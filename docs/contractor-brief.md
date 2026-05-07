# Senior Full-Stack Engineer — Phase 1 Production Foundation

**Engagement type:** Fixed-scope contract, 8–12 weeks
**Hours:** 20–30 hrs/week (your call — we care about deliverables, not timesheets)
**Rate range:** $60–120/hr depending on experience and timezone
**Total budget:** $15,000–35,000
**Start date:** Immediate
**Location:** Remote, any timezone with 3+ overlapping working hours US Eastern

---

## About Carrier Base

Carrier Base is a trucking-insurance CRM built specifically for agencies that write commercial auto, motor truck cargo, physical damage, and related lines. The product is **already built and deployed at carrier-base.vercel.app** — full FMCSA integration, CAB-style risk scoring, multi-policy management, MVR ordering, e-signature scaffolding, drag-drop documents, role-based admin, and analytics with US heat maps. The frontend is polished and demo-ready.

**The catch:** everything currently runs on browser localStorage with mocked OAuth flows. We need to replace that foundation with a real production backend so we can charge real customers.

You'd be the engineer who ships that foundation.

---

## Scope of Work (Phase 1)

The full scope is fixed and finite. Everything below ships within the engagement:

### 1. Multi-tenant database + API layer
- Migrate all Zustand-persisted state to Postgres (Supabase, Neon, or RDS — your recommendation)
- Design schema with proper tenant isolation (row-level security or org-scoped queries)
- Build typed API layer (tRPC preferred, or REST with Zod validation)
- Replace every `useCRMStore` and `useAuthStore` action with API calls
- Migrate seed data and any dev fixtures

### 2. Authentication hardening
- Replace localStorage auth with NextAuth.js (or Auth.js v5)
- bcrypt password hashing, JWT or database sessions
- Email verification on signup
- Secure password reset via tokenized email links
- TOTP-based MFA (optional toggle per user)
- Session expiry and refresh
- Brute-force / rate limiting on auth endpoints

### 3. Live Stripe billing
- Wire `STRIPE_SECRET_KEY` into existing `/api/stripe/checkout` route (already scaffolded)
- Subscription billing for Solo, Agency, Enterprise tiers
- Webhook receiver for `checkout.session.completed`, `invoice.paid`, `subscription.deleted`, `invoice.payment_failed`
- One-time payment flow for Broker Directory ($1,000)
- Stripe Customer Portal embed for self-service plan changes
- Wallet top-up flow connecting to existing wallet store (also scaffolded)

### 4. Email send + reply sync
- Wire `RESEND_API_KEY` for transactional email (existing `/api/email/send` route is scaffolded)
- OAuth flows for Gmail and Outlook via NextAuth providers
- Build inbound email handler — IMAP poll for connected Gmail/Outlook accounts, parse replies, attach to matching lead by Reference-ID header
- Bounce handling

### 5. Document storage migration
- Move `dataUrl` document storage off localStorage to S3 or Cloudflare R2
- Signed URL generation for downloads
- Same UI, different storage backend
- Apply to: lead documents, MVR results (when implemented later), policy attachments

### 6. Audit logging
- Append-only `audit_log` table
- Log: status changes, policy edits/creates/deletes, MVR orders, document uploads/deletes, login events, role changes, wallet charges
- Admin panel view to query the log
- Export to CSV

### 7. Backups + DR
- Daily automated Postgres backups with 30-day retention
- Document storage versioning (S3 Object Versioning or equivalent)
- Documented restore procedure with tested runbook
- Target RTO < 4 hours, RPO < 1 hour

### 8. Compliance baseline plumbing
- Endpoints for data export (GDPR/CCPA "give me my data")
- Endpoints for account deletion that preserves audit trail
- NPN (insurance license number) capture during agency signup
- E&O proof-of-coverage upload during agency onboarding

### Out of scope (explicitly)
- New product features beyond what's already built
- Mobile apps
- AI features
- Third-party integrations beyond what's listed (Samba Safety MVR, DocuSign, etc. come in Phase 2)
- SOC 2 prep (handled separately when needed)

---

