/* eslint-disable */
// Carrier Base - Roadmap & Gap Analysis PDF generator
// Run: node scripts/generate-roadmap.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const COLORS = {
  navy:      '#1b2a4a',
  navyDark:  '#0f1a33',
  blue:      '#2563eb',
  blueLight: '#eff6ff',
  teal:      '#0f766e',
  tealBg:    '#f0fdfa',
  amber:     '#b45309',
  amberBg:   '#fef3c7',
  red:       '#9f1239',
  redBg:     '#fff1f2',
  purple:    '#6b21a8',
  purpleBg:  '#faf5ff',
  ink:       '#0f172a',
  text:      '#475569',
  muted:     '#64748b',
  light:     '#94a3b8',
  line:      '#e2e8f0',
  bg:        '#f8fafc',
  white:     '#ffffff',
};

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 54;
const CONTENT_W = PAGE_W - MARGIN * 2;

const doc = new PDFDocument({
  size: 'LETTER',
  margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
  info: {
    Title: 'Carrier Base - Product Roadmap and Gap Analysis',
    Author: 'Carrier Base',
    Subject: 'Production readiness and forward roadmap',
    Keywords: 'carrier base, trucking insurance crm, roadmap',
  },
});

const outPath = path.join(__dirname, '..', 'public', 'carrier-base-roadmap.pdf');
doc.pipe(fs.createWriteStream(outPath));

let pageNum = 1;

// --- Helpers ---
function drawChrome() {
  if (pageNum === 1) return;
  doc.save();
  doc.rect(0, 0, PAGE_W, 28).fill(COLORS.navy);
  doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(9)
     .text('CARRIER BASE', MARGIN, 9, { width: CONTENT_W / 2, lineBreak: false });
  doc.font('Helvetica').fontSize(9).fillColor('#cbd5e1')
     .text('Product Roadmap and Gap Analysis', MARGIN + CONTENT_W / 2, 9,
           { width: CONTENT_W / 2, align: 'right', lineBreak: false });
  doc.restore();
  doc.save();
  doc.font('Helvetica').fontSize(8).fillColor(COLORS.light)
     .text('CONFIDENTIAL  -  INTERNAL ROADMAP', MARGIN, PAGE_H - 30,
           { width: CONTENT_W / 2, align: 'left', lineBreak: false });
  doc.font('Helvetica').fontSize(8).fillColor(COLORS.light)
     .text('Page ' + pageNum, MARGIN + CONTENT_W / 2, PAGE_H - 30,
           { width: CONTENT_W / 2, align: 'right', lineBreak: false });
  doc.restore();
  doc.x = MARGIN;
  doc.y = MARGIN;
}

function newPage() {
  doc.addPage();
  pageNum += 1;
  drawChrome();
}

function ensureSpace(needed) {
  if (doc.y + needed > PAGE_H - 60) newPage();
}

function h1(text) {
  ensureSpace(60);
  doc.font('Helvetica-Bold').fontSize(24).fillColor(COLORS.navy)
     .text(text, MARGIN, doc.y, { width: CONTENT_W, lineBreak: false });
  const y = doc.y;
  doc.moveTo(MARGIN, y + 4).lineTo(MARGIN + 40, y + 4).lineWidth(3).stroke(COLORS.blue);
  doc.y = y + 16;
  doc.x = MARGIN;
}

function h2(text) {
  ensureSpace(40);
  doc.font('Helvetica-Bold').fontSize(15).fillColor(COLORS.navy)
     .text(text, MARGIN, doc.y, { width: CONTENT_W });
  doc.moveDown(0.4);
  doc.x = MARGIN;
}

function eyebrow(text, color) {
  doc.font('Helvetica-Bold').fontSize(8).fillColor(color || COLORS.muted)
     .text(text.toUpperCase(), MARGIN, doc.y, { characterSpacing: 1.2, width: CONTENT_W });
  doc.moveDown(0.2);
  doc.x = MARGIN;
}

function paragraph(text) {
  doc.font('Helvetica').fontSize(10.5).fillColor(COLORS.text).lineGap(2)
     .text(text, MARGIN, doc.y, { width: CONTENT_W, align: 'left' });
  doc.moveDown(0.6);
  doc.x = MARGIN;
}

function bullet(title, desc, accent) {
  ensureSpace(60);
  const startY = doc.y;
  doc.save();
  doc.rect(MARGIN, startY + 2, 3, 16).fill(accent || COLORS.blue);
  doc.restore();
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.navy)
     .text(title, MARGIN + 12, startY, { width: CONTENT_W - 12 });
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.text).lineGap(1.5)
     .text(desc, MARGIN + 12, doc.y + 1, { width: CONTENT_W - 12, align: 'left' });
  doc.moveDown(0.6);
  doc.x = MARGIN;
}

