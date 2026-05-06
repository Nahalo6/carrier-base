import { NextRequest, NextResponse } from 'next/server';

const KEY = process.env.FMCSA_API_KEY ?? '8e86ac61eae6a072c83b3089897612edbea80095';
const BASE = 'https://mobile.fmcsa.dot.gov/qc/services';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const name = searchParams.get('name') ?? '';
  const start = searchParams.get('start') ?? '1';
  const size = searchParams.get('size') ?? '100';

  if (!name.trim()) {
    return NextResponse.json({ error: 'name param required' }, { status: 400 });
  }

  try {
    const encoded = encodeURIComponent(name.trim());
    const res = await fetch(
      `${BASE}/carriers/name/${encoded}?start=${start}&size=${size}&webKey=${KEY}`,
      { headers: { Accept: 'application/json' }, next: { revalidate: 600 } }
    );
    if (!res.ok) return NextResponse.json({ error: 'Search failed', status: res.status }, { status: res.status });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'FMCSA search failed' }, { status: 500 });
  }
}
