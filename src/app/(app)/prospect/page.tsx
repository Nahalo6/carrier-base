'use client';
import { useState, useCallback } from 'react';
import { useCRMStore } from '@/lib/store';
import { todayISO } from '@/lib/utils';
import { US_STATES } from '@/lib/constants';
import {
  fmcsaLookupDOT, fmcsaSearchName, fmcsaBrowseAll, fmcsaBrowseState, fmcsaNewVentures, fmcsaGetBasics,
  safetyRatingColor, operatingStatusColor, toSaferData,
  type FMCSACarrier, type FMCSABasicsResult, type BasicDetail,
} from '@/lib/fmcsa';

// ─── Clean inline icons (no emojis) ───────────────────────────────────────────
const IconSearch = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconSpark = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.5 5.5l2 2M16.5 16.5l2 2M5.5 18.5l2-2M16.5 7.5l2-2" />
  </svg>
);
const IconReset = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" />
  </svg>
);
const IconChev = ({ open, size = 12 }: { open: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} aria-hidden>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const IconPlus = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const BASIC_LABELS: { key: string; label: string }[] = [
  { key: 'unsafeDriving',        label: 'Unsafe Driving' },
  { key: 'hoursOfService',       label: 'HOS Compliance' },
  { key: 'vehicleMaintenance',   label: 'Vehicle Maintenance' },
  { key: 'crashIndicator',       label: 'Crash Indicator' },
  { key: 'driverFitness',        label: 'Driver Fitness' },
  { key: 'controlledSubstances', label: 'Drugs & Alcohol' },
  { key: 'hmCompliance',         label: 'HM Compliance' },
];

// ─── BASICs row — measure + violations + alert
function BasicRow({ label, d }: { label: string; d: BasicDetail | undefined }) {
  if (!d || !d.hasData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', fontSize: 11, borderBottom: '1px solid #f8fafc' }}>
        <div style={{ width: 130, color: '#475569', fontWeight: 600 }}>{label}</div>
        <div style={{ flex: 1, color: '#94a3b8', fontStyle: 'italic' }}>No data</div>
      </div>
    );
  }
  const measureText = d.measure != null ? d.measure.toFixed(2) : '—';
  const measurePct = d.measure != null && d.threshold != null
    ? Math.min(100, (d.measure / d.threshold) * 100) : 0;
  const fillColor = d.alert ? '#9f1239' : measurePct > 70 ? '#b45309' : measurePct > 40 ? '#0369a1' : '#0f766e';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', fontSize: 11, borderBottom: '1px solid #f8fafc' }}>
      <div style={{ width: 130, color: '#475569', fontWeight: 600 }}>{label}</div>
      <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
        <div style={{ width: `${measurePct}%`, height: '100%', background: fillColor, borderRadius: 3 }} />
      </div>
      <div style={{ width: 70, fontSize: 10, color: '#475569', textAlign: 'right' }} title="Measure / Threshold">
        {measureText}{d.threshold != null ? ` / ${d.threshold}` : ''}
      </div>
      <div style={{ width: 70, fontSize: 10, color: d.totalViolations > 0 ? '#92400e' : '#64748b', textAlign: 'right' }}>
        {d.totalViolations} viol
      </div>
      <div style={{ width: 84, textAlign: 'right' }}>
        {d.alert ? (
          <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', background: '#9f1239', padding: '2px 6px', borderRadius: 4, letterSpacing: '0.04em' }}>ALERT</span>
        ) : d.percentile != null ? (
          <span style={{ fontSize: 11, fontWeight: 700, color: fillColor }}>{d.percentile}%</span>
        ) : d.notPublic ? (
          <span style={{ fontSize: 9, color: '#94a3b8', fontStyle: 'italic' }}>Restricted</span>
        ) : (
          <span style={{ fontSize: 9, color: '#0f766e', fontWeight: 600 }}>Pass</span>
        )}
      </div>
    </div>
  );
}

