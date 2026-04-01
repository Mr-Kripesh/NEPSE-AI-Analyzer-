import { load } from 'cheerio'
import { getCache, getStaleCache, setCache } from '@/lib/cache'

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

export interface BoardNewsItem {
  title: string
  description: string
  image: string
  source: string
  publishedAt: string
  url: string
}

export interface CategorizedNews {
  stocks: BoardNewsItem[]
  gold: BoardNewsItem[]
  politics: BoardNewsItem[]
  latest: BoardNewsItem[]
}

const NEWS_CACHE_KEY = 'nepse-news-v4'
const METALS_CACHE_KEY = 'nepse-metals-v2'
const BOARD_CACHE_KEY = 'nepse-board-news-v3'
const NEWS_TTL_MS = 10 * 60 * 1000
const METALS_TTL_MS = 5 * 60 * 1000
const BOARD_TTL_MS = 24 * 60 * 60 * 1000
const MIN_BOARD_ITEM_COUNT = 6
const MIN_NON_GOLD_BOARD_ITEMS = 4

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
const LISTING_NAV_TEXT_PATTERN = /^(home|login|register|contact us|faq|write for us|search|clear|load more|next|previous|analysis|market|news|tools|forum|about|privacy policy|terms|careers|read epaper|go to)/i
const MARKET_HEADLINE_PATTERN = /nepse|share|stock|ipo|fpo|allotment|dividend|bonus share|right share|hydropower|bank(?:ing)?|turnover|trading|bullion|sebon|merchant banker|microfinance|laghubitta/i
const POLITICS_HEADLINE_PATTERN = /politics|parliament|cabinet|minister|government|prime minister|congress|uml|maoist|coalition|election|party|opposition|lawmakers|supreme court|detention/i
const KATHMANDU_POST_ARTICLE_PATH_PATTERN = /^\/[a-z-]+\/\d{4}\/\d{2}\/\d{2}\//
const GENERIC_SOURCE_BLURB_PATTERN = /find the latest breaking news from nepal|opinion & analysis on nepali politics|without fear or favour|focusing on the present moment can be a powerful way|news, opinion & analysis|books, education, auto & more/i
const SECTION_TITLE_PATTERN = /^(culture\s*&\s*lifestyle|science\s*&\s*technology|sudurpaschim province|madhesh province|lumbini province|bagmati province|koshi province|gandaki province|karnali province|national security|kathmandu|lalitpur|bhaktapur|letters|columns|editorial|cartoon|health|food|travel|investigations|climate\s*&\s*environment|world)$/i

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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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

function isSyntheticText(value: string): boolean {
  return /syncing|reloading|backup|retries|collector retries|board populated|gold-only|refresh completes|latest headline stack/i.test(value)
}