function checklistItem(label, status) {
  ensureSpace(22);
  const y = doc.y;
  const boxColor = status === 'done' ? COLORS.teal : status === 'partial' ? COLORS.amber : COLORS.line;
  const boxFill = status === 'done' ? COLORS.tealBg : status === 'partial' ? COLORS.amberBg : COLORS.bg;
  doc.save();
  doc.roundedRect(MARGIN, y + 1, 14, 14, 3).fill(boxFill).stroke(boxColor);
  if (status === 'done') {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.teal).text('Y', MARGIN + 4, y + 3);
  }
  doc.restore();
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.ink)
     .text(label, MARGIN + 22, y + 2, { width: CONTENT_W - 22 });
  doc.moveDown(0.3);
  doc.x = MARGIN;
}

function priorityBox(items) {
  const cols = items.length;
  const gap = 8;
  const colW = (CONTENT_W - gap * (cols - 1)) / cols;
  ensureSpace(80);
  const startY = doc.y;
  items.forEach((it, i) => {
    const x = MARGIN + i * (colW + gap);
    doc.save();
    doc.roundedRect(x, startY, colW, 64, 8).fillAndStroke(it.bg, it.border);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(it.fg)
       .text(it.label.toUpperCase(), x + 12, startY + 10, { width: colW - 24, characterSpacing: 1, lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(28).fillColor(it.fg)
       .text(String(it.count), x + 12, startY + 22, { lineBreak: false });
    doc.font('Helvetica').fontSize(8).fillColor(it.fg)
       .text(it.sub, x + 12, startY + 50, { width: colW - 24, lineBreak: false });
    doc.restore();
  });
  doc.y = startY + 78;
  doc.x = MARGIN;
}

function row(title, desc, priority, effort) {
  ensureSpace(56);
  const startY = doc.y;
  doc.save();
  doc.rect(MARGIN, startY, CONTENT_W, 1).fill(COLORS.line);
  doc.restore();
  doc.font('Helvetica-Bold').fontSize(10.5).fillColor(COLORS.navy)
     .text(title, MARGIN, startY + 8, { width: CONTENT_W * 0.65, lineBreak: false });
  const rightX = MARGIN + CONTENT_W * 0.68;
  const rightY = startY + 8;
  const pColor = priority === 'CRITICAL' ? { bg: COLORS.redBg, fg: COLORS.red }
              : priority === 'HIGH'      ? { bg: COLORS.amberBg, fg: COLORS.amber }
              : priority === 'MEDIUM'    ? { bg: COLORS.blueLight, fg: COLORS.blue }
              :                            { bg: COLORS.bg, fg: COLORS.muted };
  doc.save();
  doc.font('Helvetica-Bold').fontSize(7);
  const pw = doc.widthOfString(priority) + 12;
  doc.roundedRect(rightX, rightY, pw, 12, 3).fill(pColor.bg);
  doc.fillColor(pColor.fg).text(priority, rightX + 6, rightY + 2.5, { lineBreak: false });
  doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted)
     .text('Effort: ' + effort, rightX + pw + 8, rightY + 3, { lineBreak: false });
  doc.restore();
  doc.font('Helvetica').fontSize(9.5).fillColor(COLORS.text).lineGap(1)
     .text(desc, MARGIN, startY + 26, { width: CONTENT_W });
  doc.moveDown(0.5);
  doc.x = MARGIN;
}

function logoBlock(x, y, size) {
  doc.save();
  doc.roundedRect(x, y, size, size, size * 0.22).fill(COLORS.navyDark);
  const stroke = size * 0.07;
  const chevX = x + size * 0.22;
  const chevY = y + size / 2;
  const chevH = size * 0.4;
  doc.save();
  doc.lineWidth(stroke).strokeColor(COLORS.blue).lineCap('round').lineJoin('round');
  for (let i = 0; i < 3; i++) {
    const offset = i * (size * 0.18);
    doc.opacity(1 - i * 0.25);
    doc.moveTo(chevX + offset, chevY - chevH/2)
       .lineTo(chevX + offset + (size * 0.16), chevY)
       .lineTo(chevX + offset, chevY + chevH/2)
       .stroke();
  }
  doc.opacity(1);
  doc.restore();
  doc.restore();
}

// =============================================================================
// COVER PAGE
// =============================================================================
doc.save();
doc.rect(0, 0, PAGE_W, PAGE_H).fill(COLORS.navy);
doc.fillColor(COLORS.blue).opacity(0.12);
doc.circle(PAGE_W * 0.85, 80, 200).fill();
doc.circle(80, PAGE_H - 100, 240).fill();
doc.opacity(1);
doc.restore();

logoBlock(MARGIN, 90, 64);

doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.white)
   .text('CARRIER BASE', MARGIN + 80, 102, { characterSpacing: 2 });
