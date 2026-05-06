import type { LeadStatus } from './types';

export const STATUSES: LeadStatus[] = [
  'New Lead', 'Contacted', 'Quoting', 'Submitted', 'Bound', 'Lost', 'Remarketing'
];

export const STATUS_COLORS: Record<LeadStatus, { bg: string; b: string; t: string }> = {
  'New Lead':    { bg: '#fff1f2', b: '#fda4af', t: '#9f1239' },
  'Contacted':   { bg: '#f0f9ff', b: '#93c5fd', t: '#1e40af' },
  'Quoting':     { bg: '#fefce8', b: '#fde68a', t: '#854d0e' },
  'Submitted':   { bg: '#eff6ff', b: '#818cf8', t: '#3730a3' },
  'Bound':       { bg: '#f0fdfa', b: '#5eead4', t: '#0f766e' },
  'Lost':        { bg: '#fafafa', b: '#d4d4d4', t: '#525252' },
  'Remarketing': { bg: '#faf5ff', b: '#c084fc', t: '#5b21b6' },
};

export const LINES = [
  'Auto Liability', 'General Liability', 'Physical Damage', 'Motor Truck Cargo',
  'Non-Trucking Liability', 'Occupational Accident', 'Workers Comp', 'Umbrella/Excess',
  'Trailer Interchange', 'Reefer Breakdown',
];

export const COMMODITIES = [
  'General Freight', 'Household Goods', 'Metal/Sheets/Coils', 'Motor Vehicles',
  'Logs/Lumber', 'Building Materials', 'Mobile Homes', 'Machinery/Large Objects',
  'Fresh Produce', 'Liquids/Gases', 'Intermodal Containers', 'Passengers',
  'Oil Field Equipment', 'Livestock', 'Grain/Feed', 'Coal/Coke', 'Meat',
  'Garbage/Refuse', 'US Mail', 'Chemicals', 'Dry Bulk', 'Refrigerated Food', 'Hazmat',
];

export const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
];

export const BASIC_CATS = [
  { key: 'unsafeDriving',       label: 'Unsafe Driving',       short: 'UD',  icon: '!', thr: 65 },
  { key: 'hoursOfService',      label: 'HOS Compliance',       short: 'HOS', icon: 'H', thr: 65 },
  { key: 'driverFitness',       label: 'Driver Fitness',       short: 'DF',  icon: 'D', thr: 80 },
  { key: 'controlledSubstances',label: 'Controlled Substances', short: 'CS',  icon: 'C', thr: 80 },
  { key: 'vehicleMaintenance',  label: 'Vehicle Maintenance',  short: 'VM',  icon: 'V', thr: 80 },
  { key: 'crashIndicator',      label: 'Crash Indicator',      short: 'CI',  icon: 'X', thr: 65 },
  { key: 'hmCompliance',        label: 'HM Compliance',        short: 'HM',  icon: 'H', thr: 80 },
] as const;

export const DOC_TAGS = [
  'Application', 'Loss Runs', 'MVRs', 'IFTAs', 'Supplemental',
  'Finance Agreement', 'Signed Documents', 'Lease Terminations', 'Other',
];

export const DOC_TAG_COLORS: Record<string, string> = {
  'Application':      'tag-blue',
  'Loss Runs':        'tag-purple',
  'MVRs':             'tag-amber',
  'IFTAs':            'tag-green',
  'Supplemental':     'tag-slate',
  'Finance Agreement':'tag-red',
  'Signed Documents': 'tag-green',
  'Lease Terminations':'tag-amber',
  'Other':            'tag-slate',
};

export const EMAIL_TAGS = [
  'Market', 'Broker', 'Customer', 'Underwriter', 'Internal',
  'Claims', 'Renewal', 'Quote', 'Bind Request', 'Other',
];

export const EMAIL_TAG_COLORS: Record<string, string> = {
  'Market':       'tag-blue',
  'Broker':       'tag-purple',
  'Customer':     'tag-green',
  'Underwriter':  'tag-amber',
  'Internal':     'tag-slate',
  'Claims':       'tag-red',
  'Renewal':      'tag-amber',
  'Quote':        'tag-blue',
  'Bind Request': 'tag-green',
  'Other':        'tag-slate',
};

export const PRODUCER_COLORS: Record<string, string> = {
  p1: '#2563eb',
  p2: '#0f766e',
  p3: '#92400e',
};

export const TABS = [
  { key: 'dashboard',   label: 'Dashboard',          icon: 'LayoutDashboard', href: '/dashboard' },
  { key: 'leaderboard', label: 'Leaderboard',         icon: 'Trophy',          href: '/leaderboard' },
  { key: 'leads',       label: 'Leads & Accounts',   icon: 'Users',           href: '/leads' },
  { key: 'pipeline',    label: 'Pipeline',            icon: 'Kanban',          href: '/pipeline' },
  { key: 'markets',     label: 'Markets',             icon: 'Building2',       href: '/markets' },
  { sep: true },
  { key: 'prospect',    label: 'DOT Leads',           icon: 'Search',          href: '/prospect' },
  { key: 'applications',label: 'Applications / Forms',icon: 'FileText',        href: '/applications' },
  { key: 'contacts',    label: 'Contacts',            icon: 'Contact',         href: '/contacts' },
  { key: 'policy',      label: 'Policies & Bound',    icon: 'CheckCircle',     href: '/policy' },
  { key: 'analytics',   label: 'Analytics',           icon: 'BarChart2',       href: '/analytics' },
] as const;
