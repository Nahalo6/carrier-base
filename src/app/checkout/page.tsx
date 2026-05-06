'use client';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';
import s from './checkout.module.css';

// ── Plan data ─────────────────────────────────────────────────────────────────
const PLANS = {
  solo: {
    name: 'Solo', desc: 'For 1 user', price: 200,
    features: ['Up to 100 active accounts', 'Unlimited DOT/SAFER lookups', 'All forms + custom apps', 'Unlimited MVR reports', 'Pre-underwriting engine', 'Email + documents'],
  },
  agency: {
    name: 'Agency', desc: 'For 2–5 users', price: 500,
    features: ['Up to 5 producers', 'Unlimited accounts', 'MVR reports (250/mo included)', 'Producer leaderboard & goals', 'Manager dashboard', 'Outlook integration', 'Priority support'],
  },
  enterprise: {
    name: 'Enterprise', desc: 'For larger agencies', price: 0,
    features: ['Unlimited producers', 'Unlimited MVRs', 'Single sign-on (SSO)', 'Custom integrations & API', 'Dedicated success manager', 'White-glove onboarding'],
  },
} as const;

type PlanKey = keyof typeof PLANS;

const Check = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ── Inner component (uses useSearchParams — needs Suspense wrapper) ────────────
function CheckoutInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initialPlan = (params.get('plan') as PlanKey) || 'agency';
  const [plan, setPlan] = useState<PlanKey>(PLANS[initialPlan] ? initialPlan : 'agency');
  const [processing, setProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successEmail, setSuccessEmail] = useState('');

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '',
    agencyName: '', phone: '', producerCount: 'Just me',
    address: '', city: '', state: '', zip: '',
    cardNumber: '', expiry: '', cvc: '', cardName: '',
  });

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const formatCard = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\s/g, '').replace(/[^0-9]/g, '');
    const parts: string[] = [];
    for (let i = 0; i < v.length && i < 16; i += 4) parts.push(v.substring(i, i + 4));
    setForm(p => ({ ...p, cardNumber: parts.join(' ') }));
  };

  const formatExpiry = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length >= 2) v = v.substring(0, 2) + ' / ' + v.substring(2, 4);
    setForm(p => ({ ...p, expiry: v }));
  };

  const handlePlanSwitch = (p: PlanKey) => {
    if (p === 'enterprise') {
      if (confirm('Enterprise plans are custom priced. Redirect to contact sales?')) {
        router.push('/#pricing');
      }
      return;
    }
    setPlan(p);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    try {
      const USERS_KEY = 'carrierBase_users_v1';
      const users: Record<string, unknown>[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');

      if (users.find((u) => (u.email as string).toLowerCase() === form.email.toLowerCase())) {
        alert('An account with this email already exists. Please sign in instead.');
        setProcessing(false);
        return;
      }

      const newUser = {
        id: 'u' + Date.now(),
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        fullName: `${form.firstName} ${form.lastName}`,
        agencyName: form.agencyName,
        phone: form.phone,
        producerCount: form.producerCount,
        address: form.address,
        city: form.city,
        state: form.state,
        zip: form.zip,
        plan,
        role: 'admin',
        subscriptionStatus: 'active',
        stripeCustomerId: 'cus_demo_' + Date.now(),
        stripeSubscriptionId: 'sub_demo_' + Date.now(),
        createdAt: new Date().toISOString(),
        lastLogin: null,
        loginCount: 0,
        usage: { accountsCreated: 0, applicationsCompleted: 0, mvrsRun: 0, emailsSent: 0 },
      };

      users.push(newUser);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));

      // Also register in main auth store so user can sign in
      const authResult = useAuthStore.getState().signUp({
        email: form.email,
        password: form.password,
        name: `${form.firstName} ${form.lastName}`,
        plan,
        role: 'admin',  // first signup of a paying account is admin of their org
      });
      if (!authResult.ok) {
        // user already exists in auth store — sign them in
        useAuthStore.getState().signIn(form.email, form.password);
      }

      const EVENTS_KEY = 'carrierBase_events_v1';
      const events: Record<string, unknown>[] = JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]');
      events.push({
        id: 'evt' + Date.now(), type: 'signup', userId: newUser.id,
        email: newUser.email, plan, amount: PLANS[plan].price,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem(EVENTS_KEY, JSON.stringify(events));

      await new Promise(r => setTimeout(r, 1200));
      setSuccessEmail(form.email);
      setShowSuccess(true);
    } catch (err) {
      alert('Error creating account: ' + (err as Error).message);
      setProcessing(false);
    }
  };

  const p = PLANS[plan];

  return (
    <div className={s.page}>
      <div className={s.wrap}>

        {/* ── FORM SIDE ── */}
        <div className={s.formSide}>
          <div className={s.cfHeader}>
            <Link href="/" className={s.cfLogo}>
              <svg width="32" height="32" viewBox="0 0 48 48">
                <rect x="2" y="2" width="44" height="44" rx="11" fill="#0b1730" />
                <path d="M12 14 L22 24 L12 34" stroke="#3b82f6" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M22 14 L32 24 L22 34" stroke="#3b82f6" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
                <path d="M32 14 L42 24 L32 34" stroke="#ffffff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Carrier Base
            </Link>
            <Link href="/" className={s.cfBack}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
              </svg>
              Back to home
            </Link>
          </div>

          <h1 className={s.cfTitle}>Start your <em>subscription</em>.</h1>
          <p className={s.cfSub}>Cancel anytime. Your card is charged immediately upon sign-up.</p>

          {/* Plan switcher */}
          <div className={s.planSwitch}>
            {(['solo', 'agency', 'enterprise'] as PlanKey[]).map(pk => (
              <button key={pk} className={`${s.planSwitchBtn} ${plan === pk ? s.active : ''}`} onClick={() => handlePlanSwitch(pk)}>
                {pk === 'solo' ? 'Solo · $200' : pk === 'agency' ? 'Agency · $500' : 'Enterprise'}
              </button>
            ))}
          </div>

          {/* Trust bar */}
          <div className={s.cfTrust}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <div className={s.cfTrustText}><strong>Secure checkout.</strong> Your payment info is encrypted end-to-end and processed by Stripe. Carrier Base never sees or stores your card number.</div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Section 1: Account */}
            <div className={s.cfSection}>
              <div className={s.cfSectionHdr}><div className={s.cfStepNum}>1</div><h3>Your account</h3></div>
              <div className={s.cfGrid2}>
                <div className={s.cfRow}><label>First Name *</label><input type="text" required value={form.firstName} onChange={f('firstName')} /></div>
                <div className={s.cfRow}><label>Last Name *</label><input type="text" required value={form.lastName} onChange={f('lastName')} /></div>
              </div>
              <div className={s.cfRow}><label>Work Email *</label><input type="email" required placeholder="you@youragency.com" value={form.email} onChange={f('email')} /></div>
              <div className={s.cfRow}>
                <label>Create Password *</label>
                <input type="password" required minLength={8} value={form.password} onChange={f('password')} />
                <div className={s.hint}>At least 8 characters. You&apos;ll use this to sign in.</div>
              </div>
            </div>

            {/* Section 2: Agency Info */}
            <div className={s.cfSection}>
              <div className={s.cfSectionHdr}><div className={s.cfStepNum}>2</div><h3>Agency information</h3></div>
              <div className={s.cfRow}><label>Agency Name *</label><input type="text" required placeholder="Smith Insurance Group" value={form.agencyName} onChange={f('agencyName')} /></div>
              <div className={s.cfGrid2}>
                <div className={s.cfRow}><label>Phone *</label><input type="tel" required placeholder="(555) 555-5555" value={form.phone} onChange={f('phone')} /></div>
                <div className={s.cfRow}><label>Producer Count</label>
                  <select value={form.producerCount} onChange={f('producerCount')}>
                    <option>Just me</option><option>2–5</option><option>6–15</option><option>16–50</option><option>50+</option>
                  </select>
                </div>
              </div>
              <div className={s.cfRow}><label>Billing Address *</label><input type="text" required placeholder="Street address" value={form.address} onChange={f('address')} /></div>
              <div className={s.cfGrid3}>
                <div className={s.cfRow}><label>City *</label><input type="text" required value={form.city} onChange={f('city')} /></div>
                <div className={s.cfRow}><label>State *</label><input type="text" required maxLength={2} placeholder="TX" value={form.state} onChange={f('state')} /></div>
                <div className={s.cfRow}><label>ZIP *</label><input type="text" required placeholder="78130" value={form.zip} onChange={f('zip')} /></div>
              </div>
            </div>

            {/* Section 3: Payment */}
            <div className={s.cfSection}>
              <div className={s.cfSectionHdr}><div className={s.cfStepNum}>3</div><h3>Payment details</h3></div>
              <div className={s.cfRow}>
                <label>Card Number *</label>
                <div className={s.cardRow}>
                  <input type="text" placeholder="1234 1234 1234 1234" maxLength={19} value={form.cardNumber} onChange={formatCard} />
                  <div className={s.cardIcons}>
                    <svg viewBox="0 0 32 20" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="20" rx="3" fill="#1a1f71" /><text x="16" y="14" textAnchor="middle" fill="#fff" fontFamily="Arial" fontSize="8" fontWeight="bold" fontStyle="italic">VISA</text></svg>
                    <svg viewBox="0 0 32 20" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="20" rx="3" fill="#fff" stroke="#e2e8f0" /><circle cx="13" cy="10" r="5" fill="#eb001b" /><circle cx="19" cy="10" r="5" fill="#f79e1b" fillOpacity="0.85" /></svg>
                  </div>
                </div>
                <div className={s.hint}>Test card: 4242 4242 4242 4242</div>
              </div>
              <div className={s.cfGrid2}>
                <div className={s.cfRow}><label>Expiration *</label><input type="text" placeholder="MM / YY" maxLength={7} value={form.expiry} onChange={formatExpiry} /></div>
                <div className={s.cfRow}><label>CVC *</label><input type="text" placeholder="123" maxLength={4} value={form.cvc} onChange={f('cvc')} /></div>
              </div>
              <div className={s.cfRow}><label>Name on Card *</label><input type="text" required placeholder="As shown on card" value={form.cardName} onChange={f('cardName')} /></div>
            </div>

            <button type="submit" className={s.cfSubmit} disabled={processing}>
              {processing ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" opacity="0.3" /><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                  </svg>
                  Creating your account...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Subscribe Now
                </>
              )}
            </button>
            <p className={s.cfLegal}>
              By subscribing, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>. You will be charged the plan amount each month. Cancel anytime.
            </p>
          </form>
        </div>

        {/* ── SUMMARY SIDE ── */}
        <div className={s.summarySide}>
          <div className={s.summaryGlow} />
          <div className={s.summaryInner}>
            <div className={s.csEyebrow}>— Order summary</div>
            <h2 className={s.csTitle}>You&apos;re almost <em style={{ color: '#60a5fa', fontStyle: 'italic' }}>in</em>.</h2>
            <p className={s.csSub}>Review your plan details below.</p>

            <div className={s.csPlanCard}>
              <div className={s.csPlanName}>{p.name}</div>
              <div className={s.csPlanDesc}>{p.desc}</div>
              <div className={s.csPlanPrice}>
                {p.price > 0 ? <><span className="cur">$</span>{p.price}<span className="per">/mo</span></> : <span style={{ fontSize: 36 }}>Custom</span>}
              </div>
              <ul className={s.csFeatures}>
                {p.features.map(feat => (
                  <li key={feat}><Check />{feat}</li>
                ))}
              </ul>
            </div>

            {p.price > 0 && (
              <div className={s.csTotals}>
                <div className={s.csTotalRow}><span>Subtotal</span><span>${p.price.toFixed(2)}</span></div>
                <div className={s.csTotalRow}><span>Sales tax</span><span>$0.00</span></div>
                <div className={`${s.csTotalRow} ${s.csTotalGrand}`}>
                  <span>Due today</span><span className="amount">${p.price.toFixed(2)}</span>
                </div>
              </div>
            )}

            <div className={s.csSecureLogos}>
              <div>STRIPE SECURE</div>
              <div>SOC 2 TYPE II</div>
              <div>AES-256</div>
            </div>
          </div>
        </div>

      </div>

      {/* ── SUCCESS OVERLAY ── */}
      {showSuccess && (
        <div className={s.successOverlay}>
          <div className={s.successBox}>
            <div className={s.successIconWrap}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2>You&apos;re in!</h2>
            <p>Your subscription is active. Your account has been created and is ready to use.</p>
            <div className={s.creds}>
              <div className={s.credsLabel}>Your sign-in email</div>
              <div className={s.credsValue}>{successEmail}</div>
            </div>
            <button className={s.successBtn} onClick={() => router.push('/dashboard')}>
              Sign In to Carrier Base
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Default export with Suspense (required for useSearchParams) ───────────────
export default function CheckoutPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', color: '#64748b' }}>Loading...</div>}>
      <CheckoutInner />
    </Suspense>
  );
}
