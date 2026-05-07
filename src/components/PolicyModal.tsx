'use client';
import { useState } from 'react';
import { useCRMStore } from '@/lib/store';
import { LINES } from '@/lib/constants';
import type { Policy, Lead, Market } from '@/lib/types';
import Modal from './ui/Modal';
import { todayISO } from '@/lib/utils';
import { fmt$ } from '@/lib/utils';

const NEW_MARKET_VALUE = '__new__';

interface PolicyEntry extends Policy {
  _expanded: boolean;
  _isNew: boolean;
  _newMarket?: { name: string; notes: string };
}

function emptyPolicy(lead: Lead, defaultMarketId: string): PolicyEntry {
  return {
    id: 'pol_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    policyNumber: '',
    line: lead.lines?.[0] || 'Auto Liability',
    market: defaultMarketId,
    marketName: '',
    producer: lead.producer,
    premium: 0,
    effectiveDate: todayISO(),
    expirationDate: '',
    bindDate: todayISO(),
    status: 'Active',
    notes: '',
    _expanded: true,
    _isNew: true,
  };
}

export default function PolicyModal({ lead, policy, onClose }: { lead: Lead; policy?: Policy; onClose: () => void }) {
  const addPolicy = useCRMStore(s => s.addPolicy);
  const updatePolicy = useCRMStore(s => s.updatePolicy);
  const addMarket = useCRMStore(s => s.addMarket);
  const markets = useCRMStore(s => s.markets);
  const producers = useCRMStore(s => s.producers);

  const defaultMarketId = lead.markets?.[0]?.mid || markets[0]?.id || '';

  // Initialize with either the existing policy (edit mode) or one empty entry (add mode)
  const [entries, setEntries] = useState<PolicyEntry[]>(() => {
    if (policy) {
      return [{ ...policy, _expanded: true, _isNew: false }];
    }
    return [emptyPolicy(lead, defaultMarketId)];
  });

  const updateEntry = (idx: number, updates: Partial<PolicyEntry>) => {
    setEntries(prev => prev.map((e, i) => i === idx ? { ...e, ...updates } : e));
  };

  const updateEntryField = <K extends keyof Policy>(idx: number, field: K, value: Policy[K]) => {
    setEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const handleMarketChange = (idx: number, val: string) => {
    if (val === NEW_MARKET_VALUE) {
      updateEntry(idx, { _newMarket: { name: '', notes: '' } });
    } else {
      updateEntry(idx, { market: val, _newMarket: undefined });
    }
  };

  const setNewMarketField = (idx: number, field: 'name' | 'notes', value: string) => {
    setEntries(prev => prev.map((e, i) => {
      if (i !== idx) return e;
      return { ...e, _newMarket: { ...(e._newMarket || { name: '', notes: '' }), [field]: value } };
    }));
  };

  const addNewEntry = () => {
    // Collapse all existing entries before adding the new one for clarity
    setEntries(prev => [
      ...prev.map(e => ({ ...e, _expanded: false })),
      emptyPolicy(lead, defaultMarketId),
    ]);
  };

  const removeEntry = (idx: number) => {
    if (entries.length === 1) {
      alert('At least one policy is required. Cancel instead if you don\'t want to save.');
      return;
    }
    if (!entries[idx]._isNew && !confirm('Delete this existing policy?')) return;
    setEntries(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleExpand = (idx: number) => {
    updateEntry(idx, { _expanded: !entries[idx]._expanded });
  };

  const validateEntry = (entry: PolicyEntry, idx: number): string | null => {
    if (!entry.policyNumber.trim()) return `Policy #${idx + 1}: Policy Number is required.`;
    if (!entry.line) return `Policy #${idx + 1}: Coverage Line is required.`;
    if (!entry.effectiveDate) return `Policy #${idx + 1}: Effective Date is required.`;
    if (entry._newMarket && !entry._newMarket.name.trim()) return `Policy #${idx + 1}: Enter a name for the new market.`;
    return null;
  };

  const save = () => {
    // Validate all entries
    for (let i = 0; i < entries.length; i++) {
      const err = validateEntry(entries[i], i);
      if (err) { alert(err); return; }
    }

    // Process each entry
    entries.forEach(entry => {
      let marketId = entry.market;
      let marketDisplayName = entry.marketName;

      if (entry._newMarket) {
        const newId = 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        const mkt: Market = {
          id: newId,
          name: entry._newMarket.name.trim(),
          lines: [entry.line],
          apt: { minYrs: 0, minF: 0, maxF: 999, comm: [], noHaz: false, maxViol: 999, maxAlerts: 7,
            bt: { unsafeDriving: 65, hoursOfService: 65, vehicleMaintenance: 80, crashIndicator: 65 } },
          notes: entry._newMarket.notes.trim(),
        };
        addMarket(mkt);
        marketId = newId;
        marketDisplayName = entry._newMarket.name.trim();
      } else {
        const market = markets.find(m => m.id === marketId);
        marketDisplayName = market?.name || marketDisplayName;
      }

      // Strip our internal helper fields before saving
      const { _expanded, _isNew, _newMarket, ...cleanPolicy } = entry;
      void _expanded; void _newMarket;
      const finalPolicy: Policy = { ...cleanPolicy, market: marketId, marketName: marketDisplayName };

      if (_isNew) {
        addPolicy(lead.id, finalPolicy);
      } else {
        updatePolicy(lead.id, finalPolicy.id, finalPolicy);
      }
    });

    onClose();
  };

  // Group totals shown in modal header
  const totalPremium = entries.reduce((s, e) => s + e.premium, 0);
  const newCount = entries.filter(e => e._isNew).length;
  const updatedCount = entries.length - newCount;

  const modalTitle = policy
    ? (entries.length > 1 ? `Edit policy + add ${entries.length - 1} more` : 'Edit Policy')
    : (entries.length > 1 ? `Add ${entries.length} Policies` : 'Add Policy');

  return (
    <Modal title={modalTitle} onClose={onClose} width={780}>
      {/* Help banner */}
      <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#1e40af' }}>
        <b>Tip:</b> An account can have multiple policies — different coverage lines often go to different markets. Click <b>+ Add Another Coverage Line</b> below to add Auto Liability with Canal, Motor Truck Cargo with Lloyd&apos;s, and Physical Damage with Progressive all in one flow.
      </div>

      {/* Summary bar when 2+ entries */}
      {entries.length > 1 && (
        <div style={{ display: 'flex', gap: 14, padding: 10, background: '#f8fafc', borderRadius: 8, marginBottom: 14, fontSize: 12 }}>
          <div><span style={{ color: '#64748b' }}>Policies in this batch: </span><b style={{ color: '#1b2a4a' }}>{entries.length}</b></div>
          {newCount > 0 && <div><span style={{ color: '#64748b' }}>New: </span><b style={{ color: '#0f766e' }}>{newCount}</b></div>}
          {updatedCount > 0 && <div><span style={{ color: '#64748b' }}>Updated: </span><b style={{ color: '#1e40af' }}>{updatedCount}</b></div>}
          <div style={{ marginLeft: 'auto' }}><span style={{ color: '#64748b' }}>Combined premium: </span><b style={{ color: '#0f766e' }}>{fmt$(totalPremium)}</b></div>
        </div>
      )}

      {/* Policy entries */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
        {entries.map((entry, idx) => (
          <PolicyEntryCard
            key={entry.id}
            entry={entry} idx={idx} totalEntries={entries.length}
            markets={markets} producers={producers}
            onUpdate={updateEntryField}
            onMarketChange={(val) => handleMarketChange(idx, val)}
            onNewMarketField={(field, value) => setNewMarketField(idx, field, value)}
            onCancelNewMarket={() => updateEntry(idx, { _newMarket: undefined, market: defaultMarketId })}
            onToggleExpand={() => toggleExpand(idx)}
            onRemove={() => removeEntry(idx)}
          />
        ))}
      </div>

      {/* Add another button */}
      <button
        type="button"
        onClick={addNewEntry}
        style={{
          width: '100%', padding: '12px 16px',
          background: '#fff', color: '#2563eb',
          border: '2px dashed #93c5fd', borderRadius: 10,
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Another Coverage Line
      </button>

      {/* Footer */}
      <div className="flex" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 18, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
        <button className="btn-s" onClick={onClose}>Cancel</button>
        <button className="btn-p" onClick={save} style={{ minWidth: 140 }}>
          {entries.length === 1 ? (policy ? 'Save Changes' : 'Add Policy') : `Save All ${entries.length} Policies`}
        </button>
      </div>
    </Modal>
  );
}

// ─── Single policy entry card ───────────────────────────────────────────────
function PolicyEntryCard({
  entry, idx, totalEntries,
  markets, producers,
  onUpdate, onMarketChange, onNewMarketField, onCancelNewMarket,
  onToggleExpand, onRemove,
}: {
  entry: PolicyEntry; idx: number; totalEntries: number;
  markets: ReturnType<typeof useCRMStore.getState>['markets'];
  producers: ReturnType<typeof useCRMStore.getState>['producers'];
  onUpdate: <K extends keyof Policy>(idx: number, field: K, value: Policy[K]) => void;
  onMarketChange: (val: string) => void;
  onNewMarketField: (field: 'name' | 'notes', value: string) => void;
  onCancelNewMarket: () => void;
  onToggleExpand: () => void;
  onRemove: () => void;
}) {
  const market = markets.find(m => m.id === entry.market);
  const producer = producers.find(p => p.id === entry.producer);

  const summaryLine = entry.policyNumber
    ? `${entry.line} · ${market?.name || entry._newMarket?.name || '—'} · ${entry.policyNumber}`
    : `${entry.line} · (no policy number yet)`;

  return (
    <div style={{ border: `1.5px solid ${entry._expanded ? '#2563eb' : '#e2e8f0'}`, borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: entry._expanded ? '#eff6ff' : '#fafbfc', cursor: 'pointer' }}
        onClick={onToggleExpand}>
        <div style={{ width: 26, height: 26, borderRadius: 6, background: entry._isNew ? '#f0fdfa' : '#fef3c7', color: entry._isNew ? '#0f766e' : '#92400e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
          {idx + 1}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Policy {idx + 1} of {totalEntries} {entry._isNew ? <span style={{ color: '#0f766e' }}>· NEW</span> : <span style={{ color: '#92400e' }}>· EDITING</span>}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1b2a4a', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {summaryLine}
          </div>
        </div>
        {entry.premium > 0 && (
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f766e', flexShrink: 0 }}>{fmt$(entry.premium)}</div>
        )}
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onRemove(); }}
          style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'transparent', color: '#9f1239', cursor: 'pointer', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Remove this policy from the batch">
          ×
        </button>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: entry._expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {/* Body — fields */}
      {entry._expanded && (
        <div style={{ padding: 18 }}>
          <div className="grid grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="lbl">Coverage Line *</label>
              <select className="sel" style={{ width: '100%' }} value={entry.line} onChange={e => onUpdate(idx, 'line', e.target.value)}>
                {LINES.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="lbl">Status</label>
              <select className="sel" style={{ width: '100%' }} value={entry.status} onChange={e => onUpdate(idx, 'status', e.target.value as Policy['status'])}>
                <option>Active</option><option>Pending</option><option>Cancelled</option><option>Expired</option>
              </select>
            </div>

            <div>
              <label className="lbl">Policy Number *</label>
              <input className="inp" value={entry.policyNumber} onChange={e => onUpdate(idx, 'policyNumber', e.target.value)} placeholder="e.g. CB-2025-001234" />
            </div>
            <div>
              <label className="lbl">Bound With (Market)</label>
              <select className="sel" style={{ width: '100%' }} value={entry._newMarket ? NEW_MARKET_VALUE : entry.market} onChange={e => onMarketChange(e.target.value)}>
                <option value="">— Select market —</option>
                {markets.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                <option value={NEW_MARKET_VALUE}>+ Add new market…</option>
              </select>
            </div>

            {entry._newMarket && (
              <div style={{ gridColumn: '1 / -1', background: '#f0fdfa', border: '1px solid #5eead4', borderRadius: 10, padding: 12 }}>
                <div className="flex flex-between" style={{ alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0f766e' }}>New Market — added to your Markets list on save</div>
                  <button type="button" onClick={onCancelNewMarket}
                    style={{ fontSize: 11, padding: '4px 10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer' }}>
                    Cancel new market
                  </button>
                </div>
                <div className="grid grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label className="lbl">Market Name *</label>
                    <input className="inp" value={entry._newMarket.name} onChange={e => onNewMarketField('name', e.target.value)} placeholder="e.g. Lloyd's of London" />
                  </div>
                  <div>
                    <label className="lbl">Notes</label>
                    <input className="inp" value={entry._newMarket.notes} onChange={e => onNewMarketField('notes', e.target.value)} placeholder="Specialty lines, contact, etc." />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="lbl">Producer</label>
              <select className="sel" style={{ width: '100%' }} value={entry.producer} onChange={e => onUpdate(idx, 'producer', e.target.value)}>
                {producers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="lbl">Premium ($)</label>
              <input className="inp" type="number" min="0" value={entry.premium} onChange={e => onUpdate(idx, 'premium', Number(e.target.value))} />
            </div>

            <div>
              <label className="lbl">Effective Date *</label>
              <input className="inp" type="date" value={entry.effectiveDate} onChange={e => onUpdate(idx, 'effectiveDate', e.target.value)} />
            </div>
            <div>
              <label className="lbl">Expiration Date</label>
              <input className="inp" type="date" value={entry.expirationDate} onChange={e => onUpdate(idx, 'expirationDate', e.target.value)} />
            </div>
            <div>
              <label className="lbl">Bind Date</label>
              <input className="inp" type="date" value={entry.bindDate} onChange={e => onUpdate(idx, 'bindDate', e.target.value)} />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label className="lbl">Notes</label>
              <textarea className="inp" rows={2} value={entry.notes ?? ''} onChange={e => onUpdate(idx, 'notes', e.target.value)} placeholder="Endorsements, special notes, payment terms..." />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
