// Comprehensive trucking insurance supplemental application data model.
// Captures everything an underwriter needs to quote commercial auto, motor truck cargo,
// physical damage, and general liability for a trucking risk.

export type CoverageLine = 'autoLiability' | 'physicalDamage' | 'motorTruckCargo' | 'generalLiability';

export interface LossRunYear {
  year: number;
  carrier: string;
  policyNumber: string;
  premium: number;
  numClaims: number;
  totalIncurred: number;
  totalPaid: number;
  openReserves: number;
  largestClaim: number;
  notes: string;
}

export interface HistoricalYear {
  year: number;
  unitCount: number;
  driverCount: number;
  revenue: number;
  tiv: number;            // total insured value
  mileage: number;
  notes: string;
}

export interface CommodityEntry {
  commodity: string;
  percentage: number;
}

export interface RadiusEntry {
  range: '0-100' | '101-500' | '501+';
  percentage: number;
}

export interface OwnerEntry {
  name: string;
  ownership: number;       // %
  drivesTrucks: boolean;
}

export interface PriorCarrierEntry {
  carrier: string;
  year: number;
  reason: string;          // why they left
  cancellation: boolean;
}

export type EntityType = 'LLC' | 'Corporation' | 'S-Corporation' | 'Sole Proprietor' | 'Partnership' | 'Other';
export type CarrierAuthority = 'Common' | 'Contract' | 'Both' | 'None';
export type DUIPolicy = 'Never Allowed' | '5+ Years Ago' | '7+ Years Ago' | '10+ Years Ago' | 'Other';
export type MVRFreq = 'Annual' | 'Semi-annual' | 'Quarterly' | 'Monthly' | 'Other';

export interface CoverageRequest {
  requested: boolean;
  limit?: number;
  deductible?: number;
  effectiveDate?: string;
  notes?: string;
}

export interface TruckingApplication {
  id: string;
  leadId: string;
  status: 'Draft' | 'Complete' | 'Sent';
  createdAt: string;
  updatedAt: string;
  completedSections: string[];
  effectiveDate?: string;

  // ── Section 1: Insured Information ──
  insuredName: string;
  dba: string;
  dot: string;
  mc: string;
  fein: string;
  scac: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  mailingDifferent: boolean;
  mailingStreet: string;
  mailingCity: string;
  mailingState: string;
  mailingZip: string;
  phone: string;
  email: string;
  website: string;
  contactName: string;
  contactTitle: string;
  contactEmail: string;
  contactPhone: string;
  yearsInBusiness: number;
  yearEstablished: number;
  entityType: EntityType;
  owners: OwnerEntry[];

  // ── Section 2: Operations ──
  forHire: boolean;
  privateCarrier: boolean;
  household: boolean;
  ownerOperator: boolean;
  interstate: boolean;
  intrastate: boolean;
  carrierAuthority: CarrierAuthority;
  hasBrokerAuthority: boolean;
  hasFreightForwarding: boolean;
  hasWarehousing: boolean;
  statesOfOperation: string[];
  terminalLocations: string;
  hoursOfOperation: string;
  descriptionOfOps: string;

  // ── Section 3: Radius (user requested specific buckets) ──
  radius: RadiusEntry[];

  // ── Section 4: Commodities (user requested) ──
  commodities: CommodityEntry[];
  haulsHazmat: boolean;
  hazmatTypes: string;
  hazmatPercentage: number;
  haulsRefrigerated: boolean;
  haulsOversize: boolean;

  // ── Section 5: Historical Data (user requested current + 5 years) ──
  historical: HistoricalYear[];

  // ── Section 6: Loss Runs (user requested per line, current + 5 years) ──
  lossRuns: Record<CoverageLine, LossRunYear[]>;

  // ── Section 7: Coverage Requested ──
  coverage: {
    autoLiability: CoverageRequest;
    physicalDamage: CoverageRequest;
    motorTruckCargo: CoverageRequest;
    generalLiability: CoverageRequest;
    workersComp: CoverageRequest;
    umbrella: CoverageRequest;
    nonTruckingLiability: CoverageRequest;
    trailerInterchange: CoverageRequest;
    reeferBreakdown: CoverageRequest;
    occupationalAccident: CoverageRequest;
  };

  // ── Section 8: Safety & Risk Management ──
  safetyRating: string;
  safetyRatingDate: string;
  basicAlerts: string[];
  hasDriverTraining: boolean;
  driverTrainingDescription: string;
  hasELD: boolean;
  eldProvider: string;
  hasGPS: boolean;
  gpsProvider: string;
  hasForwardCamera: boolean;
  forwardCameraProvider: string;
  hasInCabCamera: boolean;
  inCabCameraProvider: string;
  hasSpeedLimiters: boolean;
  speedLimit: number;
  hasMaintenanceProgram: boolean;
  maintenanceFrequency: string;
  drugAlcoholProgram: boolean;
  drugTestingProvider: string;
  preEmploymentScreening: boolean;
  randomTestingPercent: number;
  // ─── (continued) ─────────────────────────────────────────────────────────

