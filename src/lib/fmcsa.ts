import type { SaferData, SaferBasics } from './types';

// ─── Raw FMCSA API shapes (verified against live API) ─────────────────────────
export interface FMCSARawCarrier {
  dotNumber?: number | string;
  legalName?: string;
  dbaName?: string;
  phyStreet?: string;
  phyCity?: string;
  phyState?: string;
  phyZipcode?: string;
  telephone?: string | number;
  fax?: string;
  emailAddress?: string;
  mileageYear?: number;
  mcs150Date?: string;
  mcs150Mileage?: number;
  drivers?: number;
  totalDrivers?: number;
  totalDriversAndOperators?: number;
  totalPowerUnits?: number;
  operatingStatus?: string;
  statusCode?: string;
  commonAuthorityStatus?: string;
  allowedToOperate?: string;
  safetyRating?: string;
  safetyRatingDate?: string;
  issScore?: number | null;
  carrierOperation?: { carrierOperationCode?: string; carrierOperationDesc?: string; code?: string; desc?: string };
  hmFlag?: number;
  pcFlag?: number;
  isPassengerCarrier?: string;
  mcNumber?: string | number;
  vehicleInsp?: number;
  vehicleOosInsp?: number;
  vehicleOosRate?: number;
  driverInsp?: number;
  driverOosInsp?: number;
  driverOosRate?: number;
  hazmatInsp?: number;
  hazmatOosInsp?: number;
  crashTotal?: number;
  fatalCrash?: number;
  injCrash?: number;
  towawayCrash?: number;
  bipdInsuranceOnFile?: string | number;
  bipdInsuranceRequired?: string;
  bipdRequiredAmount?: string;
  cargoInsuranceOnFile?: string | number;
  cargoInsuranceRequired?: string;
  bondInsuranceOnFile?: string | number;
}

export interface FMCSARawBasicItem {
  basic?: {
    basicsType?: { basicsCode?: string; basicsShortDesc?: string };
    basicsPercentile?: string | number;
    measureValue?: string | number;
    basicsViolationThreshold?: string | number;
    exceededFMCSAInterventionThreshold?: string | number;
    totalInspectionWithViolation?: number;
    totalViolation?: number;
    basicsRunDate?: string;
  };
}

export interface FMCSACargoItem {
  id?: number;
  cargoClassDesc?: string;
}

// ─── Enriched app types ──────────────────────────────────────────────────────
export interface FMCSACarrier {
  dotNumber: string;
  mcNumber: string;
  legalName: string;
  dbaName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  operatingStatus: string;
  authorityStatus: string;
  safetyRating: string;
  safetyRatingDate: string;
  powerUnits: number;
  drivers: number;
  mcs150Date: string;
  mcs150Mileage: number;
  mileageYear: number;
  hmFlag: boolean;
  pcFlag: boolean;
  cargoTypes: string[];
  allowedToOperate: boolean;
  opType: string;
  vehicleInsp: number;
  vehicleOosInsp: number;
  vehicleOosRate: number;
  driverInsp: number;
  driverOosInsp: number;
  driverOosRate: number;
  crashTotal: number;
  fatalCrash: number;
  injCrash: number;
  towawayCrash: number;
  bipdOnFile: boolean;
  bipdRequired: boolean;
  bipdAmount: string;
}

// Per-BASIC detail - much richer than just a percentile
export interface BasicDetail {
  percentile: number | null;        // SMS percentile (almost always null - "Not Public")
  measure: number | null;            // raw measure value (lower is better)
  threshold: number | null;          // intervention threshold (e.g., 65, 80)
  totalViolations: number;
  inspectionsWithViolations: number;
  alert: boolean;                    // exceededFMCSAInterventionThreshold === '1'
  notPublic: boolean;                // FMCSA hid the percentile
  hasData: boolean;                  // any data at all
  runDate: string;                   // when last computed
}

