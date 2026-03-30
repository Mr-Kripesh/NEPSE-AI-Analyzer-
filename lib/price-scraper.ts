/**
 * lib/price-scraper.ts
 *
 * Per-stock LTP scraper with 24h cache.
 * Mirrors the scraping logic in api/analyze/route.ts so that
 * oracle-prices and other routes get real prices even when the
 * bulk NEPSE market API is unavailable (e.g. market closed).
 *
 * Sources (tried in parallel):
 *  1. MeroLagani company detail page
 *  2. NepseAlpha scoreboard widget
 */

import { load } from 'cheerio'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'

// ── 24h per-symbol cache ──────────────────────────────────────────────────────
interface PriceEntry { ltp: number; change: number; fetchedAt: number }
const priceCache = new Map<string, PriceEntry>()
const PRICE_TTL  = 24 * 60 * 60 * 1000

// ── HTML → key/value map (same logic as analyze route) ───────────────────────
function buildKV(html: string): Record<string, string> {
  const $ = load(html)
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const kv: Record<string, string> = {}
  const add = (label: string, value: string) => {
    const k = norm(label); const v = value.trim()
    if (k.length >= 2 && v) kv[k] = v
  }
  $('table tr').each((_, tr) => {
    const cells = $(tr).find('td, th')
    for (let i = 0; i + 1 < cells.length; i += 2)
      add($(cells[i]).text(), $(cells[i + 1]).text())
  })
  $('dt').each((_, dt) => add($(dt).text(), $(dt).next('dd').text()))
  $('div, li, span').each((_, el) => {
    const kids = $(el).children()
    if (kids.length === 2) {
      const label = kids.first().text().trim()
      const value = kids.last().text().trim()
      if (norm(label).length >= 2 && norm(label).length <= 60 && value.length >= 1 && value.length <= 80)
        add(label, value)
    }
  })
  return kv
}

function cleanNum(v: string): number {
  const normalized = String(v ?? '')
    .replace(/[−–—]/g, '-')
    .replace(/\(([^)]+)\)/g, '-$1')
    .replace(/,/g, '')
    .trim()
  const match = normalized.match(/-?\d*\.?\d+/)
  return match ? parseFloat(match[0]) : NaN
}

function ltpFromKV(kv: Record<string, string>): number {
  const get = (...keys: string[]): string => {
    for (const k of keys)
      for (const [label, value] of Object.entries(kv))
        if (label === k || label.startsWith(k)) return value
    return ''
  }
  const raw = get('marketprice', 'ltp', 'lasttradedprice', 'currentprice', 'closeprice', 'lasttraded')
  const num = cleanNum(raw)
  return !isNaN(num) && num > 0 ? num : 0
}

// ── Source 1: MeroLagani ──────────────────────────────────────────────────────
async function scrapeMeroLagani(symbol: string): Promise<{ ltp: number; change: number } | null> {
  try {
    const res = await fetch(
      `https://merolagani.com/CompanyDetail.aspx?symbol=${symbol}`,
      {
        headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml', 'Referer': 'https://merolagani.com/' },
        signal: AbortSignal.timeout(12000),
      }
    )
    if (!res.ok) return null
    const kv  = buildKV(await res.text())
    const ltp = ltpFromKV(kv)
    if (ltp <= 0) return null

    // Try to extract daily % change from the page
    const get = (...keys: string[]): string => {
      for (const k of keys)
        for (const [label, value] of Object.entries(kv))
          if (label === k || label.startsWith(k)) return value
      return ''
    }
    const changeRaw = get('changepercent', 'percentchange', 'pricechange', 'change')
    const change    = isFinite(cleanNum(changeRaw)) ? cleanNum(changeRaw) : 0
    return { ltp, change }
  } catch { return null }
}

// ── Source 2: NepseAlpha scoreboard widget ────────────────────────────────────
async function scrapeNepseAlpha(symbol: string): Promise<{ ltp: number; change: number } | null> {
  try {
    const res = await fetch('https://nepsealpha.com/widget/scoreboard', {
      headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml', 'Referer': 'https://nepsealpha.com/' },
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return null

    const text  = load(await res.text()).root().text()
    const lines = text.split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean)
    const row   = lines.find(l => new RegExp(`^${symbol}\\b`, 'i').test(l))
    if (!row) return null

    const tokens = row.split(/\s+/)
    if (tokens.length < 7) return null

    const ltp = cleanNum(tokens[tokens.length - 1] ?? '')
    if (isNaN(ltp) || ltp <= 0) return null
    return { ltp, change: 0 }
  } catch { return null }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the live LTP + daily change % for a symbol.
 * Tries MeroLagani and NepseAlpha in parallel; caches result for 24h.
 * Returns null only if both scrapers fail.
 */
export async function getLivePrice(symbol: string): Promise<{ ltp: number; change: number } | null> {
  const cached = priceCache.get(symbol)
  if (cached && Date.now() - cached.fetchedAt < PRICE_TTL) {
    return { ltp: cached.ltp, change: cached.change }
  }

  const [ml, na] = await Promise.all([
    scrapeMeroLagani(symbol),
    scrapeNepseAlpha(symbol),
  ])

  // Prefer MeroLagani (has change); fall back to NepseAlpha
  const result = ml ?? na
  if (result && result.ltp > 0) {
    priceCache.set(symbol, { ...result, fetchedAt: Date.now() })
    return result
  }
  return null
}

/**
 * Fetch live prices for multiple symbols in parallel.
 * Returns a map of symbol → {ltp, change}; missing symbols are omitted.
 */
export async function getLivePrices(symbols: string[]): Promise<Map<string, { ltp: number; change: number }>> {
  const entries = await Promise.all(
    symbols.map(async sym => {
      const p = await getLivePrice(sym)
      return p ? ([sym, p] as const) : null
    })
  )
  return new Map(entries.filter(Boolean) as [string, { ltp: number; change: number }][])
}
