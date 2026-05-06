'use client';
import { useState, useCallback } from 'react';
import { useCRMStore } from '@/lib/store';
import { todayISO } from '@/lib/utils';
import { US_STATES } from '@/lib/constants';
import {
  fmcsaLookupDOT, fmcsaSearchName, fmcsaBrowseState, fmcsaGetBasics,
  safetyRatingColor, operatingStatusColor,
  type FMCSACarrier, type FMCSABasicsResult,
} from '@/lib/fmcsa';
import { toSaferData } from '@/lib/fmcsa';

// ─── BASIC score bar ──────────────────────────────────────────────────────────
const BASIC_LABELS: { key: keyof FMCSABasicsResult; label: string; short: string; thr: number }[] = [
  { key: 'unsafeDriving',        label: 'Unsafe Driving',        short: 'Unsafe Drv',   thr: 65 },
  { key: 'hoursOfService',       label: 'HOS Compliance',        short: 'HOS',          thr: 65 },
  { key: 'vehicleMaintenance',   label: 'Vehicle Maintenance',   short: 'Veh Maint',    thr: 80 },
  { key: 'crashIndicator',       label: 'Crash Indicator',       short: 'Crash Ind',    thr: 65 },
  { key: 'driverFitness',        label: 'Driver Fitness',        short: 'Drv Fitness',  thr: 80 },
  { key: 'controlledSubstances', label: 'Controlled Substances', short: 'Ctrl Subs',    thr: 80 },
  { key: 'hmCompliance',         label: 'HM Compliance',         short: 'HM',           thr: 80 },
];

function barColor(v: number, thr: number) {
  if (v >= thr) return '#9f1239';
  if (v >= thr * 0.85) return '#b45309';
  if (v >= thr * 0.65) return '#0369a1';
  return '#0f766e';
}

function BasicScoreMini({ basics }: { basics: FMCSABasicsResult }) {
  const alertCount = basics.alerts.length;
  const hasData = BASIC_LABELS.some(b => basics[b.key] != null);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginTop: 4 }}>
      {alertCount > 0
        ? <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 100, background: '#fff1f2', color: '#9f1239', border: '1px solid #fda4af' }}>⚠ {alertCount} BASICs Alert{alertCount > 1 ? 's' : ''}</span>
        : hasData
          ? <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 100, background: '#f0fdfa', color: '#0f766e', border: '1px solid #5eead4' }}>✓ Clean BASICs</span>
          : <span style={{ fontSize: 10, color: '#94a3b8', padding: '2px 7px' }}>No BASICs data</span>
      }
      {BASIC_LABELS.filter(b => b.key !== 'hmCompliance' && b.key !== 'controlledSubstances').map(b => {
        const v = basics[b.key] as number | null;
        if (v == null) return null;
        const col = barColor(v, b.thr);
        return (
          <span key={b.key} style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 100, background: '#f8fafc', color: col, border: `1px solid ${col}40` }} title={b.label}>
            {b.short}: {v}
          </span>
        );
      })}
    </div>
  );
}

function BasicScoreDetail({ basics }: { basics: FMCSABasicsResult }) {
  return (
    <div>
      {BASIC_LABELS.map(b => {
        const v = basics[b.key] as number | null;
        if (v == null) return (
          <div key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', fontSize: 11, borderBottom: '1px solid #f8fafc' }}>
            <div style={{ width: 108, color: '#64748b', fontSize: 10 }}>{b.label}</div>
            <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3 }} />
            <div style={{ width: 54, color: '#94a3b8', fontSize: 10, textAlign: 'right' }}>N/A</div>
          </div>
        );
        const col = barColor(v, b.thr);
        const exceeded = v >= b.thr;
        return (
          <div key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', fontSize: 11, borderBottom: '1px solid #f8fafc' }}>
            <div style={{ width: 108, color: '#475569', fontSize: 10 }}>{b.label}</div>
            <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', left: `${b.thr}%`, top: 0, bottom: 0, width: 1, background: '#94a3b8', opacity: 0.6 }} />
              <div style={{ width: `${Math.min(v, 100)}%`, height: '100%', background: col, borderRadius: 3 }} />
            </div>
            <div style={{ width: 24, fontWeight: 700, color: col, fontSize: 11, textAlign: 'right' }}>{v}</div>
            {exceeded && <span style={{ fontSize: 9, fontWeight: 800, color: '#9f1239', background: '#fff1f2', padding: '1px 5px', borderRadius: 4 }}>ALERT</span>}
          </div>
        );
      })}
    </div>
  );
}