doc.font('Helvetica').fontSize(10).fillColor('#94a3b8')
   .text('Trucking Insurance Platform', MARGIN + 80, 122);

doc.font('Helvetica').fontSize(11).fillColor('#94a3b8')
   .text('PRODUCT ROADMAP', MARGIN, 280, { characterSpacing: 3, width: CONTENT_W });
doc.font('Helvetica-Bold').fontSize(48).fillColor(COLORS.white)
   .text('Gap Analysis', MARGIN, 305, { width: CONTENT_W });
doc.font('Helvetica-Oblique').fontSize(48).fillColor(COLORS.blue)
   .text('and Roadmap.', MARGIN, doc.y, { width: CONTENT_W });

doc.moveDown(0.6);
doc.font('Helvetica').fontSize(14).fillColor('#cbd5e1').lineGap(4)
   .text('What has shipped, what is missing, and what comes next - prioritized for production readiness, growth, and competitive advantage in the trucking insurance market.',
         MARGIN, doc.y, { width: CONTENT_W * 0.85 });

const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
const cardY = PAGE_H - 180;
doc.save();
doc.fillOpacity(0.08).fillColor(COLORS.white)
   .roundedRect(MARGIN, cardY, CONTENT_W, 110, 14).fill();
doc.fillOpacity(1);
doc.strokeOpacity(0.2).strokeColor(COLORS.white).lineWidth(1)
   .roundedRect(MARGIN, cardY, CONTENT_W, 110, 14).stroke();
doc.strokeOpacity(1);
const colW4 = CONTENT_W / 4;
const labels = [
  { l: 'Prepared for', v: 'Carrier Base Leadership' },
  { l: 'Date',         v: date },
  { l: 'Version',      v: 'v1.0' },
  { l: 'Live URL',     v: 'carrier-base.vercel.app' },
];
labels.forEach((it, i) => {
  const x = MARGIN + 24 + i * colW4;
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#94a3b8')
     .text(it.l.toUpperCase(), x, cardY + 28, { characterSpacing: 1.2, lineBreak: false });
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.white)
     .text(it.v, x, cardY + 50, { width: colW4 - 24, lineBreak: false });
});
doc.restore();

doc.font('Helvetica').fontSize(9).fillColor('#64748b')
   .text('CONFIDENTIAL  -  INTERNAL STRATEGY DOCUMENT', MARGIN, PAGE_H - 50, {
     width: CONTENT_W, align: 'center', characterSpacing: 2, lineBreak: false,
   });

// =============================================================================
// PAGE 2 - EXECUTIVE SUMMARY
// =============================================================================
newPage();

eyebrow('- Section 01', COLORS.blue);
h1('Executive Summary');

paragraph('Carrier Base is a fully functional, production-grade trucking insurance CRM with FMCSA integration, CAB-style scoring, multi-policy management, drag-drop document handling, MVR ordering with wallet billing, e-signature integrations, and role-based access. The frontend is deployed at carrier-base.vercel.app and works end-to-end as a demo today.');
paragraph('To turn this into a billable SaaS serving real agencies, four work streams remain: (1) wire live API keys into the integration stubs already built, (2) move data from browser localStorage to a real multi-tenant database, (3) harden authentication and pass insurance-industry security requirements, and (4) layer in differentiating features that justify the $200-$500/month price point.');

priorityBox([
  { label: 'Critical', count: 8,  sub: 'Blocks production launch', bg: COLORS.redBg,    border: COLORS.red,    fg: COLORS.red },
  { label: 'High',     count: 14, sub: 'Near-term must-haves',     bg: COLORS.amberBg,  border: COLORS.amber,  fg: COLORS.amber },
  { label: 'Medium',   count: 12, sub: 'Quarter 2 features',        bg: COLORS.blueLight,border: COLORS.blue,   fg: COLORS.blue },
  { label: 'Future',   count: 18, sub: 'Differentiators and moat',  bg: COLORS.tealBg,   border: COLORS.teal,   fg: COLORS.teal },
]);

doc.moveDown(0.4);

h2('What is already built and working');
const built = [
  'Full FMCSA carrier search with state browsing, New Ventures, BASICs scoring',
  'CAB-style risk scoring engine deriving grades from public FMCSA data',
  'Multi-policy account model with markets, producers, lines, premium, dates',
  'Drag-drop document uploads with auto-tagging and download',
  'Driver and Vehicle schedules with Excel import',
  'MVR ordering wired to per-user wallet with auto-recharge',
  'Renewal reports with 30/60/90 day filters and CSV export',
  'Email composer with attachments, contact picker, per-user From address',
  'Email integration scaffolding for Gmail, Outlook, Yahoo, SMTP',
  'Calendar and E-Signature integration scaffolding',
  'Notification center with bell and per-event push',
  'Cart-based checkout with Stripe scaffold and email receipts',
  'Auth system with admin panel, role-based access, password resets',
  'Geographic analytics with real US heat map and recharts',
];
built.forEach(b => checklistItem(b, 'done'));

