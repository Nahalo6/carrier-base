'use client';
import { computeCABScore, gradeColor, type CABCompositeScore } from '@/lib/cab';
import type { FMCSACarrier, FMCSABasicsResult } from '@/lib/fmcsa';

// Compact ring showing letter grade
function GradeRing({ grade, score, size = 78 }: { grade: string; score: number; size?: number }) {
  const colors = gradeColor(grade);
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  const pct = score / 100;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.color} strokeWidth="6"
          strokeDasharray={`${pct * c} ${c}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: size * 0.42, fontWeight: 800, lineHeight: 1, color: colors.color }}>{grade}</div>
        <div style={{ fontSize: size * 0.13, fontWeight: 600, color: '#64748b', marginTop: 2 }}>{score}</div>
      </div>
    </div>
  );
}

function SubScoreBar({ label, score }: { label: string; score: number }) {
  const colors = gradeColor(
    score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F'
  );
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
        <span style={{ color: '#475569', fontWeight: 600 }}>{label}</span>
        <span style={{ fontWeight: 700, color: colors.color }}>{score}</span>
      </div>
      <div style={{ height: 5, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: colors.color, borderRadius: 3 }} />
      </div>
    </div>
  );
}

function BasicGradeChip({ b }: { b: CABCompositeScore['basics'][number] }) {
  const colors = gradeColor(b.letterGrade);
  return (
    <div style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '8px 10px', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{b.shortLabel}</span>
        <span style={{ fontSize: 18, fontWeight: 800, color: colors.color, lineHeight: 1 }}>{b.letterGrade}</span>
      </div>
      <div style={{ fontSize: 9, color: '#64748b', marginBottom: 4, lineHeight: 1.2 }}>{b.category}</div>
      <div style={{ height: 4, background: '#fff', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${b.rawScore}%`, height: '100%', background: colors.color }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginTop: 3, color: '#64748b' }}>
        <span>{b.violations} viol</span>
        {b.alert && <span style={{ color: '#9f1239', fontWeight: 700 }}>ALERT</span>}
        <span style={{ fontWeight: 600 }}>{b.rawScore}</span>
      </div>
    </div>
  );
}

export default function CABScorePanel({
  carrier,
  basics,
  compact = false,
}: {
  carrier: FMCSACarrier;
  basics: FMCSABasicsResult | null;
  compact?: boolean;
}) {
  const score = computeCABScore(carrier, basics);
  const tier = score.riskColor;

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: tier.bg, border: `1px solid ${tier.border}`, borderRadius: 10 }}>
        <GradeRing grade={score.letterGrade} score={score.overall} size={56} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>CarrierBase Score</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: tier.color, lineHeight: 1.2 }}>{score.riskTier}</div>
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
            {score.alerts} alerts · {score.totalViolations} viols · {score.totalCrashes} crashes
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', border: `2px solid ${tier.border}`, borderRadius: 14, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: tier.bg, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: `1px solid ${tier.border}` }}>
        <GradeRing grade={score.letterGrade} score={score.overall} size={88} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>CarrierBase Composite Score</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: tier.color, lineHeight: 1.2, marginBottom: 2 }}>
            {score.riskTier}
          </div>
          <div style={{ fontSize: 12, color: '#475569' }}>
            CAB-style risk assessment · derived from FMCSA inspections, violations, crashes & authority data
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Overall</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: tier.color, lineHeight: 1 }}>{score.overall}</div>
          <div style={{ fontSize: 10, color: '#64748b' }}>of 100</div>
        </div>
      </div>

      {/* Body: sub-scores + flags */}
      <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 18 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Component Scores</div>
          <SubScoreBar label="Safety (BASICs)" score={score.safetyScore} />
          <SubScoreBar label="Inspections (OOS rates)" score={score.inspectionScore} />
          <SubScoreBar label="Crash History" score={score.crashScore} />
          <SubScoreBar label="Authority & Insurance" score={score.authorityScore} />
        </div>

        <div>
          {score.redFlags.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9f1239', textTransform: 'uppercase', marginBottom: 6 }}>Red Flags ({score.redFlags.length})</div>
              {score.redFlags.map((f, i) => (
                <div key={i} style={{ fontSize: 11, color: '#7f1d1d', display: 'flex', gap: 6, marginBottom: 3 }}>
                  <span style={{ color: '#9f1239', fontWeight: 700 }}>×</span> {f}
                </div>
              ))}
            </div>
          )}
          {score.greenFlags.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', marginBottom: 6 }}>Strengths ({score.greenFlags.length})</div>
              {score.greenFlags.map((f, i) => (
                <div key={i} style={{ fontSize: 11, color: '#134e4a', display: 'flex', gap: 6, marginBottom: 3 }}>
                  <span style={{ color: '#0f766e', fontWeight: 700 }}>✓</span> {f}
                </div>
              ))}
            </div>
          )}
          {score.redFlags.length === 0 && score.greenFlags.length === 0 && (
            <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', padding: 16 }}>
              Insufficient inspection data to identify flags. Score reflects baseline assumptions.
            </div>
          )}
        </div>
      </div>

      {/* BASICs grade grid */}
      <div style={{ borderTop: '1px solid #f1f5f9', padding: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 10 }}>BASIC Category Grades</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
          {score.basics.map(b => <BasicGradeChip key={b.shortLabel} b={b} />)}
        </div>
      </div>
    </div>
  );
}
