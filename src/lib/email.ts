// Client-side helper to send emails through our /api/email/send route
import type { CatalogItem } from './catalog';
import { computeTotals } from './catalog';

export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<{ ok: boolean; messageId?: string; mocked?: boolean }> {
  try {
    const res = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts),
    });
    const data = await res.json();
    return { ok: !!data.ok, messageId: data.messageId, mocked: data.mocked };
  } catch {
    return { ok: false };
  }
}

// Receipt template
export function buildReceiptEmail({
  toName, toEmail, items, confirmationNumber, paymentMethod,
}: {
  toName: string;
  toEmail: string;
  items: CatalogItem[];
  confirmationNumber: string;
  paymentMethod: string;
}) {
  const totals = computeTotals(items);
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const itemRows = items.map(i => `
    <tr>
      <td style="padding:12px 0; border-bottom:1px solid #e2e8f0;">
        <div style="font-weight:600; color:#1b2a4a;">${i.name}</div>
        <div style="font-size:12px; color:#64748b;">${i.description}</div>
      </td>
      <td style="padding:12px 0; border-bottom:1px solid #e2e8f0; text-align:right; font-weight:600; color:#1b2a4a; white-space:nowrap;">
        $${i.price.toLocaleString()}${i.billing === 'monthly' ? '/mo' : ''}
      </td>
    </tr>`).join('');

  const html = `
<!DOCTYPE html><html><body style="margin:0; padding:0; background:#f1f5f9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px; margin:30px auto; background:#fff; border-radius:14px; overflow:hidden; box-shadow:0 8px 24px rgba(15,23,42,0.08);">
    <div style="background:#1b2a4a; padding:32px 40px; color:#fff;">
      <div style="font-size:14px; font-weight:600; opacity:0.7; letter-spacing:0.06em; text-transform:uppercase;">Carrier Base</div>
      <div style="font-size:24px; font-weight:700; margin-top:6px;">Payment received — thank you</div>
    </div>
    <div style="padding:32px 40px;">
      <p style="margin:0 0 16px; color:#1b2a4a; font-size:15px;">Hi ${toName},</p>
      <p style="margin:0 0 24px; color:#475569; font-size:14px; line-height:1.6;">
        Thanks for your purchase! Here&rsquo;s your receipt. You can now create your account to access everything you bought.
      </p>

      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:18px; margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; font-size:12px; color:#64748b; margin-bottom:4px;">
          <span>Confirmation</span><span>${date}</span>
        </div>
        <div style="font-size:16px; font-weight:700; color:#1b2a4a; font-family:monospace;">${confirmationNumber}</div>
      </div>

      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr><th style="text-align:left; padding:8px 0; color:#64748b; font-size:11px; text-transform:uppercase; border-bottom:2px solid #e2e8f0;">Item</th>
              <th style="text-align:right; padding:8px 0; color:#64748b; font-size:11px; text-transform:uppercase; border-bottom:2px solid #e2e8f0;">Price</th></tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <div style="margin-top:20px; padding:18px; background:#f8fafc; border-radius:10px;">
        ${totals.oneTimeTotal > 0 ? `<div style="display:flex; justify-content:space-between; padding:6px 0; color:#475569; font-size:13px;"><span>One-time fees</span><span>$${totals.oneTimeTotal.toLocaleString()}</span></div>` : ''}
        ${totals.monthlyTotal > 0 ? `<div style="display:flex; justify-content:space-between; padding:6px 0; color:#475569; font-size:13px;"><span>Monthly subscription (first month)</span><span>$${totals.monthlyTotal.toLocaleString()}</span></div>` : ''}
        <div style="display:flex; justify-content:space-between; padding:10px 0 0; border-top:1px solid #e2e8f0; margin-top:6px; font-weight:700; color:#1b2a4a; font-size:16px;"><span>Total charged today</span><span>$${totals.totalDueToday.toLocaleString()}</span></div>
        ${totals.monthlyTotal > 0 ? `<div style="font-size:11px; color:#64748b; margin-top:8px;">Recurring: $${totals.monthlyTotal.toLocaleString()}/month, billed on the same day each month.</div>` : ''}
      </div>

      <div style="margin:28px 0 14px; padding:14px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px;">
        <div style="font-weight:700; color:#1e40af; font-size:13px; margin-bottom:4px;">Next step: create your account</div>
        <div style="font-size:12px; color:#475569; line-height:1.5;">
          We sent a sign-up link to this email so you can finish setting up access. Use the same email when signing up to link your purchase.
        </div>
      </div>

      <p style="font-size:12px; color:#64748b; margin:20px 0 0; line-height:1.6;">
        Charged via ${paymentMethod}. Questions? Reply to this email or contact <a href="mailto:billing@carrierbase.app" style="color:#2563eb;">billing@carrierbase.app</a>.
      </p>
    </div>
    <div style="padding:18px 40px; background:#f8fafc; color:#94a3b8; font-size:11px; text-align:center;">
      Carrier Base · Trucking insurance platform · This is a transactional email and cannot be unsubscribed from.
    </div>
  </div>
</body></html>`;

  return { subject: `Receipt — ${confirmationNumber}`, html, to: toEmail };
}

// Welcome email after signup completes
export function buildWelcomeEmail(toName: string, toEmail: string, tempPassword?: string) {
  const html = `
<!DOCTYPE html><html><body style="margin:0; padding:0; background:#f1f5f9; font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
  <div style="max-width:560px; margin:30px auto; background:#fff; border-radius:14px; overflow:hidden;">
    <div style="background:#1b2a4a; padding:28px 36px; color:#fff;">
      <div style="font-size:22px; font-weight:700;">Welcome to Carrier Base, ${toName}</div>
    </div>
    <div style="padding:28px 36px;">
      <p style="color:#475569; line-height:1.6;">Your account is ready. ${tempPassword ? 'Use the temporary password below to sign in — you&rsquo;ll be prompted to change it on first login.' : 'You can sign in with the email and password you set during checkout.'}</p>
      ${tempPassword ? `<div style="background:#1b2a4a; color:#fff; padding:16px; border-radius:10px; margin:16px 0;">
        <div style="font-size:11px; opacity:0.7; text-transform:uppercase;">Temporary Password</div>
        <div style="font-family:monospace; font-size:22px; font-weight:700; letter-spacing:0.05em;">${tempPassword}</div>
      </div>` : ''}
      <a href="https://carrier-base.vercel.app/login" style="display:inline-block; background:#2563eb; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600;">Sign in →</a>
    </div>
  </div>
</body></html>`;
  return { subject: 'Welcome to Carrier Base', html, to: toEmail };
}
