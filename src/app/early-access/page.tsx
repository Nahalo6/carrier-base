'use client';
import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { usePlatformStore } from '@/lib/platform';
import { sendEmail } from '@/lib/email';

const FOUNDING_SPOTS = 10;

function EarlyAccessInner() {
  const params = useSearchParams();
  const source = params.get('utm_source') || params.get('source') || 'direct';
  const addWaitlistSignup = usePlatformStore(s => s.addWaitlistSignup);
  const waitlist = usePlatformStore(s => s.waitlist);

  const [form, setForm] = useState({
    name: '', email: '', agencyName: '', agencySize: 'solo',
    role: 'Owner / Principal', currentTool: '', notes: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const spotsTaken = waitlist.filter(w => w.status === 'beta').length;
  const spotsLeft = Math.max(0, FOUNDING_SPOTS - spotsTaken);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = addWaitlistSignup({ ...form, source });
    if (!res.ok) { setError(res.error || 'Something went wrong.'); setLoading(false); return; }

    // Confirmation email
    await sendEmail({
      to: form.email,
      subject: 'You\'re on the Carrier Base early-access list',
      html: buildConfirmationHTML(form.name),
    });
    setSubmitted(true);
    setLoading(false);
  };

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f1a33 0%, #1b2a4a 60%, #1e40af 100%)', padding: 24, color: '#fff' }}>
        <div style={{ width: '100%', maxWidth: 540, background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.15)', padding: 44, borderRadius: 20, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 72, height: 72, borderRadius: 18, background: 'rgba(94, 234, 212, 0.2)', color: '#5eead4', marginBottom: 20 }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10 }}>You&rsquo;re on the list</h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, marginBottom: 28 }}>
            Thanks {form.name.split(' ')[0]}. We&rsquo;ve emailed a confirmation to <b style={{ color: '#fff' }}>{form.email}</b>. We&rsquo;re onboarding the first {FOUNDING_SPOTS} agencies one at a time and will reach out within 5 business days to get you set up.
          </p>
          <div style={{ padding: 18, background: 'rgba(255,255,255,0.05)', borderRadius: 12, marginBottom: 24, fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'left' }}>
            <div style={{ fontWeight: 700, marginBottom: 8, color: '#fff' }}>What happens next</div>
            <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ display: 'flex', gap: 10, padding: '4px 0' }}><span style={{ color: '#5eead4', fontWeight: 700 }}>1.</span> A 20-minute intro call to understand your book and current tools</li>
              <li style={{ display: 'flex', gap: 10, padding: '4px 0' }}><span style={{ color: '#5eead4', fontWeight: 700 }}>2.</span> White-glove onboarding for your first 10 accounts</li>
              <li style={{ display: 'flex', gap: 10, padding: '4px 0' }}><span style={{ color: '#5eead4', fontWeight: 700 }}>3.</span> 6 months free, then 50% off forever as a Founding Agency</li>
            </ol>
          </div>
          <Link href="/" style={{ color: '#93c5fd', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>← Back to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f1a33 0%, #1b2a4a 60%, #1e40af 100%)', color: '#fff' }}>
      {/* Top nav */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 32px', maxWidth: 1280, margin: '0 auto' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#fff' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#fff', color: '#1b2a4a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>CB</div>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Carrier Base</span>
        </Link>
        <Link href="/login" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>Sign in →</Link>
      </nav>

      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '40px 32px 80px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 56, alignItems: 'start' }}>

        {/* Left column — pitch */}
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(94,234,212,0.15)', border: '1px solid rgba(94,234,212,0.4)', borderRadius: 100, fontSize: 11, fontWeight: 700, color: '#5eead4', marginBottom: 24, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#5eead4' }} />
            Founding Agency Program · {spotsLeft} of {FOUNDING_SPOTS} spots left
          </div>

          <h1 style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.05, marginBottom: 20, letterSpacing: '-0.02em' }}>
            The trucking insurance CRM that <em style={{ fontStyle: 'italic', color: '#93c5fd' }}>actually understands</em> your book.
          </h1>

          <p style={{ fontSize: 17, lineHeight: 1.6, color: 'rgba(255,255,255,0.78)', marginBottom: 28 }}>
            Live FMCSA data on every account. CAB-style risk scoring. MVR ordering with one click. Multi-policy, multi-market accounts. Built specifically for agencies writing commercial auto, motor truck cargo, and physical damage — not adapted from a generic CRM.
          </p>

          {/* Founding agency offer */}
          <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 16, padding: 24, marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#5eead4', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Founding Agency Offer</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}>6 months</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>completely free</div>
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}>50% off</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>forever, after the trial</div>
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}>White-glove</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>setup &amp; training</div>
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}>Direct line</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>to founder &amp; product</div>
              </div>
            </div>
          </div>

          {/* What you get */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>What&rsquo;s in the box, day one</div>
            {[
              ['Live FMCSA carrier search', 'Every BASIC, inspection, crash, and authority status in real time'],
              ['CAB-style composite scoring', 'Letter grades and risk tiers derived from public FMCSA data — no extra subscription'],
              ['Multi-policy account model', 'Different markets, lines, and producers per account, all in one record'],
              ['Drag-drop everything', 'Driver schedules, vehicle schedules, policy docs, applications — all by drop zone'],
              ['MVR ordering with wallet', 'Per-driver MVRs at $19.50 each, charged to your prepaid wallet'],
              ['Email + calendar + e-sign integrations', 'Connect Gmail, Outlook, Yahoo, Google Calendar, DocuSign — your accounts, your contacts'],
              ['Renewal reports', '30/60/90 day filters with one-click CSV export'],
              ['Producer leaderboards & analytics', 'US heat maps showing which states pay your team and which don\'t'],
            ].map(([title, desc]) => (
              <div key={title} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ width: 20, height: 20, borderRadius: 5, background: 'rgba(94,234,212,0.2)', color: '#5eead4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{title}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Founder note */}
          <div style={{ marginTop: 28, padding: 18, background: 'rgba(255,255,255,0.04)', borderLeft: '3px solid #5eead4', borderRadius: 4 }}>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.85)', fontStyle: 'italic', margin: 0 }}>
              &ldquo;I built Carrier Base because the trucking insurance tools agencies actually use are 20 years old and don&rsquo;t even pull live FMCSA data. We&rsquo;re onboarding 10 agencies personally — I&rsquo;ll be on every kickoff call. If we don&rsquo;t earn your business in the first 60 days, you walk away with no obligation.&rdquo;
            </p>
            <div style={{ marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>— Carrier Base, Founder</div>
          </div>
        </div>

        {/* Right column — form */}
        <div style={{ position: 'sticky', top: 32 }}>
          <form onSubmit={submit} style={{ background: '#fff', color: '#1b2a4a', padding: 32, borderRadius: 20, boxShadow: '0 24px 60px -12px rgba(15,23,42,0.4)' }}>
            <div style={{ marginBottom: 22 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Reserve your founding spot</h2>
              <p style={{ fontSize: 12, color: '#64748b' }}>2 minutes. No card required. We&rsquo;ll respond within 5 business days.</p>
            </div>

            <div className="grid grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#1b2a4a', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Your Name *</label>
                <input className="inp" required value={form.name} onChange={e => f('name', e.target.value)} placeholder="Jane Smith" />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#1b2a4a', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Role *</label>
                <select className="sel" style={{ width: '100%' }} value={form.role} onChange={e => f('role', e.target.value)}>
                  <option>Owner / Principal</option>
                  <option>Producer / Agent</option>
                  <option>Manager / Director</option>
                  <option>CSR / Account Manager</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#1b2a4a', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Work Email *</label>
              <input className="inp" type="email" required value={form.email} onChange={e => f('email', e.target.value)} placeholder="jane@youragency.com" />
            </div>

            <div className="grid grid-2" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#1b2a4a', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Agency Name *</label>
                <input className="inp" required value={form.agencyName} onChange={e => f('agencyName', e.target.value)} placeholder="Smith Insurance" />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#1b2a4a', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Producers</label>
                <select className="sel" style={{ width: '100%' }} value={form.agencySize} onChange={e => f('agencySize', e.target.value)}>
                  <option value="solo">Just me</option>
                  <option value="2-5">2–5</option>
                  <option value="6-15">6–15</option>
                  <option value="15+">15+</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#1b2a4a', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Current CRM (optional)</label>
              <input className="inp" value={form.currentTool} onChange={e => f('currentTool', e.target.value)} placeholder="AMS360, EZLynx, spreadsheets, none, etc." />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#1b2a4a', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>What&rsquo;s your biggest pain right now? (optional)</label>
              <textarea className="inp" rows={3} value={form.notes} onChange={e => f('notes', e.target.value)} placeholder="What&rsquo;s broken in your current process? (Optional but helps us prioritize.)" />
            </div>

            {error && (
              <div style={{ marginBottom: 14, padding: '10px 12px', background: '#fff1f2', border: '1px solid #fda4af', color: '#9f1239', borderRadius: 8, fontSize: 12 }}>{error}</div>
            )}

            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: 14, background: '#1b2a4a', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1, letterSpacing: '0.02em' }}>
              {loading ? 'Reserving your spot…' : 'Reserve My Founding Spot →'}
            </button>

            <div style={{ marginTop: 14, padding: '10px 12px', background: '#f0fdfa', border: '1px solid #5eead4', borderRadius: 8, fontSize: 11, color: '#0f766e', textAlign: 'center', lineHeight: 1.5 }}>
              <b>{spotsLeft} founding spots remain</b><br />
              No credit card required · 6 months free
            </div>
          </form>

          {/* FAQ */}
          <div style={{ marginTop: 32, color: 'rgba(255,255,255,0.85)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Common questions</div>
            {[
              ['When does the platform actually launch?',
               'We\'re onboarding founding agencies in waves over the next 8–10 weeks while we lock down the production foundation. You\'ll have full access from day one of your wave.'],
              ['What if it doesn\'t work for me?',
               'During the 6-month free period you can leave any time, no questions asked. After the trial you can cancel month-to-month. We don\'t lock anyone in.'],
              ['Do I need to import all my accounts to test it?',
               'No. Run it parallel to your current tool on 5–10 accounts for the first 30 days, then expand if it sticks.'],
              ['Who owns the data?',
               'You do. Full export to CSV at any time, zero hostage situations.'],
            ].map(([q, a]) => (
              <details key={q} style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, marginBottom: 8, cursor: 'pointer' }}>
                <summary style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>{q}</summary>
                <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.6, color: 'rgba(255,255,255,0.7)' }}>{a}</div>
              </details>
            ))}
          </div>
        </div>
      </div>

      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: '24px 32px', textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
        Carrier Base · Built for trucking insurance · <Link href="/" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>carrier-base.vercel.app</Link>
      </footer>
    </div>
  );
}

function buildConfirmationHTML(name: string): string {
  return `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
  <div style="max-width:560px;margin:30px auto;background:#fff;border-radius:14px;overflow:hidden;">
    <div style="background:#1b2a4a;padding:28px 36px;color:#fff;">
      <div style="font-size:11px;font-weight:600;opacity:0.7;letter-spacing:0.06em;text-transform:uppercase;">Carrier Base</div>
      <div style="font-size:22px;font-weight:700;margin-top:6px;">You&rsquo;re on the list, ${name.split(' ')[0]}</div>
    </div>
    <div style="padding:28px 36px;color:#475569;line-height:1.6;font-size:14px;">
      <p style="margin:0 0 16px;">Thanks for reserving your spot in the Carrier Base Founding Agency program. Here&rsquo;s what happens next:</p>
      <ol style="padding-left:20px;margin:0 0 22px;">
        <li style="margin-bottom:8px;">Within 5 business days we&rsquo;ll reach out to schedule a 20-minute intro call.</li>
        <li style="margin-bottom:8px;">We&rsquo;ll learn about your book of business and what&rsquo;s broken in your current workflow.</li>
        <li style="margin-bottom:8px;">If we&rsquo;re a fit, we&rsquo;ll walk you through white-glove onboarding for your first 10 accounts.</li>
        <li>You&rsquo;ll get 6 months completely free, then 50% off forever as a Founding Agency.</li>
      </ol>
      <p style="margin:0 0 8px;color:#1b2a4a;font-weight:600;">In the meantime, want to play with the demo?</p>
      <a href="https://carrier-base.vercel.app/login" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Try the live demo →</a>
      <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">Sign in with <code>admin@carrierbase.app</code> / <code>admin</code> to see the full platform.</p>
    </div>
    <div style="padding:18px 36px;background:#f8fafc;color:#94a3b8;font-size:11px;text-align:center;">
      Carrier Base · Built for trucking insurance · carrier-base.vercel.app
    </div>
  </div>
</body></html>`;
}

export default function EarlyAccessPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1a33', color: 'rgba(255,255,255,0.6)' }}>Loading…</div>}>
      <EarlyAccessInner />
    </Suspense>
  );
}