export interface FMCSABasicsResult {
  // Legacy fields (kept for compatibility) - just the percentile or null
  unsafeDriving: number | null;
  hoursOfService: number | null;
  driverFitness: number | null;
  controlledSubstances: number | null;
  vehicleMaintenance: number | null;
  crashIndicator: number | null;
  hmCompliance: number | null;
  alerts: string[];
  // Rich detail per category
  details: Record<string, BasicDetail>;
  hasAnyData: boolean;
  totalViolations: number;
  totalInspections: number;
}

// ─── Client API calls ────────────────────────────────────────────────────────
export async function fmcsaLookupDOT(dot: string): Promise<FMCSACarrier | null> {
  try {
    const res = await fetch(`/api/fmcsa/carrier/${dot.trim()}`);
    if (!res.ok) return null;
    const json = await res.json();
    const raw: FMCSARawCarrier = json?.carrier?.content?.carrier ?? json?.carrier?.carrier ?? null;
    if (!raw) return null;
    const cargoList: FMCSACargoItem[] = json?.cargo?.content?.cargoCarriedList ?? [];
    return normalizeCarrier(raw, cargoList);
  } catch {
    return null;
  }
}

export async function fmcsaSearchName(name: string, size = 100, start = 1): Promise<FMCSACarrier[]> {
  try {
    const res = await fetch(`/api/fmcsa/search?name=${encodeURIComponent(name)}&size=${size}&start=${start}`);
    if (!res.ok) return [];
    const json = await res.json();
    const rawContent = json?.content;
    const items: { carrier?: FMCSARawCarrier }[] = Array.isArray(rawContent)
      ? rawContent
      : (rawContent?.listCarrierItems ?? rawContent?.carrierList ?? json?.listCarrierItems ?? []);
    return items
      .map(i => normalizeCarrier(i.carrier ?? {}, []))
      .filter(c => c.legalName && c.legalName !== 'Unknown' && c.dotNumber);
  } catch {
    return [];
  }
}

// Broad terms used to sweep the carrier database
const BROAD_TERMS = [
  'TRANSPORT', 'TRUCKING', 'LOGISTICS', 'FREIGHT', 'EXPRESS',
  'CARRIER', 'HAULING', 'LLC', 'INC', 'SERVICES',
  'COMPANY', 'CORP', 'GROUP', 'ENTERPRISES', 'INDUSTRIES',
];

// Sweeps the FMCSA database with multiple broad searches and dedupes by DOT.
// Returns ~600-1500 unique carriers depending on hit rate.
export async function fmcsaBrowseAll(): Promise<FMCSACarrier[]> {
  try {
    const responses = await Promise.allSettled(
      BROAD_TERMS.map(t =>
        fetch(`/api/fmcsa/search?name=${encodeURIComponent(t)}&size=100&start=1`)
          .then(r => r.ok ? r.json() : { content: [] })
      )
    );

    const seen = new Set<string>();
    const carriers: FMCSACarrier[] = [];

    for (const r of responses) {
      if (r.status !== 'fulfilled') continue;
      const json = r.value;
      const rawContent = json?.content;
      const items: { carrier?: FMCSARawCarrier }[] = Array.isArray(rawContent)
        ? rawContent
        : (rawContent?.listCarrierItems ?? rawContent?.carrierList ?? []);
      for (const i of items) {
        const c = normalizeCarrier(i.carrier ?? {}, []);
        if (!c.dotNumber || c.legalName === 'Unknown' || seen.has(c.dotNumber)) continue;
        seen.add(c.dotNumber);
        carriers.push(c);
      }
    }
    return carriers;
  } catch {
    return [];
  }
}

// Browse carriers in a specific state - sweeps broad terms then filters.
export async function fmcsaBrowseState(state: string): Promise<FMCSACarrier[]> {
  const all = await fmcsaBrowseAll();
  return all.filter(c => c.state.toUpperCase() === state.toUpperCase());
}

// New Ventures: sort all carriers by DOT# descending (higher = newer registration).
// Optionally filter by state.
export async function fmcsaNewVentures(state?: string, limit = 300): Promise<FMCSACarrier[]> {
  const all = state ? await fmcsaBrowseState(state) : await fmcsaBrowseAll();
  return all
    .sort((a, b) => Number(b.dotNumber) - Number(a.dotNumber))
    .slice(0, limit);
}

