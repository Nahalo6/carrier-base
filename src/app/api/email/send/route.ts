import { NextRequest, NextResponse } from 'next/server';

// Sends transactional email. Set RESEND_API_KEY in env to switch from dev-mock to live send.
// Resend was chosen for simplicity — swap with SendGrid/Postmark/SES by editing the fetch call.

const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM || 'Carrier Base <noreply@carrierbase.app>';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.to || !body?.subject || !body?.html) {
    return NextResponse.json({ error: 'to, subject, html required' }, { status: 400 });
  }

  // ── Dev mode: log + return success so the UI flow works ──
  if (!RESEND_KEY) {
    console.log('[email-mock] would send', { to: body.to, subject: body.subject });
    return NextResponse.json({
      ok: true,
      mocked: true,
      messageId: 'mock_' + Date.now(),
      note: 'No RESEND_API_KEY configured — email simulated. Set the env var to send real emails.',
    });
  }

  // ── Live send via Resend ──
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: body.to,
        subject: body.subject,
        html: body.html,
      }),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: 'Email send failed', details: data }, { status: res.status });
    return NextResponse.json({ ok: true, messageId: data.id });
  } catch (e) {
    return NextResponse.json({ error: 'Email service error' }, { status: 500 });
  }
}