function cleanSummaryText(value: string, limit = 320): string {
  return cleanText(value, limit)
    .replace(GENERIC_SOURCE_BLURB_PATTERN, '')
    .replace(/Open the source link for full coverage\.?/gi, '')
    .replace(/This story is part of the live .*? feed\.?/gi, '')
    .replace(/Use it as a fast reference and confirm the latest official board update before making any buying or selling decision\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function htmlToText(value: string, limit = 240): string {
  if (!value) return ''
  return cleanText(load(`<div>${value}</div>`).text(), limit)
}

function resolveFallbackCategory(value: string): string {
  if (MARKET_HEADLINE_PATTERN.test(value)) return 'Share Market'
  if (POLITICS_HEADLINE_PATTERN.test(value)) return 'Politics'
  return 'World'
}

function isLikelyArticleLink(baseUrl: string, title: string, url: string): boolean {
  if (!title || title.length < 18 || LISTING_NAV_TEXT_PATTERN.test(title)) return false
  if (!url || url.startsWith('#') || /^(javascript:|mailto:|tel:)/i.test(url)) return false

  try {
    const target = new URL(url, baseUrl)
    if (target.hostname.includes('kathmandupost.com')) {
      return KATHMANDU_POST_ARTICLE_PATH_PATTERN.test(target.pathname)
        && !SECTION_TITLE_PATTERN.test(title)
    }

    if (target.hostname.includes('sharesansar.com')) {
      if (/\/index\.php\/category\//i.test(target.pathname)) return false
      return target.pathname.split('/').filter(Boolean).length >= 2
    }

    if (/\/(category|tag|author|page|forum)\b/i.test(target.pathname)) return false
    const segments = target.pathname.split('/').filter(Boolean)
    return segments.length >= 2 && target.pathname.length > 16
  } catch {
    return false
  }
}

function isLikelyArticleItem(item: NewsItem): boolean {
  const title = cleanText(item.title, 180)
  if (!title || SECTION_TITLE_PATTERN.test(title) || GENERIC_SOURCE_BLURB_PATTERN.test(title)) {
    return false
  }

  try {
    const target = new URL(item.url)
    if (target.hostname.includes('kathmandupost.com')) {
      return KATHMANDU_POST_ARTICLE_PATH_PATTERN.test(target.pathname)
    }

    if (target.hostname.includes('sharesansar.com')) {
      return !/\/index\.php\/category\//i.test(target.pathname)
    }
  } catch {
    return false
  }

  return true
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
    return cleanSummaryText(seed.summary || seed.title, 260)
  }

  return cleanText(pieces.join(' '), 720)
}

function firstMeaningfulSentence(value: string, limit = 180): string {
  const sentence = cleanSummaryText(value, 420)
    .split(/(?<=[.!?])\s+/)
    .map(part => part.trim())
    .find(part => part && !GENERIC_SOURCE_BLURB_PATTERN.test(part))

  return sentence ? cleanText(sentence, limit) : ''
}

function buildQuickSummary(item: NewsItem): string {
  const sourceName = cleanText(item.source || sourceFromUrl(item.url), 80)
  const sourcePattern = sourceName ? new RegExp(escapeRegExp(sourceName), 'gi') : null
  const sourceText = cleanSummaryText(
    `${item.story || ''} ${item.summary || ''} ${item.title || ''}`,
    720,
  )
    .replace(sourcePattern ?? /$^/, '')
    .replace(/\s+/g, ' ')
    .trim()

  const sentenceSummary = firstMeaningfulSentence(sourceText, 190)
  if (sentenceSummary) return sentenceSummary

  const sentences = sourceText
    .split(/(?<=[.!?])\s+/)
    .map(sentence => sentence.trim())
    .filter(Boolean)
    .filter(sentence => !isSyntheticText(sentence))

  const concise = sentences.slice(0, 2).join(' ').trim()
  if (concise) return cleanText(concise, 260)

  const plainSummary = firstMeaningfulSentence(item.summary, 180)
  if (plainSummary && !isSyntheticText(plainSummary)) {
    return plainSummary
  }

  const titleSummary = cleanText(item.title.replace(/\s+/g, ' ').trim(), 150)
  return /[.!?]$/.test(titleSummary) ? titleSummary : `${titleSummary}.`
}

function sanitizeNewsItems(items: NewsItem[]): NewsItem[] {
  return items.filter((item) => {
    if (item.category === 'Metals') return true
    if (isSyntheticNewsItem(item)) return false
    if (!isLikelyArticleItem(item)) return false

    const summaryText = cleanSummaryText(`${item.summary} ${item.story ?? ''}`, 360)
    if (GENERIC_SOURCE_BLURB_PATTERN.test(summaryText)) return false

    return true
  })
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

  if (items.length > 0) return items

  if (baseUrl.includes('kathmandupost.com')) {
    $('a[href]').each((_, el) => {
      if (items.length >= (config.limit ?? 10)) return false

      const anchor = $(el)
      const title = cleanText(anchor.text(), 180)
      const url = toAbsoluteUrl(baseUrl, anchor.attr('href') ?? '')
      if (!isLikelyArticleLink(baseUrl, title, url)) return undefined

      const cardText = cleanText(
        anchor.parent().text().replace(anchor.text(), ''),
        260,
      )

      addListingItem(items, seen, {
        title,
        summary: cardText,
        date: '',
        url,
        source: config.source,
        category: config.category,
        priority: config.priority,
      })

      return undefined
    })
  }

  if (items.length > 0) return items

  $('a[href]').each((_, el) => {
    if (items.length >= (config.limit ?? 10)) return false

    const anchor = $(el)
    const title = cleanText(anchor.text(), 180)
    const url = toAbsoluteUrl(baseUrl, anchor.attr('href') ?? '')
    if (!isLikelyArticleLink(baseUrl, title, url)) return undefined

    const block = anchor.parent()
    const siblingText = cleanText(
      block.text().replace(anchor.text(), ''),
      260,
    )

    addListingItem(items, seen, {
      title,
      summary: siblingText,
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

function collectRssItems(
  xml: string,
  baseUrl: string,
  config: {
    source: string
    priority: number
    limit?: number
    category?: string
    resolveCategory?: (value: string) => string
  },
): NewsItem[] {
  const $ = load(xml, { xmlMode: true })
  const items: NewsItem[] = []
  const seen = new Set<string>()

  $('item').each((_, el) => {
    if (items.length >= (config.limit ?? 12)) return false

    const root = $(el)
    const title = cleanText(root.find('title').first().text(), 180)
    const url = toAbsoluteUrl(baseUrl, cleanText(root.find('link').first().text(), 320))
    const descriptionHtml = root.find('description').first().text()
    const summary = htmlToText(descriptionHtml, 240)
    const textForCategory = `${title} ${summary}`
    const category = config.category || config.resolveCategory?.(textForCategory) || resolveFallbackCategory(textForCategory)

    const image = [
      root.find('media\\:content').first().attr('url'),
      root.find('media\\:thumbnail').first().attr('url'),
      root.find('enclosure').first().attr('url'),
    ]
      .map(candidate => toAbsoluteUrl(baseUrl, candidate ?? ''))
      .find(candidate => candidate.startsWith('http'))

    addListingItem(items, seen, {
      title,
      summary,
      date: cleanText(root.find('pubDate').first().text(), 80),
      url,
      image: image || undefined,
      source: config.source,
      category,
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

async function fetchRssFeed(
  url: string,
  config: {
    source: string
    priority: number
    limit?: number
    category?: string
    resolveCategory?: (value: string) => string
  },
): Promise<NewsItem[]> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/rss+xml,application/xml,text/xml' },
    signal: AbortSignal.timeout(10000),
    cache: 'no-store',
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return collectRssItems(await res.text(), url, config)
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

async function getFallbackRssNews(): Promise<NewsItem[]> {
  try {
    return await fetchRssFeed('https://kathmandupost.com/rss', {
      source: 'Kathmandu Post',
      priority: 86,
      limit: 16,
      resolveCategory: resolveFallbackCategory,
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
        gold: hamroPatro?.gold !== 'N/A' ? (hamroPatro?.gold ?? 'N/A') : (fenegosida?.gold ?? 'N/A'),
        silver: hamroPatro?.silver !== 'N/A' ? (hamroPatro?.silver ?? 'N/A') : (fenegosida?.silver ?? 'N/A'),
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

function mapBoardItem(item: NewsItem): BoardNewsItem {
  return {
    title: cleanText(item.title, 180),
    description: buildQuickSummary(item),
    image: item.image || '',
    source: cleanText(item.source || sourceFromUrl(item.url) || 'NEPSE AI', 80),
    publishedAt: cleanText(item.date, 80),
    url: item.url.trim(),
  }
}

function isSyntheticNewsItem(item: NewsItem): boolean {
  return isSyntheticText(`${item.title} ${item.summary} ${item.story ?? ''}`)
}

function isSyntheticBoardItem(item: BoardNewsItem): boolean {
  return isSyntheticText(`${item.title} ${item.description}`)
}

function buildCategorizedNews(items: NewsItem[]): CategorizedNews {
  const stocks = items.filter(item => item.category === 'Share Market')
  const gold = items.filter(item => item.category === 'Metals')
  const politics = items.filter(item => item.category === 'Politics')

  const primaryKeys = new Set(
    [
      ...stocks.slice(0, 4),
      ...gold.slice(0, 3),
      ...politics.slice(0, 4),
    ].map(item => (item.url || item.title).trim().toLowerCase()),
  )

  const latest = items
    .slice()
    .sort((a, b) => {
      const dateDiff = parseDateValue(b.date) - parseDateValue(a.date)
      if (dateDiff !== 0) return dateDiff
      return (b.priority ?? 0) - (a.priority ?? 0)
    })
    .filter(item => !primaryKeys.has((item.url || item.title).trim().toLowerCase()))

  return {
    stocks: stocks.slice(0, 6).map(mapBoardItem),
    gold: gold.slice(0, 4).map(mapBoardItem),
    politics: politics.slice(0, 6).map(mapBoardItem),
    latest: latest.slice(0, 8).map(mapBoardItem),
  }
}

function countBoardItems(news: CategorizedNews): number {
  return news.stocks.length + news.gold.length + news.politics.length + news.latest.length
}

function countNonGoldBoardItems(news: CategorizedNews): number {
  return news.stocks.length + news.politics.length + news.latest.length
}

function isHealthyBoard(news: CategorizedNews): boolean {
  return countBoardItems(news) >= MIN_BOARD_ITEM_COUNT
    && countNonGoldBoardItems(news) >= MIN_NON_GOLD_BOARD_ITEMS
}

function mergeBoardCategory(
  primary: BoardNewsItem[],
  fallback: BoardNewsItem[],
  limit: number,
): BoardNewsItem[] {
  const merged: BoardNewsItem[] = []
  const seen = new Set<string>()

  for (const item of [...primary, ...fallback]) {
    const key = (item.url || `${item.title}-${item.publishedAt}`).trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    merged.push(item)
    if (merged.length >= limit) break
  }

  return merged
}

function mergeCategorizedNews(
  primary: CategorizedNews,
  fallback: CategorizedNews | null,
): CategorizedNews {
  return {
    stocks: mergeBoardCategory(primary.stocks.filter(item => !isSyntheticBoardItem(item)), (fallback?.stocks ?? []).filter(item => !isSyntheticBoardItem(item)), 6),
    gold: mergeBoardCategory(primary.gold.filter(item => !isSyntheticBoardItem(item)), (fallback?.gold ?? []).filter(item => !isSyntheticBoardItem(item)), 4),
    politics: mergeBoardCategory(primary.politics.filter(item => !isSyntheticBoardItem(item)), (fallback?.politics ?? []).filter(item => !isSyntheticBoardItem(item)), 6),
    latest: mergeBoardCategory(primary.latest.filter(item => !isSyntheticBoardItem(item)), (fallback?.latest ?? []).filter(item => !isSyntheticBoardItem(item)), 8),
  }
}

function ensureBoardCoverage(news: CategorizedNews): CategorizedNews {
  const ensured: CategorizedNews = {
    stocks: [...news.stocks],
    gold: [...news.gold],
    politics: [...news.politics],
    latest: [...news.latest],
  }

  return {
    stocks: ensured.stocks.slice(0, 6),
    gold: ensured.gold.slice(0, 2),
    politics: ensured.politics.slice(0, 6),
    latest: ensured.latest.slice(0, 8),
  }
}

export async function getCategorizedNews(): Promise<CategorizedNews> {
  const staleBoard = getStaleCache<CategorizedNews>(BOARD_CACHE_KEY)
  const staleNews = getStaleCache<NewsItem[]>(NEWS_CACHE_KEY)
  const items = await getNews()
  const currentBoard = buildCategorizedNews(items)
  const staleNewsBoard = staleNews
    ? buildCategorizedNews(staleNews.filter(item => !isSyntheticNewsItem(item)))
    : null
  const mergedBoard = mergeCategorizedNews(
    currentBoard,
    mergeCategorizedNews(staleNewsBoard ?? { stocks: [], gold: [], politics: [], latest: [] }, staleBoard),
  )
  const safeBoard = ensureBoardCoverage(mergedBoard)

  if (isHealthyBoard(safeBoard)) {
    setCache(BOARD_CACHE_KEY, safeBoard, BOARD_TTL_MS)
    return safeBoard
  }

  if (countBoardItems(safeBoard) > 0) {
    setCache(BOARD_CACHE_KEY, safeBoard, BOARD_TTL_MS)
  }

  return safeBoard
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
      url: `${baseUrl}#gold`,
      source: 'Metals board',
      category: 'Metals',
      priority: 95,
    },
    {
      title: `Silver rate sits around ${snapshot.silver} per tola`,
      summary: 'Latest Nepal silver board update.',
      story: makeMetalsStory('silver', snapshot.silver, snapshot.updatedAt),
      date: snapshot.updatedAt,
      url: `${baseUrl}#silver`,
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
  if (cached) {
    const sanitizedCached = sanitizeNewsItems(cached)
    if (sanitizedCached.length > 0) {
      if (sanitizedCached.length !== cached.length) {
        setCache(NEWS_CACHE_KEY, sanitizedCached, NEWS_TTL_MS)
      }
      return sanitizedCached
    }
  }

  const stale = getStaleCache<NewsItem[]>(NEWS_CACHE_KEY)
  const [shareMarket, politics, world, rssFallback, metals] = await Promise.all([
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
    getFallbackRssNews(),
    getMetalsSnapshot(),
  ])

  const combined = dedupeNews([
    ...shareMarket,
    ...politics,
    ...world,
    ...rssFallback,
    ...buildMetalsItems(metals),
  ])
    .sort((a, b) => {
      const priorityDiff = (b.priority ?? 0) - (a.priority ?? 0)
      if (priorityDiff !== 0) return priorityDiff
      return parseDateValue(b.date) - parseDateValue(a.date)
    })
    .slice(0, 18)

  if (combined.length === 0) {
    return sanitizeNewsItems(stale ?? [])
  }

  const enriched = await enrichItems(combined)
  const sanitized = sanitizeNewsItems(enriched)
  if (sanitized.length < MIN_BOARD_ITEM_COUNT && stale?.length) {
    return sanitizeNewsItems(stale)
  }
  setCache(NEWS_CACHE_KEY, sanitized, NEWS_TTL_MS)
  return sanitized
}