export async function fmcsaGetBasics(dot: string): Promise<FMCSABasicsResult | null> {
  try {
    const res = await fetch(`/api/fmcsa/basics/${dot.trim()}`);
    if (!res.ok) return null;
    const json = await res.json();
    return normalizeBasics(json);
  } catch {
    return null;
  }
}

// ─── Normalizers ──────────────────────────────────────────────────────────────
function normalizeCarrier(raw: FMCSARawCarrier, cargo: FMCSACargoItem[]): FMCSACarrier {
  const phoneRaw = String(raw.telephone ?? '').replace(/\D/g, '');
  const phone = phoneRaw.length === 10
    ? `(${phoneRaw.slice(0, 3)}) ${phoneRaw.slice(3, 6)}-${phoneRaw.slice(6)}`
    : phoneRaw || '';

  const mcs150 = raw.mcs150Date ?? '';
  const formattedMCS = mcs150.length === 8
    ? `${mcs150.slice(0, 4)}-${mcs150.slice(4, 6)}-${mcs150.slice(6)}`
    : mcs150;

  const cargoTypes = cargo.map(c => c.cargoClassDesc ?? '').filter(Boolean);
  const dbaRaw = raw.dbaName ?? '';
  const dba = (dbaRaw === '--' || dbaRaw === '0') ? '' : dbaRaw;

  const statusMap: Record<string, string> = { A: 'Active', I: 'Inactive', X: 'Out of Service', R: 'Revoked' };
  const opStatus = raw.operatingStatus
    || (raw.statusCode ? (statusMap[raw.statusCode] ?? raw.statusCode) : 'Unknown');

  const authMap: Record<string, string> = { A: 'Authorized', I: 'Inactive', N: 'None' };
  const authStatus = raw.commonAuthorityStatus
    ? (authMap[raw.commonAuthorityStatus] ?? raw.commonAuthorityStatus) : '';

  const opType = raw.carrierOperation?.carrierOperationDesc || raw.carrierOperation?.desc || '';
  const drivers = raw.totalDrivers ?? raw.drivers ?? raw.totalDriversAndOperators ?? 0;

  return {
    dotNumber: String(raw.dotNumber ?? ''),
    mcNumber: String(raw.mcNumber ?? ''),
    legalName: raw.legalName ?? 'Unknown',
    dbaName: dba,
    address: raw.phyStreet ?? '',
    city: raw.phyCity ?? '',
    state: raw.phyState ?? '',
    zip: raw.phyZipcode ?? '',
    phone,
    email: raw.emailAddress ?? '',
    operatingStatus: opStatus,
    authorityStatus: authStatus,
    safetyRating: raw.safetyRating ?? 'Not Rated',
    safetyRatingDate: raw.safetyRatingDate ?? '',
    powerUnits: raw.totalPowerUnits ?? 0,
    drivers,
    mcs150Date: formattedMCS,
    mcs150Mileage: raw.mcs150Mileage ?? 0,
    mileageYear: raw.mileageYear ?? 0,
    hmFlag: (raw.hmFlag ?? 0) === 1,
    pcFlag: (raw.pcFlag ?? 0) === 1 || raw.isPassengerCarrier === 'Y',
    cargoTypes,
    allowedToOperate: (raw.allowedToOperate ?? 'Y') === 'Y',
    opType,
    vehicleInsp: raw.vehicleInsp ?? 0,
    vehicleOosInsp: raw.vehicleOosInsp ?? 0,
    vehicleOosRate: raw.vehicleOosRate ?? 0,
    driverInsp: raw.driverInsp ?? 0,
    driverOosInsp: raw.driverOosInsp ?? 0,
    driverOosRate: raw.driverOosRate ?? 0,
    crashTotal: raw.crashTotal ?? 0,
    fatalCrash: raw.fatalCrash ?? 0,
    injCrash: raw.injCrash ?? 0,
    towawayCrash: raw.towawayCrash ?? 0,
    bipdOnFile: Number(raw.bipdInsuranceOnFile ?? 0) > 0,
    bipdRequired: raw.bipdInsuranceRequired === 'Y',
    bipdAmount: raw.bipdRequiredAmount ?? '',
  };
}