## Tech Stack You'll Inherit

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Zustand for state, Tailwind 4, recharts, react-simple-maps
- **Hosting:** Vercel
- **Repo:** github.com/Nahalo6/carrier-base (will share access)
- **Existing API routes:** `/api/stripe/checkout`, `/api/email/send`, `/api/fmcsa/*` (carrier, basics, search)
- **Existing scaffolds ready to wire:** Stripe, Resend, OAuth provider cards in Settings, MVR wallet logic

You'll likely add:
- Postgres (Supabase, Neon, or self-hosted)
- NextAuth.js / Auth.js v5
- tRPC or hand-rolled REST with Zod
- AWS S3 or Cloudflare R2 for documents
- Sentry for error monitoring
- A queue/cron tool for IMAP polling (Trigger.dev, Inngest, or vercel cron)

---

## What "Done" Looks Like

By end of engagement:
- All localStorage state replaced with database persistence
- New users sign up, verify email, log in, change passwords, enable MFA
- Real Stripe charges flow through, subscriptions work, webhooks update user records
- Producers connect their Gmail/Outlook and emails actually send + replies land in the right lead
- Documents upload to S3, download via signed URLs
- Every state-changing action writes to audit log
- Daily backups verified by a successful test restore
- Production environment is set up on Vercel with proper env vars, separate staging environment exists

You'll deliver a Loom video walkthrough of the deployed system at end of engagement plus a README in `docs/` covering: schema, deployment runbook, env vars, restore procedure.

---

## Required Experience

Apply only if you have all of these:

- [ ] Shipped at least 2 production Next.js apps using App Router (not Pages Router — different beast)
- [ ] Multi-tenant Postgres design experience — comfortable explaining row-level security or alternative isolation patterns
- [ ] NextAuth.js / Auth.js v5 in production
- [ ] Stripe Subscriptions (not just one-time payments) including webhook receivers
- [ ] OAuth 2.0 flows for at least one of: Google, Microsoft, GitHub, etc.
- [ ] TypeScript daily, not occasionally
- [ ] Comfortable with Zod or similar schema validation

### Strong nice-to-haves

- Insurance, fintech, or other regulated-industry experience
- IMAP / email parsing (Postmark inbound, Mailgun routes, or hand-rolled)
- tRPC
- Supabase, Neon, or PlanetScale
- Sentry / monitoring setup

### Red flags (don't apply if any are true)

- You'd describe yourself as primarily a "WordPress developer" or "Shopify developer"
- You haven't deployed something to production in the last 6 months
- You think auth means storing passwords in a database column (we'll ask)
- You can't show me a Postgres schema you designed

---

## Compensation

We'll agree on a fixed-scope price for the engagement based on your hourly rate × estimated hours, paid in three milestones:

| Milestone | Trigger | % of total |
|---|---|---|
| Kickoff | Engagement start, repo access, first PR | 20% |
| Halfway | Auth + DB + Stripe live in staging | 40% |
| Completion | All Phase 1 deliverables in production, verified | 40% |

Net-7 invoicing. Paid via Stripe, Wise, or direct wire (your call).

We're also open to monthly retainer post-launch ($2–4K/month for 4 weeks of on-call bug fixes) — discussed after Phase 1 completes.

---

## How to Apply

Reply with:

1. **One paragraph** on why this project interests you
2. **Two production apps you've shipped** (links + your role + tech stack)
3. **Walk me through, in 3–5 sentences:** how you'd add multi-tenant data isolation to an existing Next.js app currently using Zustand for state
4. **Your hourly rate** and rough estimate of hours to complete the scope above
5. **Earliest start date**

Replies that skip any of these get filtered out. Replies that include AI-generated text without thought get filtered out — I want to know how *you* think.

Email applications to: [INSERT YOUR EMAIL]

I read every application within 48 hours and respond either way.

---

## Why Build This With Us

- **Real product, real demo, real customer demand** — you're not building from scratch, you're hardening something that already works
- **Clear, finite scope** — no scope creep, no "while you're in there" features
- **Modern stack** — Next.js 16 App Router, React 19, TypeScript everywhere
- **Direct access to founder** — no bureaucracy, fast decisions, no design-by-committee
- **Industry with real money** — trucking insurance is a $50B+ market and the existing CRM tools are 20 years old. We've seen our beta users light up at our demo. There's room here.

---

*Carrier Base · carrier-base.vercel.app · github.com/Nahalo6/carrier-base*
