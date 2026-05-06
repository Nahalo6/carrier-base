'use client';
// Lightweight US states heat map using a hand-built squared layout (cartogram).
// Each state is a square positioned roughly geographically — readable at any size,
// no external GeoJSON or libraries needed.

const STATE_GRID: { abbr: string; name: string; row: number; col: number }[] = [
  // row 0
  { abbr: 'AK', name: 'Alaska', row: 0, col: 0 },
  { abbr: 'ME', name: 'Maine', row: 0, col: 11 },
  // row 1
  { abbr: 'VT', name: 'Vermont', row: 1, col: 10 },
  { abbr: 'NH', name: 'New Hampshire', row: 1, col: 11 },
  { abbr: 'WA', name: 'Washington', row: 1, col: 1 },
  { abbr: 'ID', name: 'Idaho', row: 1, col: 2 },
  { abbr: 'MT', name: 'Montana', row: 1, col: 3 },
  { abbr: 'ND', name: 'North Dakota', row: 1, col: 4 },
  { abbr: 'MN', name: 'Minnesota', row: 1, col: 5 },
  { abbr: 'WI', name: 'Wisconsin', row: 1, col: 7 },
  { abbr: 'MI', name: 'Michigan', row: 1, col: 8 },
  // row 2
  { abbr: 'OR', name: 'Oregon', row: 2, col: 1 },
  { abbr: 'NV', name: 'Nevada', row: 2, col: 2 },
  { abbr: 'WY', name: 'Wyoming', row: 2, col: 3 },
  { abbr: 'SD', name: 'South Dakota', row: 2, col: 4 },
  { abbr: 'IA', name: 'Iowa', row: 2, col: 5 },
  { abbr: 'IL', name: 'Illinois', row: 2, col: 6 },
  { abbr: 'IN', name: 'Indiana', row: 2, col: 7 },
  { abbr: 'OH', name: 'Ohio', row: 2, col: 8 },
  { abbr: 'PA', name: 'Pennsylvania', row: 2, col: 9 },
  { abbr: 'NJ', name: 'New Jersey', row: 2, col: 10 },
  { abbr: 'CT', name: 'Connecticut', row: 2, col: 11 },
  { abbr: 'RI', name: 'Rhode Island', row: 2, col: 12 },
  { abbr: 'MA', name: 'Massachusetts', row: 1, col: 12 },
  { abbr: 'NY', name: 'New York', row: 1, col: 9 },
  // row 3
  { abbr: 'CA', name: 'California', row: 3, col: 1 },
  { abbr: 'UT', name: 'Utah', row: 3, col: 2 },
  { abbr: 'CO', name: 'Colorado', row: 3, col: 3 },
  { abbr: 'NE', name: 'Nebraska', row: 3, col: 4 },
  { abbr: 'MO', name: 'Missouri', row: 3, col: 5 },
  { abbr: 'KY', name: 'Kentucky', row: 3, col: 7 },
  { abbr: 'WV', name: 'West Virginia', row: 3, col: 8 },
  { abbr: 'VA', name: 'Virginia', row: 3, col: 9 },
  { abbr: 'MD', name: 'Maryland', row: 3, col: 10 },
  { abbr: 'DE', name: 'Delaware', row: 3, col: 11 },
  // row 4
  { abbr: 'AZ', name: 'Arizona', row: 4, col: 2 },
  { abbr: 'NM', name: 'New Mexico', row: 4, col: 3 },
  { abbr: 'KS', name: 'Kansas', row: 4, col: 4 },
  { abbr: 'AR', name: 'Arkansas', row: 4, col: 5 },
  { abbr: 'TN', name: 'Tennessee', row: 4, col: 6 },
  { abbr: 'NC', name: 'North Carolina', row: 4, col: 8 },
  { abbr: 'SC', name: 'South Carolina', row: 4, col: 9 },
  // row 5
  { abbr: 'HI', name: 'Hawaii', row: 5, col: 0 },
  { abbr: 'TX', name: 'Texas', row: 5, col: 4 },
  { abbr: 'OK', name: 'Oklahoma', row: 5, col: 3 },
  { abbr: 'LA', name: 'Louisiana', row: 5, col: 5 },
  { abbr: 'MS', name: 'Mississippi', row: 5, col: 6 },
  { abbr: 'AL', name: 'Alabama', row: 5, col: 7 },
  { abbr: 'GA', name: 'Georgia', row: 5, col: 8 },
  { abbr: 'FL', name: 'Florida', row: 5, col: 9 },
];

export interface USStateMapProps {
  data: Record<string, number>;       // { TX: 12, CA: 8, ... }
  metricLabel?: string;                // tooltip metric label
  colorScale?: [string, string];       // [zeroColor, maxColor]
  cellSize?: number;
  highlightLabel?: (abbr: string, val: number) => string | null;
}

export default function USStateMap({
  data, metricLabel = 'Accounts', colorScale = ['#e0f2fe', '#0c4a6e'], cellSize = 38,
}: USStateMapProps) {
  const max = Math.max(1, ...Object.values(data));

  const colorFor = (val: number) => {
    if (val === 0) return '#f1f5f9';
    const t = val / max;
    // Linear interpolate between colorScale[0] and colorScale[1]
    const a = parseHex(colorScale[0]);
    const b = parseHex(colorScale[1]);
    const r = Math.round(a[0] + (b[0] - a[0]) * t);
    const g = Math.round(a[1] + (b[1] - a[1]) * t);
    const bl = Math.round(a[2] + (b[2] - a[2]) * t);
    return `rgb(${r},${g},${bl})`;
  };

  const padding = 4;
  const cols = 13;
  const rows = 6;
  const width = cols * (cellSize + padding) + padding;
  const height = rows * (cellSize + padding) + padding;

  return (
    <div>
      <svg width={width} height={height} style={{ maxWidth: '100%' }}>
        {STATE_GRID.map(s => {
          const val = data[s.abbr] || 0;
          const x = padding + s.col * (cellSize + padding);
          const y = padding + s.row * (cellSize + padding);
          const fill = colorFor(val);
          const dark = val > max * 0.5;
          return (
            <g key={s.abbr}>
              <title>{`${s.name}: ${val} ${metricLabel}`}</title>
              <rect x={x} y={y} width={cellSize} height={cellSize} rx="6" fill={fill}
                stroke={val > 0 ? '#1b2a4a' : '#cbd5e1'} strokeWidth={val > 0 ? 1 : 0.5} />
              <text x={x + cellSize / 2} y={y + cellSize / 2 - 2} textAnchor="middle" dominantBaseline="middle"
                fontSize={cellSize * 0.28} fontWeight={700} fill={dark ? '#fff' : '#1b2a4a'}>{s.abbr}</text>
              {val > 0 && (
                <text x={x + cellSize / 2} y={y + cellSize / 2 + cellSize * 0.28} textAnchor="middle" dominantBaseline="middle"
                  fontSize={cellSize * 0.22} fontWeight={600} fill={dark ? '#fff' : '#475569'}>{val}</text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 11, color: '#64748b' }}>
        <span>0</span>
        <div style={{ width: 200, height: 8, borderRadius: 4, background: `linear-gradient(to right, ${colorScale[0]}, ${colorScale[1]})` }} />
        <span>{max} {metricLabel.toLowerCase()}</span>
      </div>
    </div>
  );
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