  // ── Section 9: Driver Hiring Standards ──
  driverMinAge: number;
  driverMinExperience: number;
  driverMaxAccidents3yr: number;
  driverMaxViolations3yr: number;
  duiPolicy: DUIPolicy;
  mvrReviewFrequency: MVRFreq;
  rejectsBackground: string;            // e.g., "felonies, DUI in last 5"
  averageDriverTenure: number;
  driverTurnoverPercent: number;

  // ── Section 10: Insurance History ──
  currentCarrier: string;
  currentEffective: string;
  currentExpiration: string;
  currentPremium: number;
  priorCarriers: PriorCarrierEntry[];
  hasCancellationsLast5: boolean;
  cancellationDetails: string;
  hasNonRenewalsLast5: boolean;
  nonRenewalDetails: string;
  hasLapsesLast5: boolean;
  lapseDetails: string;

  // ── Section 11: Filings & Permits ──
  hasIRP: boolean;
  hasIFTA: boolean;
  hasUCR: boolean;
  hasMC: boolean;
  hasFormE: boolean;       // FHWA cargo
  hasFormK: boolean;       // BMC-91
  hasBMC91: boolean;       // for-hire surety bond
  hasBMC32: boolean;       // private carrier
  hasMCS90: boolean;       // hazmat endorsement
  oqStatus: string;        // operating authority status

  // ── Section 12: Additional Underwriting Questions ──
  hasSubhaulers: boolean;
  subhaulerCount: number;
  ooLeasedCount: number;     // owner-operators leased to carrier
  hasSCACCode: boolean;
  haulsOwnGoods: boolean;
  haulsOthersGoods: boolean;
  loadingProcess: string;     // shipper loaded, carrier loaded, both
  hasLoadingDock: boolean;
  hasYard: boolean;
  yardSize: string;

  // ── Section 13: Additional Notes ──
  notes: string;
}

// ─── Builders & defaults ─────────────────────────────────────────────────────
const COMMON_COMMODITIES = [
  'General Freight', 'Refrigerated Food', 'Building Materials', 'Metal/Sheets/Coils',
  'Motor Vehicles', 'Logs/Lumber', 'Machinery/Large Objects', 'Fresh Produce',
  'Liquids/Gases', 'Intermodal Containers', 'Oil Field Equipment', 'Livestock',
  'Grain/Feed', 'Dry Bulk', 'Chemicals', 'Hazmat', 'Garbage/Refuse',
  'Mobile Homes', 'Household Goods', 'US Mail', 'Coal/Coke', 'Meat',
  'Passengers', 'Other',
];

export const COMMODITY_OPTIONS = COMMON_COMMODITIES;

