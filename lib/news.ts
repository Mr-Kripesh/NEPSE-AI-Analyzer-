import { load } from 'cheerio'
import { getCache, setCache } from '@/lib/cache'

export interface NewsItem {
  title: string
  summary: string
  story?: string
  date: string
  url: string
  image?: string
  source?: string
  category?: string
  priority?: number
}

export interface MetalsSnapshot {
  gold: string
  silver: string
  updatedAt: string
  source: string
}

export interface NewsPulse {
  gold: string
  silver: string
  metalsUpdatedAt: string
  flashes: string[]
}

const NEWS_CACHE_KEY = 'nepse-news-v2'
const METALS_CACHE_KEY = 'nepse-metals-v2'
const NEWS_TTL_MS = 15 * 60 * 1000
const METALS_TTL_MS = 5 * 60 * 1000

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

function cleanText(value: string, limit = 240): string {
  return value.replace(/\s+/g, ' ').replace(/&nbsp;/g, ' ').trim().slice(0, limit)
}

function toAbsoluteUrl(baseUrl: string, href: string): string {
  if (!href) return ''
  try {
    return new URL(href, baseUrl).toString()
  } catch {
    return href.trim()
  }
}

function sourceFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    return host
      .replace(/\.(com|org|net|np)$/i, '')
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  } catch {
    return ''
  }
}

function parseDateValue(value: string): number {
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function textLinesFromHtml(html: string): string[] {
  const $ = load(html)
  return $.root()
    .text()
    .split(/\r?\n/)
    .map(line => cleanText(line, 160))
    .filter(Boolean)
}

function formatBoardDate(value: string): string {
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return cleanText(value, 48)

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(parsed))
}

