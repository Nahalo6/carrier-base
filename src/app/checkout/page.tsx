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
  const [billing, setBilling] = useState({ street: '', city: '', state: '', zip: '', country: 'US' });
  const [promo, setPromo] = useState('');
  const [promoApplied, setPromoApplied] = useState<{ code: string; pct: number } | null>(null);
  const [promoMsg, setPromoMsg] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [saveCard, setSaveCard] = useState(true);
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

  // Card brand detection
  const detectBrand = (num: string): 'visa' | 'mastercard' | 'amex' | 'discover' | 'unknown' => {
    const n = num.replace(/\D/g, '');
    if (/^4/.test(n)) return 'visa';
    if (/^(5[1-5]|2[2-7])/.test(n)) return 'mastercard';
    if (/^3[47]/.test(n)) return 'amex';
    if (/^6(?:011|5)/.test(n)) return 'discover';
    return 'unknown';
  };
  const cardBrand = detectBrand(card.number);
  const cardLast4 = card.number.replace(/\D/g, '').slice(-4);

  // Validation helpers
  const isCardValid = card.number.replace(/\D/g, '').length >= 13 && card.exp.length === 5 && card.cvc.length >= 3;
  const isBillingValid = billing.street.trim() && billing.city.trim() && billing.state.trim() && billing.zip.trim();

  // Promo codes (mock — replace with real lookup)
  const PROMO_CODES: Record<string, number> = { LAUNCH20: 20, BROKER10: 10, FRIEND15: 15 };
  const applyPromo = () => {
    const code = promo.trim().toUpperCase();
    if (!code) { setPromoMsg(null); return; }
    if (PROMO_CODES[code]) {
      setPromoApplied({ code, pct: PROMO_CODES[code] });
      setPromoMsg(`✓ ${PROMO_CODES[code]}% off applied`);
    } else {
      setPromoApplied(null);
      setPromoMsg('Invalid promo code');
    }
  };

  // Apply discount to totals
  const discountedTotals = useMemo(() => {
    if (!promoApplied) return totals;
    const factor = (100 - promoApplied.pct) / 100;
    return {
      oneTimeTotal: Math.round(totals.oneTimeTotal * factor),
      monthlyTotal: Math.round(totals.monthlyTotal * factor),
      totalDueToday: Math.round(totals.totalDueToday * factor),
    };
  }, [totals, promoApplied]);
  const savings = totals.totalDueToday - discountedTotals.totalDueToday;

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
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <h1 style={{ fontSize: 30, fontWeight: 800, color: '#1b2a4a', marginBottom: 6 }}>Complete your purchase</h1>
              <p style={{ color: '#64748b', fontSize: 14 }}>Review your order below, then enter payment details. You can create your account next.</p>
            </div>

            {/* ── Compact order summary ── */}
            <div style={{ background: 'linear-gradient(135deg, #1b2a4a 0%, #0f1a33 100%)', color: '#fff', borderRadius: 14, padding: 22, marginBottom: 22, boxShadow: '0 8px 24px -8px rgba(15,23,42,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Order Summary</div>
                  <div style={{ fontSize: 13, opacity: 0.85, marginTop: 3 }}>{cartItems.length} item{cartItems.length !== 1 ? 's' : ''}</div>
                </div>
                <button type="button" onClick={() => setStep('cart')} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                  Edit cart
                </button>
              </div>

              {/* Items */}
              <div style={{ marginBottom: 14 }}>
                {cartItems.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', fontSize: 13 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 600 }}>{item.name}</span>
                      <span style={{ opacity: 0.6, fontSize: 11, marginLeft: 8 }}>{item.billing === 'monthly' ? 'monthly' : 'one-time'}</span>
                    </div>
                    <span style={{ fontWeight: 700 }}>${item.price.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div style={{ paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                {totals.oneTimeTotal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', opacity: 0.85 }}>
                    <span>One-time fees</span><span>${totals.oneTimeTotal.toLocaleString()}</span>
                  </div>
                )}
                {totals.monthlyTotal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', opacity: 0.85 }}>
                    <span>Subscription (first month)</span><span>${totals.monthlyTotal.toLocaleString()}</span>
                  </div>
                )}
                {promoApplied && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', color: '#5eead4', fontWeight: 600 }}>
                    <span>Promo: {promoApplied.code} ({promoApplied.pct}% off)</span><span>−${savings.toLocaleString()}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22, fontWeight: 800, padding: '10px 0 0', marginTop: 6, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                  <span>Due today</span><span>${discountedTotals.totalDueToday.toLocaleString()}</span>
                </div>
                {discountedTotals.monthlyTotal > 0 && (
                  <div style={{ fontSize: 11, opacity: 0.65, marginTop: 4 }}>
                    Then ${discountedTotals.monthlyTotal.toLocaleString()}/month, recurring. Cancel anytime.
                  </div>
                )}
              </div>
            </div>

            {/* ── Payment form ── */}
            <form onSubmit={submitPayment} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 28, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>

              {/* Email */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Contact</div>
                <label className="lbl">Email address *</label>
                <input className="inp" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@agency.com" />
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>We&rsquo;ll send your receipt and confirmation here.</div>
              </div>

              {/* Card preview */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Payment Method</div>

                <CardPreview number={card.number} name={card.name} exp={card.exp} brand={cardBrand} />

                <div style={{ marginTop: 14 }}>
                  <label className="lbl">Card Number *</label>
                  <div style={{ position: 'relative' }}>
                    <input className="inp" value={card.number}
                      onChange={e => setCard({ ...card, number: formatCard(e.target.value) })}
                      placeholder="1234 5678 9012 3456" required
                      style={{ paddingRight: 60, fontFamily: 'monospace', letterSpacing: '0.05em' }} />
                    {cardBrand !== 'unknown' && (
                      <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 4, background: brandColors[cardBrand].bg, color: brandColors[cardBrand].color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {cardBrand}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <label className="lbl">Cardholder Name *</label>
                  <input className="inp" value={card.name} onChange={e => setCard({ ...card, name: e.target.value })} placeholder="Name as shown on card" required />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                  <div>
                    <label className="lbl">Expiry *</label>
                    <input className="inp" value={card.exp} onChange={e => setCard({ ...card, exp: formatExp(e.target.value) })} placeholder="MM/YY" required maxLength={5} />
                  </div>
                  <div>
                    <label className="lbl">CVC *</label>
                    <div style={{ position: 'relative' }}>
                      <input className="inp" value={card.cvc} onChange={e => setCard({ ...card, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="123" required maxLength={4} style={{ paddingRight: 32 }} />
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
                        <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Save card option */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: 12, color: '#475569', cursor: 'pointer' }}>
                  <input type="checkbox" checked={saveCard} onChange={e => setSaveCard(e.target.checked)} style={{ accentColor: '#2563eb', width: 14, height: 14 }} />
                  Save this card for future renewals (you can remove it anytime)
                </label>
              </div>

              {/* Billing address */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Billing Address</div>
                <div style={{ marginBottom: 12 }}>
                  <label className="lbl">Street Address *</label>
                  <input className="inp" value={billing.street} onChange={e => setBilling({ ...billing, street: e.target.value })} placeholder="123 Main St" required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="lbl">City *</label>
                    <input className="inp" value={billing.city} onChange={e => setBilling({ ...billing, city: e.target.value })} required />
                  </div>
                  <div>
                    <label className="lbl">State *</label>
                    <input className="inp" value={billing.state} onChange={e => setBilling({ ...billing, state: e.target.value.toUpperCase().slice(0, 2) })} placeholder="TX" required maxLength={2} />
                  </div>
                  <div>
                    <label className="lbl">ZIP *</label>
                    <input className="inp" value={billing.zip} onChange={e => setBilling({ ...billing, zip: e.target.value })} placeholder="75001" required />
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <label className="lbl">Country</label>
                  <select className="sel" style={{ width: '100%' }} value={billing.country} onChange={e => setBilling({ ...billing, country: e.target.value })}>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="MX">Mexico</option>
                  </select>
                </div>
              </div>

              {/* Promo code */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Promo Code</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="inp" value={promo} onChange={e => setPromo(e.target.value)} placeholder="Enter code (optional)" style={{ flex: 1, textTransform: 'uppercase' }} />
                  <button type="button" onClick={applyPromo} className="btn-s" style={{ minWidth: 80 }}>Apply</button>
                </div>
                {promoMsg && (
                  <div style={{ marginTop: 6, fontSize: 11, color: promoApplied ? '#0f766e' : '#9f1239', fontWeight: 600 }}>
                    {promoMsg}
                  </div>
                )}
              </div>

              {/* Trust signals */}
              <div style={{ marginBottom: 20, padding: 14, background: '#f8fafc', borderRadius: 10, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <TrustItem
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>}
                  title="256-bit TLS"
                  desc="Bank-level encryption"
                />
                <TrustItem
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7L9 18l-5-5" /></svg>}
                  title="Stripe-powered"
                  desc="PCI DSS Level 1"
                />
                <TrustItem
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9" /><polyline points="3 4 3 10 9 10" /></svg>}
                  title="Cancel anytime"
                  desc="No long contracts"
                />
              </div>

              {/* Terms checkbox */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16, fontSize: 12, color: '#475569', cursor: 'pointer', lineHeight: 1.5 }}>
                <input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} style={{ accentColor: '#2563eb', width: 14, height: 14, flexShrink: 0, marginTop: 2 }} />
                <span>
                  I authorize Carrier Base to charge my card <b>${discountedTotals.totalDueToday.toLocaleString()} today</b>
                  {discountedTotals.monthlyTotal > 0 && <> and <b>${discountedTotals.monthlyTotal.toLocaleString()}/month</b> on the same day each month until cancelled</>}
                  . I agree to the <a href="#" onClick={e => e.preventDefault()} style={{ color: '#2563eb', textDecoration: 'none' }}>Terms of Service</a> and <a href="#" onClick={e => e.preventDefault()} style={{ color: '#2563eb', textDecoration: 'none' }}>Privacy Policy</a>.
                </span>
              </label>

              {error && <div style={{ background: '#fff1f2', border: '1px solid #fda4af', color: '#9f1239', padding: '10px 12px', borderRadius: 8, fontSize: 12, marginBottom: 14 }}>{error}</div>}

              <div className="flex" style={{ gap: 10 }}>
                <button type="button" className="btn-s" onClick={() => setStep('cart')} style={{ minWidth: 110 }}>← Back to cart</button>
                <button type="submit" className="btn-p"
                  disabled={paymentLoading || !isCardValid || !isBillingValid || !acceptedTerms}
                  style={{ flex: 1, fontSize: 15, fontWeight: 700, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {paymentLoading ? (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      Processing payment…
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                      Pay ${discountedTotals.totalDueToday.toLocaleString()}
                    </>
                  )}
                </button>
              </div>

              {/* Money-back / disclaimer */}
              <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid #f1f5f9', textAlign: 'center', fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6, color: '#0f766e', fontWeight: 600 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg>
                  30-day money-back guarantee
                </div>
                Questions? Contact <a href="mailto:billing@carrierbase.app" style={{ color: '#2563eb' }}>billing@carrierbase.app</a> or call (888) 555-0100
              </div>

            </form>
            <style jsx>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
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

// ─── Card brand colors used by the payment screen ────────────────────────────
const brandColors: Record<'visa' | 'mastercard' | 'amex' | 'discover', { bg: string; color: string }> = {
  visa:       { bg: '#1a1f71', color: '#fff' },
  mastercard: { bg: '#eb001b', color: '#fff' },
  amex:       { bg: '#006fcf', color: '#fff' },
  discover:   { bg: '#ff6000', color: '#fff' },
};

// Live card preview that mirrors the entered details
function CardPreview({ number, name, exp, brand }: { number: string; name: string; exp: string; brand: string }) {
  const display = number || '•••• •••• •••• ••••';
  const padded = display.length < 19 ? display + '•••• •••• •••• ••••'.slice(display.length) : display;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1b2a4a 0%, #2563eb 60%, #3b82f6 100%)',
      color: '#fff', padding: '20px 22px', borderRadius: 12,
      boxShadow: '0 8px 24px -8px rgba(15,23,42,0.3)',
      position: 'relative', overflow: 'hidden', minHeight: 160,
    }}>
      {/* Subtle pattern */}
      <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -30, right: 80, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, position: 'relative', zIndex: 1 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Carrier Base</div>
          <div style={{ fontSize: 9, opacity: 0.6, marginTop: 2 }}>Secure Payment</div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 4, background: brand !== 'unknown' ? brandColors[brand as keyof typeof brandColors]?.bg || 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.15)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {brand !== 'unknown' ? brand : 'Card'}
        </div>
      </div>

      <div style={{ fontFamily: 'monospace', fontSize: 19, letterSpacing: '0.12em', marginBottom: 16, position: 'relative', zIndex: 1 }}>
        {padded}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', position: 'relative', zIndex: 1 }}>
        <div>
          <div style={{ fontSize: 9, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Cardholder</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{name || 'Your Name'}</div>
        </div>
        <div>
          <div style={{ fontSize: 9, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Expires</div>
          <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'monospace' }}>{exp || 'MM/YY'}</div>
        </div>
      </div>
    </div>
  );
}

function TrustItem({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 4 }}>
      <div style={{ color: '#0f766e' }}>{icon}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#1b2a4a' }}>{title}</div>
      <div style={{ fontSize: 10, color: '#64748b' }}>{desc}</div>
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
