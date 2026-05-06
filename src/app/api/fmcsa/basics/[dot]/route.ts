import { NextRequest, NextResponse } from 'next/server';

const KEY = process.env.FMCSA_API_KEY ?? '8e86ac61eae6a072c83b3089897612edbea80095';
const BASE = 'https://mobile.fmcsa.dot.gov/qc/services';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ dot: string }> }
) {
  const { dot } = await params;
  try {
    const res = await fetch(`${BASE}/carriers/${dot}/basics?webKey=${KEY}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return NextResponse.json({ error: 'No BASIC data', status: res.status }, { status: res.status });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'FMCSA basics fetch failed' }, { status: 500 });
  }
}
