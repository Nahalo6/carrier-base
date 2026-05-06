import { NextRequest, NextResponse } from 'next/server';

const KEY = process.env.FMCSA_API_KEY ?? '8e86ac61eae6a072c83b3089897612edbea80095';
const BASE = 'https://mobile.fmcsa.dot.gov/qc/services';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ dot: string }> }
) {
  const { dot } = await params;
  try {
    const [carrierRes, cargoRes] = await Promise.allSettled([
      fetch(`${BASE}/carriers/${dot}?webKey=${KEY}`, { headers: { Accept: 'application/json' }, next: { revalidate: 3600 } }),
      fetch(`${BASE}/carriers/${dot}/cargo-carried?webKey=${KEY}`, { headers: { Accept: 'application/json' }, next: { revalidate: 3600 } }),
    ]);

    const carrier = carrierRes.status === 'fulfilled' && carrierRes.value.ok
      ? await carrierRes.value.json() : null;
    const cargo = cargoRes.status === 'fulfilled' && cargoRes.value.ok
      ? await cargoRes.value.json() : null;

    if (!carrier) {
      return NextResponse.json({ error: 'Carrier not found' }, { status: 404 });
    }

    return NextResponse.json({ carrier, cargo });
  } catch {
    return NextResponse.json({ error: 'FMCSA fetch failed' }, { status: 500 });
  }
}
