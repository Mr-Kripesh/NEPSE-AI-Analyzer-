import { NextRequest, NextResponse } from 'next/server'
import { getMarketPriceMap } from '../market-data/route'
import { readDB } from '@/lib/nepse-db'
import { getLivePrices, getCachedPrices } from '@/lib/price-scraper'

/**
 * GET /api/oracle-prices?symbols=NABIL,NTC,HIDCL,...
 *
 * Returns ltp + change for each requested symbol.
 * Priority:
 *  1. getMarketPriceMap() — bulk live NEPSE data (60s TTL)
 *  2. getLivePrices()     — per-stock scrape from MeroLagani/NepseAlpha (24h TTL)
 *     (same sources the Analyze page uses — ensures real prices even when market is closed)
 *  3. nepse-fundamentals.json — stale DB fallback
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('symbols') ?? ''
  const symbols = raw
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean)

  if (symbols.length === 0) {
    return NextResponse.json({ error: 'symbols param required' }, { status: 400 })
  }

  try {
    // Fast path: if all symbols are in the scraper cache, return immediately (no network)
    const cached = getCachedPrices(symbols)
    if (cached.size === symbols.length) {
      const prices: Record<string, { ltp: number; change: number }> = {}
      cached.forEach((p, sym) => { prices[sym] = p })
      return NextResponse.json({ prices, updatedAt: new Date().toISOString() })
    }

    // Slow path: run all sources in parallel — per-stock scrape + bulk API + DB
    const [scraped, priceMap, db] = await Promise.all([
      getLivePrices(symbols),   // MeroLagani / NepseAlpha — most accurate
      getMarketPriceMap(),      // bulk NEPSE feed — fast but sometimes stale/wrong
      readDB(),
    ])

    const prices: Record<string, { ltp: number; change: number }> = {}

    for (const sym of symbols) {
      // Priority 1: per-stock MeroLagani/NepseAlpha scrape (verified accurate)
      const s = scraped.get(sym)
      if (s && s.ltp > 0) {
        prices[sym] = s
        continue
      }

      // Priority 2: bulk live market data
      const live = priceMap.get(sym)
      if (live?.ltp) {
        const ltp    = parseFloat(live.ltp)
        const change = parseFloat(live.change)
        if (isFinite(ltp) && ltp > 0) {
          prices[sym] = { ltp, change: isFinite(change) ? change : 0 }
          continue
        }
      }

      // Priority 3: DB fallback
      const entry = db.stocks[sym]
      if (entry) {
        const ltp    = parseFloat(entry.ltp)
        const change = parseFloat(entry.change)
        if (isFinite(ltp) && ltp > 0) {
          prices[sym] = { ltp, change: isFinite(change) ? change : 0 }
        }
      }
    }

    return NextResponse.json({ prices, updatedAt: new Date().toISOString() })
  } catch (err) {
    console.error('[oracle-prices]', err)
    return NextResponse.json({ error: 'Service unavailable' }, { status: 500 })
  }
}