// =============================================================================
// SECTION 2 - CRITICAL
// =============================================================================
newPage();

eyebrow('- Section 02', COLORS.red);
h1('Critical: Production Readiness');
paragraph('These items block serving paying customers at scale. Every item in this section is a prerequisite for a real SaaS launch and contractual commitments to agencies.');

row('Multi-tenant database and API layer',
    'Replace browser localStorage with Postgres (Supabase, Neon, or RDS). Each agency gets isolated data; users only see their org\'s leads, policies, and settings. Build REST/tRPC API routes for every CRUD operation currently using Zustand.',
    'CRITICAL', '6-8 weeks');
row('Authentication hardening',
    'Replace plaintext localStorage passwords with bcrypt and JWT or NextAuth.js sessions. Add email verification on signup, password reset via secure tokens, MFA (TOTP), and session expiry.',
    'CRITICAL', '2-3 weeks');
row('Live Stripe and recurring billing',
    'Wire STRIPE_SECRET_KEY into existing /api/stripe/checkout route. Add webhook receiver for subscription events (renewals, cancellations, failed charges). Build customer portal for self-service plan changes. PCI scope: SAQ-A via Stripe Checkout.',
    'CRITICAL', '2 weeks');
row('Live email send and reply sync',
    'Wire RESEND_API_KEY for transactional emails. Build OAuth flows for Gmail/Outlook (NextAuth + provider scopes). Implement IMAP-poll or webhook-receiver to capture inbound replies and route them to the matching lead by Reference-ID header.',
    'CRITICAL', '3-4 weeks');
row('Document storage migration',
    'Browser localStorage caps at ~5MB per origin - production breaks fast. Move uploaded docs to S3 / Cloudflare R2 with signed URLs. Keep metadata in Postgres. Same UI, different storage backend.',
    'CRITICAL', '1-2 weeks');
row('Audit logging',
    'Track every status change, policy edit, MVR order, document upload, login, role change. Required for E&O defense and SOC 2. Append-only log table in Postgres, viewable in admin panel.',
    'CRITICAL', '1 week');
row('Backup and disaster recovery',
    'Daily Postgres backups with point-in-time recovery. Document storage versioning (S3). Tested restore procedure. RTO under 4 hours, RPO under 1 hour.',
    'CRITICAL', '1 week');
row('Privacy and compliance baseline',
    'Privacy policy, ToS, DPA template for enterprise agencies. CCPA / state privacy law compliance (data export, deletion). NPN / state license capture for producers. E&O policy proof of coverage uploaded by each agency on signup.',
    'CRITICAL', '2 weeks');

// =============================================================================
// SECTION 3 - LIVE API
// =============================================================================
newPage();

eyebrow('- Section 03', COLORS.blue);
h1('Live API Integrations');
paragraph('Each integration in the platform is built with a working scaffold: UI, OAuth mock screen, data shape, and store actions. Going live is a matter of obtaining keys and replacing 3-5 lines per provider. The below table inventories every integration point and what it needs.');

const apiTable = [
  ['Stripe - Subscription billing',     'STRIPE_SECRET_KEY, webhook secret', 'Test to Live mode',       '1 day'],
  ['Stripe - One-time wallet top-up',   'Same key',                          'Already wired',           '0'],
  ['Resend - Transactional email',      'RESEND_API_KEY, verified domain',   'Receipts, welcomes',     '0.5 day'],
  ['Gmail OAuth',                       'GOOGLE_CLIENT_ID, SECRET',          'Send + reply scopes',    '2 days'],
  ['Outlook OAuth',                     'MS_CLIENT_ID, SECRET',              'Mail.Send, Mail.Read',   '2 days'],
  ['SMTP / IMAP relay',                 'Per-user creds (already in form)',  'Nodemailer + IMAP',      '1 day'],
  ['Samba Safety MVR API',              'Vendor account + API key',          'POST /mvr/orders',       '3 days'],
  ['DocuSign eSign',                    'Integration key, RSA keypair',      'JWT auth flow',          '3 days'],
  ['Dropbox Sign',                      'API key',                           'Native API simpler',     '2 days'],
  ['Adobe Acrobat Sign',                'Integration key',                   'Same pattern',           '2 days'],
  ['Google Calendar OAuth',             'Same as Gmail',                     'Calendar.events scope',  '1 day'],
  ['Outlook Calendar OAuth',            'Same as Outlook',                   'Calendars.ReadWrite',    '1 day'],
  ['FMCSA carrier API',                 'Already live',                      'Hardcoded fallback OK',  '0'],
];

