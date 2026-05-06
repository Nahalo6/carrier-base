'use client';
import { useRouter } from 'next/navigation';
import { useCRMStore } from '@/lib/store';
import { fmt$, producerDotColor } from '@/lib/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import ProducerDot from '@/components/ui/ProducerDot';

function GoalWheel({ current, goal, color, size = 110 }: { current: number; goal: number; color: string; size?: number }) {
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const pct = goal > 0 ? Math.min(current / goal, 1) : 0;
  const offset = circ - pct * circ;
  const strokeColor = pct >= 1 ? '#16a34a' : color;
  return (
    <div style={{ position: 'relative', display: 'inline-block', textAlign: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={strokeColor} strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1b2a4a' }}>{Math.round(pct * 100)}%</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const leads = useCRMStore(s => s.leads);
  const producers = useCRMStore(s => s.producers);
  const teamGoal = useCRMStore(s => s.teamGoal);

  const bound = leads.filter(l => l.status === 'Bound');
  const totalP = bound.reduce((s, l) => s + (l.premium || 0), 0);
  const pending = leads.filter(l => l.status === 'Submitted' || l.status === 'Quoting');
  const quoted = leads.filter(l => l.markets.some(m => m.status === 'Quoted'));
  const lost = leads.filter(l => l.status === 'Lost');
  const newLeads = leads.filter(l => l.status === 'New Lead');

  const prodStats = producers.map(p => {
    const myBound = bound.filter(l => l.producer === p.id);
    const prem = myBound.reduce((s, l) => s + (l.premium || 0), 0);
    const pct = p.goals.premium > 0 ? Math.min(Math.round((prem / p.goals.premium) * 100), 100) : 0;
    return { ...p, prem, pct, ct: myBound.length };
  }).sort((a, b) => b.prem - a.prem);

  const totalActual = prodStats.reduce((s, p) => s + p.prem, 0);
  const teamPct = teamGoal.premium > 0 ? Math.round((totalActual / teamGoal.premium) * 100) : 0;

  const recentLeads = [...leads].sort((a, b) => b.created.localeCompare(a.created)).slice(0, 5);

  return (
    <>
      <div className="app-header">
        <h1>Dashboard</h1>
        <div className="header-actions" />
      </div>
      <div className="content">
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 14, color: '#64748b' }}>Welcome to Carrier Base. Here&apos;s your agency overview.</span>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-5" style={{ gap: 16, marginBottom: 24 }}>
          <div className="dash-card" onClick={() => router.push('/leads')}>
            <div className="accent" style={{ background: 'linear-gradient(90deg,#1b2a4a,#334155)' }} />
            <div className="label">Total Leads</div>
            <div className="number" style={{ color: '#1b2a4a' }}>{leads.length}</div>
            <div className="sub">{newLeads.length} new</div>
          </div>
          <div className="dash-card" onClick={() => router.push('/leads')}>
            <div className="accent" style={{ background: 'linear-gradient(90deg,#3b82f6,#60a5fa)' }} />
            <div className="label">Pending</div>
            <div className="number" style={{ color: '#2563eb' }}>{pending.length}</div>
            <div className="sub">Quoting + Submitted</div>
          </div>
          <div className="dash-card" onClick={() => router.push('/pipeline')}>
            <div className="accent" style={{ background: 'linear-gradient(90deg,#8b5cf6,#a78bfa)' }} />
            <div className="label">Quoted</div>
            <div className="number" style={{ color: '#5b21b6' }}>{quoted.length}</div>
            <div className="sub">Market quotes in hand</div>
          </div>
          <div className="dash-card" onClick={() => router.push('/leads')}>
            <div className="accent" style={{ background: 'linear-gradient(90deg,#94a3b8,#cbd5e1)' }} />
            <div className="label">Declined</div>
            <div className="number" style={{ color: '#64748b' }}>{lost.length}</div>
            <div className="sub">Lost / declined</div>
          </div>
          <div className="dash-card" onClick={() => router.push('/policy')}>
            <div className="accent" style={{ background: 'linear-gradient(90deg,#0f766e,#5eead4)' }} />
            <div className="label">Bound</div>
            <div className="number" style={{ color: '#0f766e' }}>{bound.length}</div>
            <div className="sub">Active policies</div>
          </div>
        </div>

        {/* Premium + Recent */}
        <div className="grid grid-2" style={{ gap: 20, marginBottom: 20 }}>
          <div className="dash-card" style={{ cursor: 'default', padding: '28px 32px' }}>
            <div className="accent" style={{ background: 'linear-gradient(90deg,#0f766e,#5eead4)' }} />
            <div className="label" style={{ fontSize: 13 }}>Total Premium Bound</div>
            <div className="number" style={{ color: '#0f766e', fontSize: 42 }}>{fmt$(totalP)}</div>
            <div className="sub" style={{ fontSize: 12 }}>
              {bound.length} bound · Avg {fmt$(bound.length ? Math.round(totalP / bound.length) : 0)}/account
            </div>
          </div>
          <div className="dash-recent">
            <h3>Recent Activity</h3>
            {recentLeads.map(l => (
              <div key={l.id} className="dash-lead-row" onClick={() => router.push('/leads')}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#1b2a4a' }}>{l.company}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>DOT# {l.dot}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <StatusBadge status={l.status} small />
                  {l.premium > 0 && (
                    <div style={{ fontSize: 11, color: '#0f766e', fontWeight: 600, marginTop: 3 }}>{fmt$(l.premium)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Producer Leaderboard */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '20px 24px', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex flex-between" style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1b2a4a' }}>Producer Leaderboard</h3>
            <button className="btn-s btn-sm" onClick={() => router.push('/leaderboard')}>View Full →</button>
          </div>
          <div className="flex" style={{ gap: 20, alignItems: 'center' }}>
            <div style={{ flexShrink: 0 }}>
              <GoalWheel current={totalActual} goal={teamGoal.premium}
                color={teamPct >= 60 ? '#2563eb' : '#d97706'} size={110} />
              <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: '#64748b' }}>
                Team Goal<br />{fmt$(totalActual)} / {fmt$(teamGoal.premium)}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              {prodStats.map((p, i) => (
                <div key={p.id} className="flex" style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 11, width: 24, fontWeight: 700, color: i === 0 ? '#d97706' : i === 1 ? '#64748b' : '#a16207' }}>
                    {i === 0 ? '1st' : i === 1 ? '2nd' : '3rd'}
                  </span>
                  <ProducerDot pid={p.id} />
                  <span style={{ width: 100, fontSize: 12, fontWeight: 500, color: '#1b2a4a' }}>{p.name}</span>
                  <div style={{ flex: 1, height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${p.pct}%`, height: '100%', background: p.pct >= 100 ? '#16a34a' : p.pct >= 60 ? '#2563eb' : '#d97706', borderRadius: 4 }} />
                  </div>
                  <span style={{ width: 70, textAlign: 'right', fontSize: 11, fontWeight: 600, color: '#0f766e' }}>{fmt$(p.prem)}</span>
                  <span style={{ width: 30, textAlign: 'right', fontSize: 10, color: '#94a3b8' }}>{p.ct}a</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-4" style={{ gap: 16 }}>
          <div className="dash-card" onClick={() => router.push('/prospect')}>
            <div className="accent" style={{ background: 'linear-gradient(90deg,#d97706,#fbbf24)' }} />
            <div style={{ fontSize: 24, marginBottom: 8 }}>🔍</div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1b2a4a' }}>Find New Leads</div>
            <div className="sub">Search FMCSA census</div>
          </div>
          <div className="dash-card" onClick={() => router.push('/markets')}>
            <div className="accent" style={{ background: 'linear-gradient(90deg,#2563eb,#3b82f6)' }} />
            <div style={{ fontSize: 24, marginBottom: 8 }}>🏢</div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1b2a4a' }}>Markets</div>
            <div className="sub">Carrier appetite & thresholds</div>
          </div>
          <div className="dash-card" onClick={() => router.push('/analytics')}>
            <div className="accent" style={{ background: 'linear-gradient(90deg,#5b21b6,#8b5cf6)' }} />
            <div style={{ fontSize: 24, marginBottom: 8 }}>📊</div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1b2a4a' }}>Analytics</div>
            <div className="sub">KPIs, bottlenecks, producer & market performance</div>
          </div>
          <div className="dash-card" onClick={() => router.push('/leaderboard')}>
            <div className="accent" style={{ background: 'linear-gradient(90deg,#d97706,#eab308)' }} />
            <div style={{ fontSize: 24, marginBottom: 8 }}>🏆</div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1b2a4a' }}>Leaderboard</div>
            <div className="sub">Producer rankings & goals</div>
          </div>
        </div>
      </div>
    </>
  );
}
