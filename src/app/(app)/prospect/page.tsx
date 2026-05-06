'use client';
import { useState, useCallback } from 'react';
import { useCRMStore } from '@/lib/store';
import { todayISO } from '@/lib/utils';
import { US_STATES } from '@/lib/constants';
import {
  fmcsaLookupDOT, fmcsaSearchName, fmcsaGetBasics,
  safetyRatingColor, operatingStatusColor,
  type FMCSACarrier, type FMCSABasicsResult,
} from '@/lib/fmcsa';

// ─── BASIC score bar ──────────────────────────────────────────────────────────
const BASIC_LABELS: { key: keyof FMCSABasicsResult; label: string; short: string }[] = [
  { key: 'unsafeDriving',       label: 'Unsafe Driving',         short: 'Unsafe Drv' },
  { key: 'hoursOfService',      label: 'HOS Compliance',         short: 'HOS' },
  { key: 'vehicleMaintenance',  label: 'Vehicle Maintenance',    short: 'Veh Maint' },
  { key: 'crashIndicator',      label: 'Crash Indicator',        short: 'Crash Ind' },
  { key: 'driverFitness',       label: 'Driver Fitness',         short: 'Drv Fitness' },
  { key: 'controlledSubstances',label: 'Controlled Substances',  short: 'Ctrl Subs' },
  { key: 'hmCompliance',        label: 'HM Compliance',          short: 'HM' },
];

function barColor(v: number) {
  if (v >= 80) return '#9f1239';
  if (v >= 65) return '#92400e';
  if (v >= 50) return '#b45309';
  return '#0f766e';
}

