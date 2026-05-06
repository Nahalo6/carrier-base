'use client';
import { useState } from 'react';
import { useCRMStore } from '@/lib/store';
import { fmt$, producerDotColor } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import ProducerDot from '@/components/ui/ProducerDot';

const METRICS = [
  { key: 'premium', label: 'Premium', fmt: (v: number) => fmt$(v), color: '#2563eb' },
  { key: 'binds', label: 'Binds', fmt: (v: number) => String(v), color: '#0f766e' },
  { key: 'deals', label: 'Deals', fmt: (v: number) => String(v), color: '#5b21b6' },
  { key: 'revenue', label: 'Revenue', fmt: (v: number) => fmt$(v), color: '#0f766e' },
];

function GoalWheel({ current, goal, color, size = 110 }: { current: number; goal: number; color: string; size?: number }) {
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const pct = goal > 0 ? Math.min(current / goal, 1) : 0;
  const offset = circ - pct * circ;
  return (
    <div style={{ position: 'relative', display: 'inline-block', textAlign: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={pct >= 1 ? '#16a34a' : color}
          strokeWidth="10" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>
        <div style={{ fontSize: size > 100 ? 18 : 14, fontWeight: 700, color: '#1b2a4a' }}>{Math.round(pct * 100)}%</div>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const leads = useCRMStore(s => s.leads);
  const producers = useCRMStore(s => s.producers);
  const teamGoal = useCRMStore(s => s.teamGoal);
  const updateTeamGoal = useCRMStore(s => s.updateTeamGoal);
  const [view, setView] = useState('premium');
  const [period, setPeriod] = useState('all');
  const [showGoalEditor, setShowGoalEditor] = useState(false);

  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7);
  const thisQ = Math.ceil((now.getMonth() + 1) / 3);
  const thisYear = now.getFullYear();

  const periodLeads = leads.filter(l => {
    const d = l.boundDate || l.created;
    if (period === 'month') return d.startsWith(thisMonth);
    if (period === 'quarter') { const dt = new Date(d); return Math.ceil((dt.getMonth() + 1) / 3) === thisQ && dt.getFullYear() === thisYear; }
    if (period === 'year') return d.startsWith(String(thisYear));
    return true;
  });
  const boundLeads = periodLeads.filter(l => l.status === 'Bound');

  const prodStats = producers.map(p => {
    const myBound = boundLeads.filter(l => l.producer === p.id);
    const myAll = periodLeads.filter(l => l.producer === p.id);
    const prem = myBound.reduce((s, l) => s + (l.premium || 0), 0);
    const rev = Math.round(prem * 0.15);
    const actuals = { deals: myAll.length, binds: myBound.length, declines: myAll.filter(l => l.status === 'Lost').length, premium: prem, revenue: rev };
    const metric = METRICS.find(m => m.key === view) || METRICS[0];
    const actual = actuals[view as keyof typeof actuals] || 0;
    const goal = (p.goals as Record<string, number>)[view] || 0;
    return { ...p, actuals, actual, goal };
  }).sort((a, b) => b.actual - a.actual);

  const teamActual = prodStats.reduce((s, p) => s + p.actual, 0);
  const teamGoalVal = (teamGoal as Record<string, number>)[view] || 0;
  const metric = METRICS.find(m => m.key === view) || METRICS[0];

  return (
    <>
      <div className="app-header">
        <h1>Leaderboard</h1>
        <div className="header-actions">
          <select className="sel" value={period} onChange={e => setPeriod(e.target.value)}>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
            <option value="all">All Time</option>
          </select>
          <select className="sel" value={view} onChange={e => setView(e.target.value)}>
            {METRICS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
          <button className="btn-s btn-sm" onClick={() => setShowGoalEditor(true)}>Edit Goals</button>
        </div>
      </div>
      <div className="content">
        {/* Team goal */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '20px 24px', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 24 }}>
          <GoalWheel current={teamActual} goal={teamGoalVal} color="#2563eb" size={120} />
          <div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Team {metric.label} Goal</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1b2a4a' }}>{metric.fmt(teamActual)}</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>of {metric.fmt(teamGoalVal)} goal</div>
          </div>
        </div>

        {/* Podium */}
        <div className="lb-podium" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 12, marginBottom: 24, paddingTop: 20 }}>
          {prodStats.slice(0, 3).map((p, i) => {
            const heights = [200, 160, 140];
            const rankColors = ['#d97706', '#64748b', '#a16207'];
            return (
              <div key={p.id} style={{ textAlign: 'center', background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '20px 24px', position: 'relative', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', minWidth: 140, height: heights[i] }}>
                <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', width: 28, height: 28, borderRadius: '50%', background: rankColors[i], display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#fff' }}>
                  {i + 1}
                </div>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: producerDotColor(p.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff', margin: '16px auto 8px', fontWeight: 700 }}>
                  {p.name.charAt(0)}
                </div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#1b2a4a' }}>{p.name.split(' ')[0]}</div>
                <div style={{ fontWeight: 700, fontSize: 16, marginTop: 4, color: metric.color }}>{metric.fmt(p.actual)}</div>
              </div>
            );
          })}
        </div>

        {/* Full table */}
        {prodStats.map((p, i) => {
          const pct = p.goal > 0 ? Math.min(Math.round((p.actual / p.goal) * 100), 100) : 0;
          return (
            <div key={p.id} className="lb-row">
              <div style={{ width: 28, fontWeight: 700, fontSize: 14, color: i === 0 ? '#d97706' : '#64748b' }}>#{i + 1}</div>
              <ProducerDot pid={p.id} size={12} />
              <div style={{ width: 140, fontWeight: 600, fontSize: 13, color: '#1b2a4a', marginLeft: 8 }}>{p.name}</div>
              <div style={{ fontSize: 11, color: '#64748b', width: 100 }}>{p.title}</div>
              <div style={{ flex: 1, height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden', margin: '0 16px' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? '#16a34a' : pct >= 60 ? '#2563eb' : '#d97706', borderRadius: 4 }} />
              </div>
              <div style={{ width: 80, textAlign: 'right', fontWeight: 700, color: '#0f766e', fontSize: 13 }}>{metric.fmt(p.actual)}</div>
              <div style={{ width: 60, textAlign: 'right', fontSize: 11, color: '#94a3b8' }}>{pct}%</div>
            </div>
          );
        })}

        {/* Individual goals */}
        <div className="grid grid-3" style={{ gap: 16, marginTop: 24 }}>
          {prodStats.map(p => (
            <div key={p.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 20 }}>
              <div className="flex" style={{ gap: 10, marginBottom: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: producerDotColor(p.id), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16 }}>
                  {p.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1b2a4a' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{p.title}</div>
                </div>
              </div>
              {METRICS.map(m => {
                const actual = (p.actuals as Record<string, number>)[m.key] || 0;
                const goal = (p.goals as Record<string, number>)[m.key] || 0;
                const pct = goal > 0 ? Math.min(Math.round((actual / goal) * 100), 100) : 0;
                return (
                  <div key={m.key} style={{ marginBottom: 10 }}>
                    <div className="flex flex-between" style={{ marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: '#64748b' }}>{m.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#1b2a4a' }}>{m.fmt(actual)} / {m.fmt(goal)}</span>
                    </div>
                    <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? '#16a34a' : m.color, borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {showGoalEditor && (
        <Modal title="Edit Team Goal" onClose={() => setShowGoalEditor(false)} width={500}>
          <div style={{ maxWidth: 380, margin: '0 auto' }}>
            {(['premium', 'binds', 'deals', 'revenue', 'declines'] as const).map(k => (
              <div key={k} style={{ marginBottom: 12 }}>
                <label className="lbl">{k.charAt(0).toUpperCase() + k.slice(1)}</label>
                <input className="inp" type="number" defaultValue={(teamGoal as Record<string, number>)[k] || 0}
                  onChange={e => updateTeamGoal({ [k]: +e.target.value })} />
              </div>
            ))}
            <div className="flex" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn-p" onClick={() => setShowGoalEditor(false)}>Done</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
