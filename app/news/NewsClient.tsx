'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import type { EnrichedNewsItem } from '@/lib/newsEnrich'
import styles from './news.module.css'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Insight {
  text: string
  confidence: number
  sentiment: 'bullish' | 'bearish' | 'neutral'
}

// ── Constants ──────────────────────────────────────────────────────────────────

const CATEGORIES = ['All', 'Banking', 'Hydro', 'Finance', 'IPO', 'Economy', 'Global']

const THUMB_COLORS: Record<string, string> = {
  Banking:  'var(--crimson)',
  Hydro:    'var(--teal)',
  Finance:  'var(--gold)',
  IPO:      'var(--accent)',
  Economy:  '#8e44ad',
  Global:   '#2980b9',
  General:  'var(--muted)',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function thumbColor(category: string): string {
  return THUMB_COLORS[category] ?? 'var(--muted)'
}

function relativeTime(dateStr: string): string {
  if (!dateStr) return ''
  // Try parsing common date strings
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const diffMs = Date.now() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}

// ── Thumbnail ─────────────────────────────────────────────────────────────────

function Thumbnail({
  item,
  height,
  small = false,
}: {
  item: EnrichedNewsItem
  height: number
  small?: boolean
}) {
  const [imgError, setImgError] = useState(false)
  const color = thumbColor(item.category)

  if (item.image && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.image}
        alt=""
        className={small ? styles.thumbSm : styles.thumb}
        style={{ height }}
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <div
      className={small ? styles.thumbSmPlaceholder : styles.thumbPlaceholder}
      style={{ height, '--thumb-color': color } as React.CSSProperties}
      aria-hidden="true"
    />
  )
}

// ── Sentiment badge ───────────────────────────────────────────────────────────

function SentimentBadge({ sentiment }: { sentiment: EnrichedNewsItem['sentiment'] }) {
  const cls = sentiment === 'bullish'
    ? styles.badgeBullish
    : sentiment === 'bearish'
    ? styles.badgeBearish
    : styles.badgeNeutral
  const label = sentiment === 'bullish' ? 'Bullish' : sentiment === 'bearish' ? 'Bearish' : 'Neutral'
  return <span className={`${styles.badge} ${cls}`}>{label}</span>
}

// ── Category filter bar ───────────────────────────────────────────────────────

