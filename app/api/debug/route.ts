// Development diagnostic endpoint — shows raw scraper output for any ticker.
// Usage: GET /api/debug?ticker=ADBL

import { NextRequest, NextResponse } from 'next/server';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';

async function probeHTML(url: string, referer: string) {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml', 'Referer': referer },
      signal: AbortSignal.timeout(10000),
    });
    const text = await r.text();
    return { status: r.status, ok: r.ok, length: text.length, preview: text.slice(0, 500) };
  } catch (e) { return { error: String(e) }; }
}

async function probeJSON(url: string, referer?: string) {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json', ...(referer ? { 'Referer': referer } : {}) },
      signal: AbortSignal.timeout(10000),
    });
    const text = await r.text();
    let data: unknown = text;
    try { data = JSON.parse(text); } catch { /* keep as text */ }
    return { status: r.status, ok: r.ok, data };
  } catch (e) { return { error: String(e) }; }
}

export async function GET(req: NextRequest) {
  try {
    const ticker = (req.nextUrl.searchParams.get('ticker') || 'ADBL').toUpperCase();

    const [
      merolaganiPage,
      shareHubPage,
      bulkAPI,
      perSymbolAPI,
    ] = await Promise.all([
      probeHTML(
        `https://merolagani.com/CompanyDetail.aspx?symbol=${ticker}`,
        'https://merolagani.com/'
      ),
      probeHTML(
        `https://sharehubnepal.com/company/${ticker}`,
        'https://sharehubnepal.com/'
      ),
      probeJSON('https://nepseapi.surajrimal.dev/v1/price/today'),
      probeJSON(`https://nepsetty.kokomo.workers.dev/api?symbol=${ticker}`),
    ]);

    return NextResponse.json({
      ticker,
      merolagani_page: merolaganiPage,
      sharehub_page: shareHubPage,
      bulk_api_today: bulkAPI,
      per_symbol_api: perSymbolAPI,
    });
  } catch (error: unknown) {
    console.error('[debug]', error);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
  }
}
