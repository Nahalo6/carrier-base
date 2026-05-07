'use client';
import { useState, useMemo } from 'react';
import { useCRMStore } from '@/lib/store';
import { US_STATES } from '@/lib/constants';
import { fmt$ } from '@/lib/utils';
import {
  buildEmptyApplication, sumPercentages, applicationCompletionPercent,
  COMMODITY_OPTIONS,
  type TruckingApplication, type CoverageLine, type LossRunYear,
  type HistoricalYear, type CommodityEntry, type OwnerEntry, type PriorCarrierEntry,
} from '@/lib/trucking-app';
import type { Lead } from '@/lib/types';
import Modal from './ui/Modal';

const SECTIONS = [
  { id: 'insured',    label: 'Insured Info',          short: '1' },
  { id: 'operations', label: 'Operations',             short: '2' },
  { id: 'radius',     label: 'Radius',                 short: '3' },
  { id: 'commodity',  label: 'Commodities',            short: '4' },
  { id: 'historical', label: 'Historical Data',        short: '5' },
  { id: 'lossRuns',   label: 'Loss Runs',              short: '6' },
  { id: 'coverage',   label: 'Coverage Requested',     short: '7' },
  { id: 'safety',     label: 'Safety & Risk',          short: '8' },
  { id: 'drivers',    label: 'Driver Standards',       short: '9' },
  { id: 'history',    label: 'Insurance History',      short: '10' },
  { id: 'filings',    label: 'Filings & Permits',      short: '11' },
  { id: 'additional', label: 'Additional Questions',   short: '12' },
  { id: 'review',     label: 'Review & Notes',         short: '13' },
] as const;

type SectionId = typeof SECTIONS[number]['id'];

