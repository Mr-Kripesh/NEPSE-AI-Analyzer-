import { load } from 'cheerio'
import { getCache, setCache } from '@/lib/cache'

export interface NewsItem {
  title: string
  summary: string
  date: string
  url: string
  image?: string
}

const CACHE_KEY = 'nepse-news'
const TTL_MS = 15 * 60 * 1000 // 15 minutes

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

// ── Source 1: JSON API ────────────────────────────────────────────────────────

async function tryJsonApi(): Promise<NewsItem[] | null> {
  try {
    const res = await fetch('https://www.sharesansar.com/api/latest-news', {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const ct = res.headers.get('content-type') ?? ''
    if (!ct.includes('application/json')) return null

    const data: unknown = await res.json()
    const raw = Array.isArray(data)
      ? data
      : ((data as Record<string, unknown>)?.data ??
         (data as Record<string, unknown>)?.news ??
         [])
    if (!Array.isArray(raw) || raw.length === 0) return null

    const items = (raw as Record<string, unknown>[])
      .map(item => ({
        title: String(item.title ?? item.heading ?? '').trim(),
        summary: String(item.summary ?? item.description ?? item.excerpt ?? '').trim().slice(0, 200),
        date: String(item.date ?? item.published_at ?? item.created_at ?? '').trim(),
        url: String(item.url ?? item.link ?? '').trim(),
      }))
      .filter(n => n.title.length > 0)

    return items.length > 0 ? items : null
  } catch {
    return null
  }
}

// ── Source 2: Cheerio scrape ──────────────────────────────────────────────────

async function scrapeWithCheerio(): Promise<NewsItem[]> {
  const res = await fetch('https://www.sharesansar.com/latest-news', {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    signal: AbortSignal.timeout(10000),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const html = await res.text()
  const $ = load(html)
  const items: NewsItem[] = []

  // Try structured article/card selectors first
  $([
    'article',
    '.news-content',
    '.featured-news-block',
    '.td_module_flex',
    '.td-module-container',
    '.td-block-row .td-post-title',
  ].join(', ')).each((_, el) => {
    const $el = $(el)
    const title = $el
      .find('h3 a, h2 a, h4 a, .td-module-title a, .entry-title a, .title a')
      .first().text().trim()
    const summary = $el
      .find('p, .td-excerpt, .entry-summary, .description')
      .first().text().trim()
    const date = $el
      .find('time, .td-post-date, .updated, .entry-date, .date')
      .first().text().trim()
    const url = $el.find('a').first().attr('href') ?? ''

    if (title.length > 5) {
      items.push({ title, summary: summary.slice(0, 200), date, url })
    }
  })

  // Broad fallback: any heading links on the page
  if (items.length === 0) {
    $('h3 a, h2 a, .title a').each((_, el) => {
      const title = $(el).text().trim()
      const url = $(el).attr('href') ?? ''
      if (title.length > 10) {
        items.push({ title, summary: '', date: '', url })
      }
    })
  }

  return items.slice(0, 20)
}

// ── og:image scraping ─────────────────────────────────────────────────────────

async function fetchOgImage(url: string): Promise<string | null> {
  if (!url) return null
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: AbortSignal.timeout(3000),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const html = await res.text()
    const $ = load(html)
    const og = $('meta[property="og:image"]').attr('content')
      ?? $('meta[name="twitter:image"]').attr('content')
      ?? null
    return og && og.startsWith('http') ? og : null
  } catch {
    return null
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getNews(): Promise<NewsItem[]> {
  const cached = getCache<NewsItem[]>(CACHE_KEY)
  if (cached) return cached

  // Try JSON API; on failure or empty result, fall back to scraping
  const fromApi = await tryJsonApi()
  const items = fromApi && fromApi.length > 0 ? fromApi : null

  let base: NewsItem[] = []
  if (items) {
    base = items
  } else {
    try {
      base = await scrapeWithCheerio()
    } catch {
      return []
    }
  }

  if (base.length === 0) return []

  // Fetch og:images in parallel (best-effort, 3s timeout each)
  const imageResults = await Promise.allSettled(base.map(i => fetchOgImage(i.url)))
  const enriched = base.map((item, i) => ({
    ...item,
    image: imageResults[i].status === 'fulfilled' ? (imageResults[i].value ?? undefined) : undefined,
  }))

  setCache(CACHE_KEY, enriched, TTL_MS)
  return enriched
}