function BasicScoreMini({ basics }: { basics: FMCSABasicsResult }) {
  if (!basics.hasAnyData) return (
    <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 4, display: 'inline-block' }}>BASICs: no public data</span>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginTop: 4 }}>
      {basics.alerts.length > 0
        ? <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 100, background: '#fff1f2', color: '#9f1239', border: '1px solid #fda4af' }}>{basics.alerts.length} BASICs Alert{basics.alerts.length > 1 ? 's' : ''}</span>
        : <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 100, background: '#f0fdfa', color: '#0f766e', border: '1px solid #5eead4' }}>No BASICs Alerts</span>
      }
      <span style={{ fontSize: 10, color: '#475569' }}>{basics.totalViolations} total violations</span>
    </div>
  );
}

function InspectionCrashRow({ carrier }: { carrier: FMCSACarrier }) {
  const totalInsp = (carrier.vehicleInsp || 0) + (carrier.driverInsp || 0);
  if (totalInsp === 0 && carrier.crashTotal === 0) return null;
  return (
    <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
      {totalInsp > 0 && (
        <span style={{ fontSize: 10, color: '#475569' }}>
          Inspections: {totalInsp}
          {carrier.vehicleOosInsp > 0 && <span style={{ color: '#9f1239', marginLeft: 4 }}>· {carrier.vehicleOosInsp} veh OOS</span>}
          {carrier.driverOosInsp > 0 && <span style={{ color: '#9f1239', marginLeft: 4 }}>· {carrier.driverOosInsp} drv OOS</span>}
        </span>
      )}
      {carrier.crashTotal > 0 && (
        <span style={{ fontSize: 10, color: '#92400e' }}>
          Crashes: {carrier.crashTotal}
          {carrier.fatalCrash > 0 && <span style={{ color: '#9f1239', marginLeft: 4 }}>· {carrier.fatalCrash} fatal</span>}
        </span>
      )}
    </div>
  );
}

