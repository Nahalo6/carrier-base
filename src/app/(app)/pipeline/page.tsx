'use client';
import { useState, useRef } from 'react';
import { useCRMStore } from '@/lib/store';
import { useAuthStore } from '@/lib/auth';
import { usePlatformStore } from '@/lib/platform';
import { STATUSES, STATUS_COLORS } from '@/lib/constants';
import { fmt$, unreadCount, daysSince, stageBadgeColor, producerDotColor } from '@/lib/utils';
import type { Lead, LeadStatus } from '@/lib/types';
import StatusBadge from '@/components/ui/StatusBadge';
import ProducerDot from '@/components/ui/ProducerDot';
import { useRouter } from 'next/navigation';

const PIPE_STATUSES: LeadStatus[] = ['New Lead', 'Contacted', 'Quoting', 'Submitted', 'Bound', 'Lost', 'Remarketing'];

export default function PipelinePage() {
  const leads = useCRMStore(s => s.leads);
  const setLeadStatus = useCRMStore(s => s.setLeadStatus);
  const currentUser = useAuthStore(s => s.currentUser);
  const pushNotification = usePlatformStore(s => s.pushNotification);
  const router = useRouter();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverStatus(status);
  };
  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    if (dragId) {
      const lead = leads.find(l => l.id === dragId);
      if (lead && status !== lead.status) {
        setLeadStatus(dragId, status as LeadStatus);
        // Push notification for milestone status changes
        if (status === 'Bound' && currentUser) {
          pushNotification({
            userId: currentUser.id, type: 'policy_bound',
            title: `${lead.company} bound`,
            message: `Moved to Bound. Add policy details in the Policies & Bound tab.`,
            href: '/policy', leadId: lead.id,
          });
        }
      }
    }
    setDragId(null);
    setOverStatus(null);
  };
  const handleDragEnd = () => { setDragId(null); setOverStatus(null); };

  const totalPremium = leads.filter(l => l.status === 'Bound').reduce((s, l) => s + (l.premium || 0), 0);

  return (
    <>
      <div className="app-header">
        <h1>Pipeline</h1>
        <div className="header-actions">
          <div style={{ fontSize: 13, color: '#64748b', background: '#f1f5f9', padding: '6px 14px', borderRadius: 8 }}>
            <span style={{ fontWeight: 700, color: '#0f766e' }}>{fmt$(totalPremium)}</span> total bound
          </div>
        </div>
      </div>
      <div className="content" style={{ overflowX: 'auto', overflowY: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="pipeline">
          {PIPE_STATUSES.map(status => {
            const sc = STATUS_COLORS[status];
            const colLeads = leads.filter(l => l.status === status);
            const colPrem = colLeads.reduce((s, l) => s + (l.premium || 0), 0);
            const isOver = overStatus === status;
            return (
              <div key={status} className={`pipe-col ${isOver ? 'drag-over' : ''}`}
                onDragOver={e => handleDragOver(e, status)}
                onDrop={e => handleDrop(e, status)}
                onDragLeave={() => setOverStatus(null)}>
                <div className="pipe-header">
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#1b2a4a' }}>{status}</span>
                    <span style={{ marginLeft: 8, fontSize: 11, background: sc.bg, color: sc.t, border: `1px solid ${sc.b}`, borderRadius: 8, padding: '1px 7px', fontWeight: 600 }}>
                      {colLeads.length}
                    </span>
                  </div>
                  {colPrem > 0 && <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{fmt$(colPrem)}</span>}
                </div>
                <div className="pipe-body">
                  {colLeads.map(l => {
                    const days = daysSince(l.created);
                    const badge = stageBadgeColor(days, l.status);
                    const uCount = unreadCount(l);
                    const isDragging = dragId === l.id;
                    return (
                      <div key={l.id}
                        className={`pipe-card ${isDragging ? 'dragging' : ''}`}
                        draggable
                        onDragStart={e => handleDragStart(e, l.id)}
                        onDragEnd={handleDragEnd}>
                        <div style={{ height: 4, background: sc.b, width: '100%' }} />
                        <div className="pipe-card-body">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#1b2a4a', lineHeight: 1.3 }}>{l.company}</div>
                            {uCount > 0 && (
                              <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 5px', borderRadius: 100, background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', whiteSpace: 'nowrap' }}>{uCount} new</span>
                            )}
                          </div>
                          <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 8 }}>DOT# {l.dot}</div>
                          {(l.premium > 0 || l.fleet) && (
                            <div style={{ fontSize: 11, background: '#f8fafc', borderRadius: 6, padding: '6px 8px', marginBottom: 8, color: '#475569' }}>
                              {l.premium > 0 && <div>{fmt$(l.premium)}</div>}
                              {l.fleet && <div>{l.fleet} units · {l.years} yrs</div>}
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                            <ProducerDot pid={l.producer} />
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: badge.bg, color: badge.color }}>
                              {badge.label}
                            </span>
                          </div>
                          {uCount > 0 && (
                            <div style={{ marginTop: 6, fontSize: 10, color: '#92400e', background: '#fef3c7', borderRadius: 6, padding: '4px 8px' }}>
                              {uCount} new email{uCount > 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {colLeads.length === 0 && (
                    <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '20px 0', fontStyle: 'italic' }}>
                      Drop leads here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
