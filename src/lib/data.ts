import type { Lead, Market, Producer, Application, CensusEntry, SaferData } from './types';

export const SAFER_DB: Record<string, SaferData> = {
  '3456789': {
    legalName: 'Hill Country Freight LLC', dotNumber: '3456789', mcNumber: 'MC-987654',
    address: '1205 River Rd, New Braunfels, TX 78130', phone: '(830) 555-0142',
    opType: 'Interstate', safetyRating: 'Satisfactory',
    mcs150: { lastUpdate: '2025-11-10', mileage: 850000, drivers: 14, powerUnits: 12, year: 2025 },
    insurance: { current: 'Canal Insurance Company', policy: 'CTL-2025-8834', effective: '2025-06-01', expiration: '2026-06-01', coverage: '$1,000,000' },
    insuranceHistory: [
      { carrier: 'Canal Insurance Company', policy: 'CTL-2025-8834', effective: '2025-06-01', expiration: '2026-06-01', coverage: '$1,000,000', type: 'Primary Liability' },
      { carrier: 'Canal Insurance Company', policy: 'CTL-2024-7721', effective: '2024-06-01', expiration: '2025-06-01', coverage: '$1,000,000', type: 'Primary Liability' },
      { carrier: 'Progressive Commercial', policy: 'PGR-2023-4489', effective: '2023-06-01', expiration: '2024-06-01', coverage: '$750,000', type: 'Primary Liability' },
    ],
    basics: { unsafeDriving: 42, hoursOfService: 55, driverFitness: 30, controlledSubstances: null, vehicleMaintenance: 48, crashIndicator: 35, hmCompliance: null },
    inspections: { total: 28, vOOS: 3, dOOS: 1, vRate: 10.7, dRate: 3.6 },
    inspectionDetail: [
      { date: '2026-02-15', state: 'TX', level: 'II', result: 'Clean', violations: 0 },
      { date: '2025-11-22', state: 'OK', level: 'I', result: 'Warning', violations: 2 },
      { date: '2025-09-08', state: 'TX', level: 'III', result: 'Clean', violations: 0 },
    ],
    crashes: { total: 1, fatal: 0, injury: 0, tow: 1 },
  },
  '2987654': {
    legalName: 'Lone Star Hauling Inc', dotNumber: '2987654', mcNumber: 'MC-112233',
    address: '4500 S Lamar Blvd, Austin, TX 78745', phone: '(512) 555-0198',
    opType: 'Interstate', safetyRating: 'None',
    mcs150: { lastUpdate: '2026-01-05', mileage: 120000, drivers: 3, powerUnits: 3, year: 2026 },
    insurance: { current: 'Progressive Commercial', policy: 'PGR-2026-1122', effective: '2026-01-15', expiration: '2027-01-15', coverage: '$750,000' },
    insuranceHistory: [
      { carrier: 'Progressive Commercial', policy: 'PGR-2026-1122', effective: '2026-01-15', expiration: '2027-01-15', coverage: '$750,000', type: 'Primary Liability' },
    ],
    basics: { unsafeDriving: 15, hoursOfService: 20, driverFitness: null, controlledSubstances: null, vehicleMaintenance: 25, crashIndicator: null, hmCompliance: null },
    inspections: { total: 4, vOOS: 0, dOOS: 0, vRate: 0, dRate: 0 },
    inspectionDetail: [
      { date: '2026-03-12', state: 'TX', level: 'II', result: 'Clean', violations: 0 },
    ],
    crashes: { total: 0, fatal: 0, injury: 0, tow: 0 },
  },
  '1876543': {
    legalName: 'Alamo City Transport', dotNumber: '1876543', mcNumber: 'MC-445566',
    address: '8900 IH-35 N, San Antonio, TX 78233', phone: '(210) 555-0267',
    opType: 'Interstate', safetyRating: 'Satisfactory',
    mcs150: { lastUpdate: '2025-09-18', mileage: 4200000, drivers: 52, powerUnits: 45, year: 2025 },
    insurance: { current: 'Great West Casualty', policy: 'GWC-2025-5567', effective: '2025-05-01', expiration: '2026-05-01', coverage: '$1,000,000' },
    insuranceHistory: [
      { carrier: 'Great West Casualty', policy: 'GWC-2025-5567', effective: '2025-05-01', expiration: '2026-05-01', coverage: '$1,000,000', type: 'Primary Liability' },
      { carrier: 'National Indemnity', policy: 'NI-2023-8892', effective: '2023-05-01', expiration: '2024-05-01', coverage: '$1,000,000', type: 'Primary Liability' },
    ],
    basics: { unsafeDriving: 72, hoursOfService: 68, driverFitness: 45, controlledSubstances: 30, vehicleMaintenance: 85, crashIndicator: 70, hmCompliance: null },
    inspections: { total: 156, vOOS: 22, dOOS: 12, vRate: 14.1, dRate: 7.7 },
    inspectionDetail: [
      { date: '2026-03-28', state: 'TX', level: 'I', result: 'OOS', violations: 4 },
      { date: '2026-02-14', state: 'LA', level: 'II', result: 'Warning', violations: 2 },
    ],
    crashes: { total: 5, fatal: 0, injury: 2, tow: 3 },
  },
};

