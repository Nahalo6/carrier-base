import { NextRequest, NextResponse } from 'next/server';

// Creates a Stripe Checkout Session. Set STRIPE_SECRET_KEY in env to enable real charges.
// Without the key, returns a mocked checkout URL so the UI flow works end-to-end.

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;

interface CheckoutItem {
  id: string;
  name: string;
  price: number;             // dollars
  billing: 'one_time' | 'monthly';
  stripePriceId?: string;    // optional; if present we use it instead of inline price_data
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const items: CheckoutItem[] = body?.items || [];
  const successUrl: string = body?.successUrl || '/checkout/success';
  const cancelUrl: string = body?.cancelUrl || '/checkout';
  const customerEmail: string | undefined = body?.email;

  if (items.length === 0) {
    return NextResponse.json({ error: 'No items in cart' }, { status: 400 });
  }

  // ── Dev mock when no STRIPE_SECRET_KEY ──
  if (!STRIPE_KEY) {
    const sessionId = 'cs_mock_' + Date.now();
    return NextResponse.json({
      ok: true,
      mocked: true,
      sessionId,
      // Redirect straight to success page so the UI flow continues
      url: `${successUrl}?session_id=${sessionId}&mock=1`,
      note: 'No STRIPE_SECRET_KEY configured — payment simulated. Set the env var to charge real cards.',
    });
  }

  // ── Live Stripe Checkout ──
  try {
    const lineItems = items.map(it => {
      if (it.stripePriceId) {
        return {
          price: it.stripePriceId,
          quantity: 1,
        };
      }
      // Inline price_data fallback for products without a Price ID
      return {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(it.price * 100),
          product_data: { name: it.name },
          ...(it.billing === 'monthly' ? { recurring: { interval: 'month' } } : {}),
        },
      };
    });

    const isSubscription = items.some(i => i.billing === 'monthly');
    const formData = new URLSearchParams();
    formData.append('mode', isSubscription ? 'subscription' : 'payment');
    formData.append('success_url', `${successUrl}?session_id={CHECKOUT_SESSION_ID}`);
    formData.append('cancel_url', cancelUrl);
    if (customerEmail) formData.append('customer_email', customerEmail);
    lineItems.forEach((li, i) => {
      if ('price' in li && li.price) {
        formData.append(`line_items[${i}][price]`, li.price);
        formData.append(`line_items[${i}][quantity]`, '1');
      } else if ('price_data' in li && li.price_data) {
        formData.append(`line_items[${i}][quantity]`, '1');
        formData.append(`line_items[${i}][price_data][currency]`, 'usd');
        formData.append(`line_items[${i}][price_data][unit_amount]`, String(li.price_data.unit_amount));
        formData.append(`line_items[${i}][price_data][product_data][name]`, li.price_data.product_data.name);
        if ('recurring' in li.price_data && li.price_data.recurring) {
          formData.append(`line_items[${i}][price_data][recurring][interval]`, 'month');
        }
      }
    });

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: 'Stripe checkout failed', details: data }, { status: res.status });
    return NextResponse.json({ ok: true, sessionId: data.id, url: data.url });
  } catch {
    return NextResponse.json({ error: 'Stripe service error' }, { status: 500 });
  }
}
