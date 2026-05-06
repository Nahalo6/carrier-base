'use client';
import { useState } from 'react';
import { useCRMStore } from '@/lib/store';
import { LINES } from '@/lib/constants';
import type { Policy, Lead, Market } from '@/lib/types';
import Modal from './ui/Modal';
import { todayISO } from '@/lib/utils';

const NEW_MARKET_VALUE = '__new__';

export default function PolicyModal({ lead, policy, onClose }: { lead: Lead; policy?: Policy; onClose: () => void }) {
  const addPolicy = useCRMStore(s => s.addPolicy);
  const updatePolicy = useCRMStore(s => s.updatePolicy);
  const addMarket = useCRMStore(s => s.addMarket);
  const markets = useCRMStore(s => s.markets);
  const producers = useCRMStore(s => s.producers);

  const [form, setForm] = useState<Policy>(policy ?? {
    id: 'pol_' + Date.now(),
    policyNumber: '',
    line: lead.lines?.[0] || 'Auto Liability',
    market: lead.markets?.[0]?.mid || markets[0]?.id || '',
    marketName: '',
    producer: lead.producer,
    premium: 0,
    effectiveDate: todayISO(),
    expirationDate: '',
    bindDate: todayISO(),
    status: 'Active',
    notes: '',
  });

  // New market inline creation
  const [showNewMarket, setShowNewMarket] = useState(false);
  const [newMarketName, setNewMarketName] = useState('');
  const [newMarketNotes, setNewMarketNotes] = useState('');

  const f = <K extends keyof Policy>(k: K, v: Policy[K]) => setForm(p => ({ ...p, [k]: v }));

  const handleMarketChange = (val: string) => {
    if (val === NEW_MARKET_VALUE) {
      setShowNewMarket(true);
    } else {
      setShowNewMarket(false);
      f('market', val);
    }
  };

  const createNewMarket = (): string | null => {
    if (!newMarketName.trim()) {
      alert('Enter a market name.');
      return null;
    }
    const id = 'm_' + Date.now();
    const mkt: Market = {
      id, name: newMarketName.trim(),
      lines: [form.line],
      apt: { minYrs: 0, minF: 0, maxF: 999, comm: [], noHaz: false, maxViol: 999, maxAlerts: 7,
        bt: { unsafeDriving: 65, hoursOfService: 65, vehicleMaintenance: 80, crashIndicator: 65 } },
      notes: newMarketNotes.trim(),
    };
    addMarket(mkt);
    return id;
  };

  const save = () => {
    if (!form.policyNumber.trim()) return alert('Policy number required.');
    if (!form.line) return alert('Coverage line required.');
    if (!form.effectiveDate) return alert('Effective date required.');

    let marketId = form.market;
    let marketDisplayName = form.marketName;

    if (showNewMarket) {
      const newId = createNewMarket();
      if (!newId) return;
      marketId = newId;
      marketDisplayName = newMarketName.trim();
    } else {
      const market = markets.find(m => m.id === marketId);
      marketDisplayName = market?.name || form.marketName;
    }

    const finalForm = { ...form, market: marketId, marketName: marketDisplayName };
    if (policy) updatePolicy(lead.id, policy.id, finalForm);
    else addPolicy(lead.id, finalForm);
    onClose();
  };

  return (
    <Modal title={policy ? 'Edit Policy' : 'Add Policy'} onClose={onClose} width={720}>
      <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#1e40af' }}>
        <b>Tip:</b> Add a separate policy for each line + market combination. For example, Auto Liability with Canal, then Motor Truck Cargo with Lloyd&rsquo;s.
      </div>
      <div className="grid grid-2" style={{ gap: 12 }}>
        <div>
          <label className="lbl">Policy Number *</label>
          <input className="inp" value={form.policyNumber} onChange={e => f('policyNumber', e.target.value)} placeholder="e.g. CB-2025-001234" />
        </div>
        <div>
          <label className="lbl">Status</label>
          <select className="sel" style={{ width: '100%' }} value={form.status} onChange={e => f('status', e.target.value as Policy['status'])}>
            <option>Active</option><option>Cancelled</option><option>Expired</option><option>Pending</option>
          </select>
        </div>
        <div>
          <label className="lbl">Coverage Line *</label>
          <select className="sel" style={{ width: '100%' }} value={form.line} onChange={e => f('line', e.target.value)}>
            {LINES.map(l => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="lbl">Bound With (Market)</label>
          <select className="sel" style={{ width: '100%' }} value={showNewMarket ? NEW_MARKET_VALUE : form.market} onChange={e => handleMarketChange(e.target.value)}>
            <option value="">— Select market —</option>
            {markets.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            <option value={NEW_MARKET_VALUE}>+ Add new market…</option>
          </select>
        </div>

        {showNewMarket && (
          <div style={{ gridColumn: '1 / -1', background: '#f0fdfa', border: '1px solid #5eead4', borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f766e', marginBottom: 8 }}>New Market — will be added to your Markets list</div>
            <div className="grid grid-2" style={{ gap: 10 }}>
              <div>
                <label className="lbl">Market Name *</label>
                <input className="inp" value={newMarketName} onChange={e => setNewMarketName(e.target.value)} placeholder="e.g. Lloyd's of London" />
              </div>
              <div>
                <label className="lbl">Notes</label>
                <input className="inp" value={newMarketNotes} onChange={e => setNewMarketNotes(e.target.value)} placeholder="Specialty lines, contact, etc." />
              </div>
            </div>
            <button onClick={() => setShowNewMarket(false)} style={{ marginTop: 8, fontSize: 11, padding: '4px 10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer' }}>Cancel new market</button>
          </div>
        )}

        <div>
          <label className="lbl">Producer</label>
          <select className="sel" style={{ width: '100%' }} value={form.producer} onChange={e => f('producer', e.target.value)}>
            {producers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="lbl">Premium ($)</label>
          <input className="inp" type="number" min="0" value={form.premium} onChange={e => f('premium', Number(e.target.value))} />
        </div>
        <div>
          <label className="lbl">Effective Date *</label>
          <input className="inp" type="date" value={form.effectiveDate} onChange={e => f('effectiveDate', e.target.value)} />
        </div>
        <div>
          <label className="lbl">Expiration Date</label>
          <input className="inp" type="date" value={form.expirationDate} onChange={e => f('expirationDate', e.target.value)} />
        </div>
        <div>
          <label className="lbl">Bind Date</label>
          <input className="inp" type="date" value={form.bindDate} onChange={e => f('bindDate', e.target.value)} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="lbl">Notes</label>
          <textarea className="inp" rows={3} value={form.notes ?? ''} onChange={e => f('notes', e.target.value)} placeholder="Endorsements, special notes, payment terms..." />
        </div>
      </div>
      <div className="flex" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
        <button className="btn-s" onClick={onClose}>Cancel</button>
        <button className="btn-p" onClick={save}>{policy ? 'Save Changes' : 'Add Policy'}</button>
      </div>
    </Modal>
  );
}