// FMCSA `basicsPercentile` is "Not Public" for virtually every carrier in the
// public API — that's not a bug, it's by design. So this normalizer surfaces
// the actually-useful fields: measure, violations, inspections, threshold, alert.
export function normalizeBasics(json: Record<string, unknown>): FMCSABasicsResult {
  const empty: FMCSABasicsResult = {
    unsafeDriving: null, hoursOfService: null, driverFitness: null,
    controlledSubstances: null, vehicleMaintenance: null, crashIndicator: null,
    hmCompliance: null, alerts: [], details: {}, hasAnyData: false,
    totalViolations: 0, totalInspections: 0,
  };

  const content = json?.content;
  if (!Array.isArray(content) || content.length === 0) return empty;

  type BasicItem = NonNullable<FMCSARawBasicItem['basic']>;

  const buildDetail = (b?: BasicItem): BasicDetail => {
    if (!b) return {
      percentile: null, measure: null, threshold: null,
      totalViolations: 0, inspectionsWithViolations: 0,
      alert: false, notPublic: false, hasData: false, runDate: '',
    };
    const pStr = b.basicsPercentile;
    const notPublic = pStr === 'Not Public';
    let percentile: number | null = null;
    if (!notPublic && pStr != null && pStr !== '') {
      const n = Number(pStr);
      if (!isNaN(n)) percentile = Math.round(n);
    }
    const mStr = b.measureValue;
    let measure: number | null = null;
    if (mStr != null && mStr !== '' && mStr !== 'Not Public') {
      const n = Number(mStr);
      if (!isNaN(n)) measure = n;
    }
    const tStr = b.basicsViolationThreshold;
    const threshold = tStr != null ? Number(tStr) : null;
    return {
      percentile,
      measure,
      threshold: !isNaN(Number(threshold)) ? Number(threshold) : null,
      totalViolations: b.totalViolation ?? 0,
      inspectionsWithViolations: b.totalInspectionWithViolation ?? 0,
      alert: String(b.exceededFMCSAInterventionThreshold) === '1',
      notPublic,
      hasData: percentile != null || measure != null || (b.totalViolation ?? 0) > 0,
      runDate: b.basicsRunDate ?? '',
    };
  };

  const items = content as { basic?: BasicItem }[];
  const find = (keys: string[]) => items.find(item => {
    const code = (item.basic?.basicsType?.basicsCode ?? '').toUpperCase();
    return keys.some(k => code.includes(k.toUpperCase()));
  })?.basic;

  const ud = buildDetail(find(['UNSAFE']));
  const hos = buildDetail(find(['HOS', 'HOURS-OF-SERVICE', 'HOURS OF SERVICE']));
  const df = buildDetail(find(['DRIVER FIT', 'FITNESS']));
  const cs = buildDetail(find(['DRUG', 'ALCOHOL', 'CONTROLLED']));
  const vm = buildDetail(find(['VEHICLE MAINT', 'VEHICLE M']));
  const ci = buildDetail(find(['CRASH']));
  const hm = buildDetail(find(['HAZMAT', 'HM COMPLI']));

  const alerts: string[] = [];
  if (ud.alert) alerts.push('Unsafe Driving');
  if (hos.alert) alerts.push('HOS Compliance');
  if (df.alert) alerts.push('Driver Fitness');
  if (cs.alert) alerts.push('Controlled Substances');
  if (vm.alert) alerts.push('Vehicle Maintenance');
  if (ci.alert) alerts.push('Crash Indicator');
  if (hm.alert) alerts.push('HM Compliance');

  const allDetails = { unsafeDriving: ud, hoursOfService: hos, driverFitness: df,
    controlledSubstances: cs, vehicleMaintenance: vm, crashIndicator: ci, hmCompliance: hm };

  const totalViolations = Object.values(allDetails).reduce((s, d) => s + d.totalViolations, 0);
  const totalInspections = Object.values(allDetails).reduce((s, d) => s + d.inspectionsWithViolations, 0);
  const hasAnyData = Object.values(allDetails).some(d => d.hasData);

  return {
    unsafeDriving: ud.percentile, hoursOfService: hos.percentile, driverFitness: df.percentile,
    controlledSubstances: cs.percentile, vehicleMaintenance: vm.percentile,
    crashIndicator: ci.percentile, hmCompliance: hm.percentile,
    alerts, details: allDetails, hasAnyData, totalViolations, totalInspections,
  };
}

