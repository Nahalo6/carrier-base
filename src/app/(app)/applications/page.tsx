'use client';
import { useState, useMemo } from 'react';
import { useCRMStore } from '@/lib/store';
import { fmt$ } from '@/lib/utils';
import { applicationCompletionPercent, sumPercentages, type TruckingApplication } from '@/lib/trucking-app';
import type { Lead, Application } from '@/lib/types';
import Modal from '@/components/ui/Modal';
import { todayISO } from '@/lib/utils';
import TruckingApplicationForm from '@/components/TruckingApplicationForm';

// ─── Lead picker for new application ────────────────────────────────────────
function LeadPickerModal({ onPick, onClose }: { onPick: (lead: Lead) => void; onClose: () => void }) {
  const leads = useCRMStore(s => s.leads);
  const [search, setSearch] = useState('');
  const filtered = leads.filter(l =>
    !search || l.company.toLowerCase().includes(search.toLowerCase()) || l.dot.includes(search)
  ).slice(0, 100);

  return (
    <Modal title="Choose an account" onClose={onClose} width={560}>
      <input className="inp" placeholder="Search by company or DOT#…" value={search} onChange={e => setSearch(e.target.value)} autoFocus />
      <div style={{ maxHeight: 400, overflowY: 'auto', marginTop: 12 }}>
        {filtered.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No accounts found.</div>}
        {filtered.map(l => (
          <button key={l.id} onClick={() => onPick(l)}
            style={{ width: '100%', textAlign: 'left', padding: '12px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 6, cursor: 'pointer' }}>
            <div style={{ fontWeight: 700, color: '#1b2a4a', fontSize: 13 }}>{l.company}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>DOT# {l.dot} · {l.fleet} unit{l.fleet !== 1 ? 's' : ''} · {l.status}</div>
          </button>
        ))}
      </div>
    </Modal>
  );
}

// ─── Legacy short-form Application (kept for backward compat) ───────────────
function LegacyAppEditor({ app, onClose }: { app: Application; onClose: () => void }) {
  const leads = useCRMStore(s => s.leads);
  const updateApp = useCRMStore(s => s.updateApp);
  const [data, setData] = useState<Record<string, string>>(app.data || {});
  const lead = leads.find(l => l.id === app.leadId);
  const f = (k: string, v: string) => setData(p => ({ ...p, [k]: v }));

  const save = (status: 'Draft' | 'Complete') => {
    updateApp(app.id, { ...app, data, status, modified: todayISO() });
    onClose();
  };

  const fields = [
    ['applicantName', 'Applicant Name'], ['dba', 'DBA'], ['dot', 'DOT #'], ['mc', 'MC #'],
    ['mailingAddr', 'Mailing Address'], ['phone', 'Phone'], ['email', 'Email'],
    ['effectiveDate', 'Effective Date'], ['descOps', 'Description of Operations'],
  ];

  return (
    <Modal title={`Quick Application — ${lead?.company || 'Unknown'}`} onClose={onClose} width={760}>
      <div style={{ marginBottom: 12, padding: 10, background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
        This is a short-form quick application. For a full underwriter-ready submission, use the <b>Trucking Supplemental Application</b> on the main page.
      </div>
      <div className="grid grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        {fields.map(([k, label]) => (
          <div key={k} style={k === 'descOps' ? { gridColumn: '1 / -1' } : {}}>
            <label className="lbl">{label}</label>
            {k === 'descOps'
              ? <textarea className="inp" rows={3} value={data[k] || ''} onChange={e => f(k, e.target.value)} />
              : <input className="inp" value={data[k] || ''} onChange={e => f(k, e.target.value)} />}
          </div>
        ))}
      </div>
      <div className="flex" style={{ justifyContent: 'flex-end', gap: 10 }}>
        <button className="btn-s" onClick={onClose}>Cancel</button>
        <button className="btn-s" onClick={() => save('Draft')}>Save Draft</button>
        <button className="btn-p" onClick={() => save('Complete')}>Mark Complete</button>
      </div>
    </Modal>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────
export default function ApplicationsPage() {
  const truckingApps = useCRMStore(s => s.truckingApps);
  const apps = useCRMStore(s => s.apps);
  const leads = useCRMStore(s => s.leads);
  const deleteTruckingApp = useCRMStore(s => s.deleteTruckingApp);
  const deleteApp = useCRMStore(s => s.deleteApp);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeTApp, setActiveTApp] = useState<{ app?: TruckingApplication; lead: Lead } | null>(null);
  const [activeLegacyApp, setActiveLegacyApp] = useState<Application | null>(null);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Draft' | 'Complete' | 'Sent'>('All');
  const [search, setSearch] = useState('');

  const visible = useMemo(() => {
    return truckingApps
      .map(app => ({ app, lead: leads.find(l => l.id === app.leadId) }))
      .filter(x => x.lead) as { app: TruckingApplication; lead: Lead }[];
  }, [truckingApps, leads]);

  const filtered = visible.filter(({ app, lead }) => {
    if (statusFilter !== 'All' && app.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        app.insuredName.toLowerCase().includes(q)
        || lead.company.toLowerCase().includes(q)
        || app.dot.includes(q)
      );
    }
    return true;
  });

  const counts = {
    All: visible.length,
    Draft: visible.filter(v => v.app.status === 'Draft').length,
    Complete: visible.filter(v => v.app.status === 'Complete').length,
    Sent: visible.filter(v => v.app.status === 'Sent').length,
  };

  const startNew = (lead: Lead) => {
    setActiveTApp({ lead });
    setPickerOpen(false);
  };

  return (
    <>
      <div className="app-header">
        <h1>Applications & Forms</h1>
        <div className="header-actions">
          <input className="inp" style={{ width: 220 }} placeholder="Search by company or DOT…" value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn-p" onClick={() => setPickerOpen(true)}>+ New Trucking Supplemental</button>
        </div>
      </div>

      <div className="content">
        {/* Trucking Supplemental hero */}
        <div style={{ background: 'linear-gradient(135deg, #1b2a4a 0%, #2563eb 100%)', borderRadius: 14, padding: 22, color: '#fff', marginBottom: 18, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Featured Form</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>Trucking Supplemental Application</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6, maxWidth: 720, lineHeight: 1.6 }}>
              The full underwriter-ready submission package: 13 sections covering operations, radius, commodity %, 6-year historicals, loss runs per coverage line, coverage requested, safety, driver standards, insurance history, filings, and more.
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
              <button onClick={() => setPickerOpen(true)}
                style={{ padding: '10px 18px', background: '#fff', color: '#1b2a4a', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Start New Application
              </button>
              <div style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ opacity: 0.7 }}>Sections:</span>
                <span>13</span>
                <span style={{ opacity: 0.4 }}>·</span>
                <span style={{ opacity: 0.7 }}>Loss runs:</span>
                <span>6 years × 4 lines</span>
                <span style={{ opacity: 0.4 }}>·</span>
                <span style={{ opacity: 0.7 }}>Historicals:</span>
                <span>6 years</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status filter chips */}
        {visible.length > 0 && (
          <div className="panel" style={{ padding: 12, marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['All', 'Draft', 'Complete', 'Sent'] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 100,
                    border: `1.5px solid ${statusFilter === s ? '#1b2a4a' : '#cbd5e1'}`,
                    background: statusFilter === s ? '#1b2a4a' : '#fff',
                    color: statusFilter === s ? '#fff' : '#475569', cursor: 'pointer' }}>
                  {s} · {counts[s]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Trucking apps list */}
        {filtered.length === 0 && visible.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 12 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 14, background: '#f1f5f9', color: '#94a3b8', marginBottom: 12 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div style={{ fontSize: 14, color: '#1b2a4a', fontWeight: 600, marginBottom: 4 }}>No applications yet</div>
            <div style={{ fontSize: 12 }}>Click <b>+ New Trucking Supplemental</b> to start one for any account.</div>
          </div>
        )}

        {filtered.length === 0 && visible.length > 0 && (
          <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8', fontSize: 13, background: '#f8fafc', borderRadius: 10 }}>
            No applications match your filters.
          </div>
        )}

        {filtered.map(({ app, lead }) => {
          const completion = applicationCompletionPercent(app);
          const radiusOk = sumPercentages(app.radius) === 100;
          const commodityOk = sumPercentages(app.commodities) === 100;
          const lossTotal = (Object.values(app.lossRuns)).reduce((s, arr) => s + arr.reduce((ss, l) => ss + l.totalIncurred, 0), 0);
          const statusColor = app.status === 'Complete' ? { bg: '#f0fdfa', color: '#0f766e' }
            : app.status === 'Sent' ? { bg: '#eff6ff', color: '#1e40af' }
            : { bg: '#fef3c7', color: '#92400e' };
          return (
            <div key={app.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div className="flex flex-between" style={{ marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, color: '#1b2a4a', fontSize: 15 }}>{app.insuredName || lead.company}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 100, background: statusColor.bg, color: statusColor.color }}>{app.status}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    DOT# {app.dot || lead.dot} · Trucking Supplemental · created {new Date(app.createdAt).toLocaleDateString()} · updated {new Date(app.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex" style={{ gap: 6 }}>
                  <button className="btn-p btn-sm" onClick={() => setActiveTApp({ app, lead })}>{app.status === 'Draft' ? 'Continue' : 'Open'}</button>
                  <button className="btn-s btn-sm btn-danger" onClick={() => { if (confirm('Delete this application?')) deleteTruckingApp(app.id); }}>Delete</button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${completion}%`, height: '100%', background: completion >= 90 ? '#0f766e' : completion >= 60 ? '#2563eb' : '#b45309' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', minWidth: 40 }}>{completion}%</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, fontSize: 11 }}>
                <div>
                  <div style={{ color: '#64748b' }}>Radius</div>
                  <div style={{ fontWeight: 700, color: radiusOk ? '#0f766e' : '#9f1239' }}>{radiusOk ? 'Set' : 'Not 100%'}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b' }}>Commodities</div>
                  <div style={{ fontWeight: 700, color: commodityOk ? '#0f766e' : '#9f1239' }}>{commodityOk ? 'Set' : 'Not 100%'}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b' }}>Coverage</div>
                  <div style={{ fontWeight: 700, color: '#1b2a4a' }}>{Object.values(app.coverage).filter(c => c.requested).length} lines</div>
                </div>
                <div>
                  <div style={{ color: '#64748b' }}>Loss runs</div>
                  <div style={{ fontWeight: 700, color: '#9f1239' }}>{fmt$(lossTotal)} 5yr</div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Legacy short-form apps */}
        {apps.length > 0 && (
          <>
            <div style={{ marginTop: 28, marginBottom: 10, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Legacy Short-Form Applications ({apps.length})
            </div>
            {apps.map(a => {
              const lead = leads.find(l => l.id === a.leadId);
              return (
                <div key={a.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#1b2a4a' }}>{lead?.company || 'Unknown'} · Quick Application</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>created {a.created} · {a.status}</div>
                  </div>
                  <div className="flex" style={{ gap: 6 }}>
                    <button className="btn-s btn-sm" onClick={() => setActiveLegacyApp(a)}>Open</button>
                    <button className="btn-s btn-sm btn-danger" onClick={() => { if (confirm('Delete?')) deleteApp(a.id); }}>×</button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {pickerOpen && <LeadPickerModal onPick={startNew} onClose={() => setPickerOpen(false)} />}
      {activeTApp && (
        <TruckingApplicationForm
          existingApp={activeTApp.app}
          lead={activeTApp.lead}
          onClose={() => setActiveTApp(null)}
        />
      )}
      {activeLegacyApp && (
        <LegacyAppEditor app={activeLegacyApp} onClose={() => setActiveLegacyApp(null)} />
      )}
    </>
  );
}