// ─── Inspection / Crash summary inline ───────────────────────────────────────
function InspectionCrashRow({ carrier }: { carrier: FMCSACarrier }) {
  const totalInsp = (carrier.vehicleInsp || 0) + (carrier.driverInsp || 0);
  if (totalInsp === 0 && carrier.crashTotal === 0) return null;
  return (
    <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
      {totalInsp > 0 && (
        <span style={{ fontSize: 10, color: '#475569' }}>
          🔍 {totalInsp} insp
          {carrier.vehicleOosInsp > 0 && <span style={{ color: '#9f1239', marginLeft: 4 }}>· {carrier.vehicleOosInsp} veh OOS</span>}
          {carrier.driverOosInsp > 0 && <span style={{ color: '#9f1239', marginLeft: 4 }}>· {carrier.driverOosInsp} drv OOS</span>}
        </span>
      )}
      {carrier.crashTotal > 0 && (
        <span style={{ fontSize: 10, color: '#92400e' }}>
          💥 {carrier.crashTotal} crash{carrier.crashTotal > 1 ? 'es' : ''}
          {carrier.fatalCrash > 0 && <span style={{ color: '#9f1239', marginLeft: 4 }}>· {carrier.fatalCrash} fatal</span>}
        </span>
      )}
    </div>
  );
}

