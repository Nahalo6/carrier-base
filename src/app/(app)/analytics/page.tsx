'use client';
import { useMemo, useState } from 'react';
import { useCRMStore } from '@/lib/store';
import { fmt$, daysSince } from '@/lib/utils';
import { STATUSES, STATUS_COLORS } from '@/lib/constants';
import type { LeadStatus } from '@/lib/types';
import USStateMap from '@/components/USStateMap';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

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

const ANALYTICS_VIEWS = ['overview', 'geographic', 'producers', 'velocity', 'markets', 'renewals'] as const;
type AnalyticsView = typeof ANALYTICS_VIEWS[number];

const COLORS = ['#2563eb', '#0f766e', '#b45309', '#9f1239', '#7c3aed', '#0891b2', '#854d0e', '#525252'];

export default function AnalyticsPage() {
  const leads = useCRMStore(s => s.leads);
  const producers = useCRMStore(s => s.producers);
  const markets = useCRMStore(s => s.markets);
  const [view, setView] = useState<AnalyticsView>('overview');

  // â”€â”€â”€ KPIs â”€â”€
  const kpis = useMemo(() => {
    const bound = leads.filter(l => l.status === 'Bound');
    const totalPolicies = leads.reduce((s, l) => s + (l.policies?.length || 0), 0);
    const policyPremium = leads.reduce((s, l) => s + (l.policies?.reduce((ps, p) => ps + p.premium, 0) || 0), 0);
    const boundPremium = bound.reduce((s, l) => s + l.premium, 0);
    const allPremium = policyPremium > 0 ? policyPremium : boundPremium;
    const inFlight = leads.filter(l => ['Quoting', 'Submitted'].includes(l.status));
    const inFlightPremium = inFlight.reduce((s, l) => s + l.premium, 0);
    const won = leads.filter(l => l.status === 'Bound').length;
    const lost = leads.filter(l => l.status === 'Lost').length;
    const winRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;
    return { total: leads.length, bound: bound.length, totalPolicies, policyPremium: allPremium,
      inFlightPremium, winRate, inFlight: inFlight.length, lost };
  }, [leads]);

  // â”€â”€â”€ Pipeline by status â”€â”€
  const pipelineData = useMemo(() => STATUSES.map(s => ({
    name: s,
    count: leads.filter(l => l.status === s).length,
    premium: leads.filter(l => l.status === s).reduce((sum, l) => sum + l.premium, 0),
    color: STATUS_COLORS[s as LeadStatus]?.t || '#64748b',
  })), [leads]);

  // â”€â”€â”€ Geographic: leads / policies by state â”€â”€
  const stateData = useMemo(() => {
    const counts: Record<string, number> = {};
    const policies: Record<string, number> = {};
    const premiumByState: Record<string, number> = {};
    leads.forEach(l => {
      const st = (l.safer?.address?.match(/, ([A-Z]{2}),/)?.[1])
        || (l.safer?.address?.match(/, ([A-Z]{2})\b/)?.[1])
        || '';
      if (st) {
        counts[st] = (counts[st] || 0) + 1;
        policies[st] = (policies[st] || 0) + (l.policies?.length || 0);
        premiumByState[st] = (premiumByState[st] || 0) + l.premium;
      }
    });
    return { counts, policies, premiumByState };
  }, [leads]);

  // â”€â”€â”€ Producer leaderboard â”€â”€
  const producerStats = useMemo(() => producers.map(p => {
    const myLeads = leads.filter(l => l.producer === p.id);
    const bound = myLeads.filter(l => l.status === 'Bound');
    const policies = myLeads.reduce((s, l) => s + (l.policies?.length || 0), 0);
    const premium = myLeads.reduce((s, l) => s + (l.policies?.reduce((ps, pol) => ps + pol.premium, 0) || l.premium), 0);
    return { id: p.id, name: p.name, leads: myLeads.length, bound: bound.length,
      winRate: myLeads.length > 0 ? Math.round((bound.length / myLeads.length) * 100) : 0,
      policies, premium };
  }).sort((a, b) => b.premium - a.premium), [leads, producers]);

  const topProducerStateMap = useMemo(() => {
    // For each state, find the producer with the most leads
    const stateProducers: Record<string, Record<string, number>> = {};
    leads.forEach(l => {
      const st = (l.safer?.address?.match(/, ([A-Z]{2}),/)?.[1])
        || (l.safer?.address?.match(/, ([A-Z]{2})\b/)?.[1])
        || '';
      if (st) {
        if (!stateProducers[st]) stateProducers[st] = {};
        stateProducers[st][l.producer] = (stateProducers[st][l.producer] || 0) + 1;
      }
    });
    const result: Record<string, number> = {};
    Object.entries(stateProducers).forEach(([st, prods]) => {
      const top = Object.values(prods).sort((a, b) => b - a)[0] || 0;
      result[st] = top;
    });
    return result;
  }, [leads]);

  // â”€â”€â”€ Monthly velocity (last 12 months) â”€â”€
  const monthlyData = useMemo(() => {
    const months: { month: string; created: number; bound: number; premium: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const created = leads.filter(l => l.created?.startsWith(monthKey)).length;
      const bound = leads.filter(l => l.boundDate?.startsWith(monthKey)).length;
      const premium = leads.filter(l => l.boundDate?.startsWith(monthKey)).reduce((s, l) => s + l.premium, 0);
      months.push({ month: monthLabel, created, bound, premium });
    }
    return months;
  }, [leads]);

  // â”€â”€â”€ Lines of coverage â”€â”€
  const linesData = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(l => {
      l.policies?.forEach(p => { counts[p.line] = (counts[p.line] || 0) + 1; });
      // Fallback to lead.lines if no policies
      if (!l.policies?.length) l.lines.forEach(line => { counts[line] = (counts[line] || 0) + 0.5; });
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [leads]);

  // â”€â”€â”€ Market performance â”€â”€
  const marketData = useMemo(() => {
    const counts: Record<string, { mid: string; name: string; submitted: number; bound: number; premium: number }> = {};
    leads.forEach(l => {
      l.markets.forEach(m => {
        const market = markets.find(mk => mk.id === m.mid);
        if (!market) return;
        if (!counts[m.mid]) counts[m.mid] = { mid: m.mid, name: market.name, submitted: 0, bound: 0, premium: 0 };
        counts[m.mid].submitted++;
        if (m.status === 'Bound') {
          counts[m.mid].bound++;
          counts[m.mid].premium += l.premium;
        }
      });
    });
    return Object.values(counts).sort((a, b) => b.bound - a.bound);
  }, [leads, markets]);

  // â”€â”€â”€ Upcoming renewals â”€â”€
  const renewals = useMemo(() => {
    const now = new Date();
    const list: { lead: typeof leads[number]; policyNumber: string; daysUntil: number; expDate: string; premium: number }[] = [];
    leads.forEach(l => {
      l.policies?.forEach(p => {
        if (!p.expirationDate) return;
        const exp = new Date(p.expirationDate);
        const days = Math.ceil((exp.getTime() - now.getTime()) / 86400000);
        if (days <= 120 && days > -30) {
          list.push({ lead: l, policyNumber: p.policyNumber, daysUntil: days, expDate: p.expirationDate, premium: p.premium });
        }
      });
    });
    return list.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [leads]);

  return (
    <>
      <div className="app-header">
        <h1>Analytics</h1>
        <div style={{ fontSize: 13, color: '#64748b' }}>Pipeline performance, geographic distribution, and producer metrics</div>
      </div>
      <div className="content">
        {/* View tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 18, flexWrap: 'wrap', borderBottom: '1px solid #e2e8f0' }}>
          {ANALYTICS_VIEWS.map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{
                padding: '10px 16px', fontSize: 13, fontWeight: 600, textTransform: 'capitalize',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: `2px solid ${view === v ? '#2563eb' : 'transparent'}`,
                color: view === v ? '#2563eb' : '#64748b', marginBottom: -1,
              }}>
              {v}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {view === 'overview' && (
          <>
            <div className="grid grid-4" style={{ gap: 14, marginBottom: 18 }}>
              <KpiCard label="Total Leads" value={kpis.total} sub={`${kpis.inFlight} in flight`} accent="#2563eb" />
              <KpiCard label="Bound Accounts" value={kpis.bound} sub={`${kpis.totalPolicies} active policies`} accent="#0f766e" valColor="#0f766e" />
              <KpiCard label="Bound Premium" value={fmt$(kpis.policyPremium)} sub={`${fmt$(kpis.inFlightPremium)} in flight`} accent="#b45309" />
              <KpiCard label="Win Rate" value={`${kpis.winRate}%`} sub={`${kpis.lost} lost`} accent="#7c3aed" />
            </div>

            <div className="grid grid-2" style={{ gap: 14, marginBottom: 18 }}>
              <div className="panel">
                <div className="lbl" style={{ marginBottom: 12 }}>Pipeline by Status (count)</div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={pipelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {pipelineData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="panel">
                <div className="lbl" style={{ marginBottom: 12 }}>Pipeline Premium ($)</div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={pipelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => fmt$(Number(v))} />
                    <Bar dataKey="premium" radius={[8, 8, 0, 0]} fill="#0f766e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-2" style={{ gap: 14, marginBottom: 18 }}>
              <div className="panel">
                <div className="lbl" style={{ marginBottom: 12 }}>Lines of Coverage</div>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={linesData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => `${e.name}: ${e.value}`}>
                      {linesData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="panel">
                <div className="lbl" style={{ marginBottom: 12 }}>Coverage Lines (count)</div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={linesData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={130} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2563eb" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {/* GEOGRAPHIC */}
        {view === 'geographic' && (
          <>
            <div className="grid grid-2" style={{ gap: 14, marginBottom: 18 }}>
              <div className="panel">
                <div className="lbl" style={{ marginBottom: 12 }}>Accounts by State</div>
                <USStateMap data={stateData.counts} metricLabel="accounts" colorScale={['#dbeafe', '#1e3a8a']} />
              </div>
              <div className="panel">
                <div className="lbl" style={{ marginBottom: 12 }}>Bound Policies by State</div>
                <USStateMap data={stateData.policies} metricLabel="policies" colorScale={['#ccfbf1', '#134e4a']} />
              </div>
            </div>

            <div className="panel">
              <div className="lbl" style={{ marginBottom: 12 }}>Top Producer Lead Count by State</div>
              <USStateMap data={topProducerStateMap} metricLabel="top-producer leads" colorScale={['#fef3c7', '#7c2d12']} />
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
                Each cell shows the lead count of the highest-performing producer in that state.
              </div>
            </div>
          </>
        )}

        {/* PRODUCERS */}
        {view === 'producers' && (
          <>
            <div className="panel" style={{ marginBottom: 18 }}>
              <div className="lbl" style={{ marginBottom: 12 }}>Producer Premium Leaderboard</div>
              <ResponsiveContainer width="100%" height={Math.max(220, producerStats.length * 38)}>
                <BarChart data={producerStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip formatter={(v) => fmt$(Number(v))} />
                  <Bar dataKey="premium" fill="#0f766e" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="panel">
              <div className="lbl" style={{ marginBottom: 12 }}>Producer Detail</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: 8 }}>Producer</th>
                    <th style={{ padding: 8 }}>Leads</th>
                    <th style={{ padding: 8 }}>Bound</th>
                    <th style={{ padding: 8 }}>Win %</th>
                    <th style={{ padding: 8 }}>Policies</th>
                    <th style={{ padding: 8, textAlign: 'right' }}>Premium</th>
                  </tr>
                </thead>
                <tbody>
                  {producerStats.map(ps => (
                    <tr key={ps.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: 8, fontWeight: 600 }}>{ps.name}</td>
                      <td style={{ padding: 8 }}>{ps.leads}</td>
                      <td style={{ padding: 8 }}>{ps.bound}</td>
                      <td style={{ padding: 8, color: ps.winRate >= 30 ? '#0f766e' : '#475569', fontWeight: 600 }}>{ps.winRate}%</td>
                      <td style={{ padding: 8 }}>{ps.policies}</td>
                      <td style={{ padding: 8, textAlign: 'right', fontWeight: 700, color: '#0f766e' }}>{fmt$(ps.premium)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* VELOCITY */}
        {view === 'velocity' && (
          <>
            <div className="panel" style={{ marginBottom: 18 }}>
              <div className="lbl" style={{ marginBottom: 12 }}>Leads & Bindings (12 months)</div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="created" name="New Leads" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="bound" name="Bound" stroke="#0f766e" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="panel">
              <div className="lbl" style={{ marginBottom: 12 }}>Premium Bound (12 months)</div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="premiumGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0f766e" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#0f766e" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => fmt$(Number(v))} />
                  <Area type="monotone" dataKey="premium" stroke="#0f766e" strokeWidth={2} fill="url(#premiumGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* MARKETS */}
        {view === 'markets' && (
          <div className="panel">
            <div className="lbl" style={{ marginBottom: 12 }}>Market Performance</div>
            <ResponsiveContainer width="100%" height={Math.max(260, marketData.length * 42)}>
              <BarChart data={marketData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={150} />
                <Tooltip />
                <Legend />
                <Bar dataKey="submitted" name="Submitted" fill="#94a3b8" radius={[0, 4, 4, 0]} />
                <Bar dataKey="bound" name="Bound" fill="#0f766e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {marketData.length === 0 && <div style={{ color: '#94a3b8', textAlign: 'center', padding: 30 }}>No market submission data yet.</div>}
          </div>
        )}

        {/* RENEWALS */}
        {view === 'renewals' && (
          <div className="panel">
            <div className="lbl" style={{ marginBottom: 12 }}>Upcoming Renewals (next 120 days)</div>
            {renewals.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 30 }}>No policies expiring in the next 120 days.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: 8 }}>Account</th>
                    <th style={{ padding: 8 }}>Policy #</th>
                    <th style={{ padding: 8 }}>Expires</th>
                    <th style={{ padding: 8 }}>Days</th>
                    <th style={{ padding: 8, textAlign: 'right' }}>Premium</th>
                  </tr>
                </thead>
                <tbody>
                  {renewals.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: 8, fontWeight: 600 }}>{r.lead.company}</td>
                      <td style={{ padding: 8, color: '#2563eb', fontWeight: 600 }}>{r.policyNumber}</td>
                      <td style={{ padding: 8 }}>{r.expDate}</td>
                      <td style={{ padding: 8, color: r.daysUntil < 30 ? '#9f1239' : r.daysUntil < 60 ? '#b45309' : '#0f766e', fontWeight: 700 }}>
                        {r.daysUntil < 0 ? `${-r.daysUntil} overdue` : `${r.daysUntil}d`}
                      </td>
                      <td style={{ padding: 8, textAlign: 'right', fontWeight: 700 }}>{fmt$(r.premium)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </>
  );
}