export const INITIAL_LEADS: Lead[] = [
  {
    id: 'l1', company: 'Hill Country Freight LLC', dot: '3456789', contact: 'Mike Ramirez',
    email: 'mike@hillcountryfreight.com', phone: '(830) 555-0142', status: 'Quoting',
    producer: 'p1', lines: ['Auto Liability', 'Physical Damage', 'Motor Truck Cargo'],
    years: 4, fleet: 12, commodities: ['General Freight', 'Building Materials'],
    violations: 1, hazmat: false, vehicles: 'Flatbed, Dry Van',
    notes: 'Current with Canal, looking for better rate.',
    premium: 18500,
    markets: [{ mid: 'm1', status: 'Submitted' }, { mid: 'm3', status: 'Pending' }],
    emails: [
      { date: '2026-03-28', subj: 'Quote Request', dir: 'out', body: 'Hi Mike,\n\nFollowing up on your trucking insurance quote request. We have received your application and are currently working on getting you the best rates.\n\nBest regards,\nAlex Rivera' },
      { date: '2026-03-30', subj: 'RE: Quote Request', dir: 'in', body: 'Hi Alex,\n\nThank you for following up. I have attached our loss runs and driver list for your review.\n\nBest,\nMike Ramirez', read: false },
    ],
    docs: [
      { id: 'd1', name: 'Application_HCF.pdf', tag: 'Application', date: '2026-03-25', size: '245 KB' },
      { id: 'd2', name: 'LossRuns_3yr.pdf', tag: 'Loss Runs', date: '2026-03-30', size: '1.2 MB' },
      { id: 'd3', name: 'MVR_Ramirez.pdf', tag: 'MVRs', date: '2026-03-30', size: '89 KB' },
    ],
    drivers: [
      { firstName: 'Mike', lastName: 'Ramirez', dob: '1985-07-14', state: 'TX', dlNumber: 'TX-28491037', cdlNumber: 'CDL-A-28491037', experience: 12, accidents: 0, violations: 0, mvrStatus: 'Clean', mvrDate: '2026-03-30' },
      { firstName: 'Jesse', lastName: 'Martinez', dob: '1990-03-22', state: 'TX', dlNumber: 'TX-39201845', cdlNumber: 'CDL-A-39201845', experience: 6, accidents: 0, violations: 1, mvrStatus: 'Issues Found', mvrDate: '2026-03-30' },
      { firstName: 'Robert', lastName: 'Thompson', dob: '1978-11-05', state: 'OK', dlNumber: 'OK-11284756', cdlNumber: 'CDL-A-11284756', experience: 18, accidents: 0, violations: 0, mvrStatus: 'Clean', mvrDate: '2026-03-30' },
    ],
    vehicleList: [
      { unitNumber: '1', type: 'Tractor', year: '2022', make: 'Freightliner', model: 'Cascadia', vin: '3AKJHHDR4NSLA1234', value: 95000, gvw: 80000 },
      { unitNumber: '2', type: 'Tractor', year: '2021', make: 'Kenworth', model: 'T680', vin: '1XKYD49X1MJ567890', value: 82000, gvw: 80000 },
      { unitNumber: 'T1', type: 'Flatbed', year: '2020', make: 'Great Dane', model: 'Freedom XP', vin: '1GRAA0622LB123456', value: 32000, gvw: 48000 },
    ],
    safer: SAFER_DB['3456789'],
    created: '2026-03-25', boundDate: null,
  },
  {
    id: 'l2', company: 'Lone Star Hauling Inc', dot: '2987654', contact: 'Sarah Chen',
    email: 'schen@lonestarhauling.com', phone: '(512) 555-0198', status: 'New Lead',
    producer: 'p1', lines: ['Auto Liability', 'General Liability', 'Physical Damage'],
    years: 1, fleet: 3, commodities: ['General Freight'],
    violations: 0, hazmat: false, vehicles: 'Dry Van',
    notes: 'New venture, owner-operator expanding.',
    premium: 0, markets: [], emails: [], docs: [],
    safer: SAFER_DB['2987654'],
    created: '2026-04-01', boundDate: null,
  },
  {
    id: 'l3', company: 'Alamo City Transport', dot: '1876543', contact: 'David Gutierrez',
    email: 'david@alamocitytransport.com', phone: '(210) 555-0267', status: 'Bound',
    producer: 'p3', lines: ['Auto Liability', 'Physical Damage', 'Motor Truck Cargo', 'Workers Comp'],
    years: 8, fleet: 45, commodities: ['Refrigerated Food', 'Fresh Produce', 'General Freight'],
    violations: 2, hazmat: false, vehicles: 'Reefer, Dry Van',
    notes: 'Bound with Sentry Insurance.',
    premium: 87500,
    markets: [{ mid: 'm3', status: 'Declined' }, { mid: 'm5', status: 'Bound' }, { mid: 'm2', status: 'Declined' }],
    emails: [
      { date: '2026-03-20', subj: 'Non-Renewal Notice', dir: 'in', body: 'Non-renewal effective 4/30. Please advise next steps.', read: true },
      { date: '2026-03-21', subj: 'RE: Next Steps', dir: 'out', body: 'Submitting to Great West and Sentry immediately.' },
      { date: '2026-03-29', subj: 'Sentry Quote', dir: 'in', body: 'Sentry came back competitive at $87,500. Quote attached.', read: true },
      { date: '2026-04-02', subj: 'Bind Request', dir: 'out', body: 'Please bind Sentry policy effective 4/15. All signed docs attached.' },
    ],
    docs: [
      { id: 'd4', name: 'Application_ACT.pdf', tag: 'Application', date: '2026-03-20', size: '310 KB' },
      { id: 'd5', name: 'LossRuns_5yr_ACT.pdf', tag: 'Loss Runs', date: '2026-03-20', size: '2.1 MB' },
      { id: 'd6', name: 'MVR_Gutierrez.pdf', tag: 'MVRs', date: '2026-03-20', size: '95 KB' },
      { id: 'd9', name: 'FinanceAgreement_Sentry.pdf', tag: 'Finance Agreement', date: '2026-04-02', size: '180 KB' },
      { id: 'd10', name: 'SignedBinder_ACT.pdf', tag: 'Signed Documents', date: '2026-04-03', size: '95 KB' },
    ],
    drivers: [
      { firstName: 'David', lastName: 'Gutierrez', dob: '1980-01-18', state: 'TX', dlNumber: 'TX-10293847', cdlNumber: 'CDL-A-10293847', experience: 15, accidents: 1, violations: 1, mvrStatus: 'Issues Found', mvrDate: '2026-03-20' },
      { firstName: 'Carlos', lastName: 'Vega', dob: '1992-09-30', state: 'TX', dlNumber: 'TX-48271639', cdlNumber: 'CDL-A-48271639', experience: 4, accidents: 0, violations: 0, mvrStatus: 'Clean', mvrDate: '2026-03-21' },
    ],
    safer: SAFER_DB['1876543'],
    created: '2026-03-20', boundDate: '2026-04-03',
    policyNumber: 'SEN-2026-44891', effectiveDate: '2026-04-15', expirationDate: '2027-04-15',
  },
  {
    id: 'l4', company: 'Gulf Coast Trucking', dot: '1089012', contact: 'Lisa Nguyen',
    email: 'lnguyen@gulfcoasttrucking.com', phone: '(713) 555-0901', status: 'Bound',
    producer: 'p2', lines: ['Auto Liability', 'Physical Damage', 'General Liability'],
    years: 12, fleet: 55, commodities: ['Chemicals', 'Liquids/Gases', 'Hazmat'],
    violations: 1, hazmat: true, vehicles: 'Tanker, Flatbed',
    notes: 'Hazmat carrier. Bound with National Indemnity.',
    premium: 125000,
    markets: [{ mid: 'm2', status: 'Bound' }],
    emails: [
      { date: '2026-01-15', subj: 'Renewal Submission', dir: 'out', body: 'Submitting renewal to National Indemnity...' },
      { date: '2026-02-01', subj: 'Quote Received', dir: 'in', body: 'NI quoted at $125K. Attachments enclosed.', read: true },
      { date: '2026-02-10', subj: 'Bind Order', dir: 'out', body: 'Please bind effective 3/1...' },
    ],
    docs: [
      { id: 'd11', name: 'Application_GCT.pdf', tag: 'Application', date: '2026-01-15', size: '290 KB' },
      { id: 'd14', name: 'SignedPolicy_NI.pdf', tag: 'Signed Documents', date: '2026-02-12', size: '340 KB' },
    ],
    safer: null,
    created: '2026-01-10', boundDate: '2026-02-12',
    policyNumber: 'NI-2026-77234', effectiveDate: '2026-03-01', expirationDate: '2027-03-01',
  },
  {
    id: 'l5', company: 'Panhandle Express', dot: '5234567', contact: 'Robert Jones',
    email: 'rjones@panhandleexpress.com', phone: '(806) 555-0456', status: 'Bound',
    producer: 'p3', lines: ['Auto Liability', 'Physical Damage', 'Motor Truck Cargo'],
    years: 7, fleet: 22, commodities: ['Grain/Feed', 'Livestock', 'Dry Bulk'],
    violations: 0, hazmat: false, vehicles: 'Hopper, Dry Van',
    notes: 'Ag hauler. Bound with Sentry Q1.',
    premium: 42000,
    markets: [{ mid: 'm5', status: 'Bound' }],
    emails: [
      { date: '2025-12-05', subj: 'New Business Submission', dir: 'out', body: 'Submitting to Sentry for ag coverage...' },
      { date: '2025-12-20', subj: 'Sentry Quote', dir: 'in', body: 'Quoted at $42K. Attached.', read: true },
      { date: '2026-01-05', subj: 'Bind Order', dir: 'out', body: 'Bind effective 1/15...' },
    ],
    docs: [
      { id: 'd15', name: 'App_Panhandle.pdf', tag: 'Application', date: '2025-12-05', size: '220 KB' },
      { id: 'd16', name: 'LossRuns_PE.pdf', tag: 'Loss Runs', date: '2025-12-05', size: '890 KB' },
    ],
    safer: null,
    created: '2025-12-01', boundDate: '2026-01-05',
    policyNumber: 'SEN-2026-12908', effectiveDate: '2026-01-15', expirationDate: '2027-01-15',
  },
];