// ─── Carrier Card ─────────────────────────────────────────────────────────────
function CarrierCard({
  carrier, leads, onImport, expanded, onToggle,
  basics, basicsLoading, onLoadBasics,
}: {
  carrier: FMCSACarrier;
  leads: ReturnType<typeof useCRMStore.getState>['leads'];
  onImport: (c: FMCSACarrier, b: FMCSABasicsResult | null) => void;
  expanded: boolean;
  onToggle: () => void;
  basics: FMCSABasicsResult | null;
  basicsLoading: boolean;
  onLoadBasics: () => void;
}) {
  const alreadyAdded = leads.some(l => l.dot === carrier.dotNumber);
  const ratingStyle = safetyRatingColor(carrier.safetyRating);
  const statusStyle = operatingStatusColor(carrier.operatingStatus);

  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, marginBottom: 10,
      overflow: 'hidden', boxShadow: expanded ? '0 4px 20px -4px rgba(37,99,235,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      {/* ── Collapsed header ── */}
      <div style={{ padding: '14px 18px', cursor: 'pointer' }} onClick={onToggle}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Name row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#1b2a4a' }}>{carrier.legalName}</span>
              {carrier.dbaName && <span style={{ fontSize: 11, color: '#64748b' }}>dba {carrier.dbaName}</span>}
              {carrier.hmFlag && <span style={{ fontSize: 9, fontWeight: 700, background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', borderRadius: 5, padding: '1px 5px' }}>HM</span>}
              {carrier.pcFlag && <span style={{ fontSize: 9, fontWeight: 700, background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', borderRadius: 5, padding: '1px 5px' }}>PC</span>}
            </div>
            {/* DOT / location */}
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 5 }}>
              DOT# {carrier.dotNumber}{carrier.mcNumber ? ` · MC-${carrier.mcNumber}` : ''} · {carrier.city}, {carrier.state} {carrier.zip}
            </div>
            {/* Badges row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 100, ...ratingStyle }}>{carrier.safetyRating || 'Not Rated'}</span>
              <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 100, ...statusStyle }}>{carrier.operatingStatus}</span>
              {carrier.authorityStatus && (
                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 100, background: '#f0fdfa', color: '#0f766e' }}>Auth: {carrier.authorityStatus}</span>
              )}
              <span style={{ fontSize: 11, color: '#475569' }}>🚛 {carrier.powerUnits} unit{carrier.powerUnits !== 1 ? 's' : ''}</span>
              {carrier.drivers > 0 && <span style={{ fontSize: 11, color: '#475569' }}>👤 {carrier.drivers} driver{carrier.drivers !== 1 ? 's' : ''}</span>}
              {carrier.opType && <span style={{ fontSize: 10, color: '#64748b' }}>{carrier.opType}</span>}
            </div>
            {/* Inspections / crashes inline */}
            <InspectionCrashRow carrier={carrier} />
            {/* BASICs mini when loaded */}
            {basics && !expanded && <BasicScoreMini basics={basics} />}
          </div>
          {/* Right side */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
            {alreadyAdded
              ? <span style={{ fontSize: 11, color: '#0f766e', fontWeight: 600, padding: '4px 10px', background: '#f0fdfa', border: '1px solid #5eead4', borderRadius: 8 }}>✓ In Leads</span>
              : <button className="btn-p btn-sm" onClick={e => { e.stopPropagation(); onImport(carrier, basics); }} style={{ fontSize: 11, padding: '4px 12px' }}>+ Import</button>
            }
            <span style={{ fontSize: 10, color: '#94a3b8' }}>{expanded ? '▲' : '▼'} {expanded ? 'Collapse' : 'Details'}</span>
          </div>
        </div>
      </div>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div style={{ borderTop: '1px solid #f1f5f9', padding: '18px 18px' }}>
          {/* 3-column grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
            {/* Contact */}
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Contact Info</div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: '#64748b' }}>Phone: </span>
                {carrier.phone
                  ? <a href={`tel:${carrier.phone}`} style={{ fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}>{carrier.phone}</a>
                  : <span style={{ color: '#94a3b8' }}>—</span>}
              </div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: '#64748b' }}>Email: </span>
                {carrier.email
                  ? <a href={`mailto:${carrier.email}`} style={{ fontWeight: 600, color: '#2563eb', textDecoration: 'none', wordBreak: 'break-all' }}>{carrier.email}</a>
                  : <span style={{ color: '#94a3b8' }}>—</span>}
              </div>
              <div style={{ fontSize: 12 }}>
                <span style={{ color: '#64748b' }}>Address: </span>
                <span style={{ fontWeight: 500 }}>{[carrier.address, carrier.city, carrier.state, carrier.zip].filter(Boolean).join(', ') || '—'}</span>
              </div>
            </div>
            {/* Fleet */}
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Fleet & Operations</div>
              <div style={{ fontSize: 12, marginBottom: 4 }}><span style={{ color: '#64748b' }}>Power Units: </span><span style={{ fontWeight: 700 }}>{carrier.powerUnits}</span></div>
              <div style={{ fontSize: 12, marginBottom: 4 }}><span style={{ color: '#64748b' }}>Drivers: </span><span style={{ fontWeight: 700 }}>{carrier.drivers || '—'}</span></div>
              {carrier.mcs150Date && <div style={{ fontSize: 12, marginBottom: 4 }}><span style={{ color: '#64748b' }}>MCS-150: </span><span style={{ fontWeight: 600 }}>{carrier.mcs150Date}</span></div>}
              {carrier.mcs150Mileage > 0 && <div style={{ fontSize: 12, marginBottom: 4 }}><span style={{ color: '#64748b' }}>Mileage: </span><span style={{ fontWeight: 600 }}>{carrier.mcs150Mileage.toLocaleString()}</span></div>}
              <div style={{ fontSize: 12 }}><span style={{ color: '#64748b' }}>Op Type: </span><span>{carrier.opType || '—'}</span></div>
            </div>
            {/* Safety */}
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Safety & Compliance</div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: '#64748b' }}>Rating: </span>
                <span style={{ fontWeight: 700, ...(ratingStyle) }}>{carrier.safetyRating || 'Not Rated'}</span>
              </div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: '#64748b' }}>Status: </span>
                <span style={{ fontWeight: 600 }}>{carrier.operatingStatus}</span>
              </div>
              {/* Insurance summary */}
              <div style={{ fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: '#64748b' }}>BIPD Req: </span>
                <span style={{ fontWeight: 600 }}>{carrier.bipdRequired ? `$${carrier.bipdAmount}k` : 'N/A'}</span>
              </div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: '#64748b' }}>Ins on File: </span>
                <span style={{ fontWeight: 600, color: carrier.bipdOnFile ? '#0f766e' : '#9f1239' }}>{carrier.bipdOnFile ? 'Yes' : 'No'}</span>
              </div>
              {/* Crash summary */}
              {carrier.crashTotal > 0 && (
                <div style={{ fontSize: 12 }}>
                  <span style={{ color: '#64748b' }}>Crashes: </span>
                  <span style={{ fontWeight: 600, color: '#92400e' }}>{carrier.crashTotal} total · {carrier.fatalCrash} fatal · {carrier.injCrash} injury</span>
                </div>
              )}
            </div>
          </div>

          {/* Inspections detail */}
          {((carrier.vehicleInsp + carrier.driverInsp) > 0) && (
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, marginBottom: 14, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', gridColumn: '1/-1', marginBottom: 4 }}>Inspections (24 mo)</div>
              <div><div style={{ fontSize: 11, color: '#64748b' }}>Vehicle Insp</div><div style={{ fontWeight: 700, fontSize: 16 }}>{carrier.vehicleInsp}</div></div>
              <div><div style={{ fontSize: 11, color: '#64748b' }}>Veh OOS</div><div style={{ fontWeight: 700, fontSize: 16, color: carrier.vehicleOosInsp > 0 ? '#9f1239' : '#0f766e' }}>{carrier.vehicleOosInsp} <span style={{ fontSize: 10, fontWeight: 400 }}>({Math.round(carrier.vehicleOosRate)}%)</span></div></div>
              <div><div style={{ fontSize: 11, color: '#64748b' }}>Driver Insp</div><div style={{ fontWeight: 700, fontSize: 16 }}>{carrier.driverInsp}</div></div>
              <div><div style={{ fontSize: 11, color: '#64748b' }}>Drv OOS</div><div style={{ fontWeight: 700, fontSize: 16, color: carrier.driverOosInsp > 0 ? '#9f1239' : '#0f766e' }}>{carrier.driverOosInsp} <span style={{ fontSize: 10, fontWeight: 400 }}>({Math.round(carrier.driverOosRate)}%)</span></div></div>
            </div>
          )}

          {/* Cargo types */}
          {carrier.cargoTypes.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Cargo / Commodity Types</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {carrier.cargoTypes.map(c => <span key={c} className="tag tag-slate">{c}</span>)}
              </div>
            </div>
          )}

          {/* BASICs section */}
          <div style={{ background: basics ? (basics.alerts.length > 0 ? '#fff8f8' : '#f0fdfa') : '#f8fafc', borderRadius: 10, padding: 14, border: `1px solid ${basics ? (basics.alerts.length > 0 ? '#fda4af' : '#5eead4') : '#e2e8f0'}`, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#1b2a4a' }}>FMCSA BASICs — SMS Percentile Scores</div>
              {!basics && !basicsLoading && (
                <button className="btn-s btn-sm" onClick={onLoadBasics} style={{ fontSize: 10 }}>Load BASICs</button>
              )}
              {basicsLoading && <span style={{ fontSize: 11, color: '#64748b' }}>⏳ Loading…</span>}
              {basics && basics.alerts.length > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: '#9f1239' }}>⚠ {basics.alerts.length} Alert{basics.alerts.length > 1 ? 's' : ''}</span>
              )}
              {basics && basics.alerts.length === 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: '#0f766e' }}>✓ No Active Alerts</span>
              )}
            </div>
            {basics ? (
              <BasicScoreDetail basics={basics} />
            ) : !basicsLoading ? (
              <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '8px 0' }}>
                Click &quot;Load BASICs&quot; to pull SMS percentile scores for this carrier
              </div>
            ) : null}
          </div>

          {/* Import footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {alreadyAdded
              ? <span style={{ fontSize: 12, color: '#0f766e', fontWeight: 600, padding: '8px 14px', background: '#f0fdfa', border: '1px solid #5eead4', borderRadius: 8 }}>✓ Already in your leads</span>
              : <button className="btn-p" onClick={() => onImport(carrier, basics)}>+ Import to Leads</button>
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ProspectPage() {
  const addLead = useCRMStore(s => s.addLead);
  const leads = useCRMStore(s => s.leads);

  // Filters
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [minUnits, setMinUnits] = useState('');
  const [maxUnits, setMaxUnits] = useState('');
  const [renewalMonth, setRenewalMonth] = useState('');   // MCS-150 filed month filter
  const [authorizedOnly, setAuthorizedOnly] = useState(false);

  // Search state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<FMCSACarrier[]>([]);
  const [searched, setSearched] = useState(false);
  const [searchMode, setSearchMode] = useState<'name'|'dot'|'state'|''>('');

  // Expanded & basics
  const [expandedDot, setExpandedDot] = useState<string | null>(null);
  const [basicsByDot, setBasicsByDot] = useState<Record<string, FMCSABasicsResult>>({});
  const [basicsLoadingDot, setBasicsLoadingDot] = useState<string | null>(null);

  const applyFilters = useCallback((carriers: FMCSACarrier[]): FMCSACarrier[] => {
    let list = carriers;
    if (stateFilter) list = list.filter(c => c.state.toUpperCase() === stateFilter.toUpperCase());
    if (minUnits) list = list.filter(c => c.powerUnits >= parseInt(minUnits));
    if (maxUnits) list = list.filter(c => c.powerUnits <= parseInt(maxUnits));
    if (authorizedOnly) list = list.filter(c => c.authorityStatus === 'Authorized' || c.operatingStatus.toLowerCase().includes('active'));
    if (renewalMonth) {
      const monthIdx = MONTHS.indexOf(renewalMonth) + 1; // 1-based
      list = list.filter(c => {
        if (!c.mcs150Date) return true; // unknown — include
        const m = parseInt(c.mcs150Date.slice(5, 7));
        return m === monthIdx;
      });
    }
    return list;
  }, [stateFilter, minUnits, maxUnits, authorizedOnly, renewalMonth]);

  const runSearch = useCallback(async () => {
    const q = query.trim();
    const hasState = !!stateFilter;
    const hasQuery = !!q;

    if (!hasQuery && !hasState) {
      setError('Enter a DOT#, company name, or select a state to browse.');
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(false);
    setResults([]);
    setExpandedDot(null);

    try {
      let carriers: FMCSACarrier[] = [];

      if (/^\d{4,}$/.test(q)) {
        // Direct DOT lookup
        setSearchMode('dot');
        const c = await fmcsaLookupDOT(q);
        if (c) carriers = [c];
        else setError(`No carrier found for DOT# ${q}`);
      } else if (hasQuery) {
        // Name search
        setSearchMode('name');
        carriers = await fmcsaSearchName(q);
        if (carriers.length === 0) setError(`No carriers found matching "${q}"`);
      } else if (hasState) {
        // State-only browse
        setSearchMode('state');
        carriers = await fmcsaBrowseState(stateFilter);
        if (carriers.length === 0) setError(`No carriers found for state: ${stateFilter}`);
      }

      const filtered = applyFilters(carriers);
      setResults(filtered);
      if (carriers.length > 0 && filtered.length === 0) {
        setError('No results match the active filters. Try broadening your criteria.');
      }
    } catch {
      setError('Failed to connect to FMCSA. Please try again.');
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }, [query, stateFilter, applyFilters]);

  const loadBasics = async (dot: string) => {
    if (basicsByDot[dot] || basicsLoadingDot === dot) return;
    setBasicsLoadingDot(dot);
    try {
      const b = await fmcsaGetBasics(dot);
      if (b) setBasicsByDot(prev => ({ ...prev, [dot]: b }));
    } finally {
      setBasicsLoadingDot(null);
    }
  };

  const handleToggle = (dot: string) => {
    if (expandedDot === dot) {
      setExpandedDot(null);
    } else {
      setExpandedDot(dot);
      if (!basicsByDot[dot]) loadBasics(dot);
    }
  };

  const importLead = (c: FMCSACarrier, basics: FMCSABasicsResult | null) => {
    if (leads.find(l => l.dot === c.dotNumber)) return alert('This DOT# is already in your leads.');
    addLead({
      id: 'l' + Date.now(),
      company: c.legalName,
      dot: c.dotNumber,
      contact: '',
      email: c.email,
      phone: c.phone,
      status: 'New Lead',
      producer: 'p1',
      lines: ['Auto Liability'],
      commodities: c.cargoTypes,
      violations: 0,
      hazmat: c.hmFlag,
      vehicles: '',
      notes: `Imported from FMCSA. ${c.city}, ${c.state}. Fleet: ${c.powerUnits} units. Safety: ${c.safetyRating}.`,
      premium: 0,
      markets: [],
      emails: [],
      docs: [],
      safer: toSaferData(c, basics, new Date().toISOString()),
      created: todayISO(),
      years: c.mcs150Date ? Math.max(0, new Date().getFullYear() - parseInt(c.mcs150Date.slice(0, 4) || '0')) : 0,
      fleet: c.powerUnits,
      boundDate: null,
    });
    alert(`✓ ${c.legalName} imported to Leads!`);
  };

  const canSearch = !!query.trim() || !!stateFilter;

  return (
    <>
      <div className="app-header">
        <h1>DOT Lead Prospector</h1>
        <div style={{ fontSize: 13, color: '#64748b' }}>Live FMCSA database — inspections, crashes, BASICs scores, fleet &amp; contact data</div>
      </div>
      <div className="content">

        {/* ── Search & Filter Panel ── */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 22, marginBottom: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1b2a4a', marginBottom: 3 }}>Search FMCSA Carrier Database</div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
            Enter a DOT# for direct lookup, a company name to search, or just select a state to browse carriers.
          </div>

          {/* Search row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <input
              className="inp"
              placeholder="DOT# or Company Name (optional if state selected)"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runSearch()}
              style={{ flex: 2, minWidth: 240 }}
            />
            <button className="btn-p" onClick={runSearch} disabled={loading || !canSearch} style={{ minWidth: 110 }}>
              {loading ? '⏳ Searching…' : '🔍 Search'}
            </button>
            {searched && (
              <button className="btn-s" onClick={() => { setResults([]); setSearched(false); setError(null); setQuery(''); setExpandedDot(null); }}>
                Clear
              </button>
            )}
          </div>

          {/* Filters row 1: state, units */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>State:</label>
              <select className="sel" style={{ width: 110 }} value={stateFilter} onChange={e => setStateFilter(e.target.value)}>
                <option value="">Any State</option>
                {US_STATES.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>Units Min:</label>
              <input className="inp" type="number" min="1" placeholder="e.g. 5" value={minUnits} onChange={e => setMinUnits(e.target.value)} style={{ width: 72 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>Units Max:</label>
              <input className="inp" type="number" min="1" placeholder="e.g. 50" value={maxUnits} onChange={e => setMaxUnits(e.target.value)} style={{ width: 72 }} />
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 24, background: '#e2e8f0' }} />

            {/* Effective date (renewal month) filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>Est. Renewal Month:</label>
              <select className="sel" style={{ width: 100 }} value={renewalMonth} onChange={e => setRenewalMonth(e.target.value)}>
                <option value="">Any Month</option>
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {/* Authorized only */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>
              <input type="checkbox" checked={authorizedOnly} onChange={e => setAuthorizedOnly(e.target.checked)}
                style={{ accentColor: '#2563eb', width: 13, height: 13 }} />
              Authorized Only
            </label>
          </div>

          {/* Hint */}
          {stateFilter && !query && (
            <div style={{ fontSize: 11, color: '#0369a1', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 7, padding: '6px 12px', display: 'inline-block' }}>
              📍 State-only mode: searches &quot;TRANSPORT / TRUCKING / FREIGHT / LOGISTICS / CARRIER&quot; in {stateFilter} and deduplicates
            </div>
          )}
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden', marginBottom: 14 }}>
            <div className="loading-bar" />
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div style={{ background: '#fff1f2', border: '1px solid #fda4af', borderRadius: 10, padding: '12px 16px', marginBottom: 14, color: '#9f1239', fontSize: 13 }}>
            ⚠ {error}
          </div>
        )}

        {/* ── Results ── */}
        {searched && !loading && results.length > 0 && (
          <div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{results.length} carrier{results.length !== 1 ? 's' : ''} found</span>
              {searchMode === 'state' && <span style={{ fontSize: 11, background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 100 }}>State browse: {stateFilter}</span>}
              {stateFilter && searchMode !== 'state' && <span style={{ fontSize: 11 }}>· {stateFilter}</span>}
              {minUnits && <span style={{ fontSize: 11 }}>· Min {minUnits} units</span>}
              {maxUnits && <span style={{ fontSize: 11 }}>· Max {maxUnits} units</span>}
              {renewalMonth && <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 100 }}>📅 Renewal: {renewalMonth}</span>}
            </div>
            {results.map(c => (
              <CarrierCard
                key={c.dotNumber}
                carrier={c}
                leads={leads}
                onImport={importLead}
                expanded={expandedDot === c.dotNumber}
                onToggle={() => handleToggle(c.dotNumber)}
                basics={basicsByDot[c.dotNumber] ?? null}
                basicsLoading={basicsLoadingDot === c.dotNumber}
                onLoadBasics={() => loadBasics(c.dotNumber)}
              />
            ))}
          </div>
        )}

        {/* ── Empty state ── */}
        {!searched && !loading && (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8' }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>🔍</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1b2a4a', marginBottom: 6 }}>Search the FMCSA database</div>
            <div style={{ fontSize: 13, maxWidth: 420, margin: '0 auto 28px', lineHeight: 1.6, color: '#64748b' }}>
              Search by DOT#, company name, or select a state to browse. Use the Renewal Month filter to find accounts coming up within a specific timeframe.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, maxWidth: 580, margin: '0 auto' }}>
              {[
                ['🏢', 'Live FMCSA Data', 'Real-time carrier details'],
                ['📊', 'BASICs Scores', 'SMS percentile scores'],
                ['🔍', 'Inspections', 'Vehicle & driver OOS rates'],
                ['📋', '1-Click Import', 'Add to leads pipeline'],
              ].map(([icon, title, desc]) => (
                <div key={title} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 20, marginBottom: 5 }}>{icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#1b2a4a', marginBottom: 3 }}>{title}</div>
                  <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
