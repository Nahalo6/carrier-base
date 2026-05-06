'use client';
import { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CATALOG, computeTotals, fmtPrice, type CatalogItem } from '@/lib/catalog';
import { useAuthStore } from '@/lib/auth';
import { sendEmail, buildReceiptEmail, buildWelcomeEmail } from '@/lib/email';
import s from './checkout.module.css';

type Step = 'cart' | 'payment' | 'account' | 'done';

function genConfirmation(): string {
  return 'CB-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function CheckoutInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initial = (params.get('items') || params.get('plan') || '').split(',').filter(Boolean);

  const [selected, setSelected] = useState<Set<string>>(new Set(initial));
  const [step, setStep] = useState<Step>('cart');

  // Payment form
  const [email, setEmail] = useState('');
  const [card, setCard] = useState({ number: '', exp: '', cvc: '', name: '' });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<string>('');

  // Account form
  const [acct, setAcct] = useState({ firstName: '', lastName: '', password: '', confirm: '' });
  const [acctLoading, setAcctLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cartItems = useMemo(() => CATALOG.filter(c => selected.has(c.id) && c.id !== 'enterprise'), [selected]);
  const totals = useMemo(() => computeTotals(cartItems), [cartItems]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── Step 1 → 2: process payment ──
  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) { setError('Add at least one item.'); return; }
    if (!email) { setError('Email required.'); return; }
    setError(null);
    setPaymentLoading(true);

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems.map(c => ({ id: c.id, name: c.name, price: c.price, billing: c.billing, stripePriceId: c.stripePriceId })),
          email,
          successUrl: window.location.origin + '/checkout',
          cancelUrl: window.location.origin + '/checkout',
        }),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error || 'Payment failed.'); setPaymentLoading(false); return; }

      // If real Stripe URL came back (not mock), redirect to Stripe Checkout
      if (data.url && !data.mocked) {
        window.location.href = data.url;
        return;
      }

      // Mock mode: simulate successful payment + send receipt
      const conf = genConfirmation();
      setConfirmation(conf);
      const last4 = card.number.replace(/\D/g, '').slice(-4) || '••••';
      const receipt = buildReceiptEmail({
        toName: card.name || email.split('@')[0],
        toEmail: email,
        items: cartItems,
        confirmationNumber: conf,
        paymentMethod: `Card ending ${last4}`,
      });
      await sendEmail(receipt);
      setStep('account');
    } catch {
      setError('Payment processing error. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  // ── Step 3: create account ──
  const submitAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (acct.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (acct.password !== acct.confirm) { setError('Passwords do not match.'); return; }
    setError(null);
    setAcctLoading(true);

    const fullName = `${acct.firstName} ${acct.lastName}`.trim();
    const planId = cartItems.find(c => c.category === 'plan')?.id;

    const result = useAuthStore.getState().signUp({
      email, password: acct.password, name: fullName,
      plan: planId, role: 'admin',  // first signup of paying account is admin
    });

    if (!result.ok) {
      // user exists — sign them in
      useAuthStore.getState().signIn(email, acct.password);
    }

    // welcome email
    await sendEmail(buildWelcomeEmail(fullName, email));

    setAcctLoading(false);
    setStep('done');
  };

  // Auto-format card inputs
  const formatCard = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const formatExp = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };

  return (
    <div className={s.page}>
      <div className={s.wrap}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: '#1b2a4a' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#1b2a4a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>CB</div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>Carrier Base</span>
          </Link>
        </div>

        {/* Progress steps */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28, fontSize: 12 }}>
          {(['cart', 'payment', 'account', 'done'] as Step[]).map((st, i) => {
            const labels = ['1. Cart', '2. Payment', '3. Account', 'Done'];
            const active = step === st;
            const done = (['cart', 'payment', 'account', 'done'] as Step[]).indexOf(step) > i;
            return (
              <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ padding: '6px 12px', borderRadius: 100, background: active ? '#1b2a4a' : done ? '#0f766e' : '#e2e8f0', color: active || done ? '#fff' : '#64748b', fontWeight: 600 }}>
                  {labels[i]}
                </div>
                {i < 3 && <span style={{ color: '#cbd5e1' }}>→</span>}
              </div>
            );
          })}
        </div>

        {/* ── Step 1: Cart ── */}
        {step === 'cart' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
            {/* Catalog */}
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1b2a4a', marginBottom: 6 }}>Build your package</h1>
              <p style={{ color: '#64748b', marginBottom: 20 }}>Pick a plan, plus any add-ons. You can adjust later from your account.</p>

              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Subscription Plan</div>
                {CATALOG.filter(c => c.category === 'plan' && c.id !== 'enterprise').map(item => (
                  <ItemCard key={item.id} item={item} selected={selected.has(item.id)} onToggle={() => toggle(item.id)} />
                ))}
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Add-Ons</div>
                {CATALOG.filter(c => c.category === 'addon').map(item => (
                  <ItemCard key={item.id} item={item} selected={selected.has(item.id)} onToggle={() => toggle(item.id)} />
                ))}
              </div>
            </div>

            {/* Cart summary */}
            <CartSummary cartItems={cartItems} totals={totals} onContinue={() => setStep('payment')} />
          </div>
        )}

        {/* ── Step 2: Payment ── */}
        {step === 'payment' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
            <form onSubmit={submitPayment}>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1b2a4a', marginBottom: 6 }}>Payment</h1>
              <p style={{ color: '#64748b', marginBottom: 20, fontSize: 13 }}>Secure payment processed by Stripe. Your card is never stored on our servers.</p>

              <label className="lbl">Email *</label>
              <input className="inp" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@agency.com" />

              <div style={{ marginTop: 16 }}>
                <label className="lbl">Cardholder Name</label>
                <input className="inp" value={card.name} onChange={e => setCard({ ...card, name: e.target.value })} placeholder="Full name on card" />
              </div>
              <div style={{ marginTop: 12 }}>
                <label className="lbl">Card Number</label>
                <input className="inp" value={card.number} onChange={e => setCard({ ...card, number: formatCard(e.target.value) })} placeholder="4242 4242 4242 4242" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <div>
                  <label className="lbl">Expiry</label>
                  <input className="inp" value={card.exp} onChange={e => setCard({ ...card, exp: formatExp(e.target.value) })} placeholder="MM/YY" required />
                </div>
                <div>
                  <label className="lbl">CVC</label>
                  <input className="inp" value={card.cvc} onChange={e => setCard({ ...card, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="123" required />
                </div>
              </div>

              {error && <div style={{ background: '#fff1f2', border: '1px solid #fda4af', color: '#9f1239', padding: '10px 12px', borderRadius: 8, fontSize: 12, marginTop: 14 }}>{error}</div>}

              <div className="flex" style={{ gap: 10, marginTop: 22 }}>
                <button type="button" className="btn-s" onClick={() => setStep('cart')}>← Back</button>
                <button type="submit" className="btn-p" disabled={paymentLoading} style={{ flex: 1 }}>
                  {paymentLoading ? 'Processing…' : `Pay $${totals.totalDueToday.toLocaleString()}`}
                </button>
              </div>

              <div style={{ marginTop: 14, fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                Secured with 256-bit TLS · Stripe-powered
              </div>
            </form>

            <CartSummary cartItems={cartItems} totals={totals} readonly />
          </div>
        )}

        {/* ── Step 3: Create Account ── */}
        {step === 'account' && (
          <div style={{ maxWidth: 500, margin: '0 auto' }}>
            <div style={{ background: '#f0fdfa', border: '1px solid #5eead4', borderRadius: 12, padding: 18, marginBottom: 22, textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f766e', marginBottom: 4 }}>Payment received</div>
              <div style={{ fontSize: 11, color: '#475569' }}>Confirmation: <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1b2a4a' }}>{confirmation}</span></div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Receipt sent to {email}</div>
            </div>

            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1b2a4a', marginBottom: 6 }}>Create your account</h1>
            <p style={{ color: '#64748b', marginBottom: 20, fontSize: 13 }}>Set up your login so you can start using Carrier Base.</p>

            <form onSubmit={submitAccount}>
              <div className="grid grid-2" style={{ gap: 12 }}>
                <div>
                  <label className="lbl">First Name *</label>
                  <input className="inp" value={acct.firstName} onChange={e => setAcct({ ...acct, firstName: e.target.value })} required autoFocus />
                </div>
                <div>
                  <label className="lbl">Last Name *</label>
                  <input className="inp" value={acct.lastName} onChange={e => setAcct({ ...acct, lastName: e.target.value })} required />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="lbl">Email</label>
                  <input className="inp" value={email} disabled />
                </div>
                <div>
                  <label className="lbl">Password *</label>
                  <input className="inp" type="password" value={acct.password} onChange={e => setAcct({ ...acct, password: e.target.value })} required minLength={6} />
                </div>
                <div>
                  <label className="lbl">Confirm *</label>
                  <input className="inp" type="password" value={acct.confirm} onChange={e => setAcct({ ...acct, confirm: e.target.value })} required minLength={6} />
                </div>
              </div>

              {error && <div style={{ background: '#fff1f2', border: '1px solid #fda4af', color: '#9f1239', padding: '10px 12px', borderRadius: 8, fontSize: 12, marginTop: 14 }}>{error}</div>}

              <button type="submit" disabled={acctLoading} className="btn-p" style={{ width: '100%', marginTop: 18 }}>
                {acctLoading ? 'Creating account…' : 'Create Account & Sign In'}
              </button>
            </form>
          </div>
        )}

        {/* ── Step 4: Done ── */}
        {step === 'done' && (
          <div style={{ maxWidth: 500, margin: '40px auto 0', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 70, height: 70, borderRadius: 18, background: '#f0fdfa', color: '#0f766e', marginBottom: 18 }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1b2a4a', marginBottom: 6 }}>You&rsquo;re all set!</h1>
            <p style={{ color: '#64748b', marginBottom: 22 }}>Your account is active. A confirmation email and welcome guide were sent to <b>{email}</b>.</p>
            <button className="btn-p" onClick={() => router.push('/dashboard')} style={{ minWidth: 200 }}>Go to Dashboard →</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ItemCard({ item, selected, onToggle }: { item: CatalogItem; selected: boolean; onToggle: () => void }) {
  return (
    <label style={{
      display: 'flex', gap: 14, padding: 16, marginBottom: 10,
      background: selected ? '#eff6ff' : '#fff',
      border: `2px solid ${selected ? '#2563eb' : '#e2e8f0'}`,
      borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s',
    }}>
      <input type="checkbox" checked={selected} onChange={onToggle} style={{ marginTop: 4, accentColor: '#2563eb', width: 16, height: 16 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex flex-between" style={{ alignItems: 'flex-start', marginBottom: 4 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1b2a4a', display: 'flex', alignItems: 'center', gap: 8 }}>
              {item.name}
              {item.badge && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 100, background: '#fef3c7', color: '#92400e', textTransform: 'uppercase' }}>{item.badge}</span>}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{item.description}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1b2a4a', lineHeight: 1 }}>${item.price.toLocaleString()}</div>
            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', marginTop: 2 }}>{item.billing === 'monthly' ? 'per month' : 'one-time'}</div>
          </div>
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', fontSize: 12, color: '#475569' }}>
          {item.features.slice(0, 3).map(f => (
            <li key={f} style={{ display: 'flex', gap: 6, padding: '2px 0' }}><span style={{ color: '#0f766e', fontWeight: 700 }}>✓</span> {f}</li>
          ))}
        </ul>
      </div>
    </label>
  );
}

function CartSummary({ cartItems, totals, onContinue, readonly = false }: {
  cartItems: CatalogItem[];
  totals: ReturnType<typeof computeTotals>;
  onContinue?: () => void;
  readonly?: boolean;
}) {
  return (
    <div style={{ position: 'sticky', top: 20, background: '#1b2a4a', color: '#fff', borderRadius: 14, padding: 22 }}>
      <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Your Order</div>

      {cartItems.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', opacity: 0.7, fontSize: 13 }}>Your cart is empty.</div>
      ) : (
        <div>
          {cartItems.map(item => (
            <div key={item.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</div>
                  <div style={{ fontSize: 10, opacity: 0.65, marginTop: 2 }}>{fmtPrice(item)}</div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}>${item.price.toLocaleString()}</div>
              </div>
            </div>
          ))}

          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
            {totals.oneTimeTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', opacity: 0.85 }}>
                <span>One-time fees</span><span>${totals.oneTimeTotal.toLocaleString()}</span>
              </div>
            )}
            {totals.monthlyTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', opacity: 0.85 }}>
                <span>Subscription (first month)</span><span>${totals.monthlyTotal.toLocaleString()}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, padding: '10px 0 4px', marginTop: 4, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
              <span>Due today</span><span>${totals.totalDueToday.toLocaleString()}</span>
            </div>
            {totals.monthlyTotal > 0 && (
              <div style={{ fontSize: 10, opacity: 0.65, marginTop: 6 }}>
                Then ${totals.monthlyTotal.toLocaleString()}/month, recurring.
              </div>
            )}
          </div>

          {!readonly && onContinue && (
            <button onClick={onContinue} disabled={cartItems.length === 0}
              style={{ width: '100%', marginTop: 16, padding: 12, background: '#fff', color: '#1b2a4a', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
              Continue to Payment →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading…</div>}>
      <CheckoutInner />
    </Suspense>
  );
}