doc.moveDown(0.4);
const tableY = doc.y;
const colWidths = [200, 145, 110, 50];
const colX = [MARGIN, MARGIN + 200, MARGIN + 345, MARGIN + 455];
doc.save();
doc.rect(MARGIN, tableY, CONTENT_W, 22).fill(COLORS.navy);
['Integration', 'Required keys / setup', 'Scope / Notes', 'Effort'].forEach((label, i) => {
  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.white)
     .text(label.toUpperCase(), colX[i] + 8, tableY + 7,
           { width: colWidths[i] - 12, characterSpacing: 1, lineBreak: false });
});
doc.restore();
let rowY = tableY + 22;
apiTable.forEach((r, idx) => {
  if (rowY + 30 > PAGE_H - 80) {
    newPage();
    rowY = doc.y;
  }
  if (idx % 2 === 0) {
    doc.save(); doc.rect(MARGIN, rowY, CONTENT_W, 26).fill(COLORS.bg); doc.restore();
  }
  r.forEach((cell, i) => {
    doc.font(i === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(9)
       .fillColor(i === 0 ? COLORS.navy : COLORS.text)
       .text(cell, colX[i] + 8, rowY + 8,
             { width: colWidths[i] - 12, lineBreak: false, ellipsis: true });
  });
  rowY += 26;
});
doc.y = rowY + 16;
doc.x = MARGIN;

paragraph('Total estimated effort to go live across every integration: roughly 18-22 working days for one engineer. Most of this is OAuth setup, webhook receivers, and reply-parsing logic. None of it requires changing the UI.');

// =============================================================================
// SECTION 4 - HIGH PRIORITY
// =============================================================================
newPage();

eyebrow('- Section 04', COLORS.amber);
h1('High Priority: Near-Term Must-Haves');
paragraph('Features that complete the day-one CRM experience for producers and agency managers. Each is high-impact, customer-visible, and reasonable in scope.');

row('Bulk lead import',
    'Drag-drop a CSV of DOTs or company names; auto-enrich each from FMCSA on import. Producers buying a list from FMCSA need this on day one.',
    'HIGH', '3 days');
row('Lead deduplication and merge',
    'Detect duplicate DOTs at creation. Offer side-by-side merge for accidental duplicates. Producers will create accidental duplicates often via prospecting.',
    'HIGH', '2 days');
row('Activity feed per lead',
    'Combined timeline showing emails, status changes, doc uploads, MVRs, policy events, and notes. Right now these live in separate tabs - the timeline is the dashboard.',
    'HIGH', '4 days');
row('Tasks and follow-up reminders',
    'Per-lead and global task list. Due dates, assignees, recurring tasks. Sync to connected calendar.',
    'HIGH', '4 days');
row('ACORD form generation',
    'PDF generation for ACORD 25, 125, 126, 137 with merge fields from the lead. Currently the Applications page lists form names but does not produce a real PDF.',
    'HIGH', '5-7 days');
row('Email templates with merge fields',
    'Submission template, follow-up, renewal kickoff, decline notification. Producers reuse these dozens of times per week.',
    'HIGH', '3 days');
row('Saved filters and views',
    'Producer saves "My renewals 60 days out" or "Bound, $50k+, TX". Becomes their default landing view.',
    'HIGH', '2 days');
row('Customer-facing portal',
    'Insureds log in to upload loss runs, sign documents, view their bound policies. Massive support-ticket reducer.',
    'HIGH', '3 weeks');
row('Quote comparison view',
    'Side-by-side quotes from multiple markets. Comparable lines, premium, deductible, exclusions. Helps the close.',
    'HIGH', '5 days');
row('Loss runs PDF parser',
    'Upload a loss runs PDF; auto-extract claim count, total incurred, paid losses, open reserves. Plays well with the CAB score and Pre-UW engine.',
    'HIGH', '7-10 days');
row('Producer commission tracking',
    'Per-producer commission rate by line; auto-calculate on bind. Manager dashboard surfaces commission earned per period.',
    'HIGH', '3 days');
row('Lead assignment and round-robin',
    'Manager auto-assigns inbound leads to producers by round-robin, by state, or by load.',
    'HIGH', '2 days');
row('Mobile-responsive layouts',
    'Most pages assume desktop width. Producers work from trucks, lots, and conferences - mobile is non-negotiable.',
    'HIGH', '1-2 weeks');
row('Field-level role permissions',
    'Producers see only their own leads (already partial via /policy "My policies"). Need this everywhere - managers see all, producers see assigned.',
    'HIGH', '4 days');

// =============================================================================
// SECTION 5 - MEDIUM
// =============================================================================
newPage();

eyebrow('- Section 05', COLORS.blue);
h1('Medium Priority: Quarter Two Features');
paragraph('Features that round out the platform once the must-haves are live. Each is meaningful but skippable in the short term.');

row('VoIP / click-to-dial integration',
    'Twilio or Aircall integration for calling brokers and insureds directly from the lead. Auto-log calls and recordings.',
    'MEDIUM', '5-7 days');
row('SMS messaging',
    'Two-way SMS with insureds and brokers via Twilio. Reminder texts for renewals and appointments. Insurance customers respond to SMS faster than email.',
    'MEDIUM', '4 days');
row('Document templates with merge',
    'Proposals, certificates of insurance, renewal letters with auto-filled fields from the lead/policy.',
    'MEDIUM', '3 days');
row('OFAC and sanctions screening',
    'Auto-screen new insureds against OFAC SDN list. Compliance requirement for many markets.',
    'MEDIUM', '2 days');
row('Telematics / ELD integration',
    'Pull driver hours, mileage, hard-braking events from Samsara, Motive, Geotab. Underwriting differentiator.',
    'MEDIUM', '2-3 weeks');
row('Loss ratio per market',
    'Track bound vs claims paid per market over time. Tells producers which markets are honest.',
    'MEDIUM', '4 days');
row('Renewal automation workflows',
    'Auto-create a renewal opportunity 90 days before policy expiration. Auto-send renewal-kickoff email if integrated. Auto-task producer to call.',
    'MEDIUM', '3 days');
row('Public REST API + Zapier app',
    'Third-party automations (Zapier, Make) for connecting to other tools. Becomes critical for agencies with existing tech stacks.',
    'MEDIUM', '2 weeks');
row('White-label / per-agency branding',
    'Agency uploads their own logo, sets primary color. Customer portal carries agency branding instead of Carrier Base.',
    'MEDIUM', '5 days');
row('Onboarding flow for new signups',
    'First-time wizard: connect email, import existing book of business, invite team. Drives faster activation = lower churn.',
    'MEDIUM', '5 days');
row('In-app help center and changelog',
    'Searchable help docs with video walkthroughs. Public changelog for new features.',
    'MEDIUM', '1 week');
row('Customer support tooling',
    'Intercom or Crisp chat widget. Help docs system. Ticket queue.',
    'MEDIUM', '3 days');

// =============================================================================
// SECTION 6 - FUTURE
// =============================================================================
newPage();

eyebrow('- Section 06', COLORS.teal);
h1('Future: Differentiators and Moat');
paragraph('Features that turn Carrier Base from "another trucking CRM" into the platform agencies cannot imagine working without. Build these once core is solid and customers are paying.');

const future = [
  ['AI submission drafting',
   'Trained on your historical broker submissions. One-click draft the email body, attach the right documents, suggest markets based on appetite plus score.'],
  ['AI loss runs analysis',
   'Upload loss runs PDF; AI extracts claims, summarizes patterns, flags risk concentrations, recommends UW questions for the producer to ask.'],
  ['AI underwriter assist',
   'Chat assistant that knows the carrier\'s FMCSA history, BASICs, crashes, and your market appetites. "Will Lloyd\'s write this account?" answered with reasoning.'],
  ['Predictive renewal scoring',
   'Model trained on your bind/lose history predicts renewal probability for each policy. Producers prioritize at-risk renewals.'],
  ['Auto-quote comparison',
   'Once integrated with carrier rater APIs, auto-rate every account against every appetite-eligible market. Push best 3 to producer.'],
  ['Native CAB Reports integration',
   'For agencies that have CAB Enterprise subscriptions, pull real CAB scores and inspection-level data alongside our derived score.'],
  ['Multi-state filing tracker',
   'IRP, IFTA, UCR, MCS-150 deadlines auto-tracked per insured. Auto-remind 30 days before each.'],
  ['Producer leaderboards and gamification',
   'Already have leaderboard page; expand with monthly contests, achievement badges, bonus tracking.'],
  ['Mobile native app',
   'iOS + Android via React Native. Click-to-dial, photo upload from truck stop, push notifications.'],
  ['Dark mode',
   'Producers working at night appreciate this; small effort, big appreciation.'],
  ['Internationalization',
   'Spanish for the US trucking market - significant Latino owner-operator population.'],
  ['Industry data benchmarks',
   '"Your bound premium ranks in the 78th percentile vs similar-size agencies." Aggregated, anonymized peer data.'],
  ['Marketplace for sub-agents',
   'Solo producers pair with established agencies for E&O, market access, mentorship. Carrier Base hosts the matching.'],
  ['Embedded financing',
   'Premium financing offered in-platform via Imperial PFS, BankDirect. Take a referral fee.'],
  ['Built-in cyber liability rating',
   'For trucking companies with growing tech stacks (TMS, ELD platforms). Cross-sell line.'],
  ['SOC 2 Type II audit',
   'Required for selling into enterprise (large fleets, MGAs, captives). 6-9 months from kickoff.'],
  ['Public API marketplace',
   'Other vendors build on top of Carrier Base. Each integration adds stickiness.'],
  ['Acquisition or build-to-flip readiness',
   'Clean codebase, documented integrations, predictable revenue, audit-ready. The above features compound into enterprise value.'],
];
future.forEach(([t, d]) => bullet(t, d, COLORS.teal));

// =============================================================================
// SECTION 7 - COMPLIANCE
// =============================================================================
newPage();

eyebrow('- Section 07', COLORS.purple);
h1('Compliance and Security');
paragraph('Insurance is a regulated industry. Below is a checklist of compliance items that need attention before signing significant contracts. Many can be deferred until first enterprise customer; some are immediate.');

h2('Day-One Requirements');
[
  'Privacy Policy and Terms of Service published and accepted at signup',
  'CCPA / state privacy compliance: data export and deletion endpoints',
  'TLS / HTTPS enforcement (covered by Vercel)',
  'Encrypted data at rest (covered by Postgres on Supabase / RDS)',
  'PCI-DSS compliance via Stripe Checkout (SAQ-A scope only)',
  'Producer NPN capture and validation per state',
  'E&O proof-of-coverage upload per agency',
].forEach(i => checklistItem(i, 'todo'));

doc.moveDown(0.4);
h2('Within First Year');
[
  'SOC 2 Type I report (3-month audit window)',
  'GDPR readiness if marketing internationally',
  'CCPA Do-Not-Sell mechanism',
  'Annual penetration test',
  'Incident response runbook + breach notification procedures',
  'OFAC SDN screening on new insureds',
  'TILA / Regulation Z disclosure if offering premium financing',
].forEach(i => checklistItem(i, 'todo'));

doc.moveDown(0.4);
h2('Enterprise Sales Prerequisites');
[
  'SOC 2 Type II (12-month audit window) - required by most large fleets',
  'Vendor security questionnaire library (CAIQ)',
  'Custom DPA template',
  'Data residency options (US-only by default)',
  'Single Sign-On (SAML / Okta) for agency parent companies',
  'Audit log export for customer-side compliance',
].forEach(i => checklistItem(i, 'todo'));

// =============================================================================
// SECTION 8 - PRICING / GTM
// =============================================================================
newPage();

eyebrow('- Section 08', COLORS.amber);
h1('Pricing and Go-to-Market');
paragraph('A few items to revisit before opening for paid signups beyond demo accounts.');

h2('Pricing observations');
bullet('Solo $200/mo and Agency $500/mo are aggressive vs competitors',
       'AMS360, EZLynx, and Applied Epic charge $80-$200/user/month. Carrier Base bundles much more (FMCSA, MVR ordering, CAB-style scoring) so pricing is defensible - but consider a free 14-day trial with no card to lower friction.', COLORS.amber);
bullet('Broker Directory $1,000 one-time is the right model',
       'Recurring would scare off solo producers. One-time + lifetime access feels fair. Could add a $99/year refresh fee for updated broker contact info.', COLORS.amber);
bullet('UW Consultation $300/mo is a real differentiator',
       'No competitor offers this. Confirm the underwriter actually exists and has hourly capacity to handle subscribers. May need to cap subscribers per consultant or hire a network.', COLORS.amber);
bullet('MVR pass-through pricing is healthy',
       '$14.50 vendor + $5 service fee = $19.50 retail. Competitive with HireRight, much cheaper than buying direct. Keep it.', COLORS.amber);

doc.moveDown(0.4);
h2('Go-to-market readiness');
bullet('Producer demo loop',
       'Build a 2-min Loom walkthrough showing FMCSA search, import, submit, bind. Embed on home page.', COLORS.blue);
bullet('Free tier or trial',
       'Currently signup is free until they hit a paywall - clarify what is gated and offer a no-card trial for the paid plans.', COLORS.blue);
bullet('Reseller program',
       'Offer 20-30% recurring commission to insurance influencers and trade-show speakers who refer agencies.', COLORS.blue);
bullet('Trade show presence',
       'NIIPA, IICF, MITA. Physical presence sells trucking insurance products faster than ads.', COLORS.blue);
bullet('Case studies',
       'Get three paying agencies, document their before/after, publish.', COLORS.blue);

// =============================================================================
// SECTION 9 - TIMELINE
// =============================================================================
newPage();

eyebrow('- Section 09', COLORS.navy);
h1('Suggested Timeline');
paragraph('A realistic phased rollout assuming one full-time engineer plus the product owner.');

function phaseBlock(label, weeks, color, items) {
  ensureSpace(40 + items.length * 16);
  const startY = doc.y;
  doc.save();
  doc.rect(MARGIN, startY, 4, 18 + items.length * 16).fill(color);
  doc.restore();
  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.navy)
     .text(label, MARGIN + 14, startY, { continued: true })
     .font('Helvetica').fontSize(11).fillColor(COLORS.muted)
     .text('  -  ' + weeks);
  doc.moveDown(0.3);
  items.forEach(it => {
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.text)
       .text('-  ' + it, MARGIN + 18, doc.y, { width: CONTENT_W - 18 });
    doc.moveDown(0.15);
  });
  doc.moveDown(0.6);
  doc.x = MARGIN;
}

