// Excel/CSV parsing helpers using SheetJS (xlsx).
// Drag-drop a file → parse to rows → map columns to Driver / Vehicle records.
import * as XLSX from 'xlsx';
import type { Driver, Vehicle } from './types';

export type ParsedRow = Record<string, string | number | undefined>;

// Parse a File (xlsx, xls, csv) into an array of row objects keyed by header
export async function parseSpreadsheet(file: File): Promise<ParsedRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const rows: ParsedRow[] = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
  // Normalize header keys to lowercase trimmed for fuzzy matching
  return rows.map(r => {
    const out: ParsedRow = {};
    for (const k of Object.keys(r)) {
      out[k] = r[k];
      out[k.toLowerCase().replace(/\s+|_/g, '')] = r[k];
    }
    return out;
  });
}

// Driver column synonyms — when a sheet uses any of these, map to our field
const DRIVER_FIELD_MAP: Record<keyof Driver, string[]> = {
  firstName:  ['firstname', 'first', 'fname', 'givenname', 'driverfirstname', 'driverfirst'],
  lastName:   ['lastname', 'last', 'lname', 'surname', 'driverlastname', 'driverlast'],
  dob:        ['dob', 'dateofbirth', 'birthdate', 'birthday'],
  state:      ['state', 'st', 'stateofissue', 'licstate', 'licensestate', 'cdlstate'],
  dlNumber:   ['dlnumber', 'driverlicense', 'licensenumber', 'license', 'dl', 'driverslicense'],
  cdlNumber:  ['cdlnumber', 'cdl', 'cdlno', 'commerciallicense'],
  experience: ['experience', 'years', 'yearsexperience', 'yrsexperience', 'yearsofexperience', 'yrsexp'],
  accidents:  ['accidents', 'numaccidents', 'accidentcount', 'crashes', 'crashcount'],
  violations: ['violations', 'numviolations', 'violationcount', 'tickets', 'ticketcount'],
  mvrStatus:  ['mvrstatus', 'mvr', 'recordstatus', 'mvrresult'],
  mvrDate:    ['mvrdate', 'mvrdateordered', 'lastmvr', 'mvrordered'],
};

const VEHICLE_FIELD_MAP: Record<keyof Vehicle, string[]> = {
  unitNumber: ['unitnumber', 'unit', 'unitno', 'unit#', 'tracknumber', 'truck', 'trucknumber'],
  type:       ['type', 'vehicletype', 'class', 'category'],
  year:       ['year', 'modelyear', 'yr'],
  make:       ['make', 'manufacturer'],
  model:      ['model'],
  vin:        ['vin', 'vinno', 'vin#', 'vehicleidentificationnumber'],
  value:      ['value', 'acv', 'cost', 'price', 'statedvalue', 'agreedvalue'],
  gvw:        ['gvw', 'gvwr', 'grossweight', 'gross', 'weight', 'lbs'],
};

function pick(row: ParsedRow, candidates: string[]): string | undefined {
  for (const c of candidates) {
    const v = row[c];
    if (v != null && v !== '') return String(v);
  }
  return undefined;
}

function toNumber(v: string | undefined): number {
  if (!v) return 0;
  const cleaned = v.toString().replace(/[$,\s]/g, '');
  const n = Number(cleaned);
  return isNaN(n) ? 0 : n;
}

export function rowsToDrivers(rows: ParsedRow[]): Driver[] {
  return rows.map(r => ({
    firstName:  pick(r, DRIVER_FIELD_MAP.firstName) || '',
    lastName:   pick(r, DRIVER_FIELD_MAP.lastName) || '',
    dob:        pick(r, DRIVER_FIELD_MAP.dob) || '',
    state:      (pick(r, DRIVER_FIELD_MAP.state) || '').toUpperCase().slice(0, 2),
    dlNumber:   pick(r, DRIVER_FIELD_MAP.dlNumber) || '',
    cdlNumber:  pick(r, DRIVER_FIELD_MAP.cdlNumber) || pick(r, DRIVER_FIELD_MAP.dlNumber) || '',
    experience: toNumber(pick(r, DRIVER_FIELD_MAP.experience)),
    accidents:  toNumber(pick(r, DRIVER_FIELD_MAP.accidents)),
    violations: toNumber(pick(r, DRIVER_FIELD_MAP.violations)),
    mvrStatus:  ((pick(r, DRIVER_FIELD_MAP.mvrStatus) || 'Pending').match(/clean|good|ok/i) ? 'Clean'
                 : (pick(r, DRIVER_FIELD_MAP.mvrStatus) || '').match(/issue|bad|fail|reject/i) ? 'Issues Found'
                 : 'Pending') as Driver['mvrStatus'],
    mvrDate:    pick(r, DRIVER_FIELD_MAP.mvrDate) || '',
  })).filter(d => d.firstName || d.lastName);
}

export function rowsToVehicles(rows: ParsedRow[]): Vehicle[] {
  return rows.map(r => ({
    unitNumber: pick(r, VEHICLE_FIELD_MAP.unitNumber) || '',
    type:       pick(r, VEHICLE_FIELD_MAP.type) || 'Tractor',
    year:       pick(r, VEHICLE_FIELD_MAP.year) || '',
    make:       pick(r, VEHICLE_FIELD_MAP.make) || '',
    model:      pick(r, VEHICLE_FIELD_MAP.model) || '',
    vin:        pick(r, VEHICLE_FIELD_MAP.vin) || '',
    value:      toNumber(pick(r, VEHICLE_FIELD_MAP.value)),
    gvw:        toNumber(pick(r, VEHICLE_FIELD_MAP.gvw)),
  })).filter(v => v.vin || v.unitNumber || v.make);
}

// Build a downloadable template for users
export function downloadDriverTemplate() {
  const headers = ['First Name', 'Last Name', 'DOB', 'State', 'DL Number', 'CDL Number',
                   'Experience (yrs)', 'Accidents', 'Violations', 'MVR Status', 'MVR Date'];
  const sample = [
    ['John', 'Smith', '1985-03-15', 'TX', 'DL12345678', 'CDL98765432', '10', '0', '1', 'Clean', '2025-03-01'],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Drivers');
  XLSX.writeFile(wb, 'driver-template.xlsx');
}

export function downloadVehicleTemplate() {
  const headers = ['Unit Number', 'Type', 'Year', 'Make', 'Model', 'VIN', 'Value', 'GVW'];
  const sample = [
    ['101', 'Tractor', '2022', 'Freightliner', 'Cascadia', '1FUJGHDV0NLAA1234', '85000', '80000'],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Vehicles');
  XLSX.writeFile(wb, 'vehicle-template.xlsx');
}
