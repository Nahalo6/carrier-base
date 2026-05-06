'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import s from './home.module.css';

// ── Shared check SVG ─────────────────────────────────────────────────────────
const Check = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const ArrowRight = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);

// ── Logo SVG ─────────────────────────────────────────────────────────────────
function LogoMark({ size = 36, light = false }: { size?: number; light?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <rect x="2" y="2" width="44" height="44" rx="11" fill={light ? 'none' : '#0b1730'} stroke={light ? '#3b82f6' : 'none'} strokeWidth={light ? 1.5 : 0} />
      <path d="M12 14 L22 24 L12 34" stroke="#3b82f6" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 14 L32 24 L22 34" stroke="#3b82f6" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
      <path d="M32 14 L42 24 L32 34" stroke="#ffffff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Modal content ─────────────────────────────────────────────────────────────
type ModalKey = 'demo' | 'contact' | 'terms' | 'privacy' | 'thanks';

function ModalContent({ modalKey, onClose, onThanks }: { modalKey: ModalKey; onClose: () => void; onThanks: () => void }) {
  const submit = (e: React.FormEvent) => { e.preventDefault(); onThanks(); };

  if (modalKey === 'demo') return (
    <>
      <h3>Book a Demo</h3>
      <p className={s.modalSub}>See Carrier Base in action.</p>
      <form onSubmit={submit}>
        <div className={s.formRow}><label>Full Name</label><input required placeholder="Jane Smith" /></div>
        <div className={s.formRow}><label>Work Email</label><input type="email" required placeholder="jane@youragency.com" /></div>
        <div className={s.formRow}><label>Agency Name</label><input required placeholder="Smith Insurance Group" /></div>
        <div className={s.formRow}><label>Number of Producers</label>
          <select><option>Just me</option><option>2–5</option><option>6–15</option><option>16–50</option><option>50+</option></select>
        </div>
        <button type="submit" className={`${s.btn} ${s.btnPrimary}`} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>Schedule Demo</button>
      </form>
    </>
  );

  if (modalKey === 'contact') return (
    <>
      <h3>Get in Touch</h3>
      <p className={s.modalSub}>We&apos;ll respond within 4 business hours.</p>
      <form onSubmit={submit}>
        <div className={s.formRow}><label>Name</label><input required /></div>
        <div className={s.formRow}><label>Email</label><input type="email" required /></div>
        <div className={s.formRow}><label>Message</label><textarea required style={{ minHeight: 120 }} /></div>
        <button type="submit" className={`${s.btn} ${s.btnPrimary}`} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>Send Message</button>
      </form>
    </>
  );

  if (modalKey === 'terms') return (
    <>
      <h3>Terms of Service</h3>
      <p className={s.modalSub}>Last updated: April 12, 2026</p>
      <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, maxHeight: '50vh', overflowY: 'auto', paddingRight: 10 }}>
        <p style={{ marginBottom: 14 }}><strong style={{ color: '#0b1730' }}>1. Acceptance.</strong> By using Carrier Base you agree to these terms.</p>
        <p style={{ marginBottom: 14 }}><strong style={{ color: '#0b1730' }}>2. Service.</strong> SaaS platform for commercial trucking insurance agencies.</p>
        <p style={{ marginBottom: 14 }}><strong style={{ color: '#0b1730' }}>3. Accounts.</strong> Provide accurate info and keep credentials confidential.</p>
        <p style={{ marginBottom: 14 }}><strong style={{ color: '#0b1730' }}>4. Billing.</strong> Monthly or annual. Cancel anytime. 14-day refund window.</p>
        <p style={{ marginBottom: 14 }}><strong style={{ color: '#0b1730' }}>5. Data.</strong> Your data belongs to you.</p>
        <p><strong style={{ color: '#0b1730' }}>Contact:</strong> legal@carrierbase.com</p>
      </div>
    </>
  );

  if (modalKey === 'privacy') return (
    <>
      <h3>Privacy Policy</h3>
      <p className={s.modalSub}>Last updated: April 12, 2026</p>
      <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, maxHeight: '50vh', overflowY: 'auto', paddingRight: 10 }}>
        <p style={{ marginBottom: 14 }}><strong style={{ color: '#0b1730' }}>Commitment.</strong> We protect your privacy and never sell your data.</p>
        <p style={{ marginBottom: 14 }}><strong style={{ color: '#0b1730' }}>What We Collect.</strong> Account info, usage data, and content you create.</p>
        <p style={{ marginBottom: 14 }}><strong style={{ color: '#0b1730' }}>Security.</strong> AES-256 at rest, TLS 1.3 in transit, SOC 2 Type II.</p>
        <p><strong style={{ color: '#0b1730' }}>Contact:</strong> privacy@carrierbase.com</p>
      </div>
    </>
  );

  if (modalKey === 'thanks') return (
    <>
      <h3>Thanks!</h3>
      <p className={s.modalSub}>We got your message.</p>
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <div className={s.successIcon}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>A member of our team will reach out within 4 business hours.</p>
        <button className={`${s.btn} ${s.btnPrimary}`} style={{ marginTop: 24 }} onClick={onClose}>Close</button>
      </div>
    </>
  );

  return null;
}