function extractRateValue(line: string): string {
  const explicitMatch = line.match(/(?:npr|nrs?|rs)\.?\s*([0-9][0-9,]*(?:\.\d+)?)/i)
  const raw = explicitMatch?.[1]
    ?? (/^[0-9][0-9,]*(?:\.\d+)?$/.test(line.trim()) ? line.trim() : '')

  if (!raw) return ''

  const numeric = Number(raw.replace(/,/g, ''))
  if (!Number.isFinite(numeric) || numeric <= 0) return ''

  const decimals = raw.includes('.') ? raw.split('.')[1].length : 0
  return `Rs.${numeric.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

function findRateNearLabel(lines: string[], labelPattern: RegExp, maxOffset = 4): string {
  for (let index = 0; index < lines.length; index += 1) {
    if (!labelPattern.test(lines[index])) continue

    for (let cursor = index + 1; cursor <= Math.min(lines.length - 1, index + maxOffset); cursor += 1) {
      const value = extractRateValue(lines[cursor])
      if (value) return value
    }
  }

  return ''
}

function parseHamroPatroMetals(html: string): MetalsSnapshot | null {
  const lines = textLinesFromHtml(html)
  const gold = findRateNearLabel(lines, /gold.*hallmark.*tola/i, 4)
    || findRateNearLabel(lines, /gold.*tola/i, 4)
  const silver = findRateNearLabel(lines, /silver.*tola/i, 4)
  const updatedLine = lines.find(line => /last updated/i.test(line)) ?? ''
  const updatedAt = formatBoardDate(updatedLine.replace(/last updated\s*:?\s*/i, '').trim())

  if (!gold && !silver) return null

  return {
    gold: gold || 'N/A',
    silver: silver || 'N/A',
    updatedAt,
    source: 'Scraped metals board',
  }
}

function parseFenegosidaMetals(html: string): MetalsSnapshot | null {
  const lines = textLinesFromHtml(html)
  const gold = findRateNearLabel(lines, /fine gold/i, 3)
  const silverStart = lines.findIndex(line => /fine gold/i.test(line))
  let silver = ''

  if (silverStart >= 0) {
    for (let index = silverStart + 1; index < lines.length; index += 1) {
      if (!/silver/i.test(lines[index])) continue
      silver = findRateNearLabel(lines.slice(index), /silver/i, 2)
      if (silver) break
    }
  }

  const updatedAt = formatBoardDate(lines.find(line => /^\d{4}-\d{2}-\d{2}$/.test(line)) ?? '')

  if (!gold && !silver) return null

  return {
    gold: gold || 'N/A',
    silver: silver || 'N/A',
    updatedAt,
    source: 'Scraped metals board',
  }
}

async function scrapeMetalsSource(
  url: string,
  parser: (html: string) => MetalsSnapshot | null,
): Promise<MetalsSnapshot | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(9000),
      cache: 'no-store',
    })
    if (!res.ok) return null

    return parser(await res.text())
  } catch {
    return null
  }
}

function dedupeNews(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>()
  const deduped: NewsItem[] = []

  for (const item of items) {
    const key = (item.url || item.title).trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    deduped.push(item)
  }

  return deduped
}

function buildStory(seed: NewsItem, description: string, paragraphs: string[]): string {
  const seen = new Set<string>()
  const pieces = [seed.summary, description, ...paragraphs]
    .map(piece => cleanText(piece, 320))
    .filter(Boolean)
    .filter(piece => {
      const key = piece.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

  if (pieces.length === 0) {
    return cleanText(
      `${seed.title}. This story is part of the live ${seed.category ?? 'news'} feed. Open the source link for full coverage.`,
      520,
    )
  }

  return cleanText(pieces.join(' '), 720)
}

function makeMetalsStory(name: 'gold' | 'silver', price: string, updatedAt: string): string {
  const metal = name === 'gold' ? 'Gold' : 'Silver'
  const unit = 'per tola'
  const when = updatedAt ? ` The latest board update was captured at ${updatedAt}.` : ''

  return cleanText(
    `${metal} is now trading around ${price} ${unit} in the Nepali market.${when} This tile tracks the daily bullion pulse so users can quickly check whether the rate has moved. Use it as a fast reference and confirm the latest official board update before making any buying or selling decision.`,
    720,
  )
}

function addListingItem(
  items: NewsItem[],
  seen: Set<string>,
  item: NewsItem,
): void {
  const title = cleanText(item.title, 180)
  const url = item.url.trim()
  const key = (url || title).toLowerCase()

  if (title.length < 12 || !key || seen.has(key)) return

  seen.add(key)
  items.push({
    ...item,
    title,
    summary: cleanText(item.summary, 220),
    source: item.source || sourceFromUrl(url),
  })
}

function collectListingItems(
  html: string,
  baseUrl: string,
  config: { category: string; source: string; priority: number; limit?: number },
): NewsItem[] {
  const $ = load(html)
  const items: NewsItem[] = []
  const seen = new Set<string>()

  $('article, .list-post, .media, .featured-news-block, .news-wrap, .block--morenews article, .td_module_wrap').each((_, el) => {
    if (items.length >= (config.limit ?? 10)) return false

    const root = $(el)
    const anchor = root.find('h3 a, h2 a, h4 a, .title a, .entry-title a, .card__title a, a').first()
    const title = anchor.text().trim()
    const url = toAbsoluteUrl(baseUrl, anchor.attr('href') ?? '')
    const summary = root.find('p, .excerpt, .entry-summary, .description').first().text().trim()
    const date = root.find('time, .updated, .date, .meta_date, .entry-date').first().text().trim()
    const image = toAbsoluteUrl(baseUrl, root.find('img').first().attr('src') ?? root.find('img').first().attr('data-src') ?? '')

    addListingItem(items, seen, {
      title,
      summary,
      date,
      url,
      image: image || undefined,
      source: config.source,
      category: config.category,
      priority: config.priority,
    })

    return undefined
  })

  if (items.length > 0) return items

  $('h3 a, h2 a, .title a, .entry-title a').each((_, el) => {
    if (items.length >= (config.limit ?? 10)) return false

    const anchor = $(el)
    const title = anchor.text().trim()
    const url = toAbsoluteUrl(baseUrl, anchor.attr('href') ?? '')

    addListingItem(items, seen, {
      title,
      summary: '',
      date: '',
      url,
      source: config.source,
      category: config.category,
      priority: config.priority,
    })

    return undefined
  })

  return items
}

async function fetchListingPage(
  url: string,
  config: { category: string; source: string; priority: number; limit?: number },
): Promise<NewsItem[]> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
    signal: AbortSignal.timeout(10000),
    cache: 'no-store',
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return collectListingItems(await res.text(), url, config)
}

async function tryShareSansarApi(): Promise<NewsItem[] | null> {
  try {
    const res = await fetch('https://www.sharesansar.com/api/latest-news', {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
      cache: 'no-store',
    })
    if (!res.ok) return null

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) return null

    const data: unknown = await res.json()
    const raw = Array.isArray(data)
      ? data
      : ((data as Record<string, unknown>)?.data ??
         (data as Record<string, unknown>)?.news ??
         [])

    if (!Array.isArray(raw) || raw.length === 0) return null

    const items = raw
      .map((entry) => {
        const item = entry as Record<string, unknown>
        const title = String(item.title ?? item.heading ?? '').trim()
        const summary = String(item.summary ?? item.description ?? item.excerpt ?? '').trim()
        const url = String(item.url ?? item.link ?? '').trim()
        const image = String(item.image ?? item.thumbnail ?? '').trim()

        return {
          title,
          summary,
          date: String(item.date ?? item.published_at ?? item.created_at ?? '').trim(),
          url,
          image: image || undefined,
          source: 'ShareSansar',
          category: 'Share Market',
          priority: 100,
        } satisfies NewsItem
      })
      .filter(item => item.title.length > 0)
      .slice(0, 10)

    return items.length > 0 ? items : null
  } catch {
    return null
  }
}

async function getShareMarketNews(): Promise<NewsItem[]> {
  const fromApi = await tryShareSansarApi()
  if (fromApi && fromApi.length > 0) return fromApi

  try {
    return await fetchListingPage('https://www.sharesansar.com/latest-news', {
      source: 'ShareSansar',
      category: 'Share Market',
      priority: 100,
      limit: 10,
    })
  } catch {
    return []
  }
}

async function fetchArticleMeta(url: string): Promise<{
  image?: string
  story?: string
  source?: string
}> {
  if (!url) return {}

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(7000),
      cache: 'no-store',
    })
    if (!res.ok) return {}

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) return {}

    const finalUrl = res.url || url
    const html = await res.text()
    const $ = load(html)

    const imageCandidates = [
      $('meta[property="og:image"]').attr('content'),
      $('meta[name="twitter:image"]').attr('content'),
      $('article img').first().attr('src'),
      $('.featured-image img, .post-thumbnail img, .entry-thumb img').first().attr('src'),
    ]

    const image = imageCandidates
      .map(candidate => (candidate ? toAbsoluteUrl(finalUrl, candidate) : ''))
      .find(candidate => candidate.startsWith('http'))

    const description = cleanText(
      $('meta[property="og:description"]').attr('content')
      ?? $('meta[name="description"]').attr('content')
      ?? '',
      360,
    )

    const paragraphs = $('article p, .story__content p, .entry-content p, .post-content p, .news-content p, main p')
      .toArray()
      .map(el => cleanText($(el).text(), 220))
      .filter(text => text.length > 40)
      .slice(0, 4)

    const source = cleanText(
      $('meta[property="og:site_name"]').attr('content')
      ?? sourceFromUrl(finalUrl),
      80,
    )

    const story = (description || paragraphs.length > 0)
      ? buildStory(
          {
            title: '',
            summary: '',
            date: '',
            url: finalUrl,
          },
          description,
          paragraphs,
        )
      : undefined

    return {
      image: image || undefined,
      story,
      source: source || undefined,
    }
  } catch {
    return {}
  }
}

export async function getMetalsSnapshot(): Promise<MetalsSnapshot | null> {
  const cached = getCache<MetalsSnapshot>(METALS_CACHE_KEY)
  if (cached) return cached

  const [hamroPatro, fenegosida] = await Promise.all([
    scrapeMetalsSource('https://english.hamropatro.com/gold', parseHamroPatroMetals),
    scrapeMetalsSource('https://fenegosida.com/', parseFenegosidaMetals),
  ])

  const snapshot = hamroPatro || fenegosida
    ? {
        gold: hamroPatro?.gold !== 'N/A' ? hamroPatro.gold : (fenegosida?.gold ?? 'N/A'),
        silver: hamroPatro?.silver !== 'N/A' ? hamroPatro.silver : (fenegosida?.silver ?? 'N/A'),
        updatedAt: hamroPatro?.updatedAt || fenegosida?.updatedAt || '',
        source: 'Scraped metals board',
      } satisfies MetalsSnapshot
    : null

  if (!snapshot) return null

  setCache(METALS_CACHE_KEY, snapshot, METALS_TTL_MS)
  return snapshot
}

export function buildNewsPulse(
  flashes: string[],
  metals: MetalsSnapshot | null,
): NewsPulse {
  return {
    gold: metals?.gold ?? 'Syncing',
    silver: metals?.silver ?? 'Syncing',
    metalsUpdatedAt: metals?.updatedAt ?? '',
    flashes: flashes.slice(0, 8),
  }
}

function buildMetalsItems(snapshot: MetalsSnapshot | null): NewsItem[] {
  if (!snapshot) return []

  const baseUrl = 'https://english.hamropatro.com/gold'
  return [
    {
      title: `Gold rate holds near ${snapshot.gold} per tola`,
      summary: 'Latest Nepal bullion board update.',
      story: makeMetalsStory('gold', snapshot.gold, snapshot.updatedAt),
      date: snapshot.updatedAt,
      url: baseUrl,
      source: 'Metals board',
      category: 'Metals',
      priority: 95,
    },
    {
      title: `Silver rate sits around ${snapshot.silver} per tola`,
      summary: 'Latest Nepal silver board update.',
      story: makeMetalsStory('silver', snapshot.silver, snapshot.updatedAt),
      date: snapshot.updatedAt,
      url: baseUrl,
      source: 'Metals board',
      category: 'Metals',
      priority: 94,
    },
  ]
}

async function enrichItems(baseItems: NewsItem[]): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    baseItems.map(async (item) => {
      if (item.category === 'Metals') {
        return {
          ...item,
          image: undefined,
          story: item.story || buildStory(item, '', []),
          source: item.source || 'Metals board',
        } satisfies NewsItem
      }

      const meta = await fetchArticleMeta(item.url)
      const story = item.story || meta.story || buildStory(item, '', [])

      return {
        ...item,
        image: item.image || meta.image,
        story,
        source: item.source || meta.source || sourceFromUrl(item.url),
      } satisfies NewsItem
    }),
  )

  return results.map((result, index) =>
    result.status === 'fulfilled'
      ? result.value
      : {
          ...baseItems[index],
          story: baseItems[index].story || buildStory(baseItems[index], '', []),
        },
  )
}

export async function getNews(): Promise<NewsItem[]> {
  const cached = getCache<NewsItem[]>(NEWS_CACHE_KEY)
  if (cached) return cached

  const [shareMarket, politics, world, metals] = await Promise.all([
    getShareMarketNews(),
    fetchListingPage('https://kathmandupost.com/politics', {
      source: 'Kathmandu Post',
      category: 'Politics',
      priority: 90,
      limit: 8,
    }).catch(() => []),
    fetchListingPage('https://kathmandupost.com/world', {
      source: 'Kathmandu Post',
      category: 'World',
      priority: 84,
      limit: 8,
    }).catch(() => []),
    getMetalsSnapshot(),
  ])

  const combined = dedupeNews([
    ...shareMarket,
    ...politics,
    ...world,
    ...buildMetalsItems(metals),
  ])
    .sort((a, b) => {
      const priorityDiff = (b.priority ?? 0) - (a.priority ?? 0)
      if (priorityDiff !== 0) return priorityDiff
      return parseDateValue(b.date) - parseDateValue(a.date)
    })
    .slice(0, 18)

  if (combined.length === 0) return []

  const enriched = await enrichItems(combined)
  setCache(NEWS_CACHE_KEY, enriched, NEWS_TTL_MS)
  return enriched
}