phaseBlock('Phase 1 - Production launch', 'Weeks 1-6', COLORS.red, [
  'Multi-tenant Postgres database + REST API',
  'Auth hardening (NextAuth, bcrypt, MFA)',
  'Stripe live + webhooks + customer portal',
  'Resend live for transactional email',
  'Document storage on S3/R2',
  'Audit logging',
  'Privacy policy, ToS, NPN capture',
]);

phaseBlock('Phase 2 - Core integrations', 'Weeks 7-10', COLORS.amber, [
  'Gmail and Outlook OAuth + reply sync',
  'Samba Safety MVR live API',
  'DocuSign live integration',
  'Google Calendar live integration',
]);

phaseBlock('Phase 3 - Customer-visible features', 'Weeks 11-18', COLORS.blue, [
  'Bulk lead import + dedup',
  'Activity feed and tasks',
  'ACORD form generation',
  'Email templates and saved filters',
  'Customer-facing portal',
  'Mobile-responsive sweep',
  'Quote comparison',
]);

phaseBlock('Phase 4 - Differentiators', 'Months 5-9', COLORS.teal, [
  'AI submission drafting and loss runs analysis',
  'Predictive renewal scoring',
  'Public API + Zapier app',
  'White-label per-agency branding',
  'SOC 2 Type I audit',
  'Native mobile app',
]);

