'use client';
import { useState } from 'react';
import { useCRMStore } from '@/lib/store';
import { useAuthStore } from '@/lib/auth';
import { usePlatformStore } from '@/lib/platform';
import { fmt$ } from '@/lib/utils';
import type { Lead, MVROrder } from '@/lib/types';
import Modal from './ui/Modal';

// Pricing — wallet is debited at order time
const SAMBA_VENDOR_COST = 14.50;
const CARRIER_BASE_FEE = 5.00;

export default function MVROrderModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const addMVROrder = useCRMStore(s => s.addMVROrder);
  const currentUser = useAuthStore(s => s.currentUser);
  const ensureWallet = usePlatformStore(s => s.ensureWallet);
  const charge = usePlatformStore(s => s.charge);
  const pushNotification = usePlatformStore(s => s.pushNotification);
  const wallet = currentUser ? (usePlatformStore(s => s.wallets[currentUser.id]) || ensureWallet(currentUser.id)) : null;
  const drivers = lead.drivers || [];
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  const toggle = (i: number) => {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i); else next.add(i);
    setSelected(next);
  };
  const selectAll = () => setSelected(new Set(drivers.map((_, i) => i)));
  const selectNone = () => setSelected(new Set());

  const total = selected.size * (SAMBA_VENDOR_COST + CARRIER_BASE_FEE);

  const submit = () => {
    if (selected.size === 0) return alert('Select at least one driver.');
    if (!currentUser) { setWalletError('You must be signed in.'); return; }
    setWalletError(null);
    setSubmitting(true);
    // Charge wallet first
    const result = charge(currentUser.id, total, 'mvr', `MVR order — ${selected.size} driver${selected.size > 1 ? 's' : ''} for ${lead.company}`, lead.id);
    if (!result.ok) {
      setWalletError(`Insufficient wallet balance (${fmt$(wallet?.balance || 0)}). Top up in Settings or enable auto-recharge.`);
      setSubmitting(false);
      return;
    }
    // Simulate ordering — once the Samba Safety API key is added, this becomes a real call
    setTimeout(() => {
      const date = new Date().toISOString().split('T')[0];
      selected.forEach(i => {
        const d = drivers[i];
        const order: MVROrder = {
          id: `mvr_${Date.now()}_${i}`,
          driverIndex: i,
          driverName: `${d.firstName} ${d.lastName}`,
          orderedDate: date,
          status: 'Pending',
          cost: SAMBA_VENDOR_COST + CARRIER_BASE_FEE,
          vendorCost: SAMBA_VENDOR_COST,
          serviceFee: CARRIER_BASE_FEE,
          vendor: 'Samba Safety',
        };
        addMVROrder(lead.id, order);
      });
      // Push a notification for the user
      pushNotification({
        userId: currentUser.id, type: 'mvr_complete',
        title: `${selected.size} MVR${selected.size > 1 ? 's' : ''} ordered`,
        message: `${selected.size} MVR${selected.size > 1 ? 's' : ''} submitted for ${lead.company}. Results expected in 1–4 hours.`,
        href: '/leads', leadId: lead.id,
      });
      setSubmitting(false);
      setConfirmed(true);
    }, 800);
  };

  if (confirmed) {
    return (
      <Modal title="MVR Orders Submitted" onClose={onClose} width={560}>
        <div style={{ textAlign: 'center', padding: '20px 12px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: 16, background: '#f0fdfa', color: '#0f766e', marginBottom: 14 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div style={{ fontWeight: 700, fontSize: 17, color: '#1b2a4a', marginBottom: 6 }}>{selected.size} MVR{selected.size > 1 ? 's' : ''} Submitted</div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
            Charged to producer wallet: <b>${total.toFixed(2)}</b>
            <br />Results typically arrive within 1–4 hours from Samba Safety.
          </div>
          <button className="btn-p" onClick={onClose}>Done</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Order MVRs (Samba Safety)" onClose={onClose} width={720}>
      <div style={{ marginBottom: 12, fontSize: 12, color: '#64748b' }}>
        Order Motor Vehicle Records for one or more drivers. Results return within 1–4 hours and update each driver&rsquo;s file automatically.
      </div>

      {/* Wallet balance */}
      {wallet && (
        <div style={{ background: wallet.balance < 50 ? '#fff1f2' : '#f0fdfa', border: `1px solid ${wallet.balance < 50 ? '#fda4af' : '#5eead4'}`, borderRadius: 10, padding: '10px 14px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: wallet.balance < 50 ? '#9f1239' : '#0f766e', textTransform: 'uppercase' }}>Wallet Balance</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: wallet.balance < 50 ? '#9f1239' : '#0f766e' }}>{fmt$(wallet.balance)}</div>
          </div>
          <a href="/settings" style={{ fontSize: 11, color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>Manage in Settings →</a>
        </div>
      )}
      <div style={{ background: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 12, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
        <div><div style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>Vendor (Samba)</div><div style={{ fontWeight: 700 }}>${SAMBA_VENDOR_COST.toFixed(2)} / driver</div></div>
        <div><div style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>CarrierBase Fee</div><div style={{ fontWeight: 700 }}>${CARRIER_BASE_FEE.toFixed(2)} / driver</div></div>
        <div><div style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>Per MVR Total</div><div style={{ fontWeight: 700, color: '#0f766e' }}>${(SAMBA_VENDOR_COST + CARRIER_BASE_FEE).toFixed(2)}</div></div>
      </div>

      {drivers.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>No drivers on file. Add drivers first.</div>
      ) : (
        <>
          <div className="flex flex-between" style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: '#475569' }}>{selected.size} of {drivers.length} selected</div>
            <div className="flex" style={{ gap: 6 }}>
              <button className="btn-s btn-sm" onClick={selectAll}>Select all</button>
              <button className="btn-s btn-sm" onClick={selectNone}>Clear</button>
            </div>
          </div>
          <div style={{ maxHeight: 320, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
            {drivers.map((d, i) => (
              <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: i < drivers.length - 1 ? '1px solid #f1f5f9' : undefined, cursor: 'pointer', background: selected.has(i) ? '#eff6ff' : '#fff' }}>
                <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} style={{ accentColor: '#2563eb' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{d.firstName} {d.lastName}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>CDL: {d.cdlNumber || '—'} · {d.state} · Last MVR: {d.mvrDate || 'never'}</div>
                </div>
                <span className={`badge ${d.mvrStatus === 'Clean' ? 'alert-clean' : d.mvrStatus === 'Issues Found' ? 'alert-warn' : 'alert-badge'}`}>{d.mvrStatus}</span>
              </label>
            ))}
          </div>
        </>
      )}

      {walletError && (
        <div style={{ marginTop: 12, padding: '10px 12px', background: '#fff1f2', border: '1px solid #fda4af', borderRadius: 8, fontSize: 12, color: '#9f1239' }}>
          {walletError}
        </div>
      )}

      <div className="flex flex-between" style={{ marginTop: 16, padding: 14, background: '#1b2a4a', borderRadius: 10, color: '#fff' }}>
        <div>
          <div style={{ fontSize: 11, opacity: 0.7, textTransform: 'uppercase' }}>Total Charge</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>${total.toFixed(2)}</div>
        </div>
        <div className="flex" style={{ gap: 8 }}>
          <button className="btn-s" onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>Cancel</button>
          <button onClick={submit} disabled={submitting || selected.size === 0}
            style={{ background: '#0f766e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 700, cursor: submitting ? 'wait' : 'pointer', opacity: selected.size === 0 ? 0.5 : 1 }}>
            {submitting ? 'Submitting…' : `Order ${selected.size || ''} MVR${selected.size === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>
        Note: Live integration pending Samba Safety API key. Orders submitted now will be queued and processed once the integration is enabled.
      </div>
    </Modal>
  );
}