const FAQ_ITEMS = [
  { q: 'How is this different from Salesforce or HubSpot?', a: 'Generic CRMs are built for anyone selling anything. Carrier Base is built for one thing: commercial trucking insurance. Native FMCSA integration, trucking application auto-fill, MVR reports, market appetite scoring, BASIC alerts — all shaped by real producers and underwriters.' },
  { q: 'Who actually built this?', a: 'Our team includes former trucking insurance agency owners and commercial underwriters who wrote appetite guidelines for carriers you submit to. We know the business because we lived it.' },
  { q: 'Can I run MVRs from inside the platform?', a: 'Yes. Order motor vehicle records for any driver directly from the account view. Results return in-platform and attach automatically to the driver record.' },
  { q: 'Is the FMCSA data really live?', a: 'Yes. We integrate with the FMCSA SAFER and Census Files API to pull BASICs, MCS-150 data, insurance history, inspections, and crashes in real time.' },
  { q: 'Can I bring my own market appetite list?', a: 'Absolutely. Ships with pre-loaded profiles for major carriers, but you can edit, delete, or build your own from scratch.' },
  { q: 'Is my data secure?', a: 'AES-256 at rest, TLS 1.3 in transit, SOC 2 Type II compliant, hosted on AWS US-East. Daily backups retained 30 days.' },
];