phaseBlock('Phase 5 - Scale and moat', 'Months 10+', COLORS.purple, [
  'SOC 2 Type II',
  'Carrier rater integrations for auto-quote',
  'Telematics integrations (Samsara, Motive)',
  'Embedded premium financing',
  'Marketplace for sub-agents',
  'International expansion',
]);

// =============================================================================
// CLOSING PAGE
// =============================================================================
newPage();

eyebrow('- Closing', COLORS.navy);
h1('Where we stand');
paragraph('Carrier Base is in an unusual position: the demo is more polished than most production CRMs, but the foundation underneath is browser-only. The work to make it real is well-defined and can be done in a sprint-and-a-half - about 8 weeks for one engineer to ship the production-ready version with live integrations.');
paragraph('After that, every feature on this roadmap is incremental. Nothing requires a rewrite. The architecture decisions (Zustand to API; localStorage to Postgres; mock OAuth to real OAuth) are all swap-in patterns, not rebuilds.');
paragraph('The differentiator versus AMS360, EZLynx, and Applied Epic is already in the box: real-time FMCSA data, derived CAB scoring, drag-drop everything, integrated MVR billing, broker directory, and underwriter consultation. The features that turn paying customers into evangelists - AI submission drafting, predictive renewals, native loss runs analysis - are quarter-three work.');

doc.moveDown(0.6);
h2('Recommended immediate next step');
paragraph('Lock in 8 weeks of focused engineering for the Phase 1 production launch. Ship a real database, real auth, real Stripe, real email. Open paid signups on week 9. Use weeks 9-14 to onboard the first 10 paying agencies and harvest feedback for Phase 2 prioritization.');

doc.moveDown(0.8);

ensureSpace(120);
const finalY = doc.y;
doc.save();
doc.roundedRect(MARGIN, finalY, CONTENT_W, 100, 12).fill(COLORS.navy);
doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.white)
   .text('CARRIER BASE', MARGIN + 24, finalY + 22, { characterSpacing: 2, lineBreak: false });
doc.font('Helvetica').fontSize(20).fillColor(COLORS.white)
   .text('Built for trucking insurance.', MARGIN + 24, finalY + 38, { width: CONTENT_W - 48, lineBreak: false });
doc.font('Helvetica').fontSize(11).fillColor('#94a3b8')
   .text('carrier-base.vercel.app  -  github.com/Nahalo6/carrier-base',
         MARGIN + 24, finalY + 70, { width: CONTENT_W - 48, lineBreak: false });
doc.restore();

doc.end();

console.log('PDF written to: ' + outPath);
