// ─── CAB-Style Scoring ────────────────────────────────────────────────────────
// CAB (Central Analysis Bureau) provides composite trucking risk scores. Since
// FMCSA hides percentile rankings publicly, we compute equivalent scores from
// the public data they DO release: violation counts, inspection counts, OOS
// rates, crash counts, fleet size, time-in-business.
//
// Score scale: 0–100 where higher = better (matches CAB convention).

import type { FMCSACarrier, FMCSABasicsResult, BasicDetail } from './fmcsa';

export interface CABBasicScore {
  category: string;
  shortLabel: string;
  rawScore: number;        // 0-100, higher = better
  letterGrade: string;     // A, B, C, D, F
  measure: number | null;
  threshold: number | null;
  violations: number;
  alert: boolean;
  notes: string;
}

export interface CABCompositeScore {
  overall: number;         // 0-100, higher = better
  letterGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  riskTier: 'Preferred' | 'Standard' | 'Substandard' | 'High Risk' | 'Critical';
  riskColor: { bg: string; color: string; border: string };
  basics: CABBasicScore[];
  // Sub-scores
  safetyScore: number;       // BASICs aggregated
  inspectionScore: number;   // OOS rates
  crashScore: number;        // Crash density
  authorityScore: number;    // Authority + insurance
  // Insights
  alerts: number;
  totalViolations: number;
  totalInspections: number;
  totalCrashes: number;
  redFlags: string[];
  greenFlags: string[];
}

// Map a numeric measure against a threshold into a 0-100 "good" score
// where 100 = no risk, 0 = at or above threshold
function measureToScore(measure: number | null, threshold: number | null): number {
  if (measure == null) return 75; // unknown → neutral-good
  if (threshold == null || threshold === 0) return measure === 0 ? 100 : 50;
  // 0 measure → 100, threshold measure → 30, double threshold → 0
  if (measure <= 0) return 100;
  if (measure >= threshold) {
    const overage = (measure - threshold) / threshold;
    return Math.max(0, 30 - overage * 30);
  }
  // Below threshold: scale 100 → 30 over the range
  const ratio = measure / threshold;
  return Math.round(100 - ratio * 70);
}

