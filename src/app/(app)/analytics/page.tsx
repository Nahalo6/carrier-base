'use client';
import { useState } from 'react';
import { useCRMStore } from '@/lib/store';
import { fmt$, daysSince, producerDotColor } from '@/lib/utils';
import { STATUSES, STATUS_COLORS } from '@/lib/constants';
import type { LeadStatus } from '@/lib/types';

function KpiCard({ label, value, sub, accent, valColor }: { label: string; value: string | number; sub?: string; accent: string; valColor?: string }) {
  return (
    <div className="dash-card" style={{ cursor: 'default' }}>
      <div className="accent" style={{ background: accent }} />
      <div className="label">{label}</div>
      <div className="number" style={{ color: valColor || '#1b2a4a', fontSize: 30 }}>{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div style={{ color: '#94a3b8', fontSize: 12 }}>No data</div>;
  let offset = 0;
  const r = 44, cx = 50, cy = 50, circ = 2 * Math.PI * r;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
        {data.map((d, i) => {
          const pct = d.value / total;
          const dash = pct * circ;
          const el = <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth="12"
            strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-offset * circ / 1} />;
          offset += pct;
          return el;
        })}
      </svg>
      <div>
        {data.map((d, i) => (
          <div key={i} className="flex" style={{ gap: 6, marginBottom: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: '#64748b' }}>{d.label}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#1b2a4a', marginLeft: 'auto' }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const ANALYTICS_VIEWS = ['overview', 'velocity', 'producers', 'markets', 'renewals'] as const;
type AnalyticsView = typeof ANALYTICS_VIEWS[number];

export default function AnalyticsPage() {
  const leads = useCRMStore(s => s.leads);
  const markets = useCRMStore(s => s.markets);
  const producers = useCRMStore(s => s.producers);
  const [view, setView] = useState<AnalyticsView>('overview');

  const bound = leads.filter(l => l.status === 'Bound');
  const totalP = bound.reduce((s, l) => s + (l.premium || 0), 0);
  const convRate = leads.length > 0 ? Math.round((bound.length / leads.length) * 100) : 0;
  const avgBind = bound.length > 0 ? Math.round(bound.reduce((s, l) => s + daysSince(l.created), 0) / bound.length) : 0;
  const lost = leads.filter(l => l.status === 'Lost');

  const statusCounts = STATUSES.map(s => ({ label: s, value: leads.filter(l => l.status === s).length, color: STATUS_COLORS[s as LeadStatus].b }));

  // Velocity data
  const stageMap: Record<string, number[]> = {};
  leads.forEach(l => {
    const days = daysSince(l.created);
    if (!stageMap[l.status]) stageMap[l.status] = [];
    stageMap[l.status].push(days);
  });
  const velocityData = Object.entries(stageMap).map(([status, days]) => ({
    status, avgDays: Math.round(days.reduce((a, b) => a + b, 0) / days.length),
  }));

  // Producer performance
  const prodPerf = producers.map(p => {
    const myLeads = leads.filter(l => l.producer === p.id);
    const myBound = myLeads.filter(l => l.status === 'Bound');
    const prem = myBound.reduce((s, l) => s + (l.premium || 0), 0);
    return { ...p, leads: myLeads.length, bound: myBound.length, premium: prem, conv: myLeads.length > 0 ? Math.round((myBound.length / myLeads.length) * 100) : 0 };
  });

  // Market performance
  const mktPerf = markets.map(m => {
    const subs = leads.filter(l => l.markets.some(lm => lm.mid === m.id));
    const mBound = subs.filter(l => l.markets.find(lm => lm.mid === m.id)?.status === 'Bound');
    const mDeclined = subs.filter(l => l.markets.find(lm => lm.mid === m.id)?.status === 'Declined');
    const prem = mBound.reduce((s, l) => s + (l.premium || 0), 0);
    return { ...m, subs: subs.length, bound: mBound.length, declined: mDeclined.length, premium: prem, hitRate: subs.length > 0 ? Math.round((mBound.length / subs.length) * 100) : 0 };
  }).sort((a, b) => b.premium - a.premium);

  // Renewals
  const today = new Date();
  const renewalBuckets: Record<string, { count: number; premium: number }> = {
    expired: { count: 0, premium: 0 }, '0-30': { count: 0, premium: 0 },
    '31-60': { count: 0, premium: 0 }, '61-90': { count: 0, premium: 0 },
    '91-180': { count: 0, premium: 0 }, '181+': { count: 0, premium: 0 },
  };
  bound.forEach(l => {
    if (!l.expirationDate) return;
    const days = Math.ceil((new Date(l.expirationDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const bucket = days < 0 ? 'expired' : days <= 30 ? '0-30' : days <= 60 ? '31-60' : days <= 90 ? '61-90' : days <= 180 ? '91-180' : '181+';
    renewalBuckets[bucket].count++;
    renewalBuckets[bucket].premium += l.premium || 0;
  });

  return (
    <>
      <div className="app-header">
        <h1>Analytics</h1>
        <div className="header-actions">
          <button className="btn-s btn-sm" onClick={() => {
            const csv = ['Company,Status,Premium,Producer,Created'].concat(leads.map(l => `"${l.company}",${l.status},${l.premium},${l.producer},${l.created}`)).join('\n');
            const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv])); a.download = 'crm_export.csv'; a.click();
          }}>Export CSV</button>
        </div>
      </div>
      <div className="content">
        {/* Sub-nav */}
        <div className="lead-tabs" style={{ marginBottom: 20 }}>
          {[['overview', 'Overview'], ['velocity', 'Pipeline Velocity'], ['producers', 'Producers'], ['markets', 'Markets'], ['renewals', 'Renewals']].map(([k, l]) => (
            <button key={k} className={`lead-tab ${view === k ? 'active' : ''}`} onClick={() => setView(k as AnalyticsView)}>{l}</button>
          ))}
        </div>

        {/* OVERVIEW */}
        {view === 'overview' && (
          <div>
            <div className="grid grid-4" style={{ gap: 16, marginBottom: 20 }}>
              <KpiCard label="Total Premium" value={fmt$(totalP)} sub={`${bound.length} bound policies`} accent="linear-gradient(90deg,#0f766e,#5eead4)" valColor="#0f766e" />
              <KpiCard label="Conversion Rate" value={`${convRate}%`} sub={`${bound.length} of ${leads.length} leads`} accent="linear-gradient(90deg,#2563eb,#60a5fa)" valColor="#2563eb" />
              <KpiCard label="Avg Days to Bind" value={`${avgBind}d`} sub="from lead to bound" accent="linear-gradient(90deg,#5b21b6,#8b5cf6)" valColor="#5b21b6" />
              <KpiCard label="Lost / Declined" value={lost.length} sub={`${leads.length > 0 ? Math.round((lost.length / leads.length) * 100) : 0}% decline rate`} accent="linear-gradient(90deg,#9f1239,#fda4af)" valColor="#9f1239" />
            </div>
            <div className="grid grid-2" style={{ gap: 20 }}>
              <div className="report-card">
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1b2a4a', marginBottom: 14 }}>Pipeline by Status</div>
                <DonutChart data={statusCounts.filter(d => d.value > 0)} />
              </div>
              <div className="report-card">
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1b2a4a', marginBottom: 14 }}>Premium by Producer</div>
                {prodPerf.map(p => (
                  <div key={p.id} style={{ marginBottom: 10 }}>
                    <div className="flex flex-between" style={{ marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: '#1b2a4a', fontWeight: 500 }}>{p.name}</span>
                      <span style={{ fontSize: 11, color: '#0f766e', fontWeight: 700 }}>{fmt$(p.premium)}</span>
                    </div>
                    <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${totalP > 0 ? Math.round((p.premium / totalP) * 100) : 0}%`, height: '100%', background: producerDotColor(p.id), borderRadius: 4 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VELOCITY */}
        {view === 'velocity' && (
          <div className="report-card">
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1b2a4a', marginBottom: 16 }}>Average Days in Each Stage</div>
            <table>
              <thead><tr><th>Status</th><th>Avg Days</th><th>Lead Count</th><th>Trend</th></tr></thead>
              <tbody>
                {velocityData.map(r => (
                  <tr key={r.status}>
                    <td><span className="badge" style={{ background: STATUS_COLORS[r.status as LeadStatus]?.bg || '#f1f5f9', border: `1px solid ${STATUS_COLORS[r.status as LeadStatus]?.b || '#e2e8f0'}`, color: STATUS_COLORS[r.status as LeadStatus]?.t || '#64748b' }}>{r.status}</span></td>
                    <td style={{ fontWeight: 700 }}>{r.avgDays}d</td>
                    <td>{stageMap[r.status]?.length || 0}</td>
                    <td>
                      <div style={{ height: 8, width: 120, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(r.avgDays / 30 * 100, 100)}%`, height: '100%', background: r.avgDays > 14 ? '#9f1239' : r.avgDays > 7 ? '#92400e' : '#0f766e', borderRadius: 4 }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PRODUCERS */}
        {view === 'producers' && (
          <div>
            <table style={{ marginBottom: 20 }}>
              <thead><tr><th>Producer</th><th>Leads</th><th>Bound</th><th>Conv %</th><th>Premium</th><th>Revenue (15%)</th></tr></thead>
              <tbody>
                {prodPerf.map(p => (
                  <tr key={p.id}>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 28, height: 28, borderRadius: '50%', background: producerDotColor(p.id), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>{p.name.charAt(0)}</div>{p.name}</div></td>
                    <td>{p.leads}</td>
                    <td style={{ color: '#0f766e', fontWeight: 700 }}>{p.bound}</td>
                    <td>{p.conv}%</td>
                    <td style={{ color: '#0f766e', fontWeight: 700 }}>{fmt$(p.premium)}</td>
                    <td>{fmt$(Math.round(p.premium * 0.15))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* MARKETS */}
        {view === 'markets' && (
          <div className="report-card">
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1b2a4a', marginBottom: 16 }}>Market Performance</div>
            <table>
              <thead><tr><th>Market</th><th>Submissions</th><th>Bound</th><th>Declined</th><th>Hit Rate</th><th>Premium</th></tr></thead>
              <tbody>
                {mktPerf.map(m => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600 }}>{m.name}</td>
                    <td>{m.subs}</td>
                    <td style={{ color: '#0f766e', fontWeight: 700 }}>{m.bound}</td>
                    <td style={{ color: '#9f1239' }}>{m.declined}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 60, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${m.hitRate}%`, height: '100%', background: m.hitRate >= 50 ? '#0f766e' : m.hitRate >= 25 ? '#b45309' : '#9f1239', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontWeight: 700, color: '#1b2a4a' }}>{m.hitRate}%</span>
                      </div>
                    </td>
                    <td style={{ color: '#0f766e', fontWeight: 700 }}>{fmt$(m.premium)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* RENEWALS */}
        {view === 'renewals' && (
          <div>
            <div className="grid grid-3" style={{ gap: 16, marginBottom: 20 }}>
              {Object.entries(renewalBuckets).map(([k, v]) => {
                const colors: Record<string, string> = { expired: '#9f1239', '0-30': '#be123c', '31-60': '#92400e', '61-90': '#b45309', '91-180': '#1e40af', '181+': '#0f766e' };
                return (
                  <div key={k} className="dash-card" style={{ cursor: 'default' }}>
                    <div className="accent" style={{ background: colors[k] }} />
                    <div className="label">{k === 'expired' ? 'Expired' : `${k} days`}</div>
                    <div className="number" style={{ color: colors[k], fontSize: 28 }}>{v.count}</div>
                    <div className="sub">{fmt$(v.premium)} at risk</div>
                  </div>
                );
              })}
            </div>
            <div className="report-card">
              <div style={{ fontWeight: 600, fontSize: 14, color: '#1b2a4a', marginBottom: 16 }}>Bound Accounts by Expiration</div>
              <table>
                <thead><tr><th>Company</th><th>Policy #</th><th>Effective</th><th>Expires</th><th>Premium</th><th>Days Left</th></tr></thead>
                <tbody>
                  {bound.filter(l => l.expirationDate).sort((a, b) => (a.expirationDate || '').localeCompare(b.expirationDate || '')).map(l => {
                    const days = Math.ceil((new Date(l.expirationDate!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    const col = days < 0 ? '#9f1239' : days <= 30 ? '#be123c' : days <= 60 ? '#92400e' : '#0f766e';
                    return (
                      <tr key={l.id}>
                        <td style={{ fontWeight: 600 }}>{l.company}</td>
                        <td style={{ color: '#2563eb' }}>{l.policyNumber || '—'}</td>
                        <td>{l.effectiveDate || '—'}</td>
                        <td>{l.expirationDate}</td>
                        <td style={{ color: '#0f766e', fontWeight: 700 }}>{fmt$(l.premium)}</td>
                        <td><span style={{ fontWeight: 700, color: col }}>{days < 0 ? `${Math.abs(days)}d ago` : `${days}d`}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
