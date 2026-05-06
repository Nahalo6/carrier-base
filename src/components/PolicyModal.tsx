'use client';
import { useState } from 'react';
import { useCRMStore } from '@/lib/store';
import { LINES } from '@/lib/constants';
import type { Policy, Lead } from '@/lib/types';
import Modal from './ui/Modal';
import { todayISO } from '@/lib/utils';

export default function PolicyModal({ lead, policy, onClose }: { lead: Lead; policy?: Policy; onClose: () => void }) {
  const addPolicy = useCRMStore(s => s.addPolicy);
  const updatePolicy = useCRMStore(s => s.updatePolicy);
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

  const f = <K extends keyof Policy>(k: K, v: Policy[K]) => setForm(p => ({ ...p, [k]: v }));

  const save = () => {
    if (!form.policyNumber.trim()) return alert('Policy number required.');
    if (!form.line) return alert('Coverage line required.');
    if (!form.effectiveDate) return alert('Effective date required.');
    const market = markets.find(m => m.id === form.market);
    const finalForm = { ...form, marketName: market?.name || form.marketName };
    if (policy) updatePolicy(lead.id, policy.id, finalForm);
    else addPolicy(lead.id, finalForm);
    onClose();
  };

  return (
    <Modal title={policy ? 'Edit Policy' : 'Add Policy'} onClose={onClose} width={700}>
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
          <select className="sel" style={{ width: '100%' }} value={form.market} onChange={e => f('market', e.target.value)}>
            <option value="">— Select market —</option>
            {markets.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
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
