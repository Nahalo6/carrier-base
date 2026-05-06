'use client';
import { useState, useMemo } from 'react';
import { useCRMStore } from '@/lib/store';
import { useAuthStore } from '@/lib/auth';
import { fmt$ } from '@/lib/utils';
import type { Policy, Lead } from '@/lib/types';
import PolicyModal from '@/components/PolicyModal';

type RenewalWindow = 0 | 30 | 60 | 90;
type ViewMode = 'list' | 'by-account';

interface PolicyRow {
  policy: Policy;
  lead: Lead;
  daysToRenewal: number | null;
}

function computeRenewalDays(p: Policy): number | null {
  if (!p.effectiveDate) return null;
  const eff = new Date(p.effectiveDate);
  const next = new Date(eff);
  next.setFullYear(next.getFullYear() + 1);
  return Math.ceil((next.getTime() - Date.now()) / 86400000);
}

export default function PolicyPage() {
  const leads = useCRMStore(s => s.leads);
  const markets = useCRMStore(s => s.markets);
  const producers = useCRMStore(s => s.producers);
  const deletePolicy = useCRMStore(s => s.deletePolicy);
  const currentUser = useAuthStore(s => s.currentUser);

  const [search, setSearch] = useState('');
  const [renewalFilter, setRenewalFilter] = useState<RenewalWindow>(0);
  const [statusFilter, setStatusFilter] = useState<Policy['status'] | 'All'>('All');
  const [lineFilter, setLineFilter] = useState<string>('All');
  const [marketFilter, setMarketFilter] = useState<string>('All');
  const [producerScope, setProducerScope] = useState<'all' | 'mine'>(currentUser?.role === 'producer' ? 'mine' : 'all');
  const [view, setView] = useState<ViewMode>('list');
  const [policyModal, setPolicyModal] = useState<{ open: boolean; lead?: Lead; policy?: Policy }>({ open: false });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  const allPolicies: PolicyRow[] = useMemo(() => {
    const rows: PolicyRow[] = [];
    leads.forEach(l => {
      (l.policies || []).forEach(p => {
        rows.push({ policy: p, lead: l, daysToRenewal: computeRenewalDays(p) });
      });
    });
    return rows;
  }, [leads]);

  const lines = useMemo(() => Array.from(new Set(allPolicies.map(r => r.policy.line))).sort(), [allPolicies]);

  const filtered = useMemo(() => {
    let rows = allPolicies;
    if (producerScope === 'mine' && currentUser) rows = rows.filter(r => r.policy.producer === currentUser.id);
    if (statusFilter !== 'All') rows = rows.filter(r => r.policy.status === statusFilter);
    if (lineFilter !== 'All') rows = rows.filter(r => r.policy.line === lineFilter);
    if (marketFilter !== 'All') rows = rows.filter(r => r.policy.market === marketFilter);
    if (renewalFilter > 0) rows = rows.filter(r => r.daysToRenewal != null && r.daysToRenewal >= 0 && r.daysToRenewal <= renewalFilter);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.lead.company.toLowerCase().includes(q)
        || r.policy.policyNumber.toLowerCase().includes(q)
        || r.policy.line.toLowerCase().includes(q)
        || (r.policy.marketName || '').toLowerCase().includes(q)
      );
    }
    return rows;
  }, [allPolicies, producerScope, currentUser, statusFilter, lineFilter, marketFilter, renewalFilter, search]);

  const kpi = useMemo(() => {
    const totalPremium = filtered.reduce((s, r) => s + r.policy.premium, 0);
    const active = filtered.filter(r => r.policy.status === 'Active').length;
    const accountCount = new Set(filtered.map(r => r.lead.id)).size;
    return { count: filtered.length, totalPremium, active, accountCount };
  }, [filtered]);

  const renewalCounts = useMemo(() => {
    const scoped = producerScope === 'mine' && currentUser
      ? allPolicies.filter(r => r.policy.producer === currentUser.id)
      : allPolicies;
    return {
      30: scoped.filter(r => r.daysToRenewal != null && r.daysToRenewal >= 0 && r.daysToRenewal <= 30).length,
      60: scoped.filter(r => r.daysToRenewal != null && r.daysToRenewal >= 0 && r.daysToRenewal <= 60).length,
      90: scoped.filter(r => r.daysToRenewal != null && r.daysToRenewal >= 0 && r.daysToRenewal <= 90).length,
    };
  }, [allPolicies, producerScope, currentUser]);

  const byAccount = useMemo(() => {
    const groups: Record<string, { lead: Lead; policies: PolicyRow[] }> = {};
    for (const r of filtered) {
      if (!groups[r.lead.id]) groups[r.lead.id] = { lead: r.lead, policies: [] };
      groups[r.lead.id].policies.push(r);
    }
    return Object.values(groups).sort((a, b) => a.lead.company.localeCompare(b.lead.company));
  }, [filtered]);

  const exportCSV = () => {
    const rows: string[][] = [
      ['Account', 'DOT#', 'Policy #', 'Line', 'Market', 'Producer', 'Premium', 'Effective', 'Expiration', 'Status', 'Days to Renewal'],
    ];
    filtered.forEach(r => {
      const market = markets.find(m => m.id === r.policy.market);
      const producer = producers.find(p => p.id === r.policy.producer);
      rows.push([
        r.lead.company, r.lead.dot, r.policy.policyNumber, r.policy.line,
        market?.name || r.policy.marketName || '',
        producer?.name || r.policy.producer,
        String(r.policy.premium), r.policy.effectiveDate, r.policy.expirationDate,
        r.policy.status, r.daysToRenewal != null ? String(r.daysToRenewal) : '',
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `policies-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const statusColors: Record<Policy['status'], { bg: string; color: string }> = {
    Active: { bg: '#f0fdfa', color: '#0f766e' },
    Cancelled: { bg: '#fff1f2', color: '#9f1239' },
    Expired: { bg: '#fafafa', color: '#525252' },
    Pending: { bg: '#fefce8', color: '#854d0e' },
  };

  const filteredLeadsForPicker = leads.filter(l =>
    !pickerSearch || l.company.toLowerCase().includes(pickerSearch.toLowerCase()) || l.dot.includes(pickerSearch)
  ).slice(0, 100);

  return (
    <>
      <div className="app-header">
        <h1>Policies & Bound</h1>
        <div className="header-actions">
          <button className="btn-s" onClick={exportCSV} disabled={filtered.length === 0}>Export CSV</button>
          <button className="btn-p" onClick={() => setPickerOpen(true)}>+ Add Policy</button>
        </div>
      </div>
      <div className="content">
        {/* KPIs */}
        <div className="grid grid-4" style={{ gap: 14, marginBottom: 16 }}>
          <div className="dash-card" style={{ cursor: 'default' }}>
            <div className="accent" style={{ background: '#1b2a4a' }} />
            <div className="label">Policies Shown</div>
            <div className="number" style={{ fontSize: 28 }}>{kpi.count}</div>
            <div className="sub">across {kpi.accountCount} account{kpi.accountCount !== 1 ? 's' : ''}</div>
          </div>
          <div className="dash-card" style={{ cursor: 'default' }}>
            <div className="accent" style={{ background: '#0f766e' }} />
            <div className="label">Active</div>
            <div className="number" style={{ fontSize: 28, color: '#0f766e' }}>{kpi.active}</div>
          </div>
          <div className="dash-card" style={{ cursor: 'default' }}>
            <div className="accent" style={{ background: '#2563eb' }} />
            <div className="label">Total Premium</div>
            <div className="number" style={{ fontSize: 26, color: '#2563eb' }}>{fmt$(kpi.totalPremium)}</div>
          </div>
          <div className="dash-card" style={{ cursor: 'default' }}>
            <div className="accent" style={{ background: '#b45309' }} />
            <div className="label">Avg Premium</div>
            <div className="number" style={{ fontSize: 26 }}>{kpi.count > 0 ? fmt$(Math.round(kpi.totalPremium / kpi.count)) : '—'}</div>
          </div>
        </div>

        {/* Renewal Reports */}
        <div className="panel" style={{ marginBottom: 14 }}>
          <div className="flex flex-between" style={{ flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1b2a4a', marginBottom: 3 }}>Renewal Reports</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Click to filter by upcoming renewal window. Sort, export, and shop the list.</div>
            </div>
            <div className="flex" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={() => setRenewalFilter(renewalFilter === 30 ? 0 : 30)}
                style={{ padding: '7px 16px', fontSize: 12, fontWeight: 700, borderRadius: 8, border: `1.5px solid ${renewalFilter === 30 ? '#9f1239' : '#fda4af'}`, background: renewalFilter === 30 ? '#9f1239' : '#fff1f2', color: renewalFilter === 30 ? '#fff' : '#9f1239', cursor: 'pointer' }}>
                30 Days · {renewalCounts[30]}
              </button>
              <button onClick={() => setRenewalFilter(renewalFilter === 60 ? 0 : 60)}
                style={{ padding: '7px 16px', fontSize: 12, fontWeight: 700, borderRadius: 8, border: `1.5px solid ${renewalFilter === 60 ? '#b45309' : '#fcd34d'}`, background: renewalFilter === 60 ? '#b45309' : '#fef3c7', color: renewalFilter === 60 ? '#fff' : '#92400e', cursor: 'pointer' }}>
                60 Days · {renewalCounts[60]}
              </button>
              <button onClick={() => setRenewalFilter(renewalFilter === 90 ? 0 : 90)}
                style={{ padding: '7px 16px', fontSize: 12, fontWeight: 700, borderRadius: 8, border: `1.5px solid ${renewalFilter === 90 ? '#0f766e' : '#5eead4'}`, background: renewalFilter === 90 ? '#0f766e' : '#f0fdfa', color: renewalFilter === 90 ? '#fff' : '#0f766e', cursor: 'pointer' }}>
                90 Days · {renewalCounts[90]}
              </button>
              {renewalFilter > 0 && <button onClick={() => setRenewalFilter(0)} className="btn-s btn-sm">Clear</button>}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="panel" style={{ marginBottom: 14 }}>
          <div className="flex" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <input className="inp" style={{ minWidth: 240, flex: 1 }} placeholder="Search company, policy #, market…" value={search} onChange={e => setSearch(e.target.value)} />
            {currentUser && (
              <select className="sel" style={{ width: 130 }} value={producerScope} onChange={e => setProducerScope(e.target.value as 'all' | 'mine')}>
                <option value="all">All producers</option>
                <option value="mine">My policies</option>
              </select>
            )}
            <select className="sel" style={{ width: 130 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value as Policy['status'] | 'All')}>
              <option value="All">All statuses</option>
              <option>Active</option><option>Pending</option><option>Cancelled</option><option>Expired</option>
            </select>
            <select className="sel" style={{ width: 160 }} value={lineFilter} onChange={e => setLineFilter(e.target.value)}>
              <option value="All">All lines</option>
              {lines.map(l => <option key={l}>{l}</option>)}
            </select>
            <select className="sel" style={{ width: 160 }} value={marketFilter} onChange={e => setMarketFilter(e.target.value)}>
              <option value="All">All markets</option>
              {markets.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <div className="flex" style={{ gap: 4, marginLeft: 'auto' }}>
              <button onClick={() => setView('list')}
                style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: 6, background: view === 'list' ? '#1b2a4a' : '#fff', color: view === 'list' ? '#fff' : '#475569', cursor: 'pointer' }}>List</button>
              <button onClick={() => setView('by-account')}
                style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: 6, background: view === 'by-account' ? '#1b2a4a' : '#fff', color: view === 'by-account' ? '#fff' : '#475569', cursor: 'pointer' }}>By Account</button>
            </div>
          </div>
        </div>

        {filtered.length === 0 && (
          <div className="panel" style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
            No policies match your filters.
            {leads.length === 0 && <div style={{ marginTop: 8, fontSize: 12 }}>Add an account first, then add a policy to it.</div>}
          </div>
        )}

        {view === 'list' && filtered.length > 0 && (
          <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <th style={{ padding: 12, textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Account</th>
                  <th style={{ padding: 12, textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Policy #</th>
                  <th style={{ padding: 12, textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Line</th>
                  <th style={{ padding: 12, textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Market</th>
                  <th style={{ padding: 12, textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Producer</th>
                  <th style={{ padding: 12, textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Premium</th>
                  <th style={{ padding: 12, textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Effective</th>
                  <th style={{ padding: 12, textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Renewal</th>
                  <th style={{ padding: 12, textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: 12, textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const market = markets.find(m => m.id === r.policy.market);
                  const producer = producers.find(p => p.id === r.policy.producer);
                  const sc = statusColors[r.policy.status];
                  return (
                    <tr key={r.policy.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: 12 }}>
                        <div style={{ fontWeight: 600, color: '#1b2a4a' }}>{r.lead.company}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>DOT# {r.lead.dot}</div>
                      </td>
                      <td style={{ padding: 12, fontWeight: 700, color: '#2563eb', fontSize: 12 }}>{r.policy.policyNumber}</td>
                      <td style={{ padding: 12, fontSize: 12 }}>{r.policy.line}</td>
                      <td style={{ padding: 12, fontSize: 12 }}>{market?.name || r.policy.marketName || '—'}</td>
                      <td style={{ padding: 12, fontSize: 12 }}>{producer?.name || r.policy.producer}</td>
                      <td style={{ padding: 12, textAlign: 'right', fontWeight: 700, color: '#0f766e' }}>{r.policy.premium > 0 ? fmt$(r.policy.premium) : '—'}</td>
                      <td style={{ padding: 12, fontSize: 12 }}>{r.policy.effectiveDate || '—'}</td>
                      <td style={{ padding: 12, fontSize: 12 }}>
                        {r.daysToRenewal != null
                          ? <span style={{ color: r.daysToRenewal <= 30 ? '#9f1239' : r.daysToRenewal <= 60 ? '#b45309' : r.daysToRenewal <= 90 ? '#0f766e' : '#475569', fontWeight: 600 }}>
                              {r.daysToRenewal < 0 ? `${-r.daysToRenewal}d ago` : `in ${r.daysToRenewal}d`}
                            </span>
                          : '—'}
                      </td>
                      <td style={{ padding: 12 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: sc.bg, color: sc.color }}>{r.policy.status}</span>
                      </td>
                      <td style={{ padding: 12, textAlign: 'right' }}>
                        <div className="flex" style={{ gap: 4, justifyContent: 'flex-end' }}>
                          <button className="btn-s btn-sm" onClick={() => setPolicyModal({ open: true, lead: r.lead, policy: r.policy })}>Edit</button>
                          <button className="btn-s btn-sm btn-danger" onClick={() => { if (confirm(`Delete policy ${r.policy.policyNumber}?`)) deletePolicy(r.lead.id, r.policy.id); }}>×</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {view === 'by-account' && byAccount.map(group => (
          <div key={group.lead.id} className="panel" style={{ marginBottom: 14 }}>
            <div className="flex flex-between" style={{ marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#1b2a4a' }}>{group.lead.company}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>DOT# {group.lead.dot} · {group.policies.length} polic{group.policies.length === 1 ? 'y' : 'ies'} · {fmt$(group.policies.reduce((s, p) => s + p.policy.premium, 0))}</div>
              </div>
              <button className="btn-p btn-sm" onClick={() => setPolicyModal({ open: true, lead: group.lead })}>+ Add Policy</button>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {group.policies.map(r => {
                const market = markets.find(m => m.id === r.policy.market);
                const producer = producers.find(p => p.id === r.policy.producer);
                const sc = statusColors[r.policy.status];
                return (
                  <div key={r.policy.id} style={{ padding: 12, background: '#f8fafc', borderRadius: 8, cursor: 'pointer' }}
                    onClick={() => setPolicyModal({ open: true, lead: group.lead, policy: r.policy })}>
                    <div className="flex flex-between" style={{ marginBottom: 6 }}>
                      <div>
                        <span style={{ fontWeight: 700, color: '#2563eb', fontSize: 13 }}>{r.policy.policyNumber}</span>
                        <span style={{ marginLeft: 8, fontSize: 12, color: '#475569', fontWeight: 600 }}>{r.policy.line}</span>
                      </div>
                      <div className="flex" style={{ gap: 6, alignItems: 'center' }}>
                        {r.daysToRenewal != null && r.daysToRenewal >= 0 && r.daysToRenewal <= 90 && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: r.daysToRenewal <= 30 ? '#fff1f2' : r.daysToRenewal <= 60 ? '#fef3c7' : '#f0fdfa', color: r.daysToRenewal <= 30 ? '#9f1239' : r.daysToRenewal <= 60 ? '#92400e' : '#0f766e' }}>
                            Renew in {r.daysToRenewal}d
                          </span>
                        )}
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: sc.bg, color: sc.color }}>{r.policy.status}</span>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, fontSize: 11 }}>
                      <div><span style={{ color: '#64748b' }}>Market: </span><span style={{ fontWeight: 600 }}>{market?.name || r.policy.marketName || '—'}</span></div>
                      <div><span style={{ color: '#64748b' }}>Producer: </span><span style={{ fontWeight: 600 }}>{producer?.name || r.policy.producer}</span></div>
                      <div><span style={{ color: '#64748b' }}>Premium: </span><span style={{ fontWeight: 700, color: '#0f766e' }}>{fmt$(r.policy.premium)}</span></div>
                      <div><span style={{ color: '#64748b' }}>Effective: </span><span style={{ fontWeight: 600 }}>{r.policy.effectiveDate || '—'}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {policyModal.open && policyModal.lead && (
        <PolicyModal lead={policyModal.lead} policy={policyModal.policy} onClose={() => setPolicyModal({ open: false })} />
      )}

      {pickerOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }} onClick={() => setPickerOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: 560, maxHeight: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, color: '#1b2a4a' }}>Choose an account to add a policy to</div>
            <div style={{ padding: 14, borderBottom: '1px solid #e2e8f0' }}>
              <input className="inp" placeholder="Search by name or DOT#…" value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} autoFocus />
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filteredLeadsForPicker.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No accounts found.</div>
              )}
              {filteredLeadsForPicker.map(l => (
                <button key={l.id} onClick={() => { setPolicyModal({ open: true, lead: l }); setPickerOpen(false); setPickerSearch(''); }}
                  style={{ width: '100%', textAlign: 'left', padding: '12px 20px', background: '#fff', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: 13 }}>
                  <div style={{ fontWeight: 600, color: '#1b2a4a' }}>{l.company}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>DOT# {l.dot} · {(l.policies || []).length} polic{(l.policies || []).length === 1 ? 'y' : 'ies'} on file</div>
                </button>
              ))}
            </div>
            <div style={{ padding: 14, borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
              <button className="btn-s" onClick={() => setPickerOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
