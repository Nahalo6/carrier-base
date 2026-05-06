'use client';
import { useState } from 'react';
import { CENSUS } from '@/lib/data';
import { useCRMStore } from '@/lib/store';
import { todayISO } from '@/lib/utils';
import type { CensusEntry } from '@/lib/types';

export default function ProspectPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<CensusEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState<string[]>([]);
  const addLead = useCRMStore(s => s.addLead);
  const leads = useCRMStore(s => s.leads);

  const search = () => {
    setLoading(true);
    setTimeout(() => {
      const q = query.trim().toLowerCase();
      const found = CENSUS.find(c => c.dot === q || c.company.toLowerCase().includes(q) || c.owner.toLowerCase().includes(q));
      setResult(found || null);
      setLoading(false);
    }, 600);
  };

  const importLead = (c: CensusEntry) => {
    if (leads.find(l => l.dot === c.dot)) return alert('This DOT is already in your leads.');
    addLead({
      id: 'l' + Date.now(), company: c.company, dot: c.dot, contact: c.owner,
      email: c.email, phone: c.phone, status: 'New Lead', producer: 'p1',
      lines: ['Auto Liability'], commodities: c.cargo, violations: 0, hazmat: c.cargo.includes('Hazmat'),
      vehicles: '', notes: `Imported from FMCSA census. ${c.city}, ${c.state}.`,
      premium: 0, markets: [], emails: [], docs: [], safer: null, created: todayISO(),
      years: c.newV ? 0 : Math.floor((Date.now() - new Date(c.opStart).getTime()) / (1000 * 60 * 60 * 24 * 365)),
      fleet: c.units, boundDate: null,
    });
    setAdded(p => [...p, c.dot]);
  };

  return (
    <>
      <div className="app-header">
        <h1>DOT Leads</h1>
      </div>
      <div className="content">
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 28, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1b2a4a', marginBottom: 6 }}>Search FMCSA Census</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Enter a DOT#, company name, or owner name to search carriers.</div>
            <div className="flex" style={{ gap: 10 }}>
              <input className="inp" placeholder="DOT# or company name…" value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()} style={{ flex: 1 }} />
              <button className="btn-p" onClick={search}>Search</button>
            </div>
            {loading && (
              <div style={{ marginTop: 16, height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                <div className="loading-bar" />
              </div>
            )}
          </div>

          {result === null && query && !loading && (
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 14, padding: 24 }}>No results found for &ldquo;{query}&rdquo;</div>
          )}

          {result && (
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div className="flex flex-between" style={{ marginBottom: 14 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18, color: '#1b2a4a' }}>{result.company}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>DOT# {result.dot} · {result.city}, {result.state}</div>
                </div>
                {result.newV && <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', borderRadius: 8, padding: '3px 10px', fontWeight: 700 }}>NEW VENTURE</span>}
              </div>
              <div className="grid grid-2" style={{ gap: 12, marginBottom: 16 }}>
                <div><div style={{ fontSize: 10, color: '#64748b' }}>Owner</div><div style={{ fontWeight: 600 }}>{result.owner}</div></div>
                <div><div style={{ fontSize: 10, color: '#64748b' }}>Phone</div><div style={{ fontWeight: 600 }}>{result.phone}</div></div>
                <div><div style={{ fontSize: 10, color: '#64748b' }}>Email</div><div style={{ fontWeight: 600, color: '#2563eb' }}>{result.email}</div></div>
                <div><div style={{ fontSize: 10, color: '#64748b' }}>Fleet Size</div><div style={{ fontWeight: 600 }}>{result.units} units</div></div>
                <div><div style={{ fontSize: 10, color: '#64748b' }}>Operating Since</div><div style={{ fontWeight: 600 }}>{result.opStart}</div></div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>Cargo</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {result.cargo.map(c => <span key={c} className="tag tag-slate">{c}</span>)}
                </div>
              </div>
              {added.includes(result.dot) || leads.find(l => l.dot === result.dot) ? (
                <div style={{ padding: '10px 16px', background: '#f0fdfa', border: '1px solid #5eead4', borderRadius: 8, color: '#0f766e', fontSize: 13, fontWeight: 600 }}>✓ Already in your leads</div>
              ) : (
                <button className="btn-p" style={{ width: '100%' }} onClick={() => importLead(result)}>+ Import to Leads</button>
              )}
            </div>
          )}

          {/* Census list */}
          <div style={{ marginTop: 28 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1b2a4a', marginBottom: 12 }}>Available Carriers ({CENSUS.length})</div>
            {CENSUS.map(c => (
              <div key={c.dot} className="card" style={{ cursor: 'default' }}>
                <div className="flex flex-between">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{c.company}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>DOT# {c.dot} · {c.units} units · {c.city}, {c.state}</div>
                  </div>
                  <div className="flex" style={{ gap: 6 }}>
                    {c.newV && <span style={{ fontSize: 9, background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', borderRadius: 6, padding: '2px 6px' }}>NEW</span>}
                    {added.includes(c.dot) || leads.find(l => l.dot === c.dot) ? (
                      <span style={{ fontSize: 11, color: '#0f766e', fontWeight: 600 }}>✓ Added</span>
                    ) : (
                      <button className="btn-s btn-sm" onClick={() => importLead(c)}>+ Import</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