export default function HomePage() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [modal, setModal] = useState<ModalKey | null>(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setModal(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = modal ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [modal]);

  const goToCheckout = (plan: string) => router.push(`/checkout?plan=${plan}`);

  return (
    <div className={s.page}>

      {/* ── NAV ── */}
      <nav className={`${s.nav} ${scrolled ? s.navScrolled : ''}`}>
        <div className={s.navInner}>
          <Link href="/" className={s.brand}>
            <LogoMark />
            <div><div>Carrier Base</div><div className={s.brandSub}>Insurance Platform</div></div>
          </Link>
          <div className={s.navLinks}>
            <a href="#features">Features</a>
            <a href="#process">How it Works</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className={s.navCta}>
            <Link href="/dashboard" className={`${s.btn} ${s.btnGhost}`}>Sign In</Link>
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setModal('demo')}>
              Book Demo <ArrowRight />
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className={s.hero} id="top">
        <div className={s.heroBg} />
        <div className={s.heroGlow} />
        <div className={s.heroInner}>
          <div className={s.heroEyebrow}>
            <div className={s.heroDot} />
            <span>Built by Trucking Insurance People</span>
          </div>
          <h1 className={s.heroH1}>The operating system for <em>trucking insurance</em> agencies.</h1>
          <p className={s.heroLede}>A CRM, pre-underwriting engine, trucking application generator, MVR platform, and email system. Built specifically for commercial trucking insurance.</p>
          <div className={s.heroCtas}>
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setModal('demo')}>
              Book a Demo <ArrowRight />
            </button>
            <a href="#features" className={`${s.btn} ${s.btnLight}`}>See Features</a>
          </div>
          <div className={s.heroStats}>
            <div><div className={s.heroStatNum}><em>Live</em> SAFER</div><div className={s.heroStatLbl}>FMCSA Data</div></div>
            <div><div className={s.heroStatNum}><em>Auto</em>-fill</div><div className={s.heroStatLbl}>Trucking Application</div></div>
            <div><div className={s.heroStatNum}><em>Instant</em> MVRs</div><div className={s.heroStatLbl}>Driver Records</div></div>
            <div><div className={s.heroStatNum}><em>Smart</em> Match</div><div className={s.heroStatLbl}>Market Appetite</div></div>
          </div>
        </div>
      </section>

      {/* ── TRUCK BAR ── */}
      <div className={s.truckBar}>
        <div className={s.truckBarInner}>
          <div className={s.truckBarText}>
            <span className={s.mono}>— For the road warriors</span>
            <h3>Every <em>DOT number</em> tells a story.</h3>
          </div>
          <svg width="420" height="140" viewBox="0 0 420 140" xmlns="http://www.w3.org/2000/svg">
            <line x1="0" y1="130" x2="420" y2="130" stroke="#3b82f6" strokeWidth="1" strokeDasharray="8 6" opacity="0.4" />
            <g stroke="#3b82f6" strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round">
              <rect x="20" y="40" width="220" height="70" rx="3" />
              <line x1="60" y1="40" x2="60" y2="110" /><line x1="100" y1="40" x2="100" y2="110" />
              <line x1="140" y1="40" x2="140" y2="110" /><line x1="180" y1="40" x2="180" y2="110" />
              <line x1="220" y1="40" x2="220" y2="110" /><line x1="20" y1="105" x2="240" y2="105" />
              <line x1="240" y1="60" x2="258" y2="60" /><line x1="240" y1="90" x2="258" y2="90" />
              <path d="M258 55 L258 110 L338 110 L338 85 L378 85 L378 55 Z" />
              <path d="M338 55 L338 80 L376 80 L370 55 Z" fill="#2563eb" fillOpacity="0.15" />
              <line x1="338" y1="85" x2="338" y2="110" /><line x1="378" y1="65" x2="378" y2="105" />
              <line x1="383" y1="75" x2="383" y2="95" /><line x1="320" y1="65" x2="320" y2="105" />
              <rect x="322" y="70" width="14" height="8" rx="1" />
            </g>
            <g fill="#0b1730" stroke="#3b82f6" strokeWidth="2">
              <circle cx="55" cy="118" r="14" /><circle cx="95" cy="118" r="14" />
              <circle cx="200" cy="118" r="14" /><circle cx="278" cy="118" r="14" />
              <circle cx="358" cy="118" r="14" />
            </g>
            <g fill="#3b82f6">
              <circle cx="55" cy="118" r="5" /><circle cx="95" cy="118" r="5" />
              <circle cx="200" cy="118" r="5" /><circle cx="278" cy="118" r="5" />
              <circle cx="358" cy="118" r="5" />
            </g>
            <g stroke="#3b82f6" strokeWidth="2" fill="none" strokeLinecap="round">
              <line x1="315" y1="30" x2="315" y2="55" /><line x1="322" y1="30" x2="322" y2="55" />
            </g>
            <g stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" opacity="0.4">
              <line x1="5" y1="60" x2="16" y2="60" /><line x1="2" y1="75" x2="14" y2="75" /><line x1="6" y1="90" x2="16" y2="90" />
            </g>
          </svg>
          <div className={s.truckBarRight}>
            <span className={s.mono}>— Carrier-first</span>
            <h3>We speak <em>trucking</em>, fluently.</h3>
          </div>
        </div>
      </div>

      {/* ── FOUNDERS ── */}
      <section className={s.founders}>
        <div className={s.foundersInner}>
          <div className={s.foundersGrid}>
            <div>
              <div className={s.foundersEyebrow}>
                <div className={s.foundersEyebrowLine} />
                <span>Who built this</span>
              </div>
              <h2 className={s.foundersH2}>People who <em>wrote the book</em>.</h2>
              <p className={s.foundersP}><strong>Carrier Base wasn&apos;t built in a conference room.</strong> It was built by trucking insurance agency owners and commercial underwriters who spent 15+ years running books before writing a single line of code.</p>
              <p className={s.foundersP}>We know what a Canal decline looks like. We know why Great West won&apos;t touch a new venture under two years. We know how to win.</p>
              <div className={s.founderBadges}>
                <div className={s.founderBadge}>
                  <div className={s.founderBadgeIcon}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                  </div>
                  <h4>Agency Owners</h4>
                  <p>Built multi-million dollar trucking books from zero</p>
                </div>
                <div className={s.founderBadge}>
                  <div className={s.founderBadgeIcon}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
                  </div>
                  <h4>Underwriters</h4>
                  <p>Wrote appetite guides for carriers you submit to</p>
                </div>
              </div>
            </div>
            <div className={s.foundersVisual}>
              <div className={s.foundersVisualBg} />
              <div className={s.foundersVisualGlow} />
              <div className={s.fvContent}>
                <div className={s.fvQuote}>Every tool we tried was built for someone else&apos;s business. We got tired of waiting for the right one, so we built it ourselves.</div>
              </div>
              <div className={s.fvAttr}>
                <div className={s.fvAvatar}>CB</div>
                <div>
                  <strong>The Carrier Base Team</strong>
                  <span>Trucking Insurance Professionals</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className={s.features} id="features">
        <div className={s.featuresInner}>
          <div className={s.featuresHead}>
            <span className={s.mono}>— Features</span>
            <h2 className={s.featuresH2}>Everything you need. <em>Nothing you don&apos;t.</em></h2>
          </div>
          <div className={s.featuresGrid}>

            <div className={`${s.featureCard} ${s.fcLarge} ${s.featureCardDark}`}>
              <span className={s.fcLabel}>FMCSA Integration</span>
              <h3 className={s.fcTitle}>Live SAFER, <em>one click</em>.</h3>
              <p className={s.fcDesc}>Pull BASICs, MCS-150, insurance history, inspections, and crashes the moment you open an account.</p>
              <div className={s.fcScreenshot}>
                <div className={s.ssHdr}>
                  <div className={s.ssDot} style={{ background: '#ef4444' }} />
                  <div className={s.ssDot} style={{ background: '#f59e0b' }} />
                  <div className={s.ssDot} style={{ background: '#22c55e' }} />
                  <div style={{ marginLeft: 12, fontSize: 10, color: '#64748b' }}>Hill Country Freight — DOT# 3456789</div>
                </div>
                <div className={s.ssBody}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>FMCSA BASICs (24 months)</div>
                  {[['Unsafe Drv', 42, '#22c55e'], ['Hours of Svc', 55, '#f59e0b'], ['Veh Maint', 48, '#22c55e'], ['Crash Ind', 35, '#22c55e']].map(([lbl, val, col]) => (
                    <div key={lbl as string} className={s.ssBarWrap}>
                      <div className={s.ssBarLbl}>{lbl as string}</div>
                      <div className={s.ssBarTrack}><div className={s.ssBarFill} style={{ width: `${val}%`, background: col as string }} /></div>
                      <div className={s.ssBarVal}>{val}</div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTop: '1px solid #e2e8f0', fontSize: 10, color: '#64748b' }}>
                    <div>Safety: <b style={{ color: '#16a34a' }}>Satisfactory</b></div>
                    <div>Inspections: <b style={{ color: '#0b1730' }}>28</b></div>
                    <div>Crashes: <b style={{ color: '#d97706' }}>1</b></div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`${s.featureCard} ${s.fcMedium}`}>
              <span className={s.fcLabel}>Market Matching</span>
              <h3 className={s.fcTitle}>Pre-underwriting <em>that thinks</em>.</h3>
              <p className={s.fcDesc}>Every account scored against every market. Eligible carriers surfaced instantly.</p>
              <div className={s.fcScreenshot}>
                <div className={s.ssHdr}><div style={{ fontSize: 10, color: '#64748b' }}>Pre-Underwrite Results</div></div>
                <div className={s.ssBody}>
                  {[['Canal Insurance', 'Auto Liab · Physical Damage', 94, '#dcfce7', '#16a34a'],
                    ['Sentry Insurance', 'Workers Comp · GL', 91, '#dcfce7', '#16a34a'],
                    ['Great West Casualty', 'Motor Truck Cargo', 85, '#fef3c7', '#d97706'],
                    ['Progressive Comm.', 'Fleet too small', 47, '#fee2e2', '#dc2626'],
                  ].map(([name, sub, score, bg, col]) => (
                    <div key={name as string} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 11px', background: bg as string, borderRadius: 9, marginBottom: 5 }}>
                      <div><div className={s.ssName}>{name as string}</div><div className={s.ssSub}>{sub as string}</div></div>
                      <div style={{ fontSize: 22, color: col as string, lineHeight: 1, fontWeight: 600 }}>{score}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={`${s.featureCard} ${s.fcThird} ${s.featureCardBlue}`}>
              <span className={s.fcLabel}>MVR Reports</span>
              <h3 className={s.fcTitle}>Driver MVRs, <em>instant</em>.</h3>
              <p className={s.fcDesc}>Order motor vehicle records for every driver directly from the account.</p>
              <div className={s.fcScreenshot} style={{ background: '#fff', padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}><div style={{ fontSize: 14, color: '#0b1730', fontWeight: 600 }}>Driver MVRs</div><span style={{ fontSize: 9, fontWeight: 600, background: '#dcfce7', color: '#16a34a', padding: '3px 8px', borderRadius: 100 }}>3 CLEAN</span></div>
                {[['Mike Ramirez', 'CDL-A · TX', 'Clean', '#16a34a'], ['J. Martinez', 'CDL-A · TX', 'Clean', '#16a34a'], ['R. Thompson', 'CDL-A · OK', '1 Minor', '#d97706']].map(([name, lic, status, col]) => (
                  <div key={name as string} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div><div style={{ fontSize: 11, fontWeight: 600, color: '#0b1730' }}>{name as string}</div><div style={{ fontSize: 9, color: '#64748b' }}>{lic as string}</div></div>
                    <span style={{ fontSize: 9, color: col as string, fontWeight: 600 }}>{status as string}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${s.featureCard} ${s.fcThird}`}>
              <span className={s.fcLabel}>Trucking Application</span>
              <h3 className={s.fcTitle}>Apps fill <em>themselves</em>.</h3>
              <p className={s.fcDesc}>Trucking-specific application auto-populated from every lead&apos;s SAFER data.</p>
              <div className={s.fcScreenshot} style={{ background: '#fff', padding: '14px 16px' }}>
                <div style={{ fontSize: 15, color: '#0b1730', marginBottom: 2, fontWeight: 600 }}>Trucking Application</div>
                <div style={{ fontSize: 10, color: '#64748b', marginBottom: 12 }}>Commercial Trucking · Pre-filled</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {[['DOT #', '3456789'], ['MC #', 'MC-987654'], ['Fleet', '12 units'], ['Years', '4']].map(([lbl, val]) => (
                    <div key={lbl} style={{ background: '#eff6ff', padding: '8px 10px', borderRadius: 6 }}>
                      <div style={{ fontSize: 8, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{lbl}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#0b1730' }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={`${s.featureCard} ${s.fcThird} ${s.featureCardDark}`}>
              <span className={s.fcLabel}>Team Performance</span>
              <h3 className={s.fcTitle}>Producer <em>leaderboard</em>.</h3>
              <p className={s.fcDesc}>Live team metrics. Goals, binds, revenue.</p>
              <div className={s.fcScreenshot} style={{ background: '#152544', border: '1px solid rgba(255,255,255,0.08)', padding: 14 }}>
                {[['1', 'Alex Rivera', '$287K', '#fde047'], ['2', 'Sam Ortiz', '$234K', '#d4d4d4'], ['3', 'Jordan Wells', '$198K', '#b8823a']].map(([rank, name, rev, rankCol]) => (
                  <div key={name as string} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', fontSize: 11, color: '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ color: rankCol as string, fontSize: 17, fontWeight: 600 }}>{rank}</span>
                      <span>{name as string}</span>
                    </div>
                    <span style={{ color: '#3b82f6', fontWeight: 600 }}>{rev as string}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── PROCESS ── */}
      <section className={s.process} id="process">
        <div className={s.processInner}>
          <div className={s.processHead}>
            <span className={s.mono}>— How it Works</span>
            <h2 className={s.processH2}>From DOT number to <em>bound policy</em>, faster than ever.</h2>
          </div>
          <div className={s.processSteps}>
            {[
              ['STEP 01', 'Find', 'Paste a DOT number. Public FMCSA data loads instantly.'],
              ['STEP 02', 'Score', 'Auto pre-UW runs against every market in your appetite list.'],
              ['STEP 03', 'Submit', 'Applications auto-fill, MVRs pulled, PDFs generated, emails sent.'],
              ['STEP 04', 'Bind', 'Track every quote. Move accounts through the pipeline.'],
            ].map(([num, title, desc]) => (
              <div key={num} className={s.processStep}>
                <div className={s.processNum}>{num}</div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className={s.pricing} id="pricing">
        <div className={s.pricingInner}>
          <div className={s.pricingHead}>
            <span className={s.mono}>— Pricing</span>
            <h2 className={s.pricingH2}>Simple. <em>Honest.</em></h2>
            <p>No setup fees. No long contracts. Cancel anytime.</p>
          </div>
          <div className={s.pricingGrid}>

            <div className={s.priceCard}>
              <div className={s.priceName}>Solo</div>
              <div className={s.priceSub}>1 user</div>
              <div className={s.priceAmt}><span className="cur">$</span>200<span className="per">/mo</span></div>
              <ul className={s.priceFeatures}>
                {['Up to 100 active accounts','Unlimited DOT/SAFER lookups','Trucking application + custom apps','Unlimited MVR reports','Pre-underwriting engine'].map(f => (
                  <li key={f}><Check />{f}</li>
                ))}
              </ul>
              <button className={`${s.btn} ${s.btnLight} ${s.priceCta}`} onClick={() => goToCheckout('solo')}>Get Started</button>
            </div>

            <div className={`${s.priceCard} ${s.priceCardFeatured}`}>
              <div className={s.priceBadge}>Most Popular</div>
              <div className={s.priceName}>Agency</div>
              <div className={s.priceSub} style={{ color: 'rgba(255,255,255,0.6)' }}>2–5 users</div>
              <div className={s.priceAmt}><span className="cur">$</span>500<span className="per">/mo</span></div>
              <ul className={s.priceFeatures}>
                {['Up to 5 producers','Unlimited accounts','Unlimited MVR reports','Early access to new products','Leaderboard & goals','Manager dashboard','Outlook integration','Priority support'].map(f => (
                  <li key={f}><Check />{f}</li>
                ))}
              </ul>
              <button className={`${s.btn} ${s.btnPrimary} ${s.priceCta}`} onClick={() => goToCheckout('agency')}>Get Started</button>
            </div>

            <div className={s.priceCard}>
              <div className={s.priceName}>Enterprise</div>
              <div className={s.priceSub}>For larger agencies</div>
              <div className={s.priceAmt} style={{ fontSize: 36, paddingTop: 16 }}>Custom</div>
              <ul className={s.priceFeatures}>
                {['Unlimited producers','Unlimited MVRs','Single sign-on (SSO)','Custom integrations & API','Dedicated success mgr'].map(f => (
                  <li key={f}><Check />{f}</li>
                ))}
              </ul>
              <button className={`${s.btn} ${s.btnLight} ${s.priceCta}`} onClick={() => setModal('contact')}>Contact Sales</button>
            </div>

          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className={s.faq} id="faq">
        <div className={s.faqInner}>
          <div className={s.faqHead}>
            <span className={s.mono}>— FAQ</span>
            <h2 className={s.faqH2}>Good <em>questions</em>.</h2>
          </div>
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className={s.faqItem}>
              <button className={s.faqQ} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                {item.q}
                <span className={`${s.faqIcon} ${openFaq === i ? s.faqIconOpen : ''}`}>+</span>
              </button>
              <div className={`${s.faqA} ${openFaq === i ? s.faqAOpen : ''}`}>{item.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className={s.finalCta}>
        <div className={s.finalCtaBg} />
        <div className={s.finalCtaGlow} />
        <div className={s.finalCtaInner}>
          <h2 className={s.finalCtaH2}>Built to <em>win</em>.</h2>
          <p className={s.finalCtaP}>Book a 30-minute demo. See it in action. No credit card required.</p>
          <div className={s.finalCtaCtas}>
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setModal('demo')}>
              Book a Demo <ArrowRight />
            </button>
            <button className={`${s.btn} ${s.btnLight}`} onClick={() => setModal('contact')}>Contact Sales</button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className={s.footer}>
        <div className={s.footerInner}>
          <div className={s.footerTop}>
            <div className="footerBrand">
              <Link href="/" className={s.brand} style={{ color: '#fff', marginBottom: 14 }}>
                <LogoMark light />
                <div><div>Carrier Base</div><div className={s.brandSub} style={{ color: 'rgba(255,255,255,0.4)' }}>Insurance Platform</div></div>
              </Link>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, maxWidth: 300, marginTop: 8 }}>
                The operating system for trucking insurance agents. Built for you, by people like you.
              </p>
            </div>
            <div className={s.footerCol}>
              <h5>Product</h5>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#process">How it Works</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="#" onClick={e => { e.preventDefault(); setModal('demo'); }}>Book Demo</a></li>
              </ul>
            </div>
            <div className={s.footerCol}>
              <h5>Company</h5>
              <ul>
                <li><a href="#" onClick={e => { e.preventDefault(); setModal('contact'); }}>Contact</a></li>
                <li><a href="#faq">FAQ</a></li>
                <li><a href="#">Careers</a></li>
                <li><a href="#">Blog</a></li>
              </ul>
            </div>
            <div className={s.footerCol}>
              <h5>Legal</h5>
              <ul>
                <li><a href="#" onClick={e => { e.preventDefault(); setModal('terms'); }}>Terms</a></li>
                <li><a href="#" onClick={e => { e.preventDefault(); setModal('privacy'); }}>Privacy</a></li>
                <li><a href="#">Security</a></li>
                <li><a href="#">DPA</a></li>
              </ul>
            </div>
          </div>
          <div className={s.footerBottom}>
            <p>© 2026 Carrier Base, Inc.</p>
            <div className={s.footerLegal}>
              <a href="#" onClick={e => { e.preventDefault(); setModal('terms'); }}>Terms</a>
              <a href="#" onClick={e => { e.preventDefault(); setModal('privacy'); }}>Privacy</a>
              <a href="#">Cookies</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ── MODAL ── */}
      {modal && (
        <div className={s.modalOverlay} onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className={s.modalBox}>
            <button className={s.modalClose} onClick={() => setModal(null)}>×</button>
            <ModalContent
              modalKey={modal}
              onClose={() => setModal(null)}
              onThanks={() => setModal('thanks')}
            />
          </div>
        </div>
      )}

    </div>
  );
}