export const INITIAL_MARKETS: Market[] = [
  {
    id: 'm1', name: 'Canal Insurance', lines: ['Auto Liability', 'Physical Damage', 'Motor Truck Cargo'],
    apt: { minYrs: 2, minF: 1, maxF: 100, comm: ['General Freight', 'Dry Bulk', 'Building Materials'], noHaz: true, maxViol: 2, maxAlerts: 1, bt: { unsafeDriving: 70, hoursOfService: 70, vehicleMaintenance: 75, crashIndicator: 65 } },
    notes: 'Strong on small to mid-size fleets.',
  },
  {
    id: 'm2', name: 'National Indemnity', lines: ['Auto Liability', 'General Liability', 'Physical Damage'],
    apt: { minYrs: 3, minF: 5, maxF: 500, comm: ['General Freight', 'Metal/Sheets/Coils', 'Machinery/Large Objects', 'Building Materials'], noHaz: false, maxViol: 3, maxAlerts: 2, bt: { unsafeDriving: 75, hoursOfService: 75, vehicleMaintenance: 80, crashIndicator: 70 } },
    notes: 'Prefers established. Writes hazmat.',
  },
  {
    id: 'm3', name: 'Great West Casualty', lines: ['Auto Liability', 'Physical Damage', 'Motor Truck Cargo', 'General Liability'],
    apt: { minYrs: 1, minF: 1, maxF: 1000, comm: ['General Freight', 'Refrigerated Food', 'Fresh Produce', 'Dry Bulk', 'Grain/Feed'], noHaz: true, maxViol: 2, maxAlerts: 2, bt: { unsafeDriving: 65, hoursOfService: 65, vehicleMaintenance: 80, crashIndicator: 65 } },
    notes: 'Largest trucking insurer.',
  },
  {
    id: 'm4', name: 'Progressive Commercial', lines: ['Auto Liability', 'Physical Damage', 'General Liability'],
    apt: { minYrs: 0, minF: 1, maxF: 50, comm: ['General Freight', 'Building Materials', 'Household Goods'], noHaz: true, maxViol: 1, maxAlerts: 0, bt: { unsafeDriving: 60, hoursOfService: 60, vehicleMaintenance: 70, crashIndicator: 55 } },
    notes: 'New ventures. Zero alerts.',
  },
  {
    id: 'm5', name: 'Sentry Insurance', lines: ['Auto Liability', 'Physical Damage', 'Workers Comp', 'General Liability'],
    apt: { minYrs: 2, minF: 3, maxF: 200, comm: ['General Freight', 'Fresh Produce', 'Refrigerated Food', 'Grain/Feed', 'Livestock'], noHaz: true, maxViol: 2, maxAlerts: 1, bt: { unsafeDriving: 65, hoursOfService: 70, vehicleMaintenance: 75, crashIndicator: 65 } },
    notes: 'Ag & food haulers.',
  },
];

