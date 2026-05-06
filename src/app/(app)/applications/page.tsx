'use client';
import { useState } from 'react';
import { useCRMStore } from '@/lib/store';
import type { Application } from '@/lib/types';
import Modal from '@/components/ui/Modal';
import { todayISO } from '@/lib/utils';

function AppEditor({ app, leadId, onClose }: { app?: Application; leadId?: string; onClose: () => void }) {
  const leads = useCRMStore(s => s.leads);
  const addApp = useCRMStore(s => s.addApp);
  const updateApp = useCRMStore(s => s.updateApp);
  const [data, setData] = useState<Record<string, string>>(app?.data || {});
  const [lId, setLId] = useState(leadId || app?.leadId || leads[0]?.id || '');
  const f = (k: string, v: string) => setData(p => ({ ...p, [k]: v }));
  const lead = leads.find(l => l.id === lId);

  const save = (status: 'Draft' | 'Complete') => {
    const newApp: Application = {
      id: app?.id || 'app' + Date.now(), type: 'truckingSupp', leadId: lId,
      status, created: app?.created || todayISO(), modified: todayISO(), data,
    };
    if (app) updateApp(app.id, newApp);
    else addApp(newApp);
    onClose();
  };

  const fields = [
    ['applicantName', 'Applicant Name'], ['dba', 'DBA'], ['dot', 'DOT #'], ['mc', 'MC #'],
    ['mailingAddr', 'Mailing Address'], ['phone', 'Phone'], ['email', 'Email'], ['contact', 'Contact Person'],
    ['entityType', 'Entity Type'], ['yearsInBusiness', 'Years in Business'], ['annualRevenue', 'Annual Revenue'],
    ['effectiveDate', 'Effective Date'], ['coverageRequested', 'Coverage Requested'],
    ['priorCarrier', 'Prior Carrier'], ['priorPremium', 'Prior Premium'], ['priorExpiration', 'Prior Expiration'],
    ['claimsHistory', 'Claims History (3yr)'], ['descOps', 'Description of Operations'],
  ];

  return (
    <Modal title="Trucking Supplemental Application" onClose={onClose} width={900}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div style={{ marginBottom: 16 }}>
          <label className="lbl">Account</label>
          <select className="sel" style={{ width: '100%' }} value={lId} onChange={e => setLId(e.target.value)}>
            {leads.map(l => <option key={l.id} value={l.id}>{l.company} (DOT# {l.dot})</option>)}
          </select>
        </div>
        <div className="grid grid-2" style={{ gap: 12, marginBottom: 16 }}>
          {fields.map(([k, label]) => (
            <div key={k} style={k === 'descOps' ? { gridColumn: '1 / -1' } : {}}>
              <label className="lbl">{label}</label>
              {k === 'descOps'
                ? <textarea className="inp" rows={3} value={data[k] || ''} onChange={e => f(k, e.target.value)} />
                : <input className="inp" value={data[k] || ''} onChange={e => f(k, e.target.value)} />
              }
            </div>
          ))}
        </div>
        <div className="flex" style={{ justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn-s" onClick={onClose}>Cancel</button>
          <button className="btn-s" onClick={() => save('Draft')}>Save Draft</button>
          <button className="btn-p" onClick={() => save('Complete')}>Mark Complete</button>
        </div>
      </div>
    </Modal>
  );
}

export default function ApplicationsPage() {
  const apps = useCRMStore(s => s.apps);
  const leads = useCRMStore(s => s.leads);
  const deleteApp = useCRMStore(s => s.deleteApp);
  const [showEditor, setShowEditor] = useState(false);
  const [editApp, setEditApp] = useState<Application | undefined>(undefined);

  const statusClass: Record<string, string> = { Draft: 'app-status-draft', Complete: 'app-status-complete', Sent: 'app-status-sent' };

  return (
    <>
      <div className="app-header">
        <h1>Applications / Forms</h1>
        <div className="header-actions">
          <button className="btn-p" onClick={() => { setEditApp(undefined); setShowEditor(true); }}>+ New Application</button>
        </div>
      </div>
      <div className="content">
        {apps.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 14, background: '#f1f5f9', color: '#94a3b8', marginBottom: 12 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div style={{ fontSize: 14 }}>No applications yet. Create your first.</div>
          </div>
        )}
        {apps.map(a => {
          const lead = leads.find(l => l.id === a.leadId);
          return (
            <div key={a.id} className="app-draft">
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1b2a4a' }}>
                  Trucking Supplemental — {lead?.company || 'Unknown Account'}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                  Created {a.created} · Modified {a.modified}
                </div>
              </div>
              <div className="flex" style={{ gap: 8 }}>
                <span className={`badge ${statusClass[a.status] || ''}`}>{a.status}</span>
                <button className="btn-s btn-sm" onClick={() => { setEditApp(a); setShowEditor(true); }}>Open</button>
                <button className="btn-s btn-sm btn-danger" onClick={() => { if (confirm('Delete this application?')) deleteApp(a.id); }}>Delete</button>
              </div>
            </div>
          );
        })}
      </div>
      {showEditor && <AppEditor app={editApp} onClose={() => { setShowEditor(false); setEditApp(undefined); }} />}
    </>
  );
}
