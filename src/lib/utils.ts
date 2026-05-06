import { BASIC_CATS, STATUS_COLORS } from './constants';
import type { Lead, Market, SaferBasics, LeadStatus } from './types';

// ─── Pre-Underwriting Market Fit ──────────────────────────────────────────────
export interface PreUWResult {
  market: Market;
  score: number;           // 0–100
  eligible: boolean;       // score >= 50
  lineMatch: string[];     // overlapping coverage lines
  reasons: string[];       // disqualifying reasons
  warnings: string[];      // near-miss cautions (not disqualifying)
}

export function runPreUW(lead: Lead, markets: Market[]): PreUWResult[] {
  const alertInfo = lead.safer ? getAlerts(lead.safer.basics) : { count: 0, alerts: [] };

  return markets.map(m => {
    const reasons: string[] = [];
    const warnings: string[] = [];
    let score = 100;
    const a = m.apt;

    // Years in business
    if (lead.years < a.minYrs) {
      reasons.push(`Requires ${a.minYrs}+ yrs in business (account has ${lead.years})`);
      score -= 30;
    } else if (lead.years < a.minYrs + 1) {
      warnings.push(`Only ${lead.years} yr${lead.years !== 1 ? 's' : ''} — near minimum of ${a.minYrs}`);
    }

    // Fleet size
    if (lead.fleet < a.minF || lead.fleet > a.maxF) {
      reasons.push(`Fleet must be ${a.minF}–${a.maxF} units (account has ${lead.fleet})`);
      score -= 25;
    } else if (lead.fleet > a.maxF * 0.85) {
      warnings.push(`Fleet size ${lead.fleet} is near the max of ${a.maxF}`);
    }

    // Hazmat
    if (lead.hazmat && a.noHaz) {
      reasons.push('Market does not write hazmat operations');
      score -= 40;
    }

    // Violations
    if (lead.violations > a.maxViol) {
      reasons.push(`Max ${a.maxViol} violation${a.maxViol !== 1 ? 's' : ''} allowed (account has ${lead.violations})`);
      score -= 25;
    } else if (lead.violations === a.maxViol && a.maxViol > 0) {
      warnings.push(`At violation limit (${lead.violations}/${a.maxViol})`);
    }

    // Commodity match
    if (a.comm.length > 0 && lead.commodities.length > 0) {
      const overlap = lead.commodities.filter(c => a.comm.includes(c));
      if (overlap.length === 0) {
        reasons.push('No commodity overlap with market appetite');
        score -= 20;
      } else if (overlap.length < lead.commodities.length) {
        const unmatched = lead.commodities.filter(c => !a.comm.includes(c));
        warnings.push(`${unmatched.length} commodity type${unmatched.length !== 1 ? 's' : ''} outside appetite: ${unmatched.slice(0, 2).join(', ')}${unmatched.length > 2 ? '…' : ''}`);
      }
    }

    // Coverage line match
    const lineMatch = lead.lines.filter(l => m.lines.includes(l));
    if (lineMatch.length === 0 && lead.lines.length > 0) {
      reasons.push('No matching coverage lines');
      score -= 50;
    }

    // SAFER / BASICs thresholds
    if (lead.safer?.basics && a.bt) {
      const b = lead.safer.basics;

      if (alertInfo.count > a.maxAlerts) {
        reasons.push(`Max ${a.maxAlerts} BASIC alert${a.maxAlerts !== 1 ? 's' : ''} (account has ${alertInfo.count})`);
        score -= 20;
      } else if (alertInfo.count === a.maxAlerts && a.maxAlerts > 0) {
        warnings.push(`At BASIC alert limit (${alertInfo.count}/${a.maxAlerts})`);
      }

      type BasicNumKey = 'unsafeDriving' | 'hoursOfService' | 'vehicleMaintenance' | 'crashIndicator';
      const checks: [BasicNumKey, keyof typeof a.bt, string][] = [
        ['unsafeDriving', 'unsafeDriving', 'Unsafe Driving'],
        ['hoursOfService', 'hoursOfService', 'HOS Compliance'],
        ['vehicleMaintenance', 'vehicleMaintenance', 'Vehicle Maintenance'],
        ['crashIndicator', 'crashIndicator', 'Crash Indicator'],
      ];

      checks.forEach(([bKey, btKey, label]) => {
        const val = b[bKey] as number | null;
        const threshold = a.bt[btKey];
        if (val != null && threshold) {
          if (val >= threshold) {
            reasons.push(`${label}: ${val}% meets/exceeds market threshold of ${threshold}%`);
            score -= 15;
          } else if (val >= threshold * 0.85) {
            warnings.push(`${label}: ${val}% approaching ${threshold}% threshold`);
          }
        }
      });
    } else if (!lead.safer) {
      warnings.push('No SAFER data — market may require it during underwriting');
    }

    return {
      market: m,
      score: Math.max(0, score),
      eligible: score >= 50,
      lineMatch,
      reasons,
      warnings,
    };
  }).sort((a, b) => b.score - a.score);
}

export function fmt$(n: number): string {
  return '$' + Number(n || 0).toLocaleString();
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function getAlerts(basics: SaferBasics | null | undefined) {
  if (!basics) return { count: 0, alerts: [] as typeof BASIC_CATS[number][] };
  const alerts: (typeof BASIC_CATS[number] & { value: number })[] = [];
  BASIC_CATS.forEach(c => {
    const raw = basics[c.key as keyof SaferBasics];
    const v = typeof raw === 'number' ? raw : null;
    if (v != null && v >= c.thr) alerts.push({ ...c, value: v });
  });
  return { count: alerts.length, alerts };
}

export function statusColor(s: LeadStatus) {
  return STATUS_COLORS[s] || { bg: '#f1f5f9', b: '#94a3b8', t: '#64748b' };
}

export function mktName(markets: { id: string; name: string }[], mid: string): string {
  return markets.find(x => x.id === mid)?.name || 'Unknown';
}

export function unreadCount(lead: Lead): number {
  return (lead.emails || []).filter(e => e.dir === 'in' && !e.read).length;
}

export function docsByTag(docs: Lead['docs']) {
  const g: Record<string, typeof docs> = {};
  docs.forEach(d => {
    if (!g[d.tag]) g[d.tag] = [];
    g[d.tag].push(d);
  });
  return g;
}

export function basicBarColor(v: number): string {
  if (v >= 80) return '#9f1239';
  if (v >= 65) return '#92400e';
  if (v >= 50) return '#b45309';
  return '#0f766e';
}

export function producerDotColor(pid: string): string {
  const map: Record<string, string> = { p1: '#2563eb', p2: '#0f766e', p3: '#92400e' };
  return map[pid] || '#94a3b8';
}

export function daysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

export function stageBadgeColor(days: number, status: LeadStatus): { bg: string; color: string; label: string } {
  const benchmarks: Partial<Record<LeadStatus, number>> = {
    'New Lead': 3, 'Contacted': 7, 'Quoting': 14, 'Submitted': 10,
  };
  const bench = benchmarks[status];
  if (!bench) return { bg: '#f1f5f9', color: '#64748b', label: `${days}d` };
  if (days > bench * 1.5) return { bg: '#fff1f2', color: '#9f1239', label: `${days}d` };
  if (days > bench) return { bg: '#fefce8', color: '#92400e', label: `${days}d` };
  return { bg: '#f0fdfa', color: '#0f766e', label: `${days}d` };
}
