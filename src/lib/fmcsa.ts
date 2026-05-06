import type { SaferData, SaferBasics } from './types';

// ─── Raw FMCSA API shapes ──────────────────────────────────────────────────────
// Field names match the ACTUAL API responses (confirmed via live testing)
export interface FMCSARawCarrier {
  dotNumber?: number | string;
  legalName?: string;
  dbaName?: string;
  phyStreet?: string;
  phyCity?: string;
  phyState?: string;
  phyZipcode?: string;   // API returns phyZipcode, NOT phyZip
  telephone?: string | number;
  fax?: string;
  emailAddress?: string;
  mileageYear?: number;
  mcs150Date?: string;
  mcs150Mileage?: number;
  // Driver counts (API returns totalDrivers, not drivers)
  drivers?: number;
  totalDrivers?: number;
  totalDriversAndOperators?: number;
  totalPowerUnits?: number;
  // Status / authority
  operatingStatus?: string;
  statusCode?: string;
  commonAuthorityStatus?: string;
  allowedToOperate?: string;
  // Safety
  safetyRating?: string;
  safetyRatingDate?: string;
  issScore?: number | null;
  // Operation type
  carrierOperation?: { carrierOperationCode?: string; carrierOperationDesc?: string; code?: string; desc?: string };
  // Flags
  hmFlag?: number;
  pcFlag?: number;
  isPassengerCarrier?: string;
  // MC / identifiers
  mcNumber?: string | number;
  // Inspections — embedded directly in carrier response
  vehicleInsp?: number;
  vehicleOosInsp?: number;
  vehicleOosRate?: number;
  driverInsp?: number;
  driverOosInsp?: number;
  driverOosRate?: number;
  hazmatInsp?: number;
  hazmatOosInsp?: number;
  // Crashes — embedded directly in carrier response
  crashTotal?: number;
  fatalCrash?: number;
  injCrash?: number;
  towawayCrash?: number;
  // Insurance on file
  bipdInsuranceOnFile?: string | number;
  bipdInsuranceRequired?: string;
  bipdRequiredAmount?: string;
  cargoInsuranceOnFile?: string | number;
  cargoInsuranceRequired?: string;
  bondInsuranceOnFile?: string | number;
}

// BASICs list item as returned by the /basics endpoint
export interface FMCSARawBasicItem {
  basic?: {
    basicsType?: { basicsCode?: string; basicsShortDesc?: string };
    basicsPercentile?: string | number;
    measureValue?: string | number;
    exceededFMCSAInterventionThreshold?: string | number;
    basicsViolationThreshold?: string | number;
    totalInspectionWithViolation?: number;
    totalViolation?: number;
  };
}

export interface FMCSACargoItem {
  id?: number;
  cargoClassDesc?: string;
}

// ─── Enriched shape used in the app ──────────────────────────────────────────
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
  // Inspections (from carrier response)
  vehicleInsp: number;
  vehicleOosInsp: number;
  vehicleOosRate: number;
  driverInsp: number;
  driverOosInsp: number;
  driverOosRate: number;
  // Crashes (from carrier response)
  crashTotal: number;
  fatalCrash: number;
  injCrash: number;
  towawayCrash: number;
  // Insurance summary
  bipdOnFile: boolean;
  bipdRequired: boolean;
  bipdAmount: string;
}

export interface FMCSABasicsResult {
  unsafeDriving: number | null;
  hoursOfService: number | null;
  driverFitness: number | null;
  controlledSubstances: number | null;
  vehicleMaintenance: number | null;
  crashIndicator: number | null;
  hmCompliance: number | null;
  alerts: string[];
}

// ─── API calls (hit our Next.js proxy routes) ─────────────────────────────────
export async function fmcsaLookupDOT(dot: string): Promise<FMCSACarrier | null> {
  try {
    const res = await fetch(`/api/fmcsa/carrier/${dot.trim()}`);
    if (!res.ok) return null;
    const json = await res.json();

    // Full carrier lookup: content.carrier
    const raw: FMCSARawCarrier = json?.carrier?.content?.carrier ?? json?.carrier?.carrier ?? null;
    if (!raw) return null;

    const cargoList: FMCSACargoItem[] = json?.cargo?.content?.cargoCarriedList ?? [];

    return normalizeCarrier(raw, cargoList);
  } catch {
    return null;
  }
}

export async function fmcsaSearchName(name: string): Promise<FMCSACarrier[]> {
  try {
    const res = await fetch(`/api/fmcsa/search?name=${encodeURIComponent(name)}&size=100`);
    if (!res.ok) return [];
    const json = await res.json();

    // Name search: content is directly an array of { carrier, _links }
    const rawContent = json?.content;
    const items: { carrier?: FMCSARawCarrier }[] = Array.isArray(rawContent)
      ? rawContent
      : (rawContent?.listCarrierItems ?? rawContent?.carrierList ?? json?.listCarrierItems ?? []);

    return items
      .map(i => normalizeCarrier(i.carrier ?? {}, []))
      .filter(c => c.legalName && c.legalName !== 'Unknown');
  } catch {
    return [];
  }
}