export const INITIAL_PRODUCERS: Producer[] = [
  { id: 'p1', name: 'Alex Rivera', phone: '(830) 555-0101', email: 'arivera@carrierbase.com', supervisor: 'Marcus Hill', title: 'Senior Producer', photo: null, goals: { deals: 10, binds: 4, declines: 2, premium: 100000, revenue: 15000 } },
  { id: 'p2', name: 'Jordan Wells', phone: '(830) 555-0102', email: 'jwells@carrierbase.com', supervisor: 'Marcus Hill', title: 'Producer', photo: null, goals: { deals: 8, binds: 3, declines: 1, premium: 80000, revenue: 12000 } },
  { id: 'p3', name: 'Sam Ortiz', phone: '(830) 555-0103', email: 'sortiz@carrierbase.com', supervisor: 'Marcus Hill', title: 'Senior Producer', photo: null, goals: { deals: 12, binds: 5, declines: 2, premium: 120000, revenue: 18000 } },
];

export const INITIAL_APPLICATIONS: Application[] = [
  {
    id: 'app1', type: 'truckingSupp', leadId: 'l3', status: 'Complete',
    created: '2026-03-21', modified: '2026-04-02',
    data: {
      applicantName: 'Alamo City Transport', dba: 'ACT Refrigerated', dot: '1876543', mc: 'MC-445566',
      mailingAddr: '8900 IH-35 N, San Antonio, TX 78233', phone: '(210) 555-0267',
      email: 'david@alamocitytransport.com', contact: 'David Gutierrez', entityType: 'Corporation',
      yearsInBusiness: '8', annualRevenue: '4200000', effectiveDate: '2026-05-01',
      coverageRequested: 'Auto Liability, Physical Damage, Motor Truck Cargo, Workers Comp',
      priorCarrier: 'Great West Casualty', priorPremium: '92000', priorExpiration: '2026-04-30',
      claimsHistory: '2 claims in 3 years',
      descOps: 'Refrigerated food and produce hauling, interstate, TX/LA/OK/NM',
    },
  },
];