export function buildEmptyApplication(leadId: string, prefill?: Partial<TruckingApplication>): TruckingApplication {
  const currentYear = new Date().getFullYear();
  // Default historical: current year + 5 prior years
  const defaultHistorical: HistoricalYear[] = [];
  for (let y = currentYear; y > currentYear - 6; y--) {
    defaultHistorical.push({
      year: y, unitCount: 0, driverCount: 0, revenue: 0, tiv: 0, mileage: 0, notes: '',
    });
  }
  // Default loss runs per line
  const defaultLossRuns = (): LossRunYear[] => {
    const arr: LossRunYear[] = [];
    for (let y = currentYear; y > currentYear - 6; y--) {
      arr.push({
        year: y, carrier: '', policyNumber: '', premium: 0,
        numClaims: 0, totalIncurred: 0, totalPaid: 0, openReserves: 0,
        largestClaim: 0, notes: '',
      });
    }
    return arr;
  };

  return {
    id: 'tapp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    leadId, status: 'Draft',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    completedSections: [],
    insuredName: '', dba: '', dot: '', mc: '', fein: '', scac: '',
    street: '', city: '', state: '', zip: '',
    mailingDifferent: false, mailingStreet: '', mailingCity: '', mailingState: '', mailingZip: '',
    phone: '', email: '', website: '',
    contactName: '', contactTitle: '', contactEmail: '', contactPhone: '',
    yearsInBusiness: 0, yearEstablished: currentYear, entityType: 'LLC',
    owners: [{ name: '', ownership: 100, drivesTrucks: false }],
    forHire: true, privateCarrier: false, household: false, ownerOperator: false,
    interstate: true, intrastate: false,
    carrierAuthority: 'Common', hasBrokerAuthority: false,
    hasFreightForwarding: false, hasWarehousing: false,
    statesOfOperation: [], terminalLocations: '', hoursOfOperation: '',
    descriptionOfOps: '',
    radius: [
      { range: '0-100', percentage: 0 },
      { range: '101-500', percentage: 0 },
      { range: '501+', percentage: 0 },
    ],
    commodities: [{ commodity: 'General Freight', percentage: 100 }],
    haulsHazmat: false, hazmatTypes: '', hazmatPercentage: 0,
    haulsRefrigerated: false, haulsOversize: false,
    historical: defaultHistorical,
    lossRuns: {
      autoLiability: defaultLossRuns(),
      physicalDamage: defaultLossRuns(),
      motorTruckCargo: defaultLossRuns(),
      generalLiability: defaultLossRuns(),
    },
    coverage: {
      autoLiability:        { requested: true,  limit: 1000000 },
      physicalDamage:       { requested: true,  deductible: 1000 },
      motorTruckCargo:      { requested: true,  limit: 100000 },
      generalLiability:     { requested: true,  limit: 1000000 },
      workersComp:          { requested: false },
      umbrella:             { requested: false, limit: 1000000 },
      nonTruckingLiability: { requested: false, limit: 1000000 },
      trailerInterchange:   { requested: false, limit: 50000 },
      reeferBreakdown:      { requested: false },
      occupationalAccident: { requested: false },
    },
    safetyRating: 'Not Rated', safetyRatingDate: '', basicAlerts: [],
    hasDriverTraining: false, driverTrainingDescription: '',
    hasELD: true, eldProvider: '',
    hasGPS: false, gpsProvider: '',
    hasForwardCamera: false, forwardCameraProvider: '',
    hasInCabCamera: false, inCabCameraProvider: '',
    hasSpeedLimiters: false, speedLimit: 70,
    hasMaintenanceProgram: false, maintenanceFrequency: '',
    drugAlcoholProgram: true, drugTestingProvider: '',
    'preEmploymentScreening': true, randomTestingPercent: 50,
    driverMinAge: 23, driverMinExperience: 2,
    driverMaxAccidents3yr: 1, driverMaxViolations3yr: 2,
    duiPolicy: '7+ Years Ago', mvrReviewFrequency: 'Annual',
    rejectsBackground: '', averageDriverTenure: 0, driverTurnoverPercent: 0,
    currentCarrier: '', currentEffective: '', currentExpiration: '', currentPremium: 0,
    priorCarriers: [],
    hasCancellationsLast5: false, cancellationDetails: '',
    hasNonRenewalsLast5: false, nonRenewalDetails: '',
    hasLapsesLast5: false, lapseDetails: '',
    hasIRP: false, hasIFTA: false, hasUCR: false, hasMC: false,
    hasFormE: false, hasFormK: false, hasBMC91: false, hasBMC32: false, hasMCS90: false,
    oqStatus: '',
    hasSubhaulers: false, subhaulerCount: 0, ooLeasedCount: 0,
    hasSCACCode: false, haulsOwnGoods: false, haulsOthersGoods: true,
    loadingProcess: '', hasLoadingDock: false, hasYard: false, yardSize: '',
    notes: '',
    ...prefill,
  };
}

// Sum helpers used by the form for live validation
export function sumPercentages<T extends { percentage: number }>(arr: T[]): number {
  return arr.reduce((s, x) => s + (x.percentage || 0), 0);
}

export function applicationCompletionPercent(app: TruckingApplication): number {
  // 13 sections total — count how many have meaningful data
  const sections = [
    !!(app.insuredName && app.dot),                     // 1: Insured
    !!(app.descriptionOfOps),                            // 2: Operations
    sumPercentages(app.radius) === 100,                  // 3: Radius
    sumPercentages(app.commodities) === 100,             // 4: Commodities
    app.historical.some(h => h.unitCount > 0 || h.revenue > 0),  // 5: Historical
    Object.values(app.lossRuns).some(arr => arr.some(l => l.numClaims > 0 || l.totalIncurred > 0 || l.carrier)), // 6: Loss runs
    Object.values(app.coverage).some(c => c.requested),  // 7: Coverage
    app.hasELD || app.hasGPS || app.drugAlcoholProgram,  // 8: Safety
    app.driverMinAge > 0,                                // 9: Driver standards
    !!(app.currentCarrier || app.priorCarriers.length > 0), // 10: Insurance history
    app.hasMC || app.hasIRP || app.hasIFTA || app.hasUCR, // 11: Filings
    !!(app.loadingProcess || app.hasYard !== undefined), // 12: Additional
    !!app.notes,                                          // 13: Notes
  ];
  return Math.round(sections.filter(Boolean).length / sections.length * 100);
}