export default function TruckingApplicationForm({ existingApp, lead, onClose }: {
  existingApp?: TruckingApplication;
  lead: Lead;
  onClose: () => void;
}) {
  const saveApp = useCRMStore(s => s.saveTruckingApp);

  const initial = useMemo<TruckingApplication>(() => {
    if (existingApp) return existingApp;
    // Pre-fill from lead data
    return buildEmptyApplication(lead.id, {
      insuredName: lead.company,
      dot: lead.dot,
      mc: lead.safer?.mcNumber || '',
      phone: lead.phone,
      email: lead.email,
      contactName: lead.contact,
      contactEmail: lead.email,
      contactPhone: lead.phone,
      yearsInBusiness: lead.years,
      yearEstablished: lead.years > 0 ? new Date().getFullYear() - lead.years : new Date().getFullYear(),
      safetyRating: lead.safer?.safetyRating || 'Not Rated',
      currentCarrier: lead.safer?.insurance?.current || '',
    });
  }, [existingApp, lead]);

  const [app, setApp] = useState<TruckingApplication>(initial);
  const [section, setSection] = useState<SectionId>('insured');
  const [savedToast, setSavedToast] = useState(false);

  const completion = applicationCompletionPercent(app);

  const update = <K extends keyof TruckingApplication>(field: K, value: TruckingApplication[K]) => {
    setApp(p => ({ ...p, [field]: value }));
  };

  const saveDraft = () => {
    saveApp({ ...app, status: 'Draft' });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 1800);
  };

  const markComplete = () => {
    if (completion < 70) {
      if (!confirm(`Application is only ${completion}% complete. Mark complete anyway?`)) return;
    }
    saveApp({ ...app, status: 'Complete' });
    onClose();
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(app, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(app.insuredName || 'trucking-app').replace(/\s+/g, '-')}-application.json`;
    a.click();
  };

  return (
    <Modal title={`Trucking Supplemental Application — ${app.insuredName || lead.company}`} onClose={onClose} width={1100}>
      {/* Top header with completion + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 0', marginBottom: 16, borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Completion</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                width: `${completion}%`, height: '100%',
                background: completion >= 90 ? '#0f766e' : completion >= 60 ? '#2563eb' : completion >= 30 ? '#b45309' : '#9f1239',
                transition: 'width 0.2s',
              }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#1b2a4a', minWidth: 40 }}>{completion}%</span>
          </div>
        </div>
        <div className="flex" style={{ gap: 8 }}>
          {savedToast && <span style={{ fontSize: 11, color: '#0f766e', fontWeight: 600 }}>Saved</span>}
          <button className="btn-s btn-sm" onClick={exportJSON}>Export JSON</button>
          <button className="btn-s" onClick={saveDraft}>Save Draft</button>
          <button className="btn-p" onClick={markComplete}>Mark Complete</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '210px 1fr', gap: 16, minHeight: 500 }}>

        {/* Section nav */}
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: 8, alignSelf: 'start', position: 'sticky', top: 0 }}>
          {SECTIONS.map(s => {
            const active = section === s.id;
            return (
              <button key={s.id} onClick={() => setSection(s.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '8px 10px', marginBottom: 2,
                  background: active ? '#1b2a4a' : 'transparent',
                  color: active ? '#fff' : '#475569',
                  border: 'none', borderRadius: 7,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  textAlign: 'left',
                }}>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: active ? '#fff' : '#e2e8f0',
                  color: active ? '#1b2a4a' : '#64748b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 800, flexShrink: 0,
                }}>{s.short}</span>
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Section content */}
        <div style={{ minWidth: 0 }}>
          {section === 'insured' && <InsuredSection app={app} update={update} />}
          {section === 'operations' && <OperationsSection app={app} update={update} />}
          {section === 'radius' && <RadiusSection app={app} update={update} />}
          {section === 'commodity' && <CommoditiesSection app={app} update={update} />}
          {section === 'historical' && <HistoricalSection app={app} update={update} />}
          {section === 'lossRuns' && <LossRunsSection app={app} update={update} />}
          {section === 'coverage' && <CoverageSection app={app} update={update} />}
          {section === 'safety' && <SafetySection app={app} update={update} />}
          {section === 'drivers' && <DriverStandardsSection app={app} update={update} />}
          {section === 'history' && <InsuranceHistorySection app={app} update={update} />}
          {section === 'filings' && <FilingsSection app={app} update={update} />}
          {section === 'additional' && <AdditionalSection app={app} update={update} />}
          {section === 'review' && <ReviewSection app={app} update={update} />}
        </div>
      </div>
    </Modal>
  );
}

// ─── Reusable section helpers ───────────────────────────────────────────────
function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#1b2a4a' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{subtitle}</div>}
    </div>
  );
}

function FieldGrid({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gap: 12, marginBottom: 14 }}>{children}</div>;
}

function CheckboxRow({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label style={{ display: 'flex', gap: 10, padding: 10, background: '#f8fafc', borderRadius: 8, cursor: 'pointer', marginBottom: 6 }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ accentColor: '#2563eb', width: 16, height: 16, marginTop: 2 }} />
      <div>
        <div style={{ fontWeight: 600, fontSize: 13, color: '#1b2a4a' }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{hint}</div>}
      </div>
    </label>
  );
}

type SectionProps = { app: TruckingApplication; update: <K extends keyof TruckingApplication>(field: K, value: TruckingApplication[K]) => void };

// ─── Section 1: Insured ─────────────────────────────────────────────────────
function InsuredSection({ app, update }: SectionProps) {
  const updateOwner = (idx: number, field: keyof OwnerEntry, value: OwnerEntry[keyof OwnerEntry]) => {
    const owners = [...app.owners];
    owners[idx] = { ...owners[idx], [field]: value };
    update('owners', owners);
  };
  const addOwner = () => update('owners', [...app.owners, { name: '', ownership: 0, drivesTrucks: false }]);
  const removeOwner = (idx: number) => update('owners', app.owners.filter((_, i) => i !== idx));

  return (
    <div>
      <SectionTitle title="Insured Information" subtitle="Legal entity, address, primary contact" />
      <FieldGrid>
        <div><label className="lbl">Legal Name *</label><input className="inp" value={app.insuredName} onChange={e => update('insuredName', e.target.value)} /></div>
        <div><label className="lbl">DBA / Trade Name</label><input className="inp" value={app.dba} onChange={e => update('dba', e.target.value)} /></div>
        <div><label className="lbl">DOT # *</label><input className="inp" value={app.dot} onChange={e => update('dot', e.target.value)} /></div>
        <div><label className="lbl">MC #</label><input className="inp" value={app.mc} onChange={e => update('mc', e.target.value)} /></div>
        <div><label className="lbl">FEIN / EIN</label><input className="inp" value={app.fein} onChange={e => update('fein', e.target.value)} /></div>
        <div><label className="lbl">SCAC Code</label><input className="inp" value={app.scac} onChange={e => update('scac', e.target.value)} /></div>
        <div><label className="lbl">Year Established</label><input className="inp" type="number" value={app.yearEstablished} onChange={e => update('yearEstablished', Number(e.target.value))} /></div>
        <div><label className="lbl">Years in Business</label><input className="inp" type="number" value={app.yearsInBusiness} onChange={e => update('yearsInBusiness', Number(e.target.value))} /></div>
        <div>
          <label className="lbl">Entity Type</label>
          <select className="sel" style={{ width: '100%' }} value={app.entityType} onChange={e => update('entityType', e.target.value as TruckingApplication['entityType'])}>
            <option>LLC</option><option>Corporation</option><option>S-Corporation</option><option>Sole Proprietor</option><option>Partnership</option><option>Other</option>
          </select>
        </div>
        <div><label className="lbl">Website</label><input className="inp" value={app.website} onChange={e => update('website', e.target.value)} /></div>
      </FieldGrid>

      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Physical Address</div>
      <FieldGrid cols={4}>
        <div style={{ gridColumn: 'span 2' }}><label className="lbl">Street</label><input className="inp" value={app.street} onChange={e => update('street', e.target.value)} /></div>
        <div><label className="lbl">City</label><input className="inp" value={app.city} onChange={e => update('city', e.target.value)} /></div>
        <div><label className="lbl">State</label>
          <select className="sel" style={{ width: '100%' }} value={app.state} onChange={e => update('state', e.target.value)}>
            <option value="">—</option>
            {US_STATES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div><label className="lbl">ZIP</label><input className="inp" value={app.zip} onChange={e => update('zip', e.target.value)} /></div>
        <div><label className="lbl">Phone</label><input className="inp" value={app.phone} onChange={e => update('phone', e.target.value)} /></div>
        <div><label className="lbl">Main Email</label><input className="inp" type="email" value={app.email} onChange={e => update('email', e.target.value)} /></div>
      </FieldGrid>

      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Primary Contact</div>
      <FieldGrid cols={4}>
        <div><label className="lbl">Name</label><input className="inp" value={app.contactName} onChange={e => update('contactName', e.target.value)} /></div>
        <div><label className="lbl">Title</label><input className="inp" value={app.contactTitle} onChange={e => update('contactTitle', e.target.value)} /></div>
        <div><label className="lbl">Email</label><input className="inp" type="email" value={app.contactEmail} onChange={e => update('contactEmail', e.target.value)} /></div>
        <div><label className="lbl">Phone</label><input className="inp" value={app.contactPhone} onChange={e => update('contactPhone', e.target.value)} /></div>
      </FieldGrid>

      <div className="flex flex-between" style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Owners / Officers</div>
        <button className="btn-s btn-sm" onClick={addOwner}>+ Add Owner</button>
      </div>
      {app.owners.map((owner, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.4fr auto', gap: 10, marginBottom: 8, padding: 10, background: '#f8fafc', borderRadius: 8 }}>
          <input className="inp" placeholder="Name" value={owner.name} onChange={e => updateOwner(i, 'name', e.target.value)} />
          <div style={{ position: 'relative' }}>
            <input className="inp" type="number" min="0" max="100" value={owner.ownership} onChange={e => updateOwner(i, 'ownership', Number(e.target.value))} style={{ paddingRight: 24 }} />
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#64748b' }}>%</span>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569' }}>
            <input type="checkbox" checked={owner.drivesTrucks} onChange={e => updateOwner(i, 'drivesTrucks', e.target.checked)} style={{ accentColor: '#2563eb' }} />
            Drives trucks
          </label>
          {app.owners.length > 1 && <button className="btn-s btn-sm btn-danger" onClick={() => removeOwner(i)}>×</button>}
        </div>
      ))}
    </div>
  );
}

// ─── Section 2: Operations ──────────────────────────────────────────────────
function OperationsSection({ app, update }: SectionProps) {
  const toggleState = (state: string) => {
    const cur = app.statesOfOperation;
    update('statesOfOperation', cur.includes(state) ? cur.filter(s => s !== state) : [...cur, state]);
  };
  return (
    <div>
      <SectionTitle title="Operations" subtitle="Type of operation, authority, geographic footprint" />

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Operation Type</div>
        <div className="grid grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <CheckboxRow checked={app.forHire} onChange={v => update('forHire', v)} label="For-Hire" hint="Hauls others' goods for compensation" />
          <CheckboxRow checked={app.privateCarrier} onChange={v => update('privateCarrier', v)} label="Private Carrier" hint="Hauls own goods" />
          <CheckboxRow checked={app.ownerOperator} onChange={v => update('ownerOperator', v)} label="Owner-Operator" />
          <CheckboxRow checked={app.household} onChange={v => update('household', v)} label="Household Goods (HHG)" />
          <CheckboxRow checked={app.interstate} onChange={v => update('interstate', v)} label="Interstate" />
          <CheckboxRow checked={app.intrastate} onChange={v => update('intrastate', v)} label="Intrastate" />
        </div>
      </div>

      <FieldGrid>
        <div>
          <label className="lbl">Carrier Authority</label>
          <select className="sel" style={{ width: '100%' }} value={app.carrierAuthority} onChange={e => update('carrierAuthority', e.target.value as TruckingApplication['carrierAuthority'])}>
            <option>Common</option><option>Contract</option><option>Both</option><option>None</option>
          </select>
        </div>
        <div><label className="lbl">Hours of Operation</label><input className="inp" value={app.hoursOfOperation} onChange={e => update('hoursOfOperation', e.target.value)} placeholder="24/7, M-F 6am-6pm, etc." /></div>
      </FieldGrid>

      <div className="grid grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        <CheckboxRow checked={app.hasBrokerAuthority} onChange={v => update('hasBrokerAuthority', v)} label="Has Broker Authority" />
        <CheckboxRow checked={app.hasFreightForwarding} onChange={v => update('hasFreightForwarding', v)} label="Freight Forwarding" />
        <CheckboxRow checked={app.hasWarehousing} onChange={v => update('hasWarehousing', v)} label="Warehousing" />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="lbl">Terminal / Yard Locations</label>
        <textarea className="inp" rows={2} value={app.terminalLocations} onChange={e => update('terminalLocations', e.target.value)} placeholder="List all terminal addresses (city, state)" />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="lbl">Description of Operations *</label>
        <textarea className="inp" rows={4} value={app.descriptionOfOps} onChange={e => update('descriptionOfOps', e.target.value)} placeholder="Describe what your trucks do, who you haul for, typical lanes, etc." />
      </div>

      <div>
        <label className="lbl">States of Operation ({app.statesOfOperation.length} selected)</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 4, marginTop: 6 }}>
          {US_STATES.map(s => {
            const sel = app.statesOfOperation.includes(s);
            return (
              <button key={s} type="button" onClick={() => toggleState(s)}
                style={{ padding: '6px 4px', fontSize: 11, fontWeight: 700, borderRadius: 4,
                  border: `1.5px solid ${sel ? '#2563eb' : '#e2e8f0'}`,
                  background: sel ? '#2563eb' : '#fff', color: sel ? '#fff' : '#475569',
                  cursor: 'pointer' }}>
                {s}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Section 3: Radius ──────────────────────────────────────────────────────
function RadiusSection({ app, update }: SectionProps) {
  const total = sumPercentages(app.radius);
  const ok = total === 100;
  const updateRadius = (idx: number, percentage: number) => {
    const next = [...app.radius];
    next[idx] = { ...next[idx], percentage };
    update('radius', next);
  };
  return (
    <div>
      <SectionTitle title="Radius of Operations" subtitle="Percentage of operations within each mileage band — must total 100%" />

      {app.radius.map((r, i) => (
        <div key={r.range} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 100px', gap: 12, alignItems: 'center', marginBottom: 12, padding: 14, background: '#f8fafc', borderRadius: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1b2a4a' }}>{r.range} miles</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>
              {r.range === '0-100' ? 'Local / short-haul' : r.range === '101-500' ? 'Regional' : 'Long-haul / OTR'}
            </div>
          </div>
          <input type="range" min="0" max="100" step="5" value={r.percentage} onChange={e => updateRadius(i, Number(e.target.value))} style={{ accentColor: '#2563eb' }} />
          <div style={{ position: 'relative' }}>
            <input className="inp" type="number" min="0" max="100" value={r.percentage} onChange={e => updateRadius(i, Math.min(100, Math.max(0, Number(e.target.value))))} style={{ paddingRight: 24, textAlign: 'right' }} />
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#64748b' }}>%</span>
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14, background: ok ? '#f0fdfa' : '#fff1f2', border: `1px solid ${ok ? '#5eead4' : '#fda4af'}`, borderRadius: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: ok ? '#0f766e' : '#9f1239' }}>
          Total: {total}%
        </div>
        <div style={{ fontSize: 12, color: ok ? '#0f766e' : '#9f1239' }}>
          {ok ? 'Looks good' : `Need to adjust by ${100 - total}%`}
        </div>
      </div>
    </div>
  );
}

// ─── Section 4: Commodities ─────────────────────────────────────────────────
function CommoditiesSection({ app, update }: SectionProps) {
  const total = sumPercentages(app.commodities);
  const ok = total === 100;

  const updateCommodity = (idx: number, field: keyof CommodityEntry, value: string | number) => {
    const next = [...app.commodities];
    next[idx] = { ...next[idx], [field]: value };
    update('commodities', next);
  };
  const addCommodity = () => update('commodities', [...app.commodities, { commodity: 'Other', percentage: 0 }]);
  const removeCommodity = (idx: number) => update('commodities', app.commodities.filter((_, i) => i !== idx));

  return (
    <div>
      <SectionTitle title="Commodities Hauled" subtitle="Specific cargo types with percentage breakdown — must total 100%" />

      {app.commodities.map((c, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 80px auto', gap: 10, marginBottom: 8, alignItems: 'center', padding: 8, background: '#f8fafc', borderRadius: 8 }}>
          <select className="sel" style={{ width: '100%' }} value={c.commodity} onChange={e => updateCommodity(i, 'commodity', e.target.value)}>
            {COMMODITY_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
          </select>
          <input type="range" min="0" max="100" step="5" value={c.percentage} onChange={e => updateCommodity(i, 'percentage', Number(e.target.value))} style={{ accentColor: '#2563eb' }} />
          <div style={{ position: 'relative' }}>
            <input className="inp" type="number" min="0" max="100" value={c.percentage} onChange={e => updateCommodity(i, 'percentage', Math.min(100, Math.max(0, Number(e.target.value))))} style={{ paddingRight: 22, textAlign: 'right' }} />
            <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#64748b' }}>%</span>
          </div>
          <button className="btn-s btn-sm btn-danger" onClick={() => removeCommodity(i)} disabled={app.commodities.length === 1}>×</button>
        </div>
      ))}

      <button className="btn-s btn-sm" onClick={addCommodity} style={{ marginBottom: 14 }}>+ Add Commodity</button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14, background: ok ? '#f0fdfa' : '#fff1f2', border: `1px solid ${ok ? '#5eead4' : '#fda4af'}`, borderRadius: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: ok ? '#0f766e' : '#9f1239' }}>Total: {total}%</div>
        <div style={{ fontSize: 12, color: ok ? '#0f766e' : '#9f1239' }}>{ok ? 'Looks good' : `Need to adjust by ${100 - total}%`}</div>
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Special Commodities</div>
      <FieldGrid>
        <CheckboxRow checked={app.haulsHazmat} onChange={v => update('haulsHazmat', v)} label="Hauls Hazmat" />
        <CheckboxRow checked={app.haulsRefrigerated} onChange={v => update('haulsRefrigerated', v)} label="Refrigerated freight" />
        <CheckboxRow checked={app.haulsOversize} onChange={v => update('haulsOversize', v)} label="Oversize / overweight" />
      </FieldGrid>

      {app.haulsHazmat && (
        <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <FieldGrid>
            <div><label className="lbl">Hazmat Types / Classes</label><input className="inp" value={app.hazmatTypes} onChange={e => update('hazmatTypes', e.target.value)} placeholder="e.g. Class 3 Flammable Liquids, Class 8 Corrosives" /></div>
            <div><label className="lbl">% of operations Hazmat</label>
              <div style={{ position: 'relative' }}>
                <input className="inp" type="number" min="0" max="100" value={app.hazmatPercentage} onChange={e => update('hazmatPercentage', Number(e.target.value))} style={{ paddingRight: 22 }} />
                <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#64748b' }}>%</span>
              </div>
            </div>
          </FieldGrid>
        </div>
      )}
    </div>
  );
}

// ─── Section 5: Historical Data ─────────────────────────────────────────────
function HistoricalSection({ app, update }: SectionProps) {
  const updateRow = (year: number, field: keyof HistoricalYear, value: number | string) => {
    update('historical', app.historical.map(h => h.year === year ? { ...h, [field]: value } : h));
  };
  return (
    <div>
      <SectionTitle title="Historical Data" subtitle="Unit count, driver count, revenue, total insured value (TIV), and mileage for the current and past 5 years" />

      <div style={{ overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ background: '#1b2a4a', color: '#fff' }}>
            <tr>
              <th style={{ padding: 10, textAlign: 'left', fontSize: 11, fontWeight: 700 }}>Year</th>
              <th style={{ padding: 10, textAlign: 'right', fontSize: 11, fontWeight: 700 }}>Units</th>
              <th style={{ padding: 10, textAlign: 'right', fontSize: 11, fontWeight: 700 }}>Drivers</th>
              <th style={{ padding: 10, textAlign: 'right', fontSize: 11, fontWeight: 700 }}>Revenue</th>
              <th style={{ padding: 10, textAlign: 'right', fontSize: 11, fontWeight: 700 }}>TIV</th>
              <th style={{ padding: 10, textAlign: 'right', fontSize: 11, fontWeight: 700 }}>Mileage</th>
              <th style={{ padding: 10, textAlign: 'left', fontSize: 11, fontWeight: 700 }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {app.historical.map((h, idx) => (
              <tr key={h.year} style={{ borderTop: '1px solid #f1f5f9', background: idx === 0 ? '#eff6ff' : '#fff' }}>
                <td style={{ padding: 8, fontWeight: 700, color: '#1b2a4a' }}>
                  {h.year}{idx === 0 && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: '#2563eb' }}>CURRENT</span>}
                </td>
                <td style={{ padding: 4 }}><input className="inp" type="number" min="0" value={h.unitCount || ''} onChange={e => updateRow(h.year, 'unitCount', Number(e.target.value))} style={{ textAlign: 'right' }} /></td>
                <td style={{ padding: 4 }}><input className="inp" type="number" min="0" value={h.driverCount || ''} onChange={e => updateRow(h.year, 'driverCount', Number(e.target.value))} style={{ textAlign: 'right' }} /></td>
                <td style={{ padding: 4 }}><input className="inp" type="number" min="0" value={h.revenue || ''} onChange={e => updateRow(h.year, 'revenue', Number(e.target.value))} style={{ textAlign: 'right' }} placeholder="$" /></td>
                <td style={{ padding: 4 }}><input className="inp" type="number" min="0" value={h.tiv || ''} onChange={e => updateRow(h.year, 'tiv', Number(e.target.value))} style={{ textAlign: 'right' }} placeholder="$" /></td>
                <td style={{ padding: 4 }}><input className="inp" type="number" min="0" value={h.mileage || ''} onChange={e => updateRow(h.year, 'mileage', Number(e.target.value))} style={{ textAlign: 'right' }} placeholder="mi" /></td>
                <td style={{ padding: 4 }}><input className="inp" value={h.notes} onChange={e => updateRow(h.year, 'notes', e.target.value)} /></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
              <td style={{ padding: 8, fontWeight: 700, color: '#64748b', fontSize: 11 }}>6-YR AVG</td>
              <td style={{ padding: 8, textAlign: 'right', fontWeight: 700, color: '#1b2a4a' }}>
                {Math.round(app.historical.reduce((s, h) => s + h.unitCount, 0) / app.historical.length)}
              </td>
              <td style={{ padding: 8, textAlign: 'right', fontWeight: 700, color: '#1b2a4a' }}>
                {Math.round(app.historical.reduce((s, h) => s + h.driverCount, 0) / app.historical.length)}
              </td>
              <td style={{ padding: 8, textAlign: 'right', fontWeight: 700, color: '#0f766e' }}>
                {fmt$(Math.round(app.historical.reduce((s, h) => s + h.revenue, 0) / app.historical.length))}
              </td>
              <td style={{ padding: 8, textAlign: 'right', fontWeight: 700, color: '#0f766e' }}>
                {fmt$(Math.round(app.historical.reduce((s, h) => s + h.tiv, 0) / app.historical.length))}
              </td>
              <td style={{ padding: 8, textAlign: 'right', fontWeight: 700, color: '#1b2a4a' }}>
                {Math.round(app.historical.reduce((s, h) => s + h.mileage, 0) / app.historical.length).toLocaleString()}
              </td>
              <td style={{ padding: 8 }} />
            </tr>
          </tfoot>
        </table>
      </div>
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
        Tip: Revenue and TIV are dollar amounts. Mileage is total fleet miles for the year. Leave fields blank for years before the company existed.
      </div>
    </div>
  );
}

// ─── Section 6: Loss Runs (per line) ────────────────────────────────────────
function LossRunsSection({ app, update }: SectionProps) {
  const [activeLine, setActiveLine] = useState<CoverageLine>('autoLiability');

  const lineLabels: Record<CoverageLine, string> = {
    autoLiability: 'Auto Liability',
    physicalDamage: 'Physical Damage',
    motorTruckCargo: 'Motor Truck Cargo',
    generalLiability: 'General Liability',
  };

  const updateRow = (line: CoverageLine, year: number, field: keyof LossRunYear, value: string | number) => {
    const arr = app.lossRuns[line].map(l => l.year === year ? { ...l, [field]: value } : l);
    update('lossRuns', { ...app.lossRuns, [line]: arr });
  };

  const lineRuns = app.lossRuns[activeLine];
  const totalIncurred = lineRuns.reduce((s, l) => s + l.totalIncurred, 0);
  const totalPaid = lineRuns.reduce((s, l) => s + l.totalPaid, 0);
  const totalClaims = lineRuns.reduce((s, l) => s + l.numClaims, 0);
  const openReserves = lineRuns.reduce((s, l) => s + l.openReserves, 0);

  return (
    <div>
      <SectionTitle title="Loss Runs by Line" subtitle="Claims history per coverage line for the current and past 5 years" />

      {/* Line tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, borderBottom: '1px solid #e2e8f0', overflowX: 'auto' }}>
        {(Object.keys(lineLabels) as CoverageLine[]).map(line => {
          const lineTotal = app.lossRuns[line].reduce((s, l) => s + l.numClaims, 0);
          const isActive = activeLine === line;
          return (
            <button key={line} onClick={() => setActiveLine(line)}
              style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700,
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: `3px solid ${isActive ? '#2563eb' : 'transparent'}`,
                color: isActive ? '#2563eb' : '#64748b', whiteSpace: 'nowrap', marginBottom: -1 }}>
              {lineLabels[line]}
              {lineTotal > 0 && <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 6px', borderRadius: 100, background: '#fef3c7', color: '#92400e' }}>{lineTotal}</span>}
            </button>
          );
        })}
      </div>

      {/* Per-line summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
        <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Claims</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#1b2a4a' }}>{totalClaims}</div>
        </div>
        <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Incurred</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#9f1239' }}>{fmt$(totalIncurred)}</div>
        </div>
        <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Paid</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#b45309' }}>{fmt$(totalPaid)}</div>
        </div>
        <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Open Reserves</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#92400e' }}>{fmt$(openReserves)}</div>
        </div>
      </div>

      {/* Loss runs table */}
      <div style={{ overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ background: '#1b2a4a', color: '#fff' }}>
            <tr>
              <th style={{ padding: 10, textAlign: 'left', fontSize: 11, fontWeight: 700 }}>Year</th>
              <th style={{ padding: 10, textAlign: 'left', fontSize: 11, fontWeight: 700 }}>Carrier</th>
              <th style={{ padding: 10, textAlign: 'left', fontSize: 11, fontWeight: 700 }}>Policy #</th>
              <th style={{ padding: 10, textAlign: 'right', fontSize: 11, fontWeight: 700 }}>Premium</th>
              <th style={{ padding: 10, textAlign: 'right', fontSize: 11, fontWeight: 700 }}># Claims</th>
              <th style={{ padding: 10, textAlign: 'right', fontSize: 11, fontWeight: 700 }}>Incurred</th>
              <th style={{ padding: 10, textAlign: 'right', fontSize: 11, fontWeight: 700 }}>Paid</th>
              <th style={{ padding: 10, textAlign: 'right', fontSize: 11, fontWeight: 700 }}>Open</th>
              <th style={{ padding: 10, textAlign: 'right', fontSize: 11, fontWeight: 700 }}>Largest</th>
            </tr>
          </thead>
          <tbody>
            {lineRuns.map((l, idx) => (
              <tr key={l.year} style={{ borderTop: '1px solid #f1f5f9', background: idx === 0 ? '#eff6ff' : '#fff' }}>
                <td style={{ padding: 6, fontWeight: 700, color: '#1b2a4a' }}>
                  {l.year}{idx === 0 && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: '#2563eb' }}>CURRENT</span>}
                </td>
                <td style={{ padding: 4 }}><input className="inp" value={l.carrier} onChange={e => updateRow(activeLine, l.year, 'carrier', e.target.value)} placeholder="Insurer" /></td>
                <td style={{ padding: 4 }}><input className="inp" value={l.policyNumber} onChange={e => updateRow(activeLine, l.year, 'policyNumber', e.target.value)} /></td>
                <td style={{ padding: 4 }}><input className="inp" type="number" value={l.premium || ''} onChange={e => updateRow(activeLine, l.year, 'premium', Number(e.target.value))} style={{ textAlign: 'right' }} /></td>
                <td style={{ padding: 4 }}><input className="inp" type="number" min="0" value={l.numClaims || ''} onChange={e => updateRow(activeLine, l.year, 'numClaims', Number(e.target.value))} style={{ textAlign: 'right' }} /></td>
                <td style={{ padding: 4 }}><input className="inp" type="number" min="0" value={l.totalIncurred || ''} onChange={e => updateRow(activeLine, l.year, 'totalIncurred', Number(e.target.value))} style={{ textAlign: 'right' }} /></td>
                <td style={{ padding: 4 }}><input className="inp" type="number" min="0" value={l.totalPaid || ''} onChange={e => updateRow(activeLine, l.year, 'totalPaid', Number(e.target.value))} style={{ textAlign: 'right' }} /></td>
                <td style={{ padding: 4 }}><input className="inp" type="number" min="0" value={l.openReserves || ''} onChange={e => updateRow(activeLine, l.year, 'openReserves', Number(e.target.value))} style={{ textAlign: 'right' }} /></td>
                <td style={{ padding: 4 }}><input className="inp" type="number" min="0" value={l.largestClaim || ''} onChange={e => updateRow(activeLine, l.year, 'largestClaim', Number(e.target.value))} style={{ textAlign: 'right' }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
        Loss ratio for {lineLabels[activeLine]}: <b>{lineRuns.reduce((s, l) => s + l.premium, 0) > 0 ? Math.round((totalIncurred / lineRuns.reduce((s, l) => s + l.premium, 0)) * 100) : 0}%</b> (incurred ÷ premium across all years)
      </div>
    </div>
  );
}

// ─── Section 7: Coverage Requested ──────────────────────────────────────────
function CoverageSection({ app, update }: SectionProps) {
  const lines: { key: keyof TruckingApplication['coverage']; label: string; hasLimit?: boolean; hasDeductible?: boolean }[] = [
    { key: 'autoLiability',        label: 'Commercial Auto Liability', hasLimit: true },
    { key: 'physicalDamage',       label: 'Physical Damage', hasDeductible: true },
    { key: 'motorTruckCargo',      label: 'Motor Truck Cargo', hasLimit: true },
    { key: 'generalLiability',     label: 'General Liability', hasLimit: true },
    { key: 'workersComp',          label: 'Workers Compensation' },
    { key: 'umbrella',             label: 'Umbrella / Excess', hasLimit: true },
    { key: 'nonTruckingLiability', label: 'Non-Trucking Liability', hasLimit: true },
    { key: 'trailerInterchange',   label: 'Trailer Interchange', hasLimit: true },
    { key: 'reeferBreakdown',      label: 'Reefer Breakdown', hasLimit: true },
    { key: 'occupationalAccident', label: 'Occupational Accident' },
  ];
  const updateCov = (key: keyof TruckingApplication['coverage'], field: keyof TruckingApplication['coverage']['autoLiability'], value: boolean | number | string) => {
    update('coverage', { ...app.coverage, [key]: { ...app.coverage[key], [field]: value } });
  };
  return (
    <div>
      <SectionTitle title="Coverage Requested" subtitle="Indicate which coverages are being requested with limits and deductibles" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {lines.map(l => {
          const c = app.coverage[l.key];
          return (
            <div key={l.key} style={{ padding: 12, background: c.requested ? '#eff6ff' : '#f8fafc', border: `1.5px solid ${c.requested ? '#2563eb' : '#e2e8f0'}`, borderRadius: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, cursor: 'pointer' }}>
                  <input type="checkbox" checked={c.requested} onChange={e => updateCov(l.key, 'requested', e.target.checked)} style={{ accentColor: '#2563eb', width: 16, height: 16 }} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#1b2a4a' }}>{l.label}</span>
                </label>
                {c.requested && l.hasLimit && (
                  <div>
                    <input className="inp" type="number" placeholder="Limit ($)" value={c.limit ?? ''} onChange={e => updateCov(l.key, 'limit', Number(e.target.value))} style={{ width: 150 }} />
                  </div>
                )}
                {c.requested && l.hasDeductible && (
                  <div>
                    <input className="inp" type="number" placeholder="Deductible ($)" value={c.deductible ?? ''} onChange={e => updateCov(l.key, 'deductible', Number(e.target.value))} style={{ width: 150 }} />
                  </div>
                )}
                {c.requested && (
                  <input className="inp" type="date" placeholder="Effective" value={c.effectiveDate ?? ''} onChange={e => updateCov(l.key, 'effectiveDate', e.target.value)} style={{ width: 160 }} />
                )}
              </div>
              {c.requested && (
                <input className="inp" placeholder="Notes (optional — endorsements, special requirements)" value={c.notes ?? ''} onChange={e => updateCov(l.key, 'notes', e.target.value)} style={{ marginTop: 8, fontSize: 12 }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Section 8: Safety & Risk ───────────────────────────────────────────────
function SafetySection({ app, update }: SectionProps) {
  return (
    <div>
      <SectionTitle title="Safety & Risk Management" subtitle="Telematics, monitoring, drug testing, and safety programs" />
      <FieldGrid>
        <div><label className="lbl">FMCSA Safety Rating</label>
          <select className="sel" style={{ width: '100%' }} value={app.safetyRating} onChange={e => update('safetyRating', e.target.value)}>
            <option>Not Rated</option><option>Satisfactory</option><option>Conditional</option><option>Unsatisfactory</option>
          </select>
        </div>
        <div><label className="lbl">Safety Rating Date</label><input className="inp" type="date" value={app.safetyRatingDate} onChange={e => update('safetyRatingDate', e.target.value)} /></div>
      </FieldGrid>

      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Telematics & Monitoring</div>
      <FieldGrid>
        <CheckboxRow checked={app.hasELD} onChange={v => update('hasELD', v)} label="Electronic Logging Devices (ELD)" />
        <div>
          <label className="lbl">ELD Provider</label>
          <input className="inp" value={app.eldProvider} onChange={e => update('eldProvider', e.target.value)} placeholder="e.g. Samsara, Motive, Geotab" />
        </div>
        <CheckboxRow checked={app.hasGPS} onChange={v => update('hasGPS', v)} label="GPS Fleet Tracking" />
        <div>
          <label className="lbl">GPS Provider</label>
          <input className="inp" value={app.gpsProvider} onChange={e => update('gpsProvider', e.target.value)} />
        </div>
        <CheckboxRow checked={app.hasForwardCamera} onChange={v => update('hasForwardCamera', v)} label="Forward-Facing Cameras" />
        <div>
          <label className="lbl">Camera Provider</label>
          <input className="inp" value={app.forwardCameraProvider} onChange={e => update('forwardCameraProvider', e.target.value)} placeholder="e.g. Lytx, SmartDrive, Nauto" />
        </div>
        <CheckboxRow checked={app.hasInCabCamera} onChange={v => update('hasInCabCamera', v)} label="In-Cab Driver-Facing Cameras" />
        <div>
          <label className="lbl">Provider</label>
          <input className="inp" value={app.inCabCameraProvider} onChange={e => update('inCabCameraProvider', e.target.value)} />
        </div>
        <CheckboxRow checked={app.hasSpeedLimiters} onChange={v => update('hasSpeedLimiters', v)} label="Speed Limiters Installed" />
        <div>
          <label className="lbl">Speed Limit (mph)</label>
          <input className="inp" type="number" min="55" max="80" value={app.speedLimit} onChange={e => update('speedLimit', Number(e.target.value))} />
        </div>
      </FieldGrid>

      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Maintenance & Compliance</div>
      <FieldGrid>
        <CheckboxRow checked={app.hasMaintenanceProgram} onChange={v => update('hasMaintenanceProgram', v)} label="Formal Maintenance Program" />
        <div>
          <label className="lbl">PM Frequency</label>
          <input className="inp" value={app.maintenanceFrequency} onChange={e => update('maintenanceFrequency', e.target.value)} placeholder="e.g. every 10K miles, monthly inspections" />
        </div>
        <CheckboxRow checked={app.hasDriverTraining} onChange={v => update('hasDriverTraining', v)} label="Driver Training Program" />
        <div>
          <label className="lbl">Training Description</label>
          <input className="inp" value={app.driverTrainingDescription} onChange={e => update('driverTrainingDescription', e.target.value)} placeholder="Smith System, JJ Keller, in-house, etc." />
        </div>
      </FieldGrid>

      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Drug & Alcohol</div>
      <FieldGrid>
        <CheckboxRow checked={app.drugAlcoholProgram} onChange={v => update('drugAlcoholProgram', v)} label="DOT-Compliant Drug & Alcohol Program" />
        <div>
          <label className="lbl">Testing Provider / Consortium</label>
          <input className="inp" value={app.drugTestingProvider} onChange={e => update('drugTestingProvider', e.target.value)} placeholder="DISA, eScreen, etc." />
        </div>
        <CheckboxRow checked={app.preEmploymentScreening} onChange={v => update('preEmploymentScreening', v)} label="Pre-employment screening" />
        <div>
          <label className="lbl">Random Testing %</label>
          <div style={{ position: 'relative' }}>
            <input className="inp" type="number" min="0" max="100" value={app.randomTestingPercent} onChange={e => update('randomTestingPercent', Number(e.target.value))} style={{ paddingRight: 22 }} />
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#64748b' }}>%</span>
          </div>
        </div>
      </FieldGrid>
    </div>
  );
}

// ─── Section 9: Driver Standards ────────────────────────────────────────────
function DriverStandardsSection({ app, update }: SectionProps) {
  return (
    <div>
      <SectionTitle title="Driver Hiring Standards" subtitle="Minimum age, experience, MVR criteria, and disqualifying violations" />
      <FieldGrid>
        <div><label className="lbl">Minimum Age</label><input className="inp" type="number" min="18" max="80" value={app.driverMinAge} onChange={e => update('driverMinAge', Number(e.target.value))} /></div>
        <div><label className="lbl">Minimum Experience (years)</label><input className="inp" type="number" min="0" max="50" value={app.driverMinExperience} onChange={e => update('driverMinExperience', Number(e.target.value))} /></div>
        <div><label className="lbl">Max Accidents (3 yr)</label><input className="inp" type="number" min="0" value={app.driverMaxAccidents3yr} onChange={e => update('driverMaxAccidents3yr', Number(e.target.value))} /></div>
        <div><label className="lbl">Max Violations (3 yr)</label><input className="inp" type="number" min="0" value={app.driverMaxViolations3yr} onChange={e => update('driverMaxViolations3yr', Number(e.target.value))} /></div>
        <div><label className="lbl">DUI Policy</label>
          <select className="sel" style={{ width: '100%' }} value={app.duiPolicy} onChange={e => update('duiPolicy', e.target.value as TruckingApplication['duiPolicy'])}>
            <option>Never Allowed</option><option>5+ Years Ago</option><option>7+ Years Ago</option><option>10+ Years Ago</option><option>Other</option>
          </select>
        </div>
        <div><label className="lbl">MVR Review Frequency</label>
          <select className="sel" style={{ width: '100%' }} value={app.mvrReviewFrequency} onChange={e => update('mvrReviewFrequency', e.target.value as TruckingApplication['mvrReviewFrequency'])}>
            <option>Annual</option><option>Semi-annual</option><option>Quarterly</option><option>Monthly</option><option>Other</option>
          </select>
        </div>
        <div><label className="lbl">Avg Driver Tenure (years)</label><input className="inp" type="number" min="0" step="0.1" value={app.averageDriverTenure} onChange={e => update('averageDriverTenure', Number(e.target.value))} /></div>
        <div>
          <label className="lbl">Annual Turnover %</label>
          <div style={{ position: 'relative' }}>
            <input className="inp" type="number" min="0" max="200" value={app.driverTurnoverPercent} onChange={e => update('driverTurnoverPercent', Number(e.target.value))} style={{ paddingRight: 22 }} />
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#64748b' }}>%</span>
          </div>
        </div>
      </FieldGrid>
      <div>
        <label className="lbl">Automatic Disqualifications</label>
        <textarea className="inp" rows={3} value={app.rejectsBackground} onChange={e => update('rejectsBackground', e.target.value)} placeholder="e.g. Felony convictions, DUIs in last 5 years, license suspensions, hours-of-service violations..." />
      </div>
    </div>
  );
}

// ─── Section 10: Insurance History ──────────────────────────────────────────
function InsuranceHistorySection({ app, update }: SectionProps) {
  const updatePrior = (idx: number, field: keyof PriorCarrierEntry, value: string | number | boolean) => {
    update('priorCarriers', app.priorCarriers.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };
  const addPrior = () => update('priorCarriers', [...app.priorCarriers, { carrier: '', year: new Date().getFullYear() - 1, reason: '', cancellation: false }]);
  const removePrior = (idx: number) => update('priorCarriers', app.priorCarriers.filter((_, i) => i !== idx));

  return (
    <div>
      <SectionTitle title="Insurance History" subtitle="Current and prior carriers, cancellations, lapses" />

      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Current Coverage</div>
      <FieldGrid>
        <div><label className="lbl">Current Carrier</label><input className="inp" value={app.currentCarrier} onChange={e => update('currentCarrier', e.target.value)} /></div>
        <div><label className="lbl">Current Premium</label><input className="inp" type="number" value={app.currentPremium} onChange={e => update('currentPremium', Number(e.target.value))} /></div>
        <div><label className="lbl">Effective Date</label><input className="inp" type="date" value={app.currentEffective} onChange={e => update('currentEffective', e.target.value)} /></div>
        <div><label className="lbl">Expiration Date</label><input className="inp" type="date" value={app.currentExpiration} onChange={e => update('currentExpiration', e.target.value)} /></div>
      </FieldGrid>

      <div className="flex flex-between" style={{ marginTop: 8, marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Prior Carriers (last 5 years)</div>
        <button className="btn-s btn-sm" onClick={addPrior}>+ Add Prior Carrier</button>
      </div>
      {app.priorCarriers.length === 0 && <div style={{ fontSize: 12, color: '#94a3b8', padding: 14, textAlign: 'center', background: '#f8fafc', borderRadius: 8, marginBottom: 14 }}>No prior carriers listed.</div>}
      {app.priorCarriers.map((p, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr 1.6fr auto auto', gap: 8, marginBottom: 6, alignItems: 'center', padding: 8, background: '#f8fafc', borderRadius: 8 }}>
          <input className="inp" placeholder="Carrier" value={p.carrier} onChange={e => updatePrior(i, 'carrier', e.target.value)} />
          <input className="inp" type="number" placeholder="Year" value={p.year} onChange={e => updatePrior(i, 'year', Number(e.target.value))} />
          <input className="inp" placeholder="Reason for change" value={p.reason} onChange={e => updatePrior(i, 'reason', e.target.value)} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#475569' }}>
            <input type="checkbox" checked={p.cancellation} onChange={e => updatePrior(i, 'cancellation', e.target.checked)} style={{ accentColor: '#2563eb' }} /> Cancelled
          </label>
          <button className="btn-s btn-sm btn-danger" onClick={() => removePrior(i)}>×</button>
        </div>
      ))}

      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 14, marginBottom: 8 }}>Last 5 Years</div>
      <FieldGrid>
        <CheckboxRow checked={app.hasCancellationsLast5} onChange={v => update('hasCancellationsLast5', v)} label="Has cancellations" />
        <CheckboxRow checked={app.hasNonRenewalsLast5} onChange={v => update('hasNonRenewalsLast5', v)} label="Has non-renewals" />
        <CheckboxRow checked={app.hasLapsesLast5} onChange={v => update('hasLapsesLast5', v)} label="Has coverage lapses" />
      </FieldGrid>
      {(app.hasCancellationsLast5 || app.hasNonRenewalsLast5 || app.hasLapsesLast5) && (
        <FieldGrid>
          {app.hasCancellationsLast5 && <div style={{ gridColumn: 'span 2' }}><label className="lbl">Cancellation Details</label><textarea className="inp" rows={2} value={app.cancellationDetails} onChange={e => update('cancellationDetails', e.target.value)} /></div>}
          {app.hasNonRenewalsLast5 && <div style={{ gridColumn: 'span 2' }}><label className="lbl">Non-Renewal Details</label><textarea className="inp" rows={2} value={app.nonRenewalDetails} onChange={e => update('nonRenewalDetails', e.target.value)} /></div>}
          {app.hasLapsesLast5 && <div style={{ gridColumn: 'span 2' }}><label className="lbl">Lapse Details</label><textarea className="inp" rows={2} value={app.lapseDetails} onChange={e => update('lapseDetails', e.target.value)} /></div>}
        </FieldGrid>
      )}
    </div>
  );
}

// ─── Section 11: Filings ────────────────────────────────────────────────────
function FilingsSection({ app, update }: SectionProps) {
  return (
    <div>
      <SectionTitle title="Filings & Permits" subtitle="State registrations, surety bonds, federal filings" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <CheckboxRow checked={app.hasMC} onChange={v => update('hasMC', v)} label="MC Authority" hint="FMCSA operating authority" />
        <CheckboxRow checked={app.hasIRP} onChange={v => update('hasIRP', v)} label="IRP Registration" hint="International Registration Plan apportioned plates" />
        <CheckboxRow checked={app.hasIFTA} onChange={v => update('hasIFTA', v)} label="IFTA License" hint="International Fuel Tax Agreement" />
        <CheckboxRow checked={app.hasUCR} onChange={v => update('hasUCR', v)} label="UCR Filing" hint="Unified Carrier Registration" />
        <CheckboxRow checked={app.hasFormE} onChange={v => update('hasFormE', v)} label="Form E (Cargo)" hint="Cargo insurance filing" />
        <CheckboxRow checked={app.hasFormK} onChange={v => update('hasFormK', v)} label="Form K (Liability)" hint="Liability insurance filing" />
        <CheckboxRow checked={app.hasBMC91} onChange={v => update('hasBMC91', v)} label="BMC-91 / 91X" hint="For-hire surety bond" />
        <CheckboxRow checked={app.hasBMC32} onChange={v => update('hasBMC32', v)} label="BMC-32" hint="Cargo surety filing" />
        <CheckboxRow checked={app.hasMCS90} onChange={v => update('hasMCS90', v)} label="MCS-90 Endorsement" hint="Hazmat surety endorsement" />
      </div>
      <div style={{ marginTop: 14 }}>
        <label className="lbl">Operating Authority Status / Notes</label>
        <textarea className="inp" rows={3} value={app.oqStatus} onChange={e => update('oqStatus', e.target.value)} placeholder="Active, suspended, pending, etc. — note any issues with FMCSA filings." />
      </div>
    </div>
  );
}

// ─── Section 12: Additional ─────────────────────────────────────────────────
function AdditionalSection({ app, update }: SectionProps) {
  return (
    <div>
      <SectionTitle title="Additional Underwriting Questions" subtitle="Subhaulers, owner-operators, and operational specifics" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        <CheckboxRow checked={app.hasSubhaulers} onChange={v => update('hasSubhaulers', v)} label="Uses Subhaulers" hint="Hires other carriers to haul loads" />
        <CheckboxRow checked={app.hasSCACCode} onChange={v => update('hasSCACCode', v)} label="Has SCAC Code" />
      </div>

      <FieldGrid>
        {app.hasSubhaulers && <div><label className="lbl"># Subhaulers Used</label><input className="inp" type="number" min="0" value={app.subhaulerCount} onChange={e => update('subhaulerCount', Number(e.target.value))} /></div>}
        <div><label className="lbl"># Owner-Operators Leased to Carrier</label><input className="inp" type="number" min="0" value={app.ooLeasedCount} onChange={e => update('ooLeasedCount', Number(e.target.value))} /></div>
      </FieldGrid>

      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>What does the insured haul?</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        <CheckboxRow checked={app.haulsOwnGoods} onChange={v => update('haulsOwnGoods', v)} label="Hauls own goods (private)" />
        <CheckboxRow checked={app.haulsOthersGoods} onChange={v => update('haulsOthersGoods', v)} label="Hauls others' goods (for-hire)" />
      </div>

      <FieldGrid>
        <div>
          <label className="lbl">Loading Process</label>
          <select className="sel" style={{ width: '100%' }} value={app.loadingProcess} onChange={e => update('loadingProcess', e.target.value)}>
            <option value="">— Select —</option>
            <option>Shipper-loaded</option>
            <option>Carrier-loaded</option>
            <option>Both</option>
            <option>Drop & hook (no live load)</option>
          </select>
        </div>
      </FieldGrid>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        <CheckboxRow checked={app.hasLoadingDock} onChange={v => update('hasLoadingDock', v)} label="Has loading dock at terminal" />
        <CheckboxRow checked={app.hasYard} onChange={v => update('hasYard', v)} label="Has secure yard for trucks/trailers" />
      </div>

      {app.hasYard && (
        <FieldGrid>
          <div><label className="lbl">Yard Size / Description</label><input className="inp" value={app.yardSize} onChange={e => update('yardSize', e.target.value)} placeholder="e.g. 5 acres fenced, 24/7 security" /></div>
        </FieldGrid>
      )}
    </div>
  );
}

// ─── Section 13: Review & Submit ────────────────────────────────────────────
function ReviewSection({ app, update }: SectionProps) {
  const completion = applicationCompletionPercent(app);

  // Quick-check summary table
  const lossTotal = (Object.keys(app.lossRuns) as CoverageLine[]).reduce((s, line) => {
    return s + app.lossRuns[line].reduce((ss, l) => ss + l.totalIncurred, 0);
  }, 0);

  const histRow = app.historical[0];

  return (
    <div>
      <SectionTitle title="Review & Submit" subtitle="Final notes and a snapshot of what you're sending the underwriter" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
        <SummaryStat label="Completion" value={`${completion}%`} color="#2563eb" />
        <SummaryStat label="Current Units" value={String(histRow.unitCount || 0)} color="#0f766e" />
        <SummaryStat label="Current Revenue" value={fmt$(histRow.revenue || 0)} color="#0f766e" />
        <SummaryStat label="Total Incurred (5yr)" value={fmt$(lossTotal)} color="#9f1239" />
      </div>

      <div className="panel" style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#1b2a4a', marginBottom: 8 }}>Snapshot</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: 6, color: '#64748b', width: 200 }}>Insured</td><td style={{ padding: 6, fontWeight: 600 }}>{app.insuredName} {app.dba && `dba ${app.dba}`}</td></tr>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: 6, color: '#64748b' }}>DOT / MC</td><td style={{ padding: 6, fontWeight: 600 }}>DOT# {app.dot} · MC-{app.mc || 'N/A'}</td></tr>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: 6, color: '#64748b' }}>Years in Business</td><td style={{ padding: 6, fontWeight: 600 }}>{app.yearsInBusiness} years (est. {app.yearEstablished})</td></tr>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: 6, color: '#64748b' }}>Operations</td><td style={{ padding: 6, fontWeight: 600 }}>
              {[app.forHire && 'For-hire', app.privateCarrier && 'Private', app.ownerOperator && 'O/O', app.interstate && 'Interstate', app.intrastate && 'Intrastate'].filter(Boolean).join(' · ')}
            </td></tr>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: 6, color: '#64748b' }}>States</td><td style={{ padding: 6, fontWeight: 600 }}>{app.statesOfOperation.length} states {app.statesOfOperation.length > 0 && `· ${app.statesOfOperation.join(', ')}`}</td></tr>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: 6, color: '#64748b' }}>Top commodity</td><td style={{ padding: 6, fontWeight: 600 }}>{app.commodities[0]?.commodity} ({app.commodities[0]?.percentage}%)</td></tr>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: 6, color: '#64748b' }}>Hazmat</td><td style={{ padding: 6, fontWeight: 600 }}>{app.haulsHazmat ? `Yes — ${app.hazmatPercentage}%` : 'No'}</td></tr>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: 6, color: '#64748b' }}>Coverage requested</td><td style={{ padding: 6, fontWeight: 600 }}>
              {Object.entries(app.coverage).filter(([, v]) => v.requested).map(([k]) => k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim()).join(', ')}
            </td></tr>
            <tr><td style={{ padding: 6, color: '#64748b' }}>Loss runs total (5yr)</td><td style={{ padding: 6, fontWeight: 600, color: '#9f1239' }}>{fmt$(lossTotal)}</td></tr>
          </tbody>
        </table>
      </div>

      <div>
        <label className="lbl">Additional Notes / Underwriting Comments</label>
        <textarea className="inp" rows={6} value={app.notes} onChange={e => update('notes', e.target.value)} placeholder="Anything else the underwriter should know — fleet upgrades, recent operational changes, new safety initiatives, large-loss explanations, etc." />
      </div>
    </div>
  );
}

function SummaryStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: 14, background: '#f8fafc', borderRadius: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1.1, marginTop: 4 }}>{value}</div>
    </div>
  );
}
