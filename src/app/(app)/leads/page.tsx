'use client';
import { useState } from 'react';
import { useCRMStore } from '@/lib/store';
import { STATUSES, STATUS_COLORS, BASIC_CATS, DOC_TAG_COLORS, EMAIL_TAG_COLORS, EMAIL_TAGS, DOC_TAGS } from '@/lib/constants';
import { fmt$, unreadCount, getAlerts, basicBarColor, daysSince, stageBadgeColor, producerDotColor, todayISO, runPreUW } from '@/lib/utils';
import type { PreUWResult } from '@/lib/utils';
import type { Lead, LeadStatus, Email } from '@/lib/types';
import { fmcsaLookupDOT, fmcsaGetBasics, toSaferData } from '@/lib/fmcsa';
import StatusBadge from '@/components/ui/StatusBadge';
import ProducerDot from '@/components/ui/ProducerDot';
import Modal from '@/components/ui/Modal';

// ─── Shared helpers ───────────────────────────────────────────────────────────
function AlertBadge({ basics }: { basics: Record<string, number | null> | null | undefined }) {
  const { count } = getAlerts(basics as Parameters<typeof getAlerts>[0]);
  if (!basics) return <span style={{ fontSize: 10, color: '#94a3b8' }}>No data</span>;
  if (count === 0) return <span className="alert-badge alert-clean">✓ Clean</span>;
  if (count <= 2) return <span className="alert-badge alert-warn">{count} Alert{count > 1 ? 's' : ''}</span>;
  return <span className="alert-badge alert-danger">{count} Alert{count > 1 ? 's' : ''}</span>;
}

function BasicBars({ basics }: { basics: Record<string, number | null> | null | undefined }) {
  if (!basics) return <div style={{ color: '#94a3b8', fontSize: 11 }}>No SAFER data</div>;
  return (
    <div>
      {BASIC_CATS.map(c => {
        const v = basics[c.key];
        if (v == null) return (
          <div key={c.key} className="basic-bar">
            <span className="bar-icon">{c.icon}</span>
            <span className="bar-name">{c.short}</span>
            <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>N/A</span>
          </div>
        );
        const col = basicBarColor(v);
        return (
          <div key={c.key} className="basic-bar">
            <span className="bar-icon">{c.icon}</span>
            <span className="bar-name">{c.short}</span>
            <div className="track"><div className="fill" style={{ width: `${v}%`, background: col }} /></div>
            <span className="val" style={{ color: col }}>{v}%</span>
            {v >= c.thr && <span className="alert-tag">ALERT</span>}
          </div>
        );
      })}
    </div>
  );
}