function CategoryFilterBar({
  active,
  onChange,
}: {
  active: string
  onChange: (cat: string) => void
}) {
  return (
    <div className={styles.filterBar} role="group" aria-label="Filter by category">
      {CATEGORIES.map(cat => (
        <button
          key={cat}
          className={`${styles.filterChip} ${active === cat ? styles.filterChipActive : ''}`}
          onClick={() => onChange(cat)}
          aria-pressed={active === cat}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}

// ── Hero section ──────────────────────────────────────────────────────────────

function HeroSection({
  hero,
  secondary,
}: {
  hero: EnrichedNewsItem
  secondary: EnrichedNewsItem[]
}) {
  return (
    <div className={styles.hero}>
      {/* Featured (left) */}
      <a
        href={hero.url || undefined}
        target={hero.url ? '_blank' : undefined}
        rel="noopener noreferrer"
        className={styles.heroCard}
        aria-label={hero.title}
      >
        <Thumbnail item={hero} height={180} />
        <div className={styles.heroBody}>
          <h2 className={styles.heroTitle}>{hero.title}</h2>
          {hero.summary && <p className={styles.heroSummary}>{hero.summary}</p>}
          <div className={styles.heroMeta}>
            <span className={styles.catTag}>{hero.category}</span>
            <SentimentBadge sentiment={hero.sentiment} />
            {hero.date && <span className={styles.timestamp}>{relativeTime(hero.date)}</span>}
          </div>
        </div>
      </a>

      {/* Secondary stack (right) */}
      <div className={styles.secondaryStack}>
        {secondary.map((item, i) => (
          <a
            key={i}
            href={item.url || undefined}
            target={item.url ? '_blank' : undefined}
            rel="noopener noreferrer"
            className={styles.secondaryCard}
            aria-label={item.title}
          >
            <Thumbnail item={item} height={80} small />
            <div className={styles.secondaryBody}>
              <p className={styles.secondaryTitle}>{item.title}</p>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                <span className={styles.catTag}>{item.category}</span>
                {item.date && <span className={styles.secondaryTime}>{relativeTime(item.date)}</span>}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

// ── News card (grid) ──────────────────────────────────────────────────────────

function NewsCard({ item }: { item: EnrichedNewsItem }) {
  return (
    <a
      href={item.url || undefined}
      target={item.url ? '_blank' : undefined}
      rel="noopener noreferrer"
      className={styles.gridCard}
      aria-label={item.title}
    >
      <Thumbnail item={item} height={100} />
      <div className={styles.gridBody}>
        <p className={styles.gridTitle}>{item.title}</p>
        {item.summary && <p className={styles.gridSummary}>{item.summary}</p>}
        <div className={styles.cardMeta}>
          <span className={styles.catTag}>{item.category}</span>
          <SentimentBadge sentiment={item.sentiment} />
          {item.date && <span className={styles.timestamp}>{relativeTime(item.date)}</span>}
        </div>
      </div>
    </a>
  )
}

// ── AI Insights panel ─────────────────────────────────────────────────────────

function AIInsightsPanel({
  insights,
  isLoading,
  error,
}: {
  insights: Insight[]
  isLoading: boolean
  error: boolean
}) {
  const sentimentDot = (s: Insight['sentiment']) =>
    s === 'bullish' ? '▲' : s === 'bearish' ? '▼' : '●'

  return (
    <div className={styles.aiPanel}>
      <div className={styles.aiTitle}>
        <span>⬡</span>
        AI Market Insights
      </div>
      {isLoading ? (
        <>
          {[70, 85, 60].map((w, i) => (
            <div key={i} className={styles.insightRow}>
              <div className={styles.skeletonLine} style={{ width: `${w}%`, height: 12, marginBottom: 6 }} />
              <div className={styles.skeletonLine} style={{ width: '40%', height: 4 }} />
            </div>
          ))}
        </>
      ) : error || insights.length === 0 ? (
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.5 }}>
          {error ? 'Could not load insights. Check your API key.' : 'No insights available.'}
        </p>
      ) : (
        insights.map((insight, i) => (
          <div key={i} className={styles.insightRow}>
            <p className={styles.insightText}>
              <span style={{ marginRight: 4, opacity: 0.7 }}>{sentimentDot(insight.sentiment)}</span>
              {insight.text}
            </p>
            <div className={styles.confidenceWrap}>
              <div className={styles.confidenceTrack}>
                <div
                  className={styles.confidenceFill}
                  style={{ width: `${insight.confidence}%` }}
                />
              </div>
              <span className={styles.confidenceLabel}>{insight.confidence}%</span>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ── Trending panel ────────────────────────────────────────────────────────────

function TrendingPanel({ items }: { items: EnrichedNewsItem[] }) {
  return (
    <div className={styles.trendingPanel}>
      <p className={styles.trendingTitle}>Trending</p>
      {items.slice(0, 5).map((item, i) => (
        <a
          key={i}
          href={item.url || undefined}
          target={item.url ? '_blank' : undefined}
          rel="noopener noreferrer"
          className={styles.trendingItem}
        >
          <span className={styles.trendingNum}>#{i + 1}</span>
          <div>
            <p className={styles.trendingText}>{item.title}</p>
            {item.date && <p className={styles.trendingTime}>{relativeTime(item.date)}</p>}
          </div>
        </a>
      ))}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  const router = useRouter()
  return (
    <div className={styles.emptyState}>
      <svg
        className={styles.emptyIcon}
        width="72"
        height="72"
        viewBox="0 0 72 72"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect x="8" y="12" width="56" height="48" rx="4" stroke="currentColor" strokeWidth="2.5" fill="none" />
        <line x1="18" y1="24" x2="54" y2="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="18" y1="32" x2="54" y2="32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="18" y1="40" x2="38" y2="40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="52" cy="52" r="12" fill="var(--bg)" stroke="currentColor" strokeWidth="2.5" />
        <line x1="52" y1="47" x2="52" y2="55" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="52" cy="58" r="1.5" fill="currentColor" />
      </svg>
      <h2 className={styles.emptyTitle}>No news available right now</h2>
      <p className={styles.emptySubtitle}>We are fetching the latest updates...</p>
      <button className={styles.refreshBtn} onClick={() => router.refresh()}>
        Refresh
      </button>
    </div>
  )
}

// ── SWR fetcher ───────────────────────────────────────────────────────────────

function insightsFetcher(headlines: string[]) {
  return fetch('/api/news-insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ headlines }),
  }).then(r => r.json()) as Promise<{ insights?: Insight[]; error?: string }>
}

// ── Main client component ─────────────────────────────────────────────────────

export default function NewsClient({ items }: { items: EnrichedNewsItem[] }) {
  const [activeCategory, setActiveCategory] = useState('All')

  const handleCategoryChange = useCallback((cat: string) => {
    setActiveCategory(cat)
  }, [])

  // Filter items by active category
  const filtered = activeCategory === 'All'
    ? items
    : items.filter(item => item.category === activeCategory)

  const hero = filtered[0] ?? null
  const secondary = filtered.slice(1, 4)
  const gridItems = filtered.slice(4)

  // AI Insights — fetch once with top 10 headlines from ALL items (not filtered)
  const topHeadlines = items.slice(0, 10).map(i => i.title)
  const { data: insightsData, isLoading: insightsLoading, error: insightsError } = useSWR(
    topHeadlines.length > 0 ? ['news-insights', ...topHeadlines] : null,
    () => insightsFetcher(topHeadlines),
    { revalidateOnFocus: false, dedupingInterval: 5 * 60 * 1000 },
  )

  const insights = insightsData?.insights ?? []
  const insightsFailed = !!insightsError || !!insightsData?.error

  return (
    <main className="page-main">
      <div className="container">
        {/* Page header */}
        <div className="page-header">
          <div>
            <div className={styles.breadcrumb}>
              <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link>
              <span>›</span>
              <span>News</span>
            </div>
            <h1 className="page-title" style={{ marginTop: 6 }}>Market News</h1>
            <p className={styles.pageSubtitle}>Latest updates, insights, and trends from the market</p>
          </div>
        </div>

        {/* Category filter */}
        <CategoryFilterBar active={activeCategory} onChange={handleCategoryChange} />

        {/* Empty state */}
        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Hero section */}
            {hero && (
              <HeroSection
                hero={hero}
                secondary={secondary}
              />
            )}

            {/* Main layout: feed + sidebar */}
            <div className={styles.layout}>
              {/* News feed (65%) */}
              <div className={styles.feed}>
                {gridItems.length > 0 && (
                  <div className={styles.grid}>
                    {gridItems.map((item, i) => (
                      <NewsCard key={`${item.title.slice(0, 30)}-${i}`} item={item} />
                    ))}
                  </div>
                )}
              </div>

              {/* Sidebar (35%) */}
              <aside className={styles.sidebar}>
                <AIInsightsPanel
                  insights={insights}
                  isLoading={insightsLoading}
                  error={insightsFailed}
                />
                {items.length > 0 && <TrendingPanel items={items} />}
              </aside>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