export const CENSUS: CensusEntry[] = [
  { dot: '3456789', company: 'Hill Country Freight LLC', state: 'TX', city: 'New Braunfels', phone: '(830) 555-0142', email: 'mike@hillcountryfreight.com', owner: 'Mike Ramirez', units: 12, cargo: ['General Freight', 'Building Materials'], opStart: '2022-03-15', newV: false },
  { dot: '2987654', company: 'Lone Star Hauling Inc', state: 'TX', city: 'Austin', phone: '(512) 555-0198', email: 'schen@lonestarhauling.com', owner: 'Sarah Chen', units: 3, cargo: ['General Freight'], opStart: '2025-06-01', newV: true },
  { dot: '1876543', company: 'Alamo City Transport', state: 'TX', city: 'San Antonio', phone: '(210) 555-0267', email: 'david@alamocitytransport.com', owner: 'David Gutierrez', units: 45, cargo: ['Refrigerated Food', 'Fresh Produce', 'General Freight'], opStart: '2018-01-10', newV: false },
  { dot: '4123456', company: 'Bayou Logistics LLC', state: 'LA', city: 'Baton Rouge', phone: '(225) 555-0334', email: 'jbayou@bayoulogistics.com', owner: 'Jean-Pierre Mouton', units: 8, cargo: ['Chemicals', 'Liquids/Gases', 'Hazmat'], opStart: '2020-07-22', newV: false },
  { dot: '5234567', company: 'Panhandle Express', state: 'TX', city: 'Amarillo', phone: '(806) 555-0456', email: 'rjones@panhandleexpress.com', owner: 'Robert Jones', units: 22, cargo: ['Grain/Feed', 'Livestock', 'Dry Bulk'], opStart: '2019-04-01', newV: false },
  { dot: '6345678', company: 'Peach State Carriers', state: 'GA', city: 'Atlanta', phone: '(404) 555-0567', email: 'tking@peachstatecarriers.com', owner: 'Tamika King', units: 35, cargo: ['General Freight', 'Household Goods', 'Motor Vehicles'], opStart: '2017-09-12', newV: false },
  { dot: '7456789', company: 'Sonoran Desert Transport', state: 'AZ', city: 'Phoenix', phone: '(602) 555-0678', email: 'mgarcia@sonorandesert.com', owner: 'Miguel Garcia', units: 6, cargo: ['Building Materials', 'General Freight'], opStart: '2025-11-01', newV: true },
  { dot: '8567890', company: 'Magnolia Freight Lines', state: 'MS', city: 'Jackson', phone: '(601) 555-0789', email: 'awilliams@magnoliafreight.com', owner: 'Andre Williams', units: 18, cargo: ['Meat', 'Refrigerated Food', 'General Freight'], opStart: '2021-02-28', newV: false },
  { dot: '9678901', company: 'Rocky Mountain Haulers', state: 'CO', city: 'Denver', phone: '(303) 555-0890', email: 'cpeterson@rmhaulers.com', owner: 'Chris Peterson', units: 14, cargo: ['Machinery/Large Objects', 'Metal/Sheets/Coils', 'Oil Field Equipment'], opStart: '2016-08-15', newV: false },
  { dot: '1089012', company: 'Gulf Coast Trucking', state: 'TX', city: 'Houston', phone: '(713) 555-0901', email: 'lnguyen@gulfcoasttrucking.com', owner: 'Lisa Nguyen', units: 55, cargo: ['Chemicals', 'Liquids/Gases', 'Hazmat', 'Intermodal Containers'], opStart: '2014-05-20', newV: false },
];

export const INITIAL_TEAM_GOAL = { deals: 30, binds: 12, declines: 5, premium: 350000, revenue: 52500 };