// ─── Lead Form Modal ──────────────────────────────────────────────────────────
function LeadFormModal({ lead, onClose }: { lead?: Lead; onClose: () => void }) {
  const addLead = useCRMStore(s => s.addLead);
  const updateLead = useCRMStore(s => s.updateLead);
  const producers = useCRMStore(s => s.producers);
  const [form, setForm] = useState({
    company: lead?.company || '', dot: lead?.dot || '', contact: lead?.contact || '',
    email: lead?.email || '', phone: lead?.phone || '', status: lead?.status || 'New Lead' as LeadStatus,
    producer: lead?.producer || 'p1', years: lead?.years?.toString() || '1',
    fleet: lead?.fleet?.toString() || '1', hazmat: lead?.hazmat || false,
    vehicles: lead?.vehicles || '', notes: lead?.notes || '',
    premium: lead?.premium?.toString() || '0',
  });

  const save = () => {
    if (!form.company || !form.dot) return alert('Company and DOT# are required');
    if (lead) {
      updateLead(lead.id, { ...form, years: +form.years, fleet: +form.fleet, premium: +form.premium });
    } else {
      addLead({
        id: 'l' + Date.now(), ...form, lines: [], commodities: [], violations: 0,
        markets: [], emails: [], docs: [], safer: null, created: todayISO(),
        years: +form.years, fleet: +form.fleet, premium: +form.premium, boundDate: null,
        status: form.status as LeadStatus,
      });
    }
    onClose();
  };

  const f = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Modal title={lead ? 'Edit Lead' : 'New Lead'} onClose={onClose} width={860}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div className="grid grid-2" style={{ gap: 14, marginBottom: 14 }}>
          <div><label className="lbl">Company Name *</label><input className="inp" value={form.company} onChange={e => f('company', e.target.value)} /></div>
          <div><label className="lbl">DOT # *</label><input className="inp" value={form.dot} onChange={e => f('dot', e.target.value)} /></div>
          <div><label className="lbl">Contact Name</label><input className="inp" value={form.contact} onChange={e => f('contact', e.target.value)} /></div>
          <div><label className="lbl">Email</label><input className="inp" type="email" value={form.email} onChange={e => f('email', e.target.value)} /></div>
          <div><label className="lbl">Phone</label><input className="inp" value={form.phone} onChange={e => f('phone', e.target.value)} /></div>
          <div><label className="lbl">Status</label>
            <select className="sel" style={{ width: '100%' }} value={form.status} onChange={e => f('status', e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div><label className="lbl">Producer</label>
            <select className="sel" style={{ width: '100%' }} value={form.producer} onChange={e => f('producer', e.target.value)}>
              {producers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div><label className="lbl">Years in Business</label><input className="inp" type="number" value={form.years} onChange={e => f('years', e.target.value)} /></div>
          <div><label className="lbl">Fleet Size</label><input className="inp" type="number" value={form.fleet} onChange={e => f('fleet', e.target.value)} /></div>
          <div><label className="lbl">Vehicles</label><input className="inp" value={form.vehicles} onChange={e => f('vehicles', e.target.value)} placeholder="Flatbed, Dry Van…" /></div>
          <div><label className="lbl">Premium</label><input className="inp" type="number" value={form.premium} onChange={e => f('premium', e.target.value)} /></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
            <input type="checkbox" checked={form.hazmat} onChange={e => f('hazmat', e.target.checked)} id="haz" style={{ accentColor: '#2563eb', width: 16, height: 16 }} />
            <label htmlFor="haz" style={{ fontSize: 13, color: '#1a1a2e' }}>Hazmat</label>
          </div>
        </div>
        <div><label className="lbl">Notes</label><textarea className="inp" rows={3} value={form.notes} onChange={e => f('notes', e.target.value)} /></div>
        <div className="flex" style={{ justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button className="btn-s" onClick={onClose}>Cancel</button>
          <button className="btn-p" onClick={save}>{lead ? 'Save Changes' : 'Add Lead'}</button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Email Compose Modal ──────────────────────────────────────────────────────
function ComposeModal({ lead, opts, onClose }: {
  lead: Lead;
  opts?: { to?: string; toName?: string; subj?: string; body?: string };
  onClose: () => void;
}) {
  const addEmail = useCRMStore(s => s.addEmail);
  const [to, setTo] = useState(opts?.to ?? lead.email);
  const [toName, setToName] = useState(opts?.toName ?? lead.contact);
  const [subj, setSubj] = useState(opts?.subj ?? '');
  const [body, setBody] = useState(opts?.body ?? '');
  const [tag, setTag] = useState('');

  const send = () => {
    addEmail(lead.id, { date: todayISO(), subj, dir: 'out', body, to, toName, tag });
    onClose();
  };

  return (
    <Modal title="Compose Email" onClose={onClose} width={860}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ marginBottom: 12 }}>
          <label className="lbl">To (Email)</label>
          <input className="inp" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label className="lbl">To (Name)</label>
          <input className="inp" value={toName} onChange={e => setToName(e.target.value)} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label className="lbl">Subject</label>
          <input className="inp" value={subj} onChange={e => setSubj(e.target.value)} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label className="lbl">Tag</label>
          <select className="sel" style={{ width: '100%' }} value={tag} onChange={e => setTag(e.target.value)}>
            <option value="">— none —</option>
            {EMAIL_TAGS.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label className="lbl">Body</label>
          <textarea className="inp" rows={8} value={body} onChange={e => setBody(e.target.value)} />
        </div>
        <div className="flex" style={{ justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn-s" onClick={onClose}>Cancel</button>
          <button className="btn-p" onClick={send}>Send Email</button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Pre-UW Panel ────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const r = 22, circ = 2 * Math.PI * r;
  const pct = score / 100;
  const color = score >= 80 ? '#0f766e' : score >= 60 ? '#2563eb' : score >= 40 ? '#b45309' : '#9f1239';
  return (
    <div style={{ position: 'relative', width: 54, height: 54, flexShrink: 0 }}>
      <svg width="54" height="54" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="27" cy="27" r={r} fill="none" stroke="#e2e8f0" strokeWidth="5" />
        <circle cx="27" cy="27" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <span style={{ fontWeight: 700, fontSize: 13, color, lineHeight: 1 }}>{score}</span>
      </div>
    </div>
  );
}

function PreUWPanel({ lead }: { lead: Lead }) {
  const markets = useCRMStore(s => s.markets);
  const addMarketToLead = useCRMStore(s => s.addMarketToLead);
  const results = runPreUW(lead, markets);

  const eligible   = results.filter(r => r.eligible);
  const ineligible = results.filter(r => !r.eligible);

  if (markets.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>🏢</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1b2a4a', marginBottom: 6 }}>No markets configured</div>
        <div style={{ fontSize: 12 }}>Add markets with appetite criteria first, then run Pre-UW.</div>
      </div>
    );
  }

  const alreadyAdded = new Set(lead.markets.map(m => m.mid));

  return (
    <div>
      {/* Header summary */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 160, background: '#f0fdfa', border: '1px solid #5eead4', borderRadius: 10, padding: '12px 16px' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#0f766e' }}>{eligible.length}</div>
          <div style={{ fontSize: 11, color: '#0f766e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Eligible Markets</div>
        </div>
        <div style={{ flex: 1, minWidth: 160, background: '#fff1f2', border: '1px solid #fda4af', borderRadius: 10, padding: '12px 16px' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#9f1239' }}>{ineligible.length}</div>
          <div style={{ fontSize: 11, color: '#9f1239', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ineligible Markets</div>
        </div>
        <div style={{ flex: 2, minWidth: 200, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px' }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>ACCOUNT SNAPSHOT</div>
          <div style={{ fontSize: 12, color: '#1b2a4a', display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
            <span>{lead.fleet} units · {lead.years} yr{lead.years !== 1 ? 's' : ''}</span>
            <span>{lead.violations} violation{lead.violations !== 1 ? 's' : ''}</span>
            {lead.hazmat && <span style={{ color: '#9f1239', fontWeight: 600 }}>⚠ Hazmat</span>}
            {lead.safer ? <span style={{ color: '#0f766e' }}>✓ SAFER linked</span> : <span style={{ color: '#92400e' }}>⚠ No SAFER</span>}
          </div>
          {lead.commodities.length > 0 && (
            <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {lead.commodities.map(c => <span key={c} className="tag tag-slate">{c}</span>)}
            </div>
          )}
        </div>
      </div>

      {/* Eligible markets */}
      {eligible.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#0f766e' }} />
            Eligible Markets ({eligible.length})
          </div>
          {eligible.map(r => (
            <MarketResultCard key={r.market.id} result={r} alreadyAdded={alreadyAdded.has(r.market.id)}
              onAdd={() => addMarketToLead(lead.id, r.market.id)} />
          ))}
        </div>
      )}

      {/* Ineligible markets */}
      {ineligible.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#9f1239', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#9f1239' }} />
            Ineligible Markets ({ineligible.length})
          </div>
          {ineligible.map(r => (
            <MarketResultCard key={r.market.id} result={r} alreadyAdded={alreadyAdded.has(r.market.id)}
              onAdd={() => addMarketToLead(lead.id, r.market.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function MarketResultCard({ result, alreadyAdded, onAdd }: {
  result: PreUWResult;
  alreadyAdded: boolean;
  onAdd: () => void;
}) {
  const { market, score, eligible, lineMatch, reasons, warnings } = result;
  const borderColor = eligible ? '#5eead4' : '#fda4af';
  const bgColor     = eligible ? '#f0fdfa' : '#fff1f2';
  const scoreColor  = score >= 80 ? '#0f766e' : score >= 60 ? '#2563eb' : score >= 40 ? '#b45309' : '#9f1239';

  return (
    <div style={{ border: `1.5px solid ${borderColor}`, borderRadius: 12, marginBottom: 10, background: '#fff', overflow: 'hidden' }}>
      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: eligible ? '#f0fdfa' : '#fff1f2', borderBottom: `1px solid ${borderColor}` }}>
        <ScoreRing score={score} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1b2a4a', marginBottom: 2 }}>{market.name}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>{market.notes}</div>
          {lineMatch.length > 0 && (
            <div style={{ marginTop: 5, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {lineMatch.map(l => <span key={l} className="tag tag-blue">{l}</span>)}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: scoreColor }}>{score}/100</span>
          {alreadyAdded ? (
            <span style={{ fontSize: 11, color: '#0f766e', fontWeight: 600, padding: '3px 8px', background: '#f0fdfa', border: '1px solid #5eead4', borderRadius: 6 }}>
              ✓ In Markets
            </span>
          ) : (
            <button onClick={onAdd}
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: `1px solid ${eligible ? '#5eead4' : '#e2e8f0'}`, background: eligible ? '#f0fdfa' : '#fff', color: eligible ? '#0f766e' : '#64748b', cursor: 'pointer', fontWeight: 600 }}>
              + Add to Account
            </button>
          )}
        </div>
      </div>

      {/* Disqualifying reasons */}
      {reasons.length > 0 && (
        <div style={{ padding: '10px 16px', borderBottom: warnings.length > 0 ? `1px solid ${borderColor}` : undefined }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9f1239', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
            Disqualifying Factors
          </div>
          {reasons.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#7f1d1d', marginBottom: 4, lineHeight: 1.4 }}>
              <span style={{ marginTop: 2, color: '#9f1239', flexShrink: 0, fontWeight: 700 }}>✗</span>
              {r}
            </div>
          ))}
        </div>
      )}

      {/* Warnings / near-misses */}
      {warnings.length > 0 && (
        <div style={{ padding: '10px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
            Cautions
          </div>
          {warnings.map((w, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#78350f', marginBottom: 4, lineHeight: 1.4 }}>
              <span style={{ marginTop: 2, color: '#b45309', flexShrink: 0, fontWeight: 700 }}>⚠</span>
              {w}
            </div>
          ))}
        </div>
      )}

      {/* Clean pass */}
      {reasons.length === 0 && warnings.length === 0 && (
        <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#0f766e' }}>
          <span style={{ fontWeight: 700 }}>✓</span> Meets all known appetite criteria
        </div>
      )}
    </div>
  );
}

// ─── Lead Detail Panel ────────────────────────────────────────────────────────
const DETAIL_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'preuw',    label: 'Pre-UW' },
  { key: 'emails',   label: 'Emails' },
  { key: 'docs',     label: 'Documents' },
  { key: 'drivers',  label: 'Drivers' },
  { key: 'vehicles', label: 'Vehicles' },
  { key: 'safer',    label: 'SAFER / FMCSA' },
  { key: 'markets',  label: 'Markets' },
];

function LeadDetail({ lead, onEdit, onClose }: { lead: Lead; onEdit: () => void; onClose: () => void }) {
  const [tab, setTab] = useState('overview');
  const [composeOpts, setComposeOpts] = useState<{ to?: string; toName?: string; subj?: string; body?: string } | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [saferLoading, setSaferLoading] = useState(false);
  const [saferError, setSaferError] = useState<string | null>(null);
  const markets = useCRMStore(s => s.markets);
  const setLeadStatus = useCRMStore(s => s.setLeadStatus);
  const updateLead = useCRMStore(s => s.updateLead);
  const deleteEmail = useCRMStore(s => s.deleteEmail);
  const updateEmailTag = useCRMStore(s => s.updateEmailTag);
  const updateMarketStatus = useCRMStore(s => s.updateMarketStatus);
  const addMarketToLead = useCRMStore(s => s.addMarketToLead);
  const expandedEmails = useCRMStore(s => s.expandedEmails);
  const toggleEmailExpand = useCRMStore(s => s.toggleEmailExpand);
  const leads = useCRMStore(s => s.leads);
  // Get fresh lead from store
  const freshLead = leads.find(l => l.id === lead.id) || lead;

  const pullFMCSAData = async () => {
    const dot = freshLead.dot?.trim();
    if (!dot) { setSaferError('No DOT number on this lead.'); return; }
    setSaferLoading(true);
    setSaferError(null);
    try {
      const [carrier, basics] = await Promise.all([
        fmcsaLookupDOT(dot),
        fmcsaGetBasics(dot),
      ]);
      if (!carrier) { setSaferError('No FMCSA data found for DOT# ' + dot); return; }
      const safer = toSaferData(carrier, basics, new Date().toISOString());
      updateLead(freshLead.id, { safer });
    } catch {
      setSaferError('Failed to fetch FMCSA data. Please try again.');
    } finally {
      setSaferLoading(false);
    }
  };

  const emailUnread = unreadCount(freshLead);
  const preuwResults = runPreUW(freshLead, markets);
  const eligibleCount = preuwResults.filter(r => r.eligible).length;

  const reply = (idx: number) => {
    const e = freshLead.emails[idx];
    const senderLabel = e.dir === 'in' ? (e.toName || freshLead.contact) : 'You';
    const quotedBody = `\n\n--- Original Message ---\nFrom: ${senderLabel}\nDate: ${e.date}\n\n${e.body}`;
    setComposeOpts({
      to: e.dir === 'in' ? (e.to || freshLead.email) : freshLead.email,
      toName: e.dir === 'in' ? (e.toName || freshLead.contact) : freshLead.contact,
      subj: e.subj.startsWith('Re:') ? e.subj : `Re: ${e.subj}`,
      body: quotedBody,
    });
    setShowCompose(true);
  };

  const forward = (idx: number) => {
    const e = freshLead.emails[idx];
    setComposeOpts({ subj: `Fwd: ${e.subj}`, body: `\n\n--- Forwarded Message ---\n${e.body}` });
    setShowCompose(true);
  };

  const sc = STATUS_COLORS[freshLead.status] || { bg: '#f1f5f9', b: '#94a3b8', t: '#64748b' };
  const days = daysSince(freshLead.created);
  const stageBadge = stageBadgeColor(days, freshLead.status);

  return (
    <div className="detail-panel" style={{ minWidth: 0 }}>
      <div className="detail-header">
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#1b2a4a', marginBottom: 4 }}>{freshLead.company}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>DOT# {freshLead.dot} · {freshLead.contact} · {freshLead.phone}</div>
        </div>
        <div className="flex" style={{ gap: 8 }}>
          <StatusBadge status={freshLead.status} />
          <button className="btn-s btn-sm" onClick={onEdit}>Edit</button>
          <button className="btn-s btn-sm" onClick={onClose}>✕</button>
        </div>
      </div>

      <div className="detail-body">
        {/* Sub-tabs */}
        <div className="lead-tabs">
          {DETAIL_TABS.map(t => (
            <button key={t.key} className={`lead-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
              {t.key === 'preuw' && markets.length > 0 && (
                <span className="lead-tab-badge" style={{
                  background: eligibleCount > 0 ? '#f0fdfa' : '#fff1f2',
                  color: eligibleCount > 0 ? '#0f766e' : '#9f1239',
                  border: `1px solid ${eligibleCount > 0 ? '#5eead4' : '#fda4af'}`,
                  fontWeight: 700,
                }}>
                  {eligibleCount}/{markets.length}
                </span>
              )}
              {t.key === 'emails' && (
                <span className="lead-tab-badge" style={emailUnread > 0 ? { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', fontWeight: 700 } : {}}>
                  {emailUnread > 0 ? emailUnread : freshLead.emails.length || null}
                </span>
              )}
              {t.key === 'docs' && freshLead.docs.length > 0 && <span className="lead-tab-badge">{freshLead.docs.length}</span>}
              {t.key === 'drivers' && (freshLead.drivers?.length || 0) > 0 && <span className="lead-tab-badge">{freshLead.drivers!.length}</span>}
              {t.key === 'vehicles' && (freshLead.vehicleList?.length || 0) > 0 && <span className="lead-tab-badge">{freshLead.vehicleList!.length}</span>}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div>
            <div className="grid grid-2" style={{ gap: 12, marginBottom: 16 }}>
              <div className="panel">
                <div className="lbl" style={{ marginBottom: 10 }}>Policy Details</div>
                <div className="grid grid-2" style={{ gap: 8 }}>
                  <div><div style={{ fontSize: 10, color: '#64748b' }}>Status</div><StatusBadge status={freshLead.status} small /></div>
                  <div><div style={{ fontSize: 10, color: '#64748b' }}>Producer</div><div style={{ fontWeight: 600, fontSize: 12 }}><ProducerDot pid={freshLead.producer} /> {freshLead.producer}</div></div>
                  <div><div style={{ fontSize: 10, color: '#64748b' }}>Fleet Size</div><div style={{ fontWeight: 600, fontSize: 13 }}>{freshLead.fleet} units</div></div>
                  <div><div style={{ fontSize: 10, color: '#64748b' }}>Years in Business</div><div style={{ fontWeight: 600, fontSize: 13 }}>{freshLead.years} yrs</div></div>
                  <div><div style={{ fontSize: 10, color: '#64748b' }}>Premium</div><div style={{ fontWeight: 700, fontSize: 15, color: '#0f766e' }}>{freshLead.premium > 0 ? fmt$(freshLead.premium) : '—'}</div></div>
                  <div><div style={{ fontSize: 10, color: '#64748b' }}>Hazmat</div><div style={{ fontWeight: 600, fontSize: 13 }}>{freshLead.hazmat ? '⚠ Yes' : 'No'}</div></div>
                </div>
              </div>
              <div className="panel">
                <div className="lbl" style={{ marginBottom: 10 }}>Coverage Lines</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {freshLead.lines.map(l => <span key={l} className="tag tag-blue">{l}</span>)}
                  {freshLead.lines.length === 0 && <span style={{ color: '#94a3b8', fontSize: 12 }}>None selected</span>}
                </div>
                <div className="lbl" style={{ marginTop: 12, marginBottom: 6 }}>Commodities</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {freshLead.commodities.map(c => <span key={c} className="tag tag-slate">{c}</span>)}
                  {freshLead.commodities.length === 0 && <span style={{ color: '#94a3b8', fontSize: 12 }}>None</span>}
                </div>
              </div>
            </div>
            {freshLead.notes && (
              <div className="panel"><div className="lbl" style={{ marginBottom: 6 }}>Notes</div><div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{freshLead.notes}</div></div>
            )}
            {freshLead.policyNumber && (
              <div className="panel">
                <div className="lbl" style={{ marginBottom: 10 }}>Bound Policy</div>
                <div className="grid grid-3" style={{ gap: 8 }}>
                  <div><div style={{ fontSize: 10, color: '#64748b' }}>Policy #</div><div style={{ fontWeight: 600, color: '#2563eb' }}>{freshLead.policyNumber}</div></div>
                  <div><div style={{ fontSize: 10, color: '#64748b' }}>Effective</div><div style={{ fontWeight: 600 }}>{freshLead.effectiveDate}</div></div>
                  <div><div style={{ fontSize: 10, color: '#64748b' }}>Expiration</div><div style={{ fontWeight: 600 }}>{freshLead.expirationDate}</div></div>
                </div>
              </div>
            )}
            {/* Status changer */}
            <div className="panel">
              <div className="lbl" style={{ marginBottom: 10 }}>Change Status</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {STATUSES.map(s => {
                  const c = STATUS_COLORS[s as LeadStatus];
                  return (
                    <button key={s} onClick={() => setLeadStatus(freshLead.id, s as LeadStatus)}
                      style={{ padding: '4px 12px', borderRadius: 8, border: `1.5px solid ${freshLead.status === s ? c.b : '#e2e8f0'}`, background: freshLead.status === s ? c.bg : '#fff', color: freshLead.status === s ? c.t : '#64748b', fontSize: 11, cursor: 'pointer', fontWeight: freshLead.status === s ? 700 : 400 }}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* PRE-UW */}
        {tab === 'preuw' && <PreUWPanel lead={freshLead} />}

        {/* EMAILS */}
        {tab === 'emails' && (
          <div>
            <div className="flex flex-between" style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: '#64748b' }}>{freshLead.emails.length} emails{emailUnread > 0 ? ` · ${emailUnread} unread` : ''}</div>
              <button className="btn-p btn-sm" onClick={() => { setComposeOpts(null); setShowCompose(true); }}>+ Compose</button>
            </div>
            {freshLead.emails.length === 0 && <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 24 }}>No emails yet.</div>}
            {[...freshLead.emails].sort((a, b) => b.date.localeCompare(a.date)).map((e, i) => {
              const realIdx = freshLead.emails.indexOf(e);
              const expKey = `${freshLead.id}_${realIdx}`;
              const isExp = !!expandedEmails[expKey];
              const isUnread = e.dir === 'in' && !e.read;
              return (
                <div key={i} style={{ border: `1px solid ${isExp ? '#93c5fd' : '#e2e8f0'}`, borderRadius: 10, marginBottom: 8, overflow: 'hidden', background: isUnread ? '#fafeff' : '#fff' }}>
                  <div style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
                    onClick={() => toggleEmailExpand(freshLead.id, realIdx)}>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: e.dir === 'out' ? '#eff6ff' : '#f0fdfa', color: e.dir === 'out' ? '#1e40af' : '#0f766e' }}>
                      {e.dir === 'out' ? '↑ SENT' : '↓ RECV'}
                    </span>
                    {isUnread && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2563eb', flexShrink: 0 }} />}
                    <span style={{ fontWeight: isUnread ? 700 : 500, fontSize: 13, color: '#1b2a4a', flex: 1 }}>{e.subj}</span>
                    {e.tag && <span className={`tag ${EMAIL_TAG_COLORS[e.tag] || 'tag-slate'}`}>{e.tag}</span>}
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{e.date}</span>
                    <span style={{ color: '#94a3b8', fontSize: 12 }}>{isExp ? '▲' : '▼'}</span>
                  </div>
                  {isExp && (
                    <div style={{ padding: '0 14px 14px', borderTop: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: 11, color: '#64748b', margin: '10px 0 8px', padding: '6px 10px', background: '#f8fafc', borderRadius: 6 }}>
                        {e.dir === 'out' ? `To: ${e.toName || freshLead.contact} <${e.to || freshLead.email}>` : `From: ${e.fromName || freshLead.contact} <${freshLead.email}>`}
                      </div>
                      <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 12 }}>{e.body}</div>
                      <div className="flex flex-between">
                        <select style={{ fontSize: 11, padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 6, color: '#475569', background: '#fff' }}
                          value={e.tag || ''} onChange={ev => updateEmailTag(freshLead.id, realIdx, ev.target.value)}>
                          <option value="">Tag email…</option>
                          {EMAIL_TAGS.map(t => <option key={t}>{t}</option>)}
                        </select>
                        <div className="flex" style={{ gap: 6 }}>
                          <button className="btn-s btn-sm" onClick={() => reply(realIdx)}>↩ Reply</button>
                          <button className="btn-s btn-sm" onClick={() => forward(realIdx)}>↪ Forward</button>
                          <button className="btn-s btn-sm btn-danger" onClick={() => { if (confirm('Delete this email?')) deleteEmail(freshLead.id, realIdx); }}>🗑 Delete</button>
                        </div>
                      </div>
                    </div>
                  )}
                  {!isExp && <div style={{ padding: '0 14px 10px', fontSize: 12, color: '#94a3b8' }}>{(e.body || '').slice(0, 90)}{(e.body || '').length > 90 ? '…' : ''}</div>}
                </div>
              );
            })}
          </div>
        )}

        {/* DOCS */}
        {tab === 'docs' && (
          <div>
            <div className="flex flex-between" style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: '#64748b' }}>{freshLead.docs.length} documents</div>
            </div>
            {freshLead.docs.length === 0 && <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 24 }}>No documents yet.</div>}
            {DOC_TAGS.map(tag => {
              const docs = freshLead.docs.filter(d => d.tag === tag);
              if (!docs.length) return null;
              return (
                <div key={tag} className="doc-folder">
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#1b2a4a', marginBottom: 8 }}>{tag} ({docs.length})</div>
                  {docs.map(d => (
                    <div key={d.id} className="doc-item">
                      <div className="flex" style={{ gap: 8 }}>
                        <span>📄</span>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{d.name}</div>
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>{d.date} · {d.size}</div>
                        </div>
                      </div>
                      <span className={`tag ${DOC_TAG_COLORS[d.tag] || 'tag-slate'}`}>{d.tag}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* DRIVERS */}
        {tab === 'drivers' && (
          <div>
            {(!freshLead.drivers || freshLead.drivers.length === 0) && <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 24 }}>No driver records.</div>}
            {(freshLead.drivers || []).map((d, i) => (
              <div key={i} className="card" style={{ cursor: 'default' }}>
                <div className="flex flex-between">
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{d.firstName} {d.lastName}</div>
                  <span className={`badge ${d.mvrStatus === 'Clean' ? 'alert-clean' : d.mvrStatus === 'Issues Found' ? 'alert-warn' : 'alert-badge'}`}>{d.mvrStatus}</span>
                </div>
                <div className="grid grid-3" style={{ gap: 8, marginTop: 8, fontSize: 12 }}>
                  <div><span style={{ color: '#64748b' }}>CDL: </span>{d.cdlNumber}</div>
                  <div><span style={{ color: '#64748b' }}>State: </span>{d.state}</div>
                  <div><span style={{ color: '#64748b' }}>Exp: </span>{d.experience} yrs</div>
                  <div><span style={{ color: '#64748b' }}>Accidents: </span>{d.accidents}</div>
                  <div><span style={{ color: '#64748b' }}>Violations: </span>{d.violations}</div>
                  <div><span style={{ color: '#64748b' }}>MVR Date: </span>{d.mvrDate}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VEHICLES */}
        {tab === 'vehicles' && (
          <div>
            {(!freshLead.vehicleList || freshLead.vehicleList.length === 0) && <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 24 }}>No vehicle records.</div>}
            {(freshLead.vehicleList || []).map((v, i) => (
              <div key={i} className="card" style={{ cursor: 'default' }}>
                <div className="flex flex-between">
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{v.year} {v.make} {v.model}</div>
                  <span className="tag tag-blue">{v.type}</span>
                </div>
                <div className="grid grid-3" style={{ gap: 8, marginTop: 8, fontSize: 12 }}>
                  <div><span style={{ color: '#64748b' }}>Unit: </span>#{v.unitNumber}</div>
                  <div><span style={{ color: '#64748b' }}>VIN: </span>{v.vin}</div>
                  <div><span style={{ color: '#64748b' }}>Value: </span>{fmt$(v.value)}</div>
                  <div><span style={{ color: '#64748b' }}>GVW: </span>{v.gvw.toLocaleString()} lbs</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SAFER */}
        {tab === 'safer' && (
          <div>
            {/* Pull / Refresh bar */}
            <div className="panel" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1b2a4a', marginBottom: 2 }}>
                  Live FMCSA Lookup
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  DOT# {freshLead.dot || '—'}
                  {(freshLead.safer as any)?.fetchedAt && (
                    <span style={{ marginLeft: 8, color: '#94a3b8' }}>
                      · Last pulled {new Date((freshLead.safer as any).fetchedAt).toLocaleDateString()} {new Date((freshLead.safer as any).fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
              {saferError && (
                <div style={{ fontSize: 11, color: '#9f1239', background: '#fff1f2', border: '1px solid #fda4af', borderRadius: 6, padding: '4px 10px' }}>
                  {saferError}
                </div>
              )}
              <button
                className="btn-p btn-sm"
                onClick={pullFMCSAData}
                disabled={saferLoading || !freshLead.dot}
                style={{ minWidth: 140, opacity: (!freshLead.dot || saferLoading) ? 0.6 : 1, cursor: (!freshLead.dot || saferLoading) ? 'not-allowed' : 'pointer' }}
              >
                {saferLoading ? '⏳ Fetching…' : freshLead.safer ? '🔄 Refresh FMCSA Data' : '⬇ Pull FMCSA Data'}
              </button>
            </div>

            {!freshLead.safer ? (
              <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 32 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📡</div>
                <div style={{ fontWeight: 600, color: '#1b2a4a', marginBottom: 4 }}>No FMCSA data yet</div>
                <div>Click &ldquo;Pull FMCSA Data&rdquo; above to fetch live data for DOT# {freshLead.dot || '(no DOT set)'}.</div>
              </div>
            ) : (
              <>
                {/* Carrier header */}
                <div className="panel" style={{ marginBottom: 14, background: '#f8fafc' }}>
                  <div className="grid grid-3" style={{ gap: 8 }}>
                    <div><span style={{ color: '#64748b', fontSize: 11 }}>Legal Name</span><div style={{ fontWeight: 700, fontSize: 13, color: '#1b2a4a' }}>{freshLead.safer.legalName}</div></div>
                    <div><span style={{ color: '#64748b', fontSize: 11 }}>DOT #</span><div style={{ fontWeight: 600 }}>{freshLead.safer.dotNumber}</div></div>
                    <div><span style={{ color: '#64748b', fontSize: 11 }}>MC #</span><div style={{ fontWeight: 600 }}>{freshLead.safer.mcNumber || '—'}</div></div>
                    <div><span style={{ color: '#64748b', fontSize: 11 }}>Address</span><div style={{ fontWeight: 600 }}>{freshLead.safer.address || '—'}</div></div>
                    <div><span style={{ color: '#64748b', fontSize: 11 }}>Phone</span><div style={{ fontWeight: 600 }}>{freshLead.safer.phone || '—'}</div></div>
                    <div><span style={{ color: '#64748b', fontSize: 11 }}>Operation Type</span><div style={{ fontWeight: 600 }}>{freshLead.safer.opType || '—'}</div></div>
                  </div>
                </div>

                <div className="panel">
                  <div className="flex flex-between" style={{ marginBottom: 12 }}>
                    <div className="lbl" style={{ marginBottom: 0 }}>FMCSA BASICs Scores</div>
                    <AlertBadge basics={freshLead.safer.basics as any} />
                  </div>
                  <BasicBars basics={freshLead.safer.basics as any} />
                </div>
                <div className="panel">
                  <div className="lbl" style={{ marginBottom: 12 }}>MCS-150 Filing</div>
                  <div className="grid grid-3" style={{ gap: 8 }}>
                    <div><span style={{ color: '#64748b', fontSize: 11 }}>Last Updated</span><div style={{ fontWeight: 600 }}>{freshLead.safer.mcs150.lastUpdate || '—'}</div></div>
                    <div><span style={{ color: '#64748b', fontSize: 11 }}>Mileage ({freshLead.safer.mcs150.year || '—'})</span><div style={{ fontWeight: 600 }}>{freshLead.safer.mcs150.mileage ? freshLead.safer.mcs150.mileage.toLocaleString() : '—'}</div></div>
                    <div><span style={{ color: '#64748b', fontSize: 11 }}>Safety Rating</span><div style={{ fontWeight: 700, color: freshLead.safer.safetyRating?.toLowerCase().includes('satisfactory') ? '#0f766e' : freshLead.safer.safetyRating?.toLowerCase().includes('unsat') ? '#9f1239' : '#1b2a4a' }}>{freshLead.safer.safetyRating || 'Not Rated'}</div></div>
                    <div><span style={{ color: '#64748b', fontSize: 11 }}>Drivers</span><div style={{ fontWeight: 600 }}>{freshLead.safer.mcs150.drivers ?? '—'}</div></div>
                    <div><span style={{ color: '#64748b', fontSize: 11 }}>Power Units</span><div style={{ fontWeight: 600 }}>{freshLead.safer.mcs150.powerUnits ?? '—'}</div></div>
                  </div>
                </div>
                <div className="panel">
                  <div className="lbl" style={{ marginBottom: 12 }}>Insurance on File</div>
                  {!freshLead.safer.insurance.current && !freshLead.safer.insurance.policy ? (
                    <div style={{ color: '#94a3b8', fontSize: 12 }}>No insurance data available from FMCSA for this carrier.</div>
                  ) : (
                    <div className="grid grid-2" style={{ gap: 8 }}>
                      <div><span style={{ color: '#64748b', fontSize: 11 }}>Carrier</span><div style={{ fontWeight: 600, color: '#2563eb' }}>{freshLead.safer.insurance.current || '—'}</div></div>
                      <div><span style={{ color: '#64748b', fontSize: 11 }}>Policy</span><div style={{ fontWeight: 600 }}>{freshLead.safer.insurance.policy || '—'}</div></div>
                      <div><span style={{ color: '#64748b', fontSize: 11 }}>Effective</span><div style={{ fontWeight: 600 }}>{freshLead.safer.insurance.effective || '—'}</div></div>
                      <div><span style={{ color: '#64748b', fontSize: 11 }}>Expiration</span><div style={{ fontWeight: 600 }}>{freshLead.safer.insurance.expiration || '—'}</div></div>
                    </div>
                  )}
                </div>
                {freshLead.safer.insuranceHistory && freshLead.safer.insuranceHistory.length > 0 && (
                  <div className="panel">
                    <div className="lbl" style={{ marginBottom: 10 }}>Insurance History</div>
                    {freshLead.safer.insuranceHistory.map((ih: any, i: number) => (
                      <div key={i} style={{ borderBottom: i < freshLead.safer!.insuranceHistory.length - 1 ? '1px solid #f1f5f9' : undefined, paddingBottom: 8, marginBottom: 8 }}>
                        <div className="grid grid-3" style={{ gap: 6, fontSize: 12 }}>
                          <div><span style={{ color: '#64748b' }}>Carrier: </span><span style={{ fontWeight: 600 }}>{ih.carrier || '—'}</span></div>
                          <div><span style={{ color: '#64748b' }}>Policy: </span>{ih.policy || '—'}</div>
                          <div><span style={{ color: '#64748b' }}>Coverage: </span>{ih.coverage || '—'}</div>
                          <div><span style={{ color: '#64748b' }}>Effective: </span>{ih.effective || '—'}</div>
                          <div><span style={{ color: '#64748b' }}>Expired: </span>{ih.expiration || '—'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-2" style={{ gap: 12 }}>
                  <div className="panel">
                    <div className="lbl" style={{ marginBottom: 8 }}>Inspections (24 mo)</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#1b2a4a' }}>{freshLead.safer.inspections.total}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Vehicle OOS: {freshLead.safer.inspections.vOOS} ({freshLead.safer.inspections.vRate}%) · Driver OOS: {freshLead.safer.inspections.dOOS} ({freshLead.safer.inspections.dRate}%)</div>
                  </div>
                  <div className="panel">
                    <div className="lbl" style={{ marginBottom: 8 }}>Crashes (24 mo)</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: freshLead.safer.crashes.total > 0 ? '#92400e' : '#0f766e' }}>{freshLead.safer.crashes.total}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Fatal: {freshLead.safer.crashes.fatal} · Injury: {freshLead.safer.crashes.injury} · Tow: {freshLead.safer.crashes.tow}</div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* MARKETS */}
        {tab === 'markets' && (
          <div>
            <div style={{ marginBottom: 14 }}>
              {markets.filter(m => !freshLead.markets.find(lm => lm.mid === m.id)).length > 0 && (
                <select className="sel" style={{ width: '100%', marginBottom: 10 }} defaultValue=""
                  onChange={e => { if (e.target.value) { addMarketToLead(freshLead.id, e.target.value); e.target.value = ''; } }}>
                  <option value="">+ Add market…</option>
                  {markets.filter(m => !freshLead.markets.find(lm => lm.mid === m.id)).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              )}
            </div>
            {freshLead.markets.length === 0 && <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 24 }}>No markets added.</div>}
            {freshLead.markets.map(lm => {
              const mkt = markets.find(m => m.id === lm.mid);
              if (!mkt) return null;
              return (
                <div key={lm.mid} className="card" style={{ cursor: 'default' }}>
                  <div className="flex flex-between">
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{mkt.name}</div>
                    <select style={{ fontSize: 11, padding: '3px 8px', border: '1px solid #e2e8f0', borderRadius: 6, color: '#475569' }}
                      value={lm.status} onChange={e => updateMarketStatus(freshLead.id, lm.mid, e.target.value)}>
                      {['Pending', 'Submitted', 'Quoted', 'Bound', 'Declined', 'No Appetite'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>{mkt.notes}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Compose/Reply/Forward modal */}
      {showCompose && (
        <ComposeModal lead={freshLead} opts={composeOpts || undefined} onClose={() => setShowCompose(false)} />
      )}
    </div>
  );
}

// ─── Main Leads Page ──────────────────────────────────────────────────────────
export default function LeadsPage() {
  const leads = useCRMStore(s => s.leads);
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('All');
  const [selLead, setSelLead] = useState<Lead | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editLead, setEditLead] = useState<Lead | undefined>(undefined);

  const filtered = leads.filter(l => {
    const matchSearch = !search || l.company.toLowerCase().includes(search.toLowerCase()) || l.dot.includes(search) || l.contact.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusF === 'All' || l.status === statusF;
    return matchSearch && matchStatus;
  });

  const leadsWithUnread = leads.filter(l => unreadCount(l) > 0);
  const totalUnread = leadsWithUnread.reduce((s, l) => s + unreadCount(l), 0);

  const openEdit = (lead: Lead) => { setEditLead(lead); setShowForm(true); };

  return (
    <>
      <div className="app-header">
        <h1>Leads & Accounts</h1>
        <div className="header-actions">
          <input className="inp" style={{ width: 200 }} placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="sel" style={{ width: 130 }} value={statusF} onChange={e => setStatusF(e.target.value)}>
            <option value="All">All</option>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <button className="btn-p" onClick={() => { setEditLead(undefined); setShowForm(true); }}>+ New Lead</button>
        </div>
      </div>
      <div className="content" style={{ display: 'flex', gap: 18, overflow: 'hidden', padding: '18px 24px' }}>
        {/* Lead List */}
        <div style={{ width: 320, flexShrink: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* Unread banner */}
          {leadsWithUnread.length > 0 && (
            <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 10, padding: '10px 14px', marginBottom: 10, fontSize: 12 }}>
              <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 6 }}>📬 {totalUnread} unread email{totalUnread > 1 ? 's' : ''}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {leadsWithUnread.map(l => (
                  <button key={l.id} style={{ fontSize: 11, padding: '3px 8px', background: '#fff', border: '1px solid #fcd34d', borderRadius: 6, cursor: 'pointer', color: '#92400e' }}
                    onClick={() => setSelLead(l)}>
                    {l.company} · {unreadCount(l)} new
                  </button>
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 24 }}>No leads found.</div>}
          {filtered.map(l => {
            const sc = STATUS_COLORS[l.status];
            const uCount = unreadCount(l);
            return (
              <div key={l.id} className={`card ${selLead?.id === l.id ? 'selected' : ''}`}
                onClick={() => setSelLead(l)} style={{ marginBottom: 8 }}>
                <div className="flex flex-between" style={{ marginBottom: 4 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1b2a4a' }}>{l.company}</div>
                  {uCount > 0 && (
                    <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 100, background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}>📬 {uCount}</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>DOT# {l.dot} · {l.contact}</div>
                <div className="flex flex-between">
                  <StatusBadge status={l.status} small />
                  {l.premium > 0 && <span style={{ fontSize: 11, color: '#0f766e', fontWeight: 600 }}>{fmt$(l.premium)}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail Panel */}
        <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
          {selLead ? (
            <LeadDetail lead={selLead} onEdit={() => openEdit(selLead)} onClose={() => setSelLead(null)} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 14 }}>Select a lead to view details</div>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <LeadFormModal lead={editLead} onClose={() => { setShowForm(false); setEditLead(undefined); }} />
      )}
    </>
  );
}
