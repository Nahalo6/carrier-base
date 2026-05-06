import type { SaferData, SaferBasics } from './types';

// ─── Raw FMCSA API shapes ──────────────────────────────────────────────────────
export interface FMCSARawCarrier {
  dotNumber?: number | string;
  legalName?: string;
  dbaName?: string;
  phyStreet?: string;
  phyCity?: string;
  phyState?: string;
  phyZip?: string;
  telephone?: string;
  fax?: string;
  emailAddress?: string;
  mileageYear?: number;
  mcs150Date?: string;
  mcs150Mileage?: number;
  drivers?: number;
  totalDriversAndOperators?: number;
  totalPowerUnits?: number;
  operatingStatus?: string;
  safetyRating?: string;
  safetyRatingDate?: string;
  carrierOperation?: { code?: string; desc?: string };
  hmFlag?: number;
  pcFlag?: number;
  mcNumber?: string | number;
  statusCode?: string;
  allowedToOperate?: string;
}

export interface FMCSARawBasicItem {
  basicType?: string;
  basic?: string;
  basicsValue?: number;
  basicsPercentile?: number;
  percentile?: number;
  measure?: number;
  alertIndicator?: string;
  onRoadPerformanceBasic?: { measure?: number; percentile?: number };
  violationThrshld?: number;
  totalVehicleInspections?: number;
  totalDriverInspections?: number;
}

export interface FMCSARawBasics {
  UNSAFE_DRIVING?: FMCSARawBasicItem;
  HOS_COMPLIANCE?: FMCSARawBasicItem;
  DRIVER_FITNESS?: FMCSARawBasicItem;
  CONTROLLED_SUBS?: FMCSARawBasicItem;
  VEHICLE_MAINT?: FMCSARawBasicItem;
  CRASH_INDICATOR?: FMCSARawBasicItem;
  HM_COMPLIANCE?: FMCSARawBasicItem;
  basicsInfoList?: FMCSARawBasicItem[];
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
    const res = await fetch(`/api/fmcsa/search?name=${encodeURIComponent(name)}&size=50`);
    if (!res.ok) return [];
    const json = await res.json();

    // The API may return listCarrierItems or similar
    const items: { carrier?: FMCSARawCarrier }[] =
      json?.content?.listCarrierItems ??
      json?.content?.carrierList ??
      json?.listCarrierItems ??
      [];

    return items.map(i => normalizeCarrier(i.carrier ?? {}, []));
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
  const phone = String(raw.telephone ?? '');
  const formattedPhone = phone.length === 10
    ? `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`
    : phone;

  const mcs150 = raw.mcs150Date ?? '';
  const formattedMCS = mcs150.length === 8
    ? `${mcs150.slice(0, 4)}-${mcs150.slice(4, 6)}-${mcs150.slice(6)}`
    : mcs150;

  const cargoTypes = cargo
    .map(c => c.cargoClassDesc ?? '')
    .filter(Boolean);

  return {
    dotNumber: String(raw.dotNumber ?? ''),
    mcNumber: String(raw.mcNumber ?? ''),
    legalName: raw.legalName ?? 'Unknown',
    dbaName: raw.dbaName ?? '',
    address: raw.phyStreet ?? '',
    city: raw.phyCity ?? '',
    state: raw.phyState ?? '',
    zip: raw.phyZip ?? '',
    phone: formattedPhone,
    email: raw.emailAddress ?? '',
    operatingStatus: raw.operatingStatus ?? raw.statusCode ?? 'Unknown',
    safetyRating: raw.safetyRating ?? 'Not Rated',
    safetyRatingDate: raw.safetyRatingDate ?? '',
    powerUnits: raw.totalPowerUnits ?? 0,
    drivers: raw.drivers ?? raw.totalDriversAndOperators ?? 0,
    mcs150Date: formattedMCS,
    mcs150Mileage: raw.mcs150Mileage ?? 0,
    mileageYear: raw.mileageYear ?? 0,
    hmFlag: (raw.hmFlag ?? 0) === 1,
    pcFlag: (raw.pcFlag ?? 0) === 1,
    cargoTypes,
    allowedToOperate: (raw.allowedToOperate ?? 'Y') === 'Y',
    opType: raw.carrierOperation?.desc ?? raw.operatingStatus ?? '',
  };
}

