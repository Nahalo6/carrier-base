'use client';
import { useState } from 'react';
import { useCRMStore } from '@/lib/store';
import { fmt$, daysSince } from '@/lib/utils';
import StatusBadge from '@/components/ui/StatusBadge';

export default function PolicyPage() {
  const leads = useCRMStore(s => s.leads);
  const [search, setSearch] = useState('');
  const bound = leads.filter(l => l.status === 'Bound');
  const filtered = bound.filter(l => !search || l.company.toLowerCase().includes(search.toLowerCase()) || (l.policyNumber || '').includes(search));
  const totalPrem = bound.reduce((s, l) => s + (l.premium || 0), 0);
  const today = new Date();

  const expiringSoon = bound.filter(l => {
    if (!l.expirationDate) return false;
    const days = Math.ceil((new Date(l.expirationDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 60;
  });

  return (
    <>
      <div className="app-header">
        <h1>Policies & Bound</h1>
        <div className="header-actions">
          <input className="inp" style={{ width: 220 }} placeholder="Search policies…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="content">
        {/* Stats */}
        <div className="grid grid-4" style={{ gap: 16, marginBottom: 20 }}>
          <div className="dash-card" style={{ cursor: 'default' }}>
            <div className="accent" style={{ background: 'linear-gradient(90deg,#0f766e,#5eead4)' }} />
            <div className="label">Bound Policies</div>
            <div className="number" style={{ color: '#0f766e' }}>{bound.length}</div>
          </div>
          <div className="dash-card" style={{ cursor: 'default' }}>
            <div className="accent" style={{ background: 'linear-gradient(90deg,#2563eb,#60a5fa)' }} />
            <div className="label">Total Premium</div>
            <div className="number" style={{ color: '#2563eb', fontSize: 26 }}>{fmt$(totalPrem)}</div>
          </div>
          <div className="dash-card" style={{ cursor: 'default' }}>
            <div className="accent" style={{ background: 'linear-gradient(90deg,#d97706,#fbbf24)' }} />
            <div className="label">Expiring Soon</div>
            <div className="number" style={{ color: '#d97706' }}>{expiringSoon.length}</div>
            <div className="sub">within 60 days</div>
          </div>
          <div className="dash-card" style={{ cursor: 'default' }}>
            <div className="accent" style={{ background: 'linear-gradient(90deg,#5b21b6,#8b5cf6)' }} />
            <div className="label">Avg Premium</div>
            <div className="number" style={{ color: '#5b21b6', fontSize: 26 }}>{fmt$(bound.length ? Math.round(totalPrem / bound.length) : 0)}</div>
          </div>
        </div>

        {/* Expiring soon banner */}
        {expiringSoon.length > 0 && (
          <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 6 }}>⚠ {expiringSoon.length} polic{expiringSoon.length > 1 ? 'ies' : 'y'} expiring within 60 days</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {expiringSoon.map(l => {
                const days = Math.ceil((new Date(l.expirationDate!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                return <span key={l.id} style={{ fontSize: 11, background: '#fff', border: '1px solid #fde68a', borderRadius: 6, padding: '3px 8px', color: '#92400e' }}>{l.company} — {days}d</span>;
              })}
            </div>
          </div>
        )}

        {/* Table */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <table>
            <thead>
              <tr>
                <th>Company</th><th>Policy #</th><th>Lines</th><th>Effective</th><th>Expires</th><th>Premium</th><th>Days Left</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: 24 }}>No bound policies found.</td></tr>
              )}
              {filtered.map(l => {
                const days = l.expirationDate ? Math.ceil((new Date(l.expirationDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
                const dayColor = days === null ? '#94a3b8' : days < 0 ? '#9f1239' : days <= 30 ? '#be123c' : days <= 60 ? '#92400e' : '#0f766e';
                return (
                  <tr key={l.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{l.company}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>DOT# {l.dot}</div>
                    </td>
                    <td style={{ color: '#2563eb', fontWeight: 600 }}>{l.policyNumber || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        {l.lines.slice(0, 2).map(line => <span key={line} className="tag tag-blue">{line}</span>)}
                        {l.lines.length > 2 && <span className="tag tag-slate">+{l.lines.length - 2}</span>}
                      </div>
                    </td>
                    <td>{l.effectiveDate || '—'}</td>
                    <td>{l.expirationDate || '—'}</td>
                    <td style={{ fontWeight: 700, color: '#0f766e' }}>{fmt$(l.premium)}</td>
                    <td><span style={{ fontWeight: 700, color: dayColor }}>{days === null ? '—' : days < 0 ? `${Math.abs(days)}d ago` : `${days}d`}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
