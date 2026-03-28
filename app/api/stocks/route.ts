import { NextResponse } from 'next/server';
import { getMarketPriceMap } from '../market-data/route';
import { COMPANIES } from '@/lib/companies';

export async function GET() {
  try {
    const res = await fetch(
      'https://www.nepalstock.com/api/nots/security?nonDelisted=true&size=500',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Referer': 'https://www.nepalstock.com/',
        },
        next: { revalidate: 60 },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) throw new Error('NEPSE API failed');
    const json = await res.json();
    const list = json?.object || [];

    const stocks = list
      .filter((s: Record<string, unknown>) => s.symbol || s.stockSymbol)
      .map((s: Record<string, unknown>) => {
        const symbol = String(s.symbol ?? s.stockSymbol ?? '').toUpperCase().trim();
        const known = COMPANIES[symbol];
        return {
          symbol,
          name:   known?.name   || String(s.companyName ?? s.securityName ?? symbol),
          sector: known?.sector || String(s.sectorName  ?? s.businessSector ?? 'Others'),
        };
      })
      .filter((s: { symbol: string }) => s.symbol.length > 0)
      .sort((a: { symbol: string }, b: { symbol: string }) => a.symbol.localeCompare(b.symbol));

    // Merge live prices into stock list (best-effort)
    let priceMap = new Map<string, { ltp: string; change: string }>();
    try { priceMap = await getMarketPriceMap(); } catch { /* optional */ }

    const enriched = stocks.map((s: { symbol: string; name: string; sector: string }) => {
      const p = priceMap.get(s.symbol);
      return { ...s, ltp: p?.ltp ?? '', change: p?.change ?? '' };
    });

    return NextResponse.json({
      stocks: enriched,
      total: enriched.length,
      source: 'nepalstock.com + live prices',
      updatedAt: new Date().toISOString(),
    });

  } catch {
    // If NEPSE API fails, return the canonical list enriched with live prices
    let priceMap = new Map<string, { ltp: string; change: string }>();
    try { priceMap = await getMarketPriceMap(); } catch { /* optional */ }

    const fallback = Object.entries(COMPANIES).map(([symbol, info]) => {
      const p = priceMap.get(symbol);
      return { symbol, name: info.name, sector: info.sector, ltp: p?.ltp ?? '', change: p?.change ?? '' };
    }).sort((a, b) => a.symbol.localeCompare(b.symbol));

    return NextResponse.json({
      stocks: fallback,
      total: fallback.length,
      source: 'fallback-companies',
      error: 'Service unavailable',
    });
  }
}