export function normalizeBasics(json: Record<string, unknown>): FMCSABasicsResult {
  // Handle both flat object and list formats
  const content = (json?.content ?? json) as Record<string, unknown>;
  const basicsList = (content?.basicsInfoList ?? []) as FMCSARawBasicItem[];
  const flat = content as FMCSARawBasics;

  const getPercentile = (item?: FMCSARawBasicItem): number | null => {
    if (!item) return null;
    const val = item.basicsPercentile ?? item.percentile
      ?? item.onRoadPerformanceBasic?.percentile
      ?? item.basicsValue ?? item.measure;
    return val != null ? Math.round(Number(val)) : null;
  };

  const isAlert = (item?: FMCSARawBasicItem): boolean =>
    item?.alertIndicator === 'Y' || item?.alertIndicator === '1';

  // Try list format first
  let ud: FMCSARawBasicItem | undefined;
  let hos: FMCSARawBasicItem | undefined;
  let df: FMCSARawBasicItem | undefined;
  let cs: FMCSARawBasicItem | undefined;
  let vm: FMCSARawBasicItem | undefined;
  let ci: FMCSARawBasicItem | undefined;
  let hm: FMCSARawBasicItem | undefined;

  if (basicsList.length > 0) {
    const find = (keys: string[]) => basicsList.find(b => {
      const t = (b.basicType ?? b.basic ?? '').toUpperCase();
      return keys.some(k => t.includes(k));
    });
    ud = find(['UNSAFE', 'UNSAFE_DRIVING']);
    hos = find(['HOS', 'HOURS']);
    df = find(['DRIVER_FIT', 'FITNESS']);
    cs = find(['CONTROLLED', 'DRUG', 'ALCOHOL']);
    vm = find(['VEHICLE_MAINT', 'MAINTENANCE', 'MAINT']);
    ci = find(['CRASH']);
    hm = find(['HM', 'HAZMAT']);
  } else {
    // Try flat object format
    ud = flat.UNSAFE_DRIVING;
    hos = flat.HOS_COMPLIANCE;
    df = flat.DRIVER_FITNESS;
    cs = flat.CONTROLLED_SUBS;
    vm = flat.VEHICLE_MAINT;
    ci = flat.CRASH_INDICATOR;
    hm = flat.HM_COMPLIANCE;
  }

  const alerts: string[] = [];
  if (isAlert(ud)) alerts.push('Unsafe Driving');
  if (isAlert(hos)) alerts.push('HOS Compliance');
  if (isAlert(df)) alerts.push('Driver Fitness');
  if (isAlert(cs)) alerts.push('Controlled Substances');
  if (isAlert(vm)) alerts.push('Vehicle Maintenance');
  if (isAlert(ci)) alerts.push('Crash Indicator');
  if (isAlert(hm)) alerts.push('HM Compliance');

  return {
    unsafeDriving: getPercentile(ud),
    hoursOfService: getPercentile(hos),
    driverFitness: getPercentile(df),
    controlledSubstances: getPercentile(cs),
    vehicleMaintenance: getPercentile(vm),
    crashIndicator: getPercentile(ci),
    hmCompliance: getPercentile(hm),
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
      current: '',
      policy: '',
      effective: '',
      expiration: '',
      coverage: '',
    },
    insuranceHistory: [],
    basics: b,
    inspections: { total: 0, vOOS: 0, dOOS: 0, vRate: 0, dRate: 0 },
    inspectionDetail: [],
    crashes: { total: 0, fatal: 0, injury: 0, tow: 0 },
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
  if (s.includes('authorized') || s.includes('active')) return { bg: '#f0fdfa', color: '#0f766e' };
  if (s.includes('out-of-service') || s.includes('revoked')) return { bg: '#fff1f2', color: '#9f1239' };
  return { bg: '#f1f5f9', color: '#64748b' };
}