// ─── Carrier card ─────────────────────────────────────────────────────────────
function CarrierCard({
  carrier, leads, onImport, expanded, onToggle, basics, basicsLoading, onLoadBasics,
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
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, marginBottom: 10, overflow: 'hidden', boxShadow: expanded ? '0 4px 20px -4px rgba(37,99,235,0.12)' : '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ padding: '14px 18px', cursor: 'pointer' }} onClick={onToggle}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#1b2a4a' }}>{carrier.legalName}</span>
              {carrier.dbaName && <span style={{ fontSize: 11, color: '#64748b' }}>dba {carrier.dbaName}</span>}
              {carrier.hmFlag && <span style={{ fontSize: 9, fontWeight: 700, background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', borderRadius: 5, padding: '1px 6px' }}>HAZMAT</span>}
              {carrier.pcFlag && <span style={{ fontSize: 9, fontWeight: 700, background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', borderRadius: 5, padding: '1px 6px' }}>PASSENGER</span>}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 5 }}>
              DOT# {carrier.dotNumber}{carrier.mcNumber ? ` · MC-${carrier.mcNumber}` : ''} · {carrier.city}, {carrier.state} {carrier.zip}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 100, ...ratingStyle }}>{carrier.safetyRating || 'Not Rated'}</span>
              <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 100, ...statusStyle }}>{carrier.operatingStatus}</span>
              {carrier.authorityStatus && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 100, background: '#f0fdfa', color: '#0f766e' }}>Auth: {carrier.authorityStatus}</span>}
              <span style={{ fontSize: 11, color: '#475569' }}>{carrier.powerUnits} unit{carrier.powerUnits !== 1 ? 's' : ''}</span>
              {carrier.drivers > 0 && <span style={{ fontSize: 11, color: '#475569' }}>· {carrier.drivers} driver{carrier.drivers !== 1 ? 's' : ''}</span>}
              {carrier.opType && <span style={{ fontSize: 10, color: '#64748b' }}>· {carrier.opType}</span>}
            </div>
            <InspectionCrashRow carrier={carrier} />
            {basics && !expanded && <BasicScoreMini basics={basics} />}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
            {alreadyAdded
              ? <span style={{ fontSize: 11, color: '#0f766e', fontWeight: 600, padding: '4px 10px', background: '#f0fdfa', border: '1px solid #5eead4', borderRadius: 8 }}>In Leads</span>
              : <button className="btn-p btn-sm" onClick={e => { e.stopPropagation(); onImport(carrier, basics); }} style={{ fontSize: 11, padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <IconPlus /> Import
                </button>
            }
            <span style={{ fontSize: 10, color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <IconChev open={expanded} /> {expanded ? 'Collapse' : 'Details'}
            </span>
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid #f1f5f9', padding: '18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Contact Info</div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: '#64748b' }}>Phone: </span>
                {carrier.phone ? <a href={`tel:${carrier.phone}`} style={{ fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}>{carrier.phone}</a> : <span style={{ color: '#94a3b8' }}>—</span>}
              </div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: '#64748b' }}>Email: </span>
                {carrier.email ? <a href={`mailto:${carrier.email}`} style={{ fontWeight: 600, color: '#2563eb', textDecoration: 'none', wordBreak: 'break-all' }}>{carrier.email}</a> : <span style={{ color: '#94a3b8' }}>—</span>}
              </div>
              <div style={{ fontSize: 12 }}>
                <span style={{ color: '#64748b' }}>Address: </span>
                <span style={{ fontWeight: 500 }}>{[carrier.address, carrier.city, carrier.state, carrier.zip].filter(Boolean).join(', ') || '—'}</span>
              </div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Fleet & Operations</div>
              <div style={{ fontSize: 12, marginBottom: 4 }}><span style={{ color: '#64748b' }}>Power Units: </span><span style={{ fontWeight: 700 }}>{carrier.powerUnits}</span></div>
              <div style={{ fontSize: 12, marginBottom: 4 }}><span style={{ color: '#64748b' }}>Drivers: </span><span style={{ fontWeight: 700 }}>{carrier.drivers || '—'}</span></div>
              {carrier.mcs150Date && <div style={{ fontSize: 12, marginBottom: 4 }}><span style={{ color: '#64748b' }}>MCS-150: </span><span style={{ fontWeight: 600 }}>{carrier.mcs150Date}</span></div>}
              {carrier.mcs150Mileage > 0 && <div style={{ fontSize: 12, marginBottom: 4 }}><span style={{ color: '#64748b' }}>Mileage: </span><span style={{ fontWeight: 600 }}>{carrier.mcs150Mileage.toLocaleString()}</span></div>}
              <div style={{ fontSize: 12 }}><span style={{ color: '#64748b' }}>Op Type: </span><span>{carrier.opType || '—'}</span></div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Safety & Insurance</div>
              <div style={{ fontSize: 12, marginBottom: 4 }}><span style={{ color: '#64748b' }}>Rating: </span><span style={{ fontWeight: 700, ...ratingStyle }}>{carrier.safetyRating || 'Not Rated'}</span></div>
              <div style={{ fontSize: 12, marginBottom: 4 }}><span style={{ color: '#64748b' }}>Status: </span><span style={{ fontWeight: 600 }}>{carrier.operatingStatus}</span></div>
              <div style={{ fontSize: 12, marginBottom: 4 }}><span style={{ color: '#64748b' }}>BIPD Req: </span><span style={{ fontWeight: 600 }}>{carrier.bipdRequired ? `$${carrier.bipdAmount}k` : 'N/A'}</span></div>
              <div style={{ fontSize: 12 }}><span style={{ color: '#64748b' }}>Ins on File: </span><span style={{ fontWeight: 600, color: carrier.bipdOnFile ? '#0f766e' : '#9f1239' }}>{carrier.bipdOnFile ? 'Yes' : 'No'}</span></div>
            </div>
          </div>

          {((carrier.vehicleInsp + carrier.driverInsp) > 0 || carrier.crashTotal > 0) && (
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, marginBottom: 14, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', gridColumn: '1/-1', marginBottom: 4 }}>Inspections & Crashes (24 mo)</div>
              <div><div style={{ fontSize: 11, color: '#64748b' }}>Vehicle Insp</div><div style={{ fontWeight: 700, fontSize: 16 }}>{carrier.vehicleInsp}</div></div>
              <div><div style={{ fontSize: 11, color: '#64748b' }}>Veh OOS</div><div style={{ fontWeight: 700, fontSize: 16, color: carrier.vehicleOosInsp > 0 ? '#9f1239' : '#0f766e' }}>{carrier.vehicleOosInsp} <span style={{ fontSize: 10, fontWeight: 400 }}>({Math.round(carrier.vehicleOosRate)}%)</span></div></div>
              <div><div style={{ fontSize: 11, color: '#64748b' }}>Driver Insp</div><div style={{ fontWeight: 700, fontSize: 16 }}>{carrier.driverInsp}</div></div>
              <div><div style={{ fontSize: 11, color: '#64748b' }}>Drv OOS</div><div style={{ fontWeight: 700, fontSize: 16, color: carrier.driverOosInsp > 0 ? '#9f1239' : '#0f766e' }}>{carrier.driverOosInsp} <span style={{ fontSize: 10, fontWeight: 400 }}>({Math.round(carrier.driverOosRate)}%)</span></div></div>
              {carrier.crashTotal > 0 && (
                <div style={{ gridColumn: '1/-1', fontSize: 12, color: '#92400e', marginTop: 4 }}>
                  <b>Crashes:</b> {carrier.crashTotal} total · {carrier.fatalCrash} fatal · {carrier.injCrash} injury · {carrier.towawayCrash} tow
                </div>
              )}
            </div>
          )}

          {carrier.cargoTypes.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Cargo / Commodity Types</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {carrier.cargoTypes.map(c => <span key={c} className="tag tag-slate">{c}</span>)}
              </div>
            </div>
          )}

          <div style={{ background: basics?.alerts.length ? '#fff8f8' : basics?.hasAnyData ? '#f0fdfa' : '#f8fafc', borderRadius: 10, padding: 14, border: `1px solid ${basics?.alerts.length ? '#fda4af' : basics?.hasAnyData ? '#5eead4' : '#e2e8f0'}`, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#1b2a4a' }}>FMCSA SMS BASICs</div>
              {!basics && !basicsLoading && <button className="btn-s btn-sm" onClick={onLoadBasics} style={{ fontSize: 10 }}>Load BASICs</button>}
              {basicsLoading && <span style={{ fontSize: 11, color: '#64748b' }}>Loading…</span>}
              {basics && basics.alerts.length > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#9f1239' }}>{basics.alerts.length} Alert{basics.alerts.length > 1 ? 's' : ''}: {basics.alerts.join(', ')}</span>}
              {basics && basics.alerts.length === 0 && basics.hasAnyData && <span style={{ fontSize: 10, fontWeight: 700, color: '#0f766e' }}>No Active Alerts · {basics.totalViolations} total violations</span>}
              {basics && !basics.hasAnyData && <span style={{ fontSize: 10, color: '#94a3b8' }}>No public BASICs data</span>}
            </div>
            {basics?.hasAnyData ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0', fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ width: 130 }}>Category</div>
                  <div style={{ flex: 1 }}>Severity</div>
                  <div style={{ width: 70, textAlign: 'right' }}>Measure</div>
                  <div style={{ width: 70, textAlign: 'right' }}>Violations</div>
                  <div style={{ width: 84, textAlign: 'right' }}>Status</div>
                </div>
                {BASIC_LABELS.map(b => (
                  <BasicRow key={b.key} label={b.label} d={basics.details[b.key]} />
                ))}
                <div style={{ marginTop: 8, fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>
                  Note: SMS percentile rankings are restricted to authenticated portal users. The measure values, violation counts, and alert flags above are public.
                </div>
              </>
            ) : !basicsLoading && basics ? (
              <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>
                FMCSA returned no BASICs records for this carrier.
                <br /><span style={{ fontSize: 10 }}>Common for very small carriers without enough inspections to be evaluated.</span>
              </div>
            ) : !basics ? (
              <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '8px 0' }}>Click &ldquo;Load BASICs&rdquo; to pull live SMS data</div>
            ) : null}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {alreadyAdded
              ? <span style={{ fontSize: 12, color: '#0f766e', fontWeight: 600, padding: '8px 14px', background: '#f0fdfa', border: '1px solid #5eead4', borderRadius: 8 }}>Already in your leads</span>
              : <button className="btn-p" onClick={() => onImport(carrier, basics)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <IconPlus /> Import to Leads
                </button>
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
type SortMode = 'newest' | 'fleet' | 'state' | 'name';

const FILTER_DEFAULTS = {
  query: '', stateFilter: '', minUnits: '', maxUnits: '',
  renewalMonth: '', authorizedOnly: false, sortMode: 'newest' as SortMode,
};

export default function ProspectPage() {
  const addLead = useCRMStore(s => s.addLead);
  const leads = useCRMStore(s => s.leads);

  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [minUnits, setMinUnits] = useState('');
  const [maxUnits, setMaxUnits] = useState('');
  const [renewalMonth, setRenewalMonth] = useState('');
  const [authorizedOnly, setAuthorizedOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('newest');

  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('Searching FMCSA…');
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<FMCSACarrier[]>([]);
  const [searched, setSearched] = useState(false);
  const [searchMode, setSearchMode] = useState<'name'|'dot'|'state'|'all'|'new'|''>('');

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
      const monthIdx = MONTHS.indexOf(renewalMonth) + 1;
      list = list.filter(c => {
        if (!c.mcs150Date) return true;
        const m = parseInt(c.mcs150Date.slice(5, 7));
        return m === monthIdx;
      });
    }
    const sorted = [...list];
    if (sortMode === 'newest') sorted.sort((a, b) => Number(b.dotNumber) - Number(a.dotNumber));
    else if (sortMode === 'fleet') sorted.sort((a, b) => b.powerUnits - a.powerUnits);
    else if (sortMode === 'state') sorted.sort((a, b) => a.state.localeCompare(b.state) || a.legalName.localeCompare(b.legalName));
    else if (sortMode === 'name') sorted.sort((a, b) => a.legalName.localeCompare(b.legalName));
    return sorted;
  }, [stateFilter, minUnits, maxUnits, authorizedOnly, renewalMonth, sortMode]);

  const runSearch = useCallback(async (mode?: 'new') => {
    const q = query.trim();
    setLoading(true);
    setError(null);
    setSearched(false);
    setResults([]);
    setExpandedDot(null);

    try {
      let carriers: FMCSACarrier[] = [];

      if (mode === 'new') {
        setSearchMode('new');
        setLoadingMsg(`Sweeping FMCSA for new ventures${stateFilter ? ` in ${stateFilter}` : ''}…`);
        carriers = await fmcsaNewVentures(stateFilter || undefined, 500);
      } else if (/^\d{4,}$/.test(q)) {
        setSearchMode('dot');
        setLoadingMsg(`Looking up DOT# ${q}…`);
        const c = await fmcsaLookupDOT(q);
        if (c) carriers = [c];
        else setError(`No carrier found for DOT# ${q}`);
      } else if (q) {
        setSearchMode('name');
        setLoadingMsg(`Searching for "${q}"…`);
        carriers = await fmcsaSearchName(q, 100);
        if (carriers.length === 0) setError(`No carriers found matching "${q}"`);
      } else if (stateFilter) {
        setSearchMode('state');
        setLoadingMsg(`Browsing carriers in ${stateFilter}…`);
        carriers = await fmcsaBrowseState(stateFilter);
        if (carriers.length === 0) setError(`No carriers found for ${stateFilter}`);
      } else {
        setSearchMode('all');
        setLoadingMsg('Sweeping FMCSA database…');
        carriers = await fmcsaBrowseAll();
        if (carriers.length === 0) setError('No carriers returned. FMCSA may be slow — try again.');
      }

      const filtered = applyFilters(carriers);
      setResults(filtered);
      if (carriers.length > 0 && filtered.length === 0) {
        setError(`Found ${carriers.length} carriers but none match your filters. Try broadening the criteria.`);
      }
    } catch {
      setError('Failed to connect to FMCSA. Please try again.');
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }, [query, stateFilter, applyFilters]);

  const loadBasics = async (dot: string): Promise<FMCSABasicsResult | null> => {
    if (basicsByDot[dot]) return basicsByDot[dot];
    if (basicsLoadingDot === dot) return null;
    setBasicsLoadingDot(dot);
    try {
      const b = await fmcsaGetBasics(dot);
      if (b) {
        setBasicsByDot(prev => ({ ...prev, [dot]: b }));
        return b;
      }
      return null;
    } finally {
      setBasicsLoadingDot(null);
    }
  };

  const handleToggle = (dot: string) => {
    if (expandedDot === dot) setExpandedDot(null);
    else {
      setExpandedDot(dot);
      if (!basicsByDot[dot]) loadBasics(dot);
    }
  };

  // CRITICAL: always pull fresh BASICs before importing — even if not expanded.
  const importLead = async (c: FMCSACarrier, cachedBasics: FMCSABasicsResult | null) => {
    if (leads.find(l => l.dot === c.dotNumber)) return alert('This DOT# is already in your leads.');

    let basics: FMCSABasicsResult | null = cachedBasics ?? basicsByDot[c.dotNumber] ?? null;
    if (!basics) {
      setLoading(true);
      setLoadingMsg(`Pulling BASICs for ${c.legalName}…`);
      const fetched = await fmcsaGetBasics(c.dotNumber);
      basics = fetched;
      if (fetched) setBasicsByDot(prev => ({ ...prev, [c.dotNumber]: fetched }));
      setLoading(false);
    }

    addLead({
      id: 'l' + Date.now(),
      company: c.legalName, dot: c.dotNumber, contact: '', email: c.email, phone: c.phone,
      status: 'New Lead', producer: 'p1', lines: ['Auto Liability'], commodities: c.cargoTypes,
      violations: basics?.totalViolations ?? 0, hazmat: c.hmFlag, vehicles: '',
      notes: `Imported from FMCSA. ${c.city}, ${c.state}. Fleet: ${c.powerUnits} units. Safety: ${c.safetyRating}.`,
      premium: 0, markets: [], emails: [], docs: [],
      safer: toSaferData(c, basics, new Date().toISOString()),
      created: todayISO(),
      years: c.mcs150Date ? Math.max(0, new Date().getFullYear() - parseInt(c.mcs150Date.slice(0, 4) || '0')) : 0,
      fleet: c.powerUnits, boundDate: null,
    });
    alert(`${c.legalName} imported to Leads with full FMCSA data.`);
  };

  const handleReset = () => {
    setQuery(FILTER_DEFAULTS.query);
    setStateFilter(FILTER_DEFAULTS.stateFilter);
    setMinUnits(FILTER_DEFAULTS.minUnits);
    setMaxUnits(FILTER_DEFAULTS.maxUnits);
    setRenewalMonth(FILTER_DEFAULTS.renewalMonth);
    setAuthorizedOnly(FILTER_DEFAULTS.authorizedOnly);
    setSortMode(FILTER_DEFAULTS.sortMode);
    setResults([]);
    setSearched(false);
    setError(null);
    setExpandedDot(null);
    setSearchMode('');
  };

  const hasActiveFilters = query !== FILTER_DEFAULTS.query
    || stateFilter !== FILTER_DEFAULTS.stateFilter
    || minUnits !== FILTER_DEFAULTS.minUnits
    || maxUnits !== FILTER_DEFAULTS.maxUnits
    || renewalMonth !== FILTER_DEFAULTS.renewalMonth
    || authorizedOnly !== FILTER_DEFAULTS.authorizedOnly
    || searched;

  return (
    <>
      <div className="app-header">
        <h1>DOT Lead Prospector</h1>
        <div style={{ fontSize: 13, color: '#64748b' }}>Live FMCSA database — inspections, crashes, BASICs violations, fleet &amp; contact data</div>
      </div>
      <div className="content">
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 22, marginBottom: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1b2a4a', marginBottom: 3 }}>Search FMCSA Carrier Database</div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
            Click <b>Search</b> with no criteria for a broad sweep · Use filters to narrow · Click <b>New Ventures</b> for newest registrations · Click <b>Reset</b> to clear
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <input
              className="inp"
              placeholder="DOT# / Company Name (optional)"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runSearch()}
              style={{ flex: 2, minWidth: 220 }}
            />
            <button className="btn-p" onClick={() => runSearch()} disabled={loading} style={{ minWidth: 120, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <IconSearch /> {loading ? 'Searching…' : 'Search'}
            </button>
            <button onClick={() => runSearch('new')} disabled={loading}
              style={{ background: '#0f766e', color: '#fff', border: 'none', borderRadius: 10, padding: '0 16px', fontWeight: 600, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, minWidth: 140, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <IconSpark /> New Ventures
            </button>
            <button onClick={handleReset} disabled={loading || !hasActiveFilters}
              style={{ background: '#fff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 10, padding: '0 14px', fontWeight: 600, fontSize: 13, cursor: (loading || !hasActiveFilters) ? 'not-allowed' : 'pointer', opacity: (loading || !hasActiveFilters) ? 0.5 : 1, minWidth: 100, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <IconReset /> Reset
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>State:</label>
              <select className="sel" style={{ width: 110 }} value={stateFilter} onChange={e => setStateFilter(e.target.value)}>
                <option value="">Any State</option>
                {US_STATES.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Units Min:</label>
              <input className="inp" type="number" min="1" placeholder="1" value={minUnits} onChange={e => setMinUnits(e.target.value)} style={{ width: 64 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Max:</label>
              <input className="inp" type="number" min="1" placeholder="999" value={maxUnits} onChange={e => setMaxUnits(e.target.value)} style={{ width: 64 }} />
            </div>
            <div style={{ width: 1, height: 22, background: '#e2e8f0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Renewal Month:</label>
              <select className="sel" style={{ width: 96 }} value={renewalMonth} onChange={e => setRenewalMonth(e.target.value)}>
                <option value="">Any</option>
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>
              <input type="checkbox" checked={authorizedOnly} onChange={e => setAuthorizedOnly(e.target.checked)} style={{ accentColor: '#2563eb', width: 13, height: 13 }} />
              Authorized Only
            </label>
            <div style={{ width: 1, height: 22, background: '#e2e8f0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Sort:</label>
              <select className="sel" style={{ width: 130 }} value={sortMode} onChange={e => setSortMode(e.target.value as SortMode)}>
                <option value="newest">Newest DOT</option>
                <option value="fleet">Largest fleet</option>
                <option value="state">State / Name</option>
                <option value="name">Name (A–Z)</option>
              </select>
            </div>
          </div>
        </div>

        {loading && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
              <div className="loading-bar" />
            </div>
            <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center' }}>{loadingMsg}</div>
          </div>
        )}

        {error && (
          <div style={{ background: '#fff1f2', border: '1px solid #fda4af', borderRadius: 10, padding: '12px 16px', marginBottom: 14, color: '#9f1239', fontSize: 13 }}>
            {error}
          </div>
        )}

        {searched && !loading && results.length > 0 && (
          <div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span>{results.length} carrier{results.length !== 1 ? 's' : ''} found</span>
              {searchMode === 'new' && <span style={{ fontSize: 11, background: '#f0fdfa', color: '#0f766e', padding: '2px 8px', borderRadius: 100, fontWeight: 700 }}>New Ventures (newest DOTs first)</span>}
              {searchMode === 'all' && <span style={{ fontSize: 11, background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 100 }}>Database sweep</span>}
              {searchMode === 'state' && <span style={{ fontSize: 11, background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 100 }}>{stateFilter}</span>}
              {stateFilter && searchMode !== 'state' && <span style={{ fontSize: 11 }}>· {stateFilter} only</span>}
              {minUnits && <span style={{ fontSize: 11 }}>· {minUnits}+ units</span>}
              {maxUnits && <span style={{ fontSize: 11 }}>· ≤{maxUnits} units</span>}
              {renewalMonth && <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 100 }}>Renewal: {renewalMonth}</span>}
              {authorizedOnly && <span style={{ fontSize: 11, background: '#f0fdfa', color: '#0f766e', padding: '2px 8px', borderRadius: 100 }}>Authorized</span>}
            </div>
            {results.map(c => (
              <CarrierCard
                key={c.dotNumber} carrier={c} leads={leads} onImport={importLead}
                expanded={expandedDot === c.dotNumber}
                onToggle={() => handleToggle(c.dotNumber)}
                basics={basicsByDot[c.dotNumber] ?? null}
                basicsLoading={basicsLoadingDot === c.dotNumber}
                onLoadBasics={() => loadBasics(c.dotNumber)}
              />
            ))}
          </div>
        )}

        {!searched && !loading && (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 14, background: '#f1f5f9', color: '#64748b', marginBottom: 14 }}>
              <IconSearch size={26} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1b2a4a', marginBottom: 6 }}>Search the FMCSA database</div>
            <div style={{ fontSize: 13, maxWidth: 480, margin: '0 auto 28px', lineHeight: 1.6, color: '#64748b' }}>
              Just click <b>Search</b> for a broad database sweep, or use any combination of DOT#, name, state, fleet size, and renewal month to narrow down. Use <b>New Ventures</b> to find recently-registered carriers — perfect for fresh leads.
            </div>
          </div>
        )}
      </div>
    </>
  );
}