function BasicScoreMini({ basics }: { basics: FMCSABasicsResult }) {
  const alertCount = basics.alerts.length;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {alertCount > 0
        ? <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: '#fff1f2', color: '#9f1239', border: '1px solid #fda4af' }}>⚠ {alertCount} Alert{alertCount > 1 ? 's' : ''}</span>
        : <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: '#f0fdfa', color: '#0f766e', border: '1px solid #5eead4' }}>✓ Clean BASICs</span>
      }
      {BASIC_LABELS.filter(b => b.key !== 'hmCompliance' && b.key !== 'controlledSubstances' && b.key !== 'driverFitness').map(b => {
        const v = basics[b.key] as number | null;
        if (v == null) return null;
        const col = barColor(v);
        return (
          <span key={b.key} style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: '#f8fafc', color: col, border: `1px solid ${col}30` }}
            title={b.label}>
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
          <div key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0', fontSize: 11 }}>
            <div style={{ width: 100, color: '#64748b', fontSize: 10 }}>{b.short}</div>
            <div style={{ flex: 1, height: 5, background: '#e2e8f0', borderRadius: 3 }} />
            <div style={{ width: 30, color: '#94a3b8', fontSize: 10, textAlign: 'right' }}>N/A</div>
          </div>
        );
        const col = barColor(v);
        return (
          <div key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0', fontSize: 11 }}>
            <div style={{ width: 100, color: '#475569', fontSize: 10 }}>{b.short}</div>
            <div style={{ flex: 1, height: 5, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${v}%`, height: '100%', background: col, borderRadius: 3 }} />
            </div>
            <div style={{ width: 30, fontWeight: 700, color: col, fontSize: 11, textAlign: 'right' }}>{v}</div>
            {v >= 65 && <span style={{ fontSize: 9, fontWeight: 700, color: '#9f1239' }}>⚠</span>}
          </div>
        );
      })}
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
  onImport: (c: FMCSACarrier) => void;
  expanded: boolean;
  onToggle: () => void;
  basics: FMCSABasicsResult | null;
  basicsLoading: boolean;
  onLoadBasics: () => void;
}) {
  const alreadyAdded = leads.some(l => l.dot === carrier.dotNumber);
  const ratingStyle = safetyRatingColor(carrier.safetyRating);
  const statusStyle = operatingStatusColor(carrier.operatingStatus);
  const yearsOp = carrier.mcs150Date
    ? Math.max(0, new Date().getFullYear() - parseInt(carrier.mcs150Date.slice(0, 4) || '0'))
    : null;

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, marginBottom: 12, overflow: 'hidden', transition: 'box-shadow 0.2s', boxShadow: expanded ? '0 4px 20px -4px rgba(37,99,235,0.15)' : '0 1px 3px rgba(0,0,0,0.04)' }}>
      {/* Card Header */}
      <div style={{ padding: '16px 20px', cursor: 'pointer' }} onClick={onToggle}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          {/* Company info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1b2a4a' }}>{carrier.legalName}</div>
              {carrier.dbaName && carrier.dbaName !== carrier.legalName && (
                <span style={{ fontSize: 11, color: '#64748b' }}>dba {carrier.dbaName}</span>
              )}
              {carrier.hmFlag && <span style={{ fontSize: 9, fontWeight: 700, background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', borderRadius: 6, padding: '1px 6px' }}>HM</span>}
              {carrier.pcFlag && <span style={{ fontSize: 9, fontWeight: 700, background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', borderRadius: 6, padding: '1px 6px' }}>PC</span>}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>
              DOT# {carrier.dotNumber}{carrier.mcNumber ? ` · MC-${carrier.mcNumber}` : ''} · {carrier.city}, {carrier.state} {carrier.zip}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: ratingStyle.bg, color: ratingStyle.color }}>
                {carrier.safetyRating || 'Not Rated'}
              </span>
              <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 100, background: statusStyle.bg, color: statusStyle.color }}>
                {carrier.operatingStatus.split(',')[0]}
              </span>
              <span style={{ fontSize: 11, color: '#475569' }}>🚛 {carrier.powerUnits} units</span>
              {carrier.drivers > 0 && <span style={{ fontSize: 11, color: '#475569' }}>👤 {carrier.drivers} drivers</span>}
              {yearsOp !== null && <span style={{ fontSize: 11, color: '#475569' }}>📅 MCS-150: {carrier.mcs150Date.slice(0, 4)}</span>}
            </div>
            {/* BASICs mini badges when loaded */}
            {basics && !expanded && (
              <div style={{ marginTop: 6 }}><BasicScoreMini basics={basics} /></div>
            )}
          </div>
          {/* Right side actions */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {alreadyAdded ? (
                <span style={{ fontSize: 11, color: '#0f766e', fontWeight: 600, padding: '4px 10px', background: '#f0fdfa', border: '1px solid #5eead4', borderRadius: 8 }}>✓ In Leads</span>
              ) : (
                <button className="btn-p btn-sm"
                  onClick={e => { e.stopPropagation(); onImport(carrier); }}
                  style={{ fontSize: 11, padding: '4px 12px' }}>
                  + Import
                </button>
              )}
            </div>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>{expanded ? '▲ Collapse' : '▼ Details'}</span>
          </div>
        </div>
      </div>

      {/* Expanded Detail */}
      {expanded && (
        <div style={{ borderTop: '1px solid #f1f5f9', padding: '20px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
            {/* Contact */}
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Contact Info</div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: '#64748b' }}>Phone: </span>
                <span style={{ fontWeight: 600 }}>
                  {carrier.phone ? (
                    <a href={`tel:${carrier.phone}`} style={{ color: '#2563eb', textDecoration: 'none' }}>{carrier.phone}</a>
                  ) : '—'}
                </span>
              </div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: '#64748b' }}>Email: </span>
                <span style={{ fontWeight: 600 }}>
                  {carrier.email ? (
                    <a href={`mailto:${carrier.email}`} style={{ color: '#2563eb', textDecoration: 'none', wordBreak: 'break-all' }}>{carrier.email}</a>
                  ) : '—'}
                </span>
              </div>
              <div style={{ fontSize: 12 }}>
                <span style={{ color: '#64748b' }}>Address: </span>
                <span style={{ fontWeight: 500 }}>{carrier.address}, {carrier.city}, {carrier.state} {carrier.zip}</span>
              </div>
            </div>
            {/* Fleet & Operations */}
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Fleet & Operations</div>
              <div style={{ fontSize: 12, marginBottom: 4 }}><span style={{ color: '#64748b' }}>Power Units: </span><span style={{ fontWeight: 700 }}>{carrier.powerUnits}</span></div>
              <div style={{ fontSize: 12, marginBottom: 4 }}><span style={{ color: '#64748b' }}>Drivers: </span><span style={{ fontWeight: 700 }}>{carrier.drivers || '—'}</span></div>
              <div style={{ fontSize: 12, marginBottom: 4 }}><span style={{ color: '#64748b' }}>MCS-150 Date: </span><span style={{ fontWeight: 600 }}>{carrier.mcs150Date || '—'}</span></div>
              <div style={{ fontSize: 12, marginBottom: 4 }}><span style={{ color: '#64748b' }}>Mileage ({carrier.mileageYear}): </span><span style={{ fontWeight: 600 }}>{carrier.mcs150Mileage ? carrier.mcs150Mileage.toLocaleString() : '—'}</span></div>
              <div style={{ fontSize: 12 }}><span style={{ color: '#64748b' }}>Operation: </span><span style={{ fontWeight: 500 }}>{carrier.opType || '—'}</span></div>
            </div>
            {/* Safety */}
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Safety & Compliance</div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: '#64748b' }}>Safety Rating: </span>
                <span style={{ fontWeight: 700, ...ratingStyle }}>{carrier.safetyRating || 'Not Rated'}</span>
              </div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: '#64748b' }}>Hazmat: </span>
                <span style={{ fontWeight: 600 }}>{carrier.hmFlag ? '⚠ Yes' : 'No'}</span>
              </div>
              <div style={{ fontSize: 12 }}>
                <span style={{ color: '#64748b' }}>Passenger: </span>
                <span style={{ fontWeight: 600 }}>{carrier.pcFlag ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>

          {/* Cargo Types */}
          {carrier.cargoTypes.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Cargo / Commodity Types</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {carrier.cargoTypes.map(c => (
                  <span key={c} className="tag tag-slate">{c}</span>
                ))}
              </div>
            </div>
          )}

          {/* BASICs Section */}
          <div style={{ background: basics ? (basics.alerts.length > 0 ? '#fff8f8' : '#f0fdfa') : '#f8fafc', borderRadius: 10, padding: 14, border: `1px solid ${basics ? (basics.alerts.length > 0 ? '#fda4af' : '#5eead4') : '#e2e8f0'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#1b2a4a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                FMCSA BASICs (SMS Percentiles)
              </div>
              {!basics && !basicsLoading && (
                <button className="btn-s btn-sm" onClick={onLoadBasics} style={{ fontSize: 10 }}>
                  Load BASICs
                </button>
              )}
              {basicsLoading && <span style={{ fontSize: 11, color: '#64748b' }}>Loading…</span>}
              {basics && basics.alerts.length > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: '#9f1239' }}>⚠ {basics.alerts.length} Alert{basics.alerts.length > 1 ? 's' : ''}: {basics.alerts.join(', ')}</span>
              )}
              {basics && basics.alerts.length === 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: '#0f766e' }}>✓ No Alerts</span>
              )}
            </div>
            {basics ? (
              <BasicScoreDetail basics={basics} />
            ) : !basicsLoading ? (
              <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '8px 0' }}>
                Click &quot;Load BASICs&quot; to pull live FMCSA SMS scores
              </div>
            ) : null}
          </div>

          {/* Import footer */}
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {!alreadyAdded && (
              <button className="btn-p" onClick={() => onImport(carrier)} style={{ fontSize: 13 }}>
                + Import to Leads
              </button>
            )}
            {alreadyAdded && (
              <span style={{ fontSize: 12, color: '#0f766e', fontWeight: 600, padding: '8px 14px', background: '#f0fdfa', border: '1px solid #5eead4', borderRadius: 8 }}>✓ Already in your leads</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProspectPage() {
  const addLead = useCRMStore(s => s.addLead);
  const leads = useCRMStore(s => s.leads);

  // Search state
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [minUnits, setMinUnits] = useState('');
  const [maxUnits, setMaxUnits] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<FMCSACarrier[]>([]);
  const [searched, setSearched] = useState(false);

  // Expanded & basics
  const [expandedDot, setExpandedDot] = useState<string | null>(null);
  const [basicsByDot, setBasicsByDot] = useState<Record<string, FMCSABasicsResult>>({});
  const [basicsLoadingDot, setBasicsLoadingDot] = useState<string | null>(null);
  const [importedDots, setImportedDots] = useState<string[]>([]);

  const runSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setSearched(false);
    setResults([]);

    try {
      let carriers: FMCSACarrier[] = [];

      // DOT number lookup
      if (/^\d{4,}$/.test(q)) {
        const c = await fmcsaLookupDOT(q);
        if (c) carriers = [c];
        else setError(`No carrier found for DOT# ${q}`);
      } else {
        // Name search
        carriers = await fmcsaSearchName(q);
        if (carriers.length === 0) setError(`No carriers found for "${q}"`);
      }

      // Apply filters
      if (stateFilter) carriers = carriers.filter(c => c.state.toUpperCase() === stateFilter.toUpperCase());
      if (minUnits) carriers = carriers.filter(c => c.powerUnits >= parseInt(minUnits));
      if (maxUnits) carriers = carriers.filter(c => c.powerUnits <= parseInt(maxUnits));

      setResults(carriers);
    } catch {
      setError('Failed to connect to FMCSA. Please try again.');
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }, [query, stateFilter, minUnits, maxUnits]);

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
      // Auto-load basics when expanding
      if (!basicsByDot[dot]) loadBasics(dot);
    }
  };

  const importLead = (c: FMCSACarrier) => {
    if (leads.find(l => l.dot === c.dotNumber)) return alert('This DOT# is already in your leads.');
    const basics = basicsByDot[c.dotNumber];
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
      notes: `Imported from FMCSA. ${c.city}, ${c.state}. Fleet: ${c.powerUnits} units. Safety Rating: ${c.safetyRating}.`,
      premium: 0,
      markets: [],
      emails: [],
      docs: [],
      safer: basics ? {
        legalName: c.legalName,
        dotNumber: c.dotNumber,
        mcNumber: c.mcNumber,
        address: [c.address, c.city, c.state, c.zip].filter(Boolean).join(', '),
        phone: c.phone,
        opType: c.opType,
        safetyRating: c.safetyRating,
        mcs150: { lastUpdate: c.mcs150Date, mileage: c.mcs150Mileage, drivers: c.drivers, powerUnits: c.powerUnits, year: c.mileageYear },
        insurance: { current: '', policy: '', effective: '', expiration: '', coverage: '' },
        insuranceHistory: [],
        basics: {
          unsafeDriving: basics.unsafeDriving,
          hoursOfService: basics.hoursOfService,
          driverFitness: basics.driverFitness,
          controlledSubstances: basics.controlledSubstances,
          vehicleMaintenance: basics.vehicleMaintenance,
          crashIndicator: basics.crashIndicator,
          hmCompliance: basics.hmCompliance,
        },
        inspections: { total: 0, vOOS: 0, dOOS: 0, vRate: 0, dRate: 0 },
        inspectionDetail: [],
        crashes: { total: 0, fatal: 0, injury: 0, tow: 0 },
      } : null,
      created: todayISO(),
      years: c.mcs150Date ? Math.max(0, new Date().getFullYear() - parseInt(c.mcs150Date.slice(0, 4) || '0')) : 0,
      fleet: c.powerUnits,
      boundDate: null,
    });
    setImportedDots(p => [...p, c.dotNumber]);
  };

  return (
    <>
      <div className="app-header">
        <h1>DOT Lead Prospector</h1>
        <div style={{ fontSize: 13, color: '#64748b' }}>Live FMCSA carrier search — scores, contact info, fleet data</div>
      </div>
      <div className="content">
        {/* ── Search Panel ── */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 24, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1b2a4a', marginBottom: 4 }}>Search FMCSA Carrier Database</div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Enter a DOT# for direct lookup, or a company name to search. Use filters to narrow results.</div>

          {/* Main search row */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <input
              className="inp"
              placeholder="DOT# (e.g. 3456789) or Company Name…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runSearch()}
              style={{ flex: 2, minWidth: 220 }}
            />
            <button className="btn-p" onClick={runSearch} disabled={loading} style={{ minWidth: 100 }}>
              {loading ? 'Searching…' : '🔍 Search'}
            </button>
            {searched && (
              <button className="btn-s" onClick={() => { setResults([]); setSearched(false); setError(null); setQuery(''); }}>
                Clear
              </button>
            )}
          </div>

          {/* Filter row */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>State:</label>
              <select className="sel" style={{ width: 120 }} value={stateFilter} onChange={e => setStateFilter(e.target.value)}>
                <option value="">Any State</option>
                {US_STATES.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>Min Units:</label>
              <input className="inp" type="number" min="1" placeholder="e.g. 5" value={minUnits} onChange={e => setMinUnits(e.target.value)} style={{ width: 80 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>Max Units:</label>
              <input className="inp" type="number" min="1" placeholder="e.g. 50" value={maxUnits} onChange={e => setMaxUnits(e.target.value)} style={{ width: 80 }} />
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Filters apply to search results</div>
          </div>
        </div>

        {/* ── Loading bar ── */}
        {loading && (
          <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden', marginBottom: 16 }}>
            <div className="loading-bar" />
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div style={{ background: '#fff1f2', border: '1px solid #fda4af', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#9f1239', fontSize: 13 }}>
            ⚠ {error}
          </div>
        )}

        {/* ── Results ── */}
        {searched && !loading && results.length > 0 && (
          <div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12, fontWeight: 600 }}>
              {results.length} carrier{results.length !== 1 ? 's' : ''} found
              {stateFilter && ` · State: ${stateFilter}`}
              {minUnits && ` · Min ${minUnits} units`}
              {maxUnits && ` · Max ${maxUnits} units`}
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
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1b2a4a', marginBottom: 8 }}>Search the FMCSA database</div>
            <div style={{ fontSize: 13, maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
              Enter a DOT number for an instant carrier lookup, or search by company name to find prospective accounts. Filter results by state and fleet size.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, maxWidth: 480, margin: '28px auto 0' }}>
              {[['🏢', 'Live FMCSA Data', 'Real-time carrier details from the federal database'],
                ['📊', 'BASICs Scores', 'SMS percentile scores across all 7 BASIC categories'],
                ['📋', '1-Click Import', 'Add any carrier directly to your leads pipeline'],
              ].map(([icon, title, desc]) => (
                <div key={title} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#1b2a4a', marginBottom: 4 }}>{title}</div>
                  <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