export async function fmcsaBrowseState(state: string): Promise<FMCSACarrier[]> {
  // FMCSA doesn't support pure state browsing — search broad terms + filter
  try {
    const terms = ['TRANSPORT', 'TRUCKING', 'FREIGHT', 'LOGISTICS', 'CARRIER'];
    const results = await Promise.all(
      terms.map(t =>
        fetch(`/api/fmcsa/search?name=${encodeURIComponent(t)}&size=100`)
          .then(r => r.ok ? r.json() : { content: [] })
          .catch(() => ({ content: [] }))
      )
    );

    const seen = new Set<string>();
    const carriers: FMCSACarrier[] = [];
    for (const json of results) {
      const rawContent = json?.content;
      const items: { carrier?: FMCSARawCarrier }[] = Array.isArray(rawContent)
        ? rawContent
        : (rawContent?.listCarrierItems ?? rawContent?.carrierList ?? []);
      for (const i of items) {
        const c = normalizeCarrier(i.carrier ?? {}, []);
        if (c.state.toUpperCase() === state.toUpperCase() && !seen.has(c.dotNumber)) {
          seen.add(c.dotNumber);
          carriers.push(c);
        }
      }
    }
    return carriers;
  } catch {
    return [];
  }
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

// ─── Normalize raw API response → our types ───────────────────────────────────
function normalizeCarrier(raw: FMCSARawCarrier, cargo: FMCSACargoItem[]): FMCSACarrier {
  const phoneRaw = String(raw.telephone ?? '').replace(/\D/g, '');
  const phone = phoneRaw.length === 10
    ? `(${phoneRaw.slice(0, 3)}) ${phoneRaw.slice(3, 6)}-${phoneRaw.slice(6)}`
    : phoneRaw || '';

  const mcs150 = raw.mcs150Date ?? '';
  const formattedMCS = mcs150.length === 8
    ? `${mcs150.slice(0, 4)}-${mcs150.slice(4, 6)}-${mcs150.slice(6)}`
    : mcs150;

  const cargoTypes = cargo
    .map(c => c.cargoClassDesc ?? '')
    .filter(Boolean);

  // DBA: treat "--" and "0" as empty
  const dbaRaw = raw.dbaName ?? '';
  const dba = (dbaRaw === '--' || dbaRaw === '0') ? '' : dbaRaw;

  // Operating status: map statusCode to human-readable
  const statusMap: Record<string, string> = {
    A: 'Active', I: 'Inactive', X: 'Out of Service', R: 'Revoked',
  };
  const opStatus = raw.operatingStatus
    || (raw.statusCode ? (statusMap[raw.statusCode] ?? raw.statusCode) : 'Unknown');

  // Authority: commonAuthorityStatus
  const authMap: Record<string, string> = {
    A: 'Authorized', I: 'Inactive', N: 'None',
  };
  const authStatus = raw.commonAuthorityStatus
    ? (authMap[raw.commonAuthorityStatus] ?? raw.commonAuthorityStatus)
    : '';

  // Op type from carrierOperation (handles both response formats)
  const opType = raw.carrierOperation?.carrierOperationDesc
    || raw.carrierOperation?.desc
    || '';

  // Drivers
  const drivers = raw.totalDrivers ?? raw.drivers ?? raw.totalDriversAndOperators ?? 0;

  return {
    dotNumber: String(raw.dotNumber ?? ''),
    mcNumber: String(raw.mcNumber ?? ''),
    legalName: raw.legalName ?? 'Unknown',
    dbaName: dba,
    address: raw.phyStreet ?? '',
    city: raw.phyCity ?? '',
    state: raw.phyState ?? '',
    zip: raw.phyZipcode ?? '',   // ← correct field name from API
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
    hmFlag: (raw.hmFlag ?? 0) === 1 || raw.isPassengerCarrier === 'Y',
    pcFlag: (raw.pcFlag ?? 0) === 1,
    cargoTypes,
    allowedToOperate: (raw.allowedToOperate ?? 'Y') === 'Y',
    opType,
    // Inspections (embedded in carrier response)
    vehicleInsp: raw.vehicleInsp ?? 0,
    vehicleOosInsp: raw.vehicleOosInsp ?? 0,
    vehicleOosRate: raw.vehicleOosRate ?? 0,
    driverInsp: raw.driverInsp ?? 0,
    driverOosInsp: raw.driverOosInsp ?? 0,
    driverOosRate: raw.driverOosRate ?? 0,
    // Crashes (embedded in carrier response)
    crashTotal: raw.crashTotal ?? 0,
    fatalCrash: raw.fatalCrash ?? 0,
    injCrash: raw.injCrash ?? 0,
    towawayCrash: raw.towawayCrash ?? 0,
    // Insurance
    bipdOnFile: Number(raw.bipdInsuranceOnFile ?? 0) > 0,
    bipdRequired: raw.bipdInsuranceRequired === 'Y',
    bipdAmount: raw.bipdRequiredAmount ?? '',
  };
}

// ─── Normalize BASICs response ────────────────────────────────────────────────
// The /basics endpoint returns: content = array of { basic: { basicsType: { basicsCode }, measureValue, basicsPercentile, exceededFMCSAInterventionThreshold }, _links }
export function normalizeBasics(json: Record<string, unknown>): FMCSABasicsResult {
  const empty: FMCSABasicsResult = {
    unsafeDriving: null, hoursOfService: null, driverFitness: null,
    controlledSubstances: null, vehicleMaintenance: null, crashIndicator: null,
    hmCompliance: null, alerts: [],
  };

  const content = json?.content;
  if (!Array.isArray(content) || content.length === 0) return empty;

  type BasicItem = {
    basic?: {
      basicsType?: { basicsCode?: string; basicsShortDesc?: string };
      basicsPercentile?: string | number;
      measureValue?: string | number;
      exceededFMCSAInterventionThreshold?: string | number;
    };
  };

  const items = content as BasicItem[];

  const getScore = (item?: BasicItem): number | null => {
    if (!item?.basic) return null;
    const b = item.basic;
    // basicsPercentile can be "Not Public" — treat as null
    if (b.basicsPercentile != null && b.basicsPercentile !== 'Not Public' && b.basicsPercentile !== '') {
      const n = Number(b.basicsPercentile);
      if (!isNaN(n)) return Math.round(n);
    }
    if (b.measureValue != null && b.measureValue !== '' && b.measureValue !== '0') {
      const n = Number(b.measureValue);
      if (!isNaN(n) && n > 0) return Math.round(n);
    }
    return null;
  };

  const isAlert = (item?: BasicItem): boolean => {
    const v = item?.basic?.exceededFMCSAInterventionThreshold;
    return v === '1' || v === 1;
  };

  const find = (keys: string[]) => items.find(item => {
    const code = (item.basic?.basicsType?.basicsCode ?? '').toUpperCase();
    return keys.some(k => code.includes(k.toUpperCase()));
  });

  const ud = find(['UNSAFE']);
  const hos = find(['HOS', 'HOURS-OF-SERVICE', 'HOURS OF SERVICE']);
  const df = find(['DRIVER FIT', 'FITNESS']);
  const cs = find(['DRUG', 'ALCOHOL', 'CONTROLLED']);
  const vm = find(['VEHICLE MAINT', 'VEHICLE M']);
  const ci = find(['CRASH']);
  const hm = find(['HAZMAT', 'HM COMPLI']);

  const alerts: string[] = [];
  if (isAlert(ud)) alerts.push('Unsafe Driving');
  if (isAlert(hos)) alerts.push('HOS Compliance');
  if (isAlert(df)) alerts.push('Driver Fitness');
  if (isAlert(cs)) alerts.push('Controlled Substances');
  if (isAlert(vm)) alerts.push('Vehicle Maintenance');
  if (isAlert(ci)) alerts.push('Crash Indicator');
  if (isAlert(hm)) alerts.push('HM Compliance');

  return {
    unsafeDriving: getScore(ud),
    hoursOfService: getScore(hos),
    driverFitness: getScore(df),
    controlledSubstances: getScore(cs),
    vehicleMaintenance: getScore(vm),
    crashIndicator: getScore(ci),
    hmCompliance: getScore(hm),
    alerts,
  };
}

// ─── Convert FMCSACarrier + basics → SaferData for the lead store ─────────────
export function toSaferData(
  carrier: FMCSACarrier,
  basics: FMCSABasicsResult | null,
  fetchedAt?: string
): SaferData {
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
      lastUpdate: carrier.mcs150Date,
      mileage: carrier.mcs150Mileage,
      drivers: carrier.drivers,
      powerUnits: carrier.powerUnits,
      year: carrier.mileageYear,
    },
    insurance: {
      current: carrier.bipdRequired ? `BIPD Required: $${carrier.bipdAmount}k` : '',
      policy: carrier.bipdOnFile ? 'On File' : 'Not On File',
      effective: '',
      expiration: '',
      coverage: carrier.bipdAmount ? `$${carrier.bipdAmount},000` : '',
    },
    insuranceHistory: [],
    basics: b,
    inspections: {
      total: totalInsp,
      vOOS: carrier.vehicleOosInsp,
      dOOS: carrier.driverOosInsp,
      vRate: carrier.vehicleOosRate,
      dRate: carrier.driverOosRate,
    },
    inspectionDetail: [],
    crashes: {
      total: carrier.crashTotal,
      fatal: carrier.fatalCrash,
      injury: carrier.injCrash,
      tow: carrier.towawayCrash,
    },
    ...(fetchedAt ? { fetchedAt } : {}),
  } as SaferData & { fetchedAt?: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