// ─── Convert to SaferData ─────────────────────────────────────────────────────
export function toSaferData(carrier: FMCSACarrier, basics: FMCSABasicsResult | null, fetchedAt?: string): SaferData {
  const b: SaferBasics = {
    unsafeDriving: basics?.unsafeDriving ?? null,
    hoursOfService: basics?.hoursOfService ?? null,
    driverFitness: basics?.driverFitness ?? null,
    controlledSubstances: basics?.controlledSubstances ?? null,
    vehicleMaintenance: basics?.vehicleMaintenance ?? null,
    crashIndicator: basics?.crashIndicator ?? null,
    hmCompliance: basics?.hmCompliance ?? null,
  };
  const totalInsp = (carrier.vehicleInsp || 0) + (carrier.driverInsp || 0);
  return {
    legalName: carrier.legalName,
    dotNumber: carrier.dotNumber,
    mcNumber: carrier.mcNumber,
    address: [carrier.address, carrier.city, carrier.state, carrier.zip].filter(Boolean).join(', '),
    phone: carrier.phone,
    opType: carrier.opType || carrier.operatingStatus,
    safetyRating: carrier.safetyRating,
    mcs150: {
      lastUpdate: carrier.mcs150Date, mileage: carrier.mcs150Mileage,
      drivers: carrier.drivers, powerUnits: carrier.powerUnits, year: carrier.mileageYear,
    },
    insurance: {
      current: carrier.bipdRequired ? `BIPD Required: $${carrier.bipdAmount}k` : '',
      policy: carrier.bipdOnFile ? 'On File' : 'Not On File',
      effective: '', expiration: '',
      coverage: carrier.bipdAmount ? `$${carrier.bipdAmount},000` : '',
    },
    insuranceHistory: [],
    basics: b,
    inspections: {
      total: totalInsp, vOOS: carrier.vehicleOosInsp, dOOS: carrier.driverOosInsp,
      vRate: carrier.vehicleOosRate, dRate: carrier.driverOosRate,
    },
    inspectionDetail: [],
    crashes: {
      total: carrier.crashTotal, fatal: carrier.fatalCrash,
      injury: carrier.injCrash, tow: carrier.towawayCrash,
    },
    ...(fetchedAt ? { fetchedAt } : {}),
  } as SaferData & { fetchedAt?: string };
}

export function safetyRatingColor(rating: string): { bg: string; color: string } {
  const r = (rating ?? '').toLowerCase();
  if (r.includes('satisfactory')) return { bg: '#f0fdfa', color: '#0f766e' };
  if (r.includes('conditional')) return { bg: '#fef3c7', color: '#92400e' };
  if (r.includes('unsatisfactory')) return { bg: '#fff1f2', color: '#9f1239' };
  return { bg: '#f1f5f9', color: '#64748b' };
}

export function operatingStatusColor(status: string): { bg: string; color: string } {
  const s = (status ?? '').toLowerCase();
  if (s.includes('active') || s.includes('authorized')) return { bg: '#f0fdfa', color: '#0f766e' };
  if (s.includes('inactive') || s.includes('out-of-service') || s.includes('revoked')) return { bg: '#fff1f2', color: '#9f1239' };
  return { bg: '#f1f5f9', color: '#64748b' };
}