function gradeFromScore(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function tierFromScore(score: number): {
  tier: CABCompositeScore['riskTier'];
  color: { bg: string; color: string; border: string };
} {
  if (score >= 85) return { tier: 'Preferred', color: { bg: '#f0fdfa', color: '#0f766e', border: '#5eead4' } };
  if (score >= 70) return { tier: 'Standard', color: { bg: '#eff6ff', color: '#1e40af', border: '#93c5fd' } };
  if (score >= 55) return { tier: 'Substandard', color: { bg: '#fefce8', color: '#854d0e', border: '#fde68a' } };
  if (score >= 40) return { tier: 'High Risk', color: { bg: '#fff7ed', color: '#9a3412', border: '#fed7aa' } };
  return { tier: 'Critical', color: { bg: '#fff1f2', color: '#9f1239', border: '#fda4af' } };
}

const BASIC_DEFINITIONS: { key: string; category: string; short: string; weight: number }[] = [
  { key: 'unsafeDriving',        category: 'Unsafe Driving',        short: 'UD',  weight: 1.5 },
  { key: 'hoursOfService',       category: 'HOS Compliance',        short: 'HOS', weight: 1.3 },
  { key: 'vehicleMaintenance',   category: 'Vehicle Maintenance',   short: 'VM',  weight: 1.2 },
  { key: 'crashIndicator',       category: 'Crash Indicator',       short: 'CI',  weight: 1.5 },
  { key: 'driverFitness',        category: 'Driver Fitness',        short: 'DF',  weight: 1.0 },
  { key: 'controlledSubstances', category: 'Drugs & Alcohol',       short: 'CS',  weight: 1.4 },
  { key: 'hmCompliance',         category: 'HM Compliance',         short: 'HM',  weight: 0.8 },
];

function scoreBasic(d: BasicDetail | undefined, def: typeof BASIC_DEFINITIONS[number]): CABBasicScore {
  if (!d || !d.hasData) {
    return {
      category: def.category, shortLabel: def.short,
      rawScore: 75, letterGrade: 'C',
      measure: null, threshold: null, violations: 0,
      alert: false, notes: 'No data available',
    };
  }
  let score = measureToScore(d.measure, d.threshold);
  // Penalize for alert flag
  if (d.alert) score = Math.min(score, 35);
  // Penalize for high violation density
  if (d.totalViolations > 50) score -= 5;
  if (d.totalViolations > 200) score -= 5;
  if (d.totalViolations > 500) score -= 5;
  score = Math.max(0, Math.min(100, score));
  return {
    category: def.category, shortLabel: def.short,
    rawScore: Math.round(score), letterGrade: gradeFromScore(score),
    measure: d.measure, threshold: d.threshold, violations: d.totalViolations,
    alert: d.alert,
    notes: d.alert ? 'BASIC alert active' : d.notPublic ? 'Score derived from measure value' : 'Within thresholds',
  };
}

export function computeCABScore(carrier: FMCSACarrier, basics: FMCSABasicsResult | null): CABCompositeScore {
  // ── BASICs sub-scores ──
  const basicScores: CABBasicScore[] = BASIC_DEFINITIONS.map(def =>
    scoreBasic(basics?.details[def.key], def)
  );
  const totalWeight = BASIC_DEFINITIONS.reduce((s, d) => s + d.weight, 0);
  const weightedBasicSum = basicScores.reduce((sum, bs, i) => sum + bs.rawScore * BASIC_DEFINITIONS[i].weight, 0);
  const safetyScore = Math.round(weightedBasicSum / totalWeight);

  // ── Inspection score (OOS rates) ──
  // Lower OOS rates = higher score. National avg veh OOS = 20%, drv OOS = 5.5%
  const vRate = carrier.vehicleOosRate ?? 0;
  const dRate = carrier.driverOosRate ?? 0;
  let inspectionScore = 100;
  inspectionScore -= Math.min(40, vRate * 1.5);  // 0% → 100, 20% → 70, 30% → 55
  inspectionScore -= Math.min(30, dRate * 4);     // 0% → 100, 5% → 80, 10% → 60
  inspectionScore = Math.max(0, Math.round(inspectionScore));
  // No inspections at all → neutral score
  if ((carrier.vehicleInsp ?? 0) + (carrier.driverInsp ?? 0) === 0) inspectionScore = 75;

  // ── Crash score ──
  // Crashes per power unit, weighted by severity
  const fleet = Math.max(1, carrier.powerUnits);
  const weightedCrashes = (carrier.crashTotal ?? 0)
    + (carrier.fatalCrash ?? 0) * 4   // fatal weighted heavily
    + (carrier.injCrash ?? 0) * 2;
  const crashRate = weightedCrashes / fleet;
  let crashScore = 100;
  if (crashRate > 0) crashScore -= Math.min(80, crashRate * 35);
  crashScore = Math.max(0, Math.round(crashScore));

  // ── Authority / insurance score ──
  let authorityScore = 100;
  if (!carrier.allowedToOperate) authorityScore -= 50;
  if (carrier.bipdRequired && !carrier.bipdOnFile) authorityScore -= 30;
  if (carrier.operatingStatus.toLowerCase().includes('out-of-service')) authorityScore -= 50;
  if (carrier.operatingStatus.toLowerCase().includes('inactive') && carrier.bipdRequired) authorityScore -= 15;
  if (!carrier.authorityStatus || carrier.authorityStatus === 'None') authorityScore -= 10;
  authorityScore = Math.max(0, Math.min(100, authorityScore));

  // ── Composite weighted score ──
  // Safety 50%, Inspection 20%, Crash 20%, Authority 10%
  const overall = Math.round(safetyScore * 0.5 + inspectionScore * 0.2 + crashScore * 0.2 + authorityScore * 0.1);
  const tierInfo = tierFromScore(overall);

  // ── Insights ──
  const alerts = basics?.alerts.length ?? 0;
  const totalViolations = basics?.totalViolations ?? 0;
  const totalInspections = (carrier.vehicleInsp ?? 0) + (carrier.driverInsp ?? 0);
  const totalCrashes = carrier.crashTotal ?? 0;

  const redFlags: string[] = [];
  const greenFlags: string[] = [];

  if (!carrier.allowedToOperate) redFlags.push('Not allowed to operate');
  if (carrier.bipdRequired && !carrier.bipdOnFile) redFlags.push('Required BIPD insurance not on file');
  if (carrier.operatingStatus.toLowerCase().includes('out-of-service')) redFlags.push('Out of Service');
  if ((carrier.fatalCrash ?? 0) > 0) redFlags.push(`${carrier.fatalCrash} fatal crash${carrier.fatalCrash > 1 ? 'es' : ''} on record`);
  if (alerts >= 3) redFlags.push(`${alerts} active BASICs alerts`);
  else if (alerts > 0) redFlags.push(`${alerts} BASICs alert${alerts > 1 ? 's' : ''} active`);
  if (vRate > 30) redFlags.push(`Vehicle OOS rate ${vRate.toFixed(0)}% above national average`);
  if (dRate > 8) redFlags.push(`Driver OOS rate ${dRate.toFixed(0)}% above national average`);
  if (totalCrashes > fleet * 0.5) redFlags.push('High crash frequency relative to fleet size');

  if (carrier.safetyRating?.toLowerCase().includes('satisfactory')) greenFlags.push('Satisfactory FMCSA safety rating');
  if (alerts === 0 && totalInspections > 5) greenFlags.push('No active BASICs alerts');
  if (totalCrashes === 0 && fleet > 0) greenFlags.push('No crashes on record');
  if (vRate > 0 && vRate < 10) greenFlags.push('Vehicle OOS rate below national average');
  if (dRate > 0 && dRate < 3) greenFlags.push('Driver OOS rate well below national average');
  if (carrier.bipdOnFile) greenFlags.push('BIPD insurance on file');
  if (carrier.allowedToOperate && carrier.authorityStatus === 'Authorized') greenFlags.push('Active authorized authority');

  return {
    overall,
    letterGrade: gradeFromScore(overall) as CABCompositeScore['letterGrade'],
    riskTier: tierInfo.tier,
    riskColor: tierInfo.color,
    basics: basicScores,
    safetyScore, inspectionScore, crashScore, authorityScore,
    alerts, totalViolations, totalInspections, totalCrashes,
    redFlags, greenFlags,
  };
}

export function gradeColor(grade: string): { bg: string; color: string; border: string } {
  switch (grade) {
    case 'A': return { bg: '#f0fdfa', color: '#0f766e', border: '#5eead4' };
    case 'B': return { bg: '#eff6ff', color: '#1e40af', border: '#93c5fd' };
    case 'C': return { bg: '#fefce8', color: '#854d0e', border: '#fde68a' };
    case 'D': return { bg: '#fff7ed', color: '#9a3412', border: '#fed7aa' };
    case 'F': return { bg: '#fff1f2', color: '#9f1239', border: '#fda4af' };
    default:  return { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' };
  }
}
