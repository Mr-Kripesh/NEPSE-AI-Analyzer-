import { NextRequest, NextResponse } from 'next/server'
import { getMarketPriceMap } from '../market-data/route'
import { readDB } from '@/lib/nepse-db'
import { getLivePrices } from '@/lib/price-scraper'

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
    const [priceMap, db] = await Promise.all([
      getMarketPriceMap(),
      readDB(),
    ])

    const prices: Record<string, { ltp: number; change: number }> = {}
    const missing: string[] = []

    for (const sym of symbols) {
      // Priority 1: bulk live market data
      const live = priceMap.get(sym)
      if (live?.ltp) {
        const ltp    = parseFloat(live.ltp)
        const change = parseFloat(live.change)
        if (isFinite(ltp) && ltp > 0) {
          prices[sym] = { ltp, change: isFinite(change) ? change : 0 }
          continue
        }
      }
      missing.push(sym)
    }

    // Priority 2: per-stock scrape (MeroLagani / NepseAlpha) — same as Analyze page
    if (missing.length > 0) {
      const scraped = await getLivePrices(missing)
      for (const sym of missing) {
        const s = scraped.get(sym)
        if (s && s.ltp > 0) {
          prices[sym] = s
        } else {
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
      }
    }

    return NextResponse.json({ prices, updatedAt: new Date().toISOString() })
  } catch (err) {
    console.error('[oracle-prices]', err)
    return NextResponse.json({ error: 'Service unavailable' }, { status: 500 })
  }
}
