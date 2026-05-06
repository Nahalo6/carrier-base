'use client';
import { useState } from 'react';
import { useCRMStore } from '@/lib/store';
import { LINES, COMMODITIES } from '@/lib/constants';
import type { Market } from '@/lib/types';
import Modal from '@/components/ui/Modal';
import { todayISO } from '@/lib/utils';

function MarketForm({ market, onClose }: { market?: Market; onClose: () => void }) {
  const addMarket = useCRMStore(s => s.addMarket);
  const updateMarket = useCRMStore(s => s.updateMarket);
  const [name, setName] = useState(market?.name || '');
  const [notes, setNotes] = useState(market?.notes || '');
  const [lines, setLines] = useState<string[]>(market?.lines || []);
  const [minYrs, setMinYrs] = useState(market?.apt.minYrs?.toString() || '0');
  const [minF, setMinF] = useState(market?.apt.minF?.toString() || '1');
  const [maxF, setMaxF] = useState(market?.apt.maxF?.toString() || '100');
  const [noHaz, setNoHaz] = useState(market?.apt.noHaz ?? true);
  const [maxViol, setMaxViol] = useState(market?.apt.maxViol?.toString() || '2');

  const toggleLine = (l: string) => setLines(p => p.includes(l) ? p.filter(x => x !== l) : [...p, l]);

  const save = () => {
    if (!name) return alert('Market name required');
    const data: Market = {
      id: market?.id || 'm' + Date.now(), name, notes, lines,
      apt: { minYrs: +minYrs, minF: +minF, maxF: +maxF, noHaz, maxViol: +maxViol, maxAlerts: 2, comm: [], bt: { unsafeDriving: 70, hoursOfService: 70, vehicleMaintenance: 75, crashIndicator: 65 } },
    };
    if (market) updateMarket(market.id, data);
    else addMarket(data);
    onClose();
  };

  return (
    <Modal title={market ? 'Edit Market' : 'Add Market'} onClose={onClose} width={760}>
      <div style={{ maxWidth: 580, margin: '0 auto' }}>
        <div style={{ marginBottom: 14 }}><label className="lbl">Market Name *</label><input className="inp" value={name} onChange={e => setName(e.target.value)} /></div>
        <div style={{ marginBottom: 14 }}><label className="lbl">Notes</label><textarea className="inp" rows={3} value={notes} onChange={e => setNotes(e.target.value)} /></div>
        <div style={{ marginBottom: 14 }}>
          <label className="lbl">Coverage Lines</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {LINES.map(l => (
              <button key={l} onClick={() => toggleLine(l)}
                style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${lines.includes(l) ? '#93c5fd' : '#e2e8f0'}`, background: lines.includes(l) ? '#eff6ff' : '#fff', color: lines.includes(l) ? '#1e40af' : '#64748b', fontSize: 11, cursor: 'pointer' }}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-3" style={{ gap: 12, marginBottom: 14 }}>
          <div><label className="lbl">Min Years</label><input className="inp" type="number" value={minYrs} onChange={e => setMinYrs(e.target.value)} /></div>
          <div><label className="lbl">Min Fleet</label><input className="inp" type="number" value={minF} onChange={e => setMinF(e.target.value)} /></div>
          <div><label className="lbl">Max Fleet</label><input className="inp" type="number" value={maxF} onChange={e => setMaxF(e.target.value)} /></div>
          <div><label className="lbl">Max Violations</label><input className="inp" type="number" value={maxViol} onChange={e => setMaxViol(e.target.value)} /></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
            <input type="checkbox" checked={!noHaz} onChange={e => setNoHaz(!e.target.checked)} id="haz" style={{ accentColor: '#2563eb', width: 16, height: 16 }} />
            <label htmlFor="haz" style={{ fontSize: 13 }}>Writes Hazmat</label>
          </div>
        </div>
        <div className="flex" style={{ justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button className="btn-s" onClick={onClose}>Cancel</button>
          <button className="btn-p" onClick={save}>{market ? 'Save Changes' : 'Add Market'}</button>
        </div>
      </div>
    </Modal>
  );
}

export default function MarketsPage() {
  const markets = useCRMStore(s => s.markets);
  const leads = useCRMStore(s => s.leads);
  const deleteMarket = useCRMStore(s => s.deleteMarket);
  const [showForm, setShowForm] = useState(false);
  const [editMkt, setEditMkt] = useState<Market | undefined>(undefined);

  return (
    <>
      <div className="app-header">
        <h1>Markets</h1>
        <div className="header-actions">
          <button className="btn-p" onClick={() => { setEditMkt(undefined); setShowForm(true); }}>+ Add Market</button>
        </div>
      </div>
      <div className="content">
        <div className="grid grid-2" style={{ gap: 16 }}>
          {markets.map(m => {
            const used = leads.filter(l => l.markets.some(lm => lm.mid === m.id));
            const bound = used.filter(l => l.markets.find(lm => lm.mid === m.id)?.status === 'Bound');
            return (
              <div key={m.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div className="flex flex-between" style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1b2a4a' }}>{m.name}</div>
                  <div className="flex" style={{ gap: 6 }}>
                    <button className="btn-s btn-sm" onClick={() => { setEditMkt(m); setShowForm(true); }}>Edit</button>
                    <button className="btn-s btn-sm btn-danger" onClick={() => { if (confirm(`Delete ${m.name}?`)) deleteMarket(m.id); }}>Delete</button>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>{m.notes}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                  {m.lines.map(l => <span key={l} className="tag tag-blue">{l}</span>)}
                </div>
                <div className="grid grid-3" style={{ gap: 8 }}>
                  <div style={{ textAlign: 'center', padding: 10, background: '#f8fafc', borderRadius: 8 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#1b2a4a' }}>{used.length}</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>Submissions</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: 10, background: '#f0fdfa', borderRadius: 8 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#0f766e' }}>{bound.length}</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>Bound</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: 10, background: '#f8fafc', borderRadius: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>{m.apt.minYrs}+ yrs</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>{m.apt.minF}–{m.apt.maxF} units</div>
                  </div>
                </div>
                <div style={{ marginTop: 10, fontSize: 11, color: '#64748b' }}>
                  {m.apt.noHaz ? 'No Hazmat' : 'Writes Hazmat'} · Max {m.apt.maxViol} violations
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {showForm && <MarketForm market={editMkt} onClose={() => { setShowForm(false); setEditMkt(undefined); }} />}
    </>
  );
}
