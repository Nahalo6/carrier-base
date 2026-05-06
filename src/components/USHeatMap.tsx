'use client';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { useState } from 'react';

// Public domain US topology hosted by us-atlas (Mike Bostock)
const GEO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

const STATE_FIPS_TO_ABBR: Record<string, string> = {
  '01':'AL','02':'AK','04':'AZ','05':'AR','06':'CA','08':'CO','09':'CT','10':'DE','11':'DC',
  '12':'FL','13':'GA','15':'HI','16':'ID','17':'IL','18':'IN','19':'IA','20':'KS','21':'KY',
  '22':'LA','23':'ME','24':'MD','25':'MA','26':'MI','27':'MN','28':'MS','29':'MO','30':'MT',
  '31':'NE','32':'NV','33':'NH','34':'NJ','35':'NM','36':'NY','37':'NC','38':'ND','39':'OH',
  '40':'OK','41':'OR','42':'PA','44':'RI','45':'SC','46':'SD','47':'TN','48':'TX','49':'UT',
  '50':'VT','51':'VA','53':'WA','54':'WV','55':'WI','56':'WY',
};

interface USHeatMapProps {
  data: Record<string, number>;
  metricLabel?: string;
  colorScale?: [string, string];
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export default function USHeatMap({
  data, metricLabel = 'accounts', colorScale = ['#dbeafe', '#1e3a8a'],
}: USHeatMapProps) {
  const max = Math.max(1, ...Object.values(data));
  const [hover, setHover] = useState<{ name: string; abbr: string; val: number; x: number; y: number } | null>(null);

  const colorFor = (val: number) => {
    if (val === 0) return '#f1f5f9';
    const t = Math.min(1, val / max);
    const a = parseHex(colorScale[0]);
    const b = parseHex(colorScale[1]);
    const r = Math.round(a[0] + (b[0] - a[0]) * t);
    const g = Math.round(a[1] + (b[1] - a[1]) * t);
    const bl = Math.round(a[2] + (b[2] - a[2]) * t);
    return `rgb(${r},${g},${bl})`;
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <ComposableMap projection="geoAlbersUsa" style={{ width: '100%', height: 'auto' }}>
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const fips = (geo.id as string) || '';
              const abbr = STATE_FIPS_TO_ABBR[fips] || '';
              const val = data[abbr] || 0;
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onMouseEnter={(e: React.MouseEvent<SVGPathElement>) => {
                    const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                    setHover({
                      name: geo.properties.name as string,
                      abbr, val,
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                    });
                  }}
                  onMouseLeave={() => setHover(null)}
                  style={{
                    default: {
                      fill: colorFor(val),
                      stroke: '#1b2a4a',
                      strokeWidth: 0.5,
                      outline: 'none',
                    },
                    hover: {
                      fill: '#2563eb',
                      stroke: '#1b2a4a',
                      strokeWidth: 1,
                      outline: 'none',
                      cursor: 'pointer',
                    },
                    pressed: { outline: 'none' },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>

      {hover && (
        <div style={{
          position: 'absolute',
          left: hover.x + 12, top: hover.y - 8,
          background: '#1b2a4a', color: '#fff',
          padding: '6px 10px', borderRadius: 6, fontSize: 12, pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)', whiteSpace: 'nowrap', zIndex: 10,
        }}>
          <div style={{ fontWeight: 700 }}>{hover.name} ({hover.abbr || '—'})</div>
          <div style={{ opacity: 0.9 }}>{hover.val} {metricLabel}</div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 11, color: '#64748b' }}>
        <span>0</span>
        <div style={{ width: 200, height: 8, borderRadius: 4, background: `linear-gradient(to right, ${colorScale[0]}, ${colorScale[1]})` }} />
        <span>{max} {metricLabel}</span>
      </div>
    </div>
  );
}
