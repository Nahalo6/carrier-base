export type LeadStatus = 'New Lead' | 'Contacted' | 'Quoting' | 'Submitted' | 'Bound' | 'Lost' | 'Remarketing';

export interface StatusHistoryEntry {
  status: LeadStatus;
  date: string;
  from: LeadStatus | null;
  changedBy: string | null;
}

export interface SaferBasicDetail {
  percentile: number | null;
  measure: number | null;
  threshold: number | null;
  totalViolations: number;
  inspectionsWithViolations: number;
  alert: boolean;
  notPublic: boolean;
  hasData: boolean;
  runDate: string;
}

export interface SaferBasics {
  unsafeDriving: number | null;
  hoursOfService: number | null;
  driverFitness: number | null;
  controlledSubstances: number | null;
  vehicleMaintenance: number | null;
  crashIndicator: number | null;
  hmCompliance: number | null;
  // Rich data — optional so legacy data still works
  details?: Record<string, SaferBasicDetail>;
  hasAnyData?: boolean;
  totalViolations?: number;
}

export interface SaferInsurance {
  current: string;
  policy: string;
  effective: string;
  expiration: string;
  coverage: string;
}

export interface SaferInsuranceHistory {
  carrier: string;
  policy: string;
  effective: string;
  expiration: string;
  coverage: string;
  type: string;
}

export interface SaferData {
  legalName: string;
  dotNumber: string;
  mcNumber: string;
  address: string;
  phone: string;
  opType: string;
  safetyRating: string;
  mcs150: { lastUpdate: string; mileage: number; drivers: number; powerUnits: number; year: number };
  insurance: SaferInsurance;
  insuranceHistory: SaferInsuranceHistory[];
  basics: SaferBasics;
  inspections: { total: number; vOOS: number; dOOS: number; vRate: number; dRate: number };
  inspectionDetail: { date: string; state: string; level: string; result: string; violations: number }[];
  crashes: { total: number; fatal: number; injury: number; tow: number };
}

export interface MarketStatus {
  mid: string;
  status: 'Pending' | 'Submitted' | 'Quoted' | 'Bound' | 'Declined' | 'No Appetite';
}

export interface Email {
  date: string;
  subj: string;
  dir: 'in' | 'out';
  body: string;
  to?: string;
  toName?: string;
  from?: string;
  fromName?: string;
  tag?: string;
  attachments?: { name: string; size: string }[];
  read?: boolean;
}

export interface Document {
  id: string;
  name: string;
  tag: string;
  date: string;
  size: string;
  checklistItem?: string;
  // For uploaded files
  mimeType?: string;
  dataUrl?: string;        // base64 data URL — stored for download/preview
  uploadedBy?: string;
}

export interface Driver {
  firstName: string;
  lastName: string;
  dob: string;
  state: string;
  dlNumber: string;
  cdlNumber: string;
  experience: number;
  accidents: number;
  violations: number;
  mvrStatus: 'Clean' | 'Issues Found' | 'Pending';
  mvrDate: string;
}

export interface Vehicle {
  unitNumber: string;
  type: string;
  year: string;
  make: string;
  model: string;
  vin: string;
  value: number;
  gvw: number;
}

export interface Policy {
  id: string;
  policyNumber: string;
  line: string;
  market: string;          // market id or name
  marketName?: string;
  producer: string;        // producer id
  premium: number;
  effectiveDate: string;
  expirationDate: string;
  bindDate: string;
  status: 'Active' | 'Cancelled' | 'Expired' | 'Pending';
  notes?: string;
}

export interface MVROrder {
  id: string;
  driverIndex: number;     // index in lead.drivers
  driverName: string;
  orderedDate: string;
  status: 'Pending' | 'Complete' | 'Failed';
  cost: number;            // total charged to producer (vendor cost + carrierBase fee)
  vendorCost: number;
  serviceFee: number;
  resultUrl?: string;
  result?: string;
  vendor: 'Samba Safety' | 'Manual';
}

export interface Lead {
  id: string;
  company: string;
  dot: string;
  contact: string;
  email: string;
  phone: string;
  status: LeadStatus;
  producer: string;
  lines: string[];
  years: number;
  fleet: number;
  commodities: string[];
  violations: number;
  hazmat: boolean;
  vehicles: string;
  notes: string;
  premium: number;
  markets: MarketStatus[];
  emails: Email[];
  docs: Document[];
  drivers?: Driver[];
  vehicleList?: Vehicle[];
  safer?: SaferData | null;
  created: string;
  boundDate?: string | null;
  // legacy single-policy fields (kept for backward compat)
  policyNumber?: string;
  effectiveDate?: string;
  expirationDate?: string;
  // new: multiple policies per account
  policies?: Policy[];
  mvrOrders?: MVROrder[];
  statusHistory?: StatusHistoryEntry[];
}

export interface Market {
  id: string;
  name: string;
  lines: string[];
  apt: {
    minYrs: number;
    minF: number;
    maxF: number;
    comm: string[];
    noHaz: boolean;
    maxViol: number;
    maxAlerts: number;
    bt: { unsafeDriving: number; hoursOfService: number; vehicleMaintenance: number; crashIndicator: number };
  };
  notes: string;
}

export interface Producer {
  id: string;
  name: string;
  phone: string;
  email: string;
  supervisor: string;
  title: string;
  photo?: string | null;
  goals: { deals: number; binds: number; declines: number; premium: number; revenue: number };
}

export type ContactType = 'Underwriter' | 'Market' | 'Broker' | 'Producer' | 'Insured' | 'Carrier' | 'Vendor' | 'Other';

export interface Contact {
  id: string;
  name: string;
  company: string;
  role: string;
  email: string;
  phone: string;
  type?: ContactType;
  notes?: string;
  created?: string;
}

export interface Application {
  id: string;
  type: string;
  leadId: string;
  status: 'Draft' | 'Complete' | 'Sent';
  created: string;
  modified: string;
  data: Record<string, string>;
}

export interface CensusEntry {
  dot: string;
  company: string;
  state: string;
  city: string;
  phone: string;
  email: string;
  owner: string;
  units: number;
  cargo: string[];
  opStart: string;
  newV: boolean;
}
