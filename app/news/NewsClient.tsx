'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'
import type { BoardNewsItem, CategorizedNews } from '@/lib/news'
import styles from './news.module.css'

type BoardCategory = keyof CategorizedNews
type CardVariant = 'feature' | 'tall' | 'wide' | 'square'

interface BoardCard extends BoardNewsItem {
  category: BoardCategory
}

const NEWS_ENDPOINT = '/api/news'
const REFRESH_INTERVAL_MS = 5 * 60 * 1000
const BOARD_MIN = 6
const BOARD_LIMIT = 6
const LOCAL_BOARD_CACHE_KEY = 'nepse-news-board-v2'
const CARD_PATTERN: CardVariant[] = [
  'feature', 'tall', 'wide', 'square', 'wide', 'square',
]

const CATEGORY_LABELS: Record<BoardCategory, string> = {
  stocks: 'Stocks',
  gold: 'Gold',
  politics: 'Politics',
  latest: 'Latest',
}

const FALLBACK_IMAGE_BY_CATEGORY: Record<BoardCategory, string> = {
  stocks: '/news/stocks-fallback.svg',
  gold: '/news/gold-fallback.svg',
  politics: '/news/politics-fallback.svg',
  latest: '/news/latest-fallback.svg',
}

const REFERENCE_IMAGE_RULES: Array<{ pattern: RegExp; image: string }> = [
  {
    pattern: /culture|lifestyle|art|arts|movie|film|music|food|travel|book|books|festival|fashion/i,
    image: '/news/culture-reference.svg',
  },
  {
    pattern: /science|technology|tech|digital|ai|research|innovation|education|startup/i,
    image: '/news/science-reference.svg',
  },
  {
    pattern: /world|global|international|war|conflict|china|india|europe|america|middle east|foreign/i,
    image: '/news/world-reference.svg',
  },
]

function itemKey(item: BoardNewsItem): string {
  return (item.url || `${item.title}-${item.publishedAt}`).trim().toLowerCase()
}

function referenceImageForItem(item: BoardCard): string {
  const text = `${item.title} ${item.description}`
  const matched = REFERENCE_IMAGE_RULES.find(rule => rule.pattern.test(text))
  return matched?.image ?? FALLBACK_IMAGE_BY_CATEGORY[item.category]
}

function toBoardItems(news: CategorizedNews): BoardCard[] {
  const board: BoardCard[] = []
  const seen = new Set<string>()

  const pushItems = (category: BoardCategory, items: BoardNewsItem[], limit: number) => {
    let added = 0
    for (const item of items) {
      if (board.length >= BOARD_LIMIT || added >= limit) break
      const key = itemKey(item)
      if (!key || seen.has(key)) continue

      seen.add(key)
      board.push({ ...item, category })
      added += 1
    }
  }

  pushItems('stocks', news.stocks, 2)
  pushItems('politics', news.politics, 2)
  pushItems('latest', news.latest, 2)
  pushItems('gold', news.gold, 1)

  if (board.length < BOARD_MIN) {
    const buckets: Array<[BoardCategory, BoardNewsItem[]]> = [
      ['stocks', news.stocks],
      ['politics', news.politics],
      ['latest', news.latest],
      ['gold', news.gold],
    ]

    for (const [category, items] of buckets) {
      for (const item of items) {
        if (board.length >= BOARD_LIMIT) return board
        const key = itemKey(item)
        if (!key || seen.has(key)) continue

        seen.add(key)
        board.push({ ...item, category })
      }
    }
  }

  return board.slice(0, BOARD_LIMIT)
}

function countNonGoldStories(news: CategorizedNews): number {
  return news.stocks.length + news.politics.length + news.latest.length
}

function hasHealthyBoard(news: CategorizedNews): boolean {
  return toBoardItems(news).length >= BOARD_MIN && countNonGoldStories(news) >= 3
}

function isCategorizedNews(value: unknown): value is CategorizedNews {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return ['stocks', 'gold', 'politics', 'latest']
    .every(key => Array.isArray(candidate[key]))
}

function formatRelativeTime(value: string): string {
  if (!value) return 'Just now'

  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) return value

  const diffMinutes = Math.round((timestamp - Date.now()) / 60000)
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, 'minute')

  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour')

  const diffDays = Math.round(diffHours / 24)
  return rtf.format(diffDays, 'day')
}

function formatPublishedAt(value: string): string {
  if (!value) return 'Latest update'

  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) return value

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

function latestStamp(items: BoardCard[]): string {
  const latest = items
    .map(item => Date.parse(item.publishedAt))
    .filter(value => Number.isFinite(value))
    .sort((left, right) => right - left)[0]

  if (!latest) return 'Auto-updates every 5 min'
  return `Latest ${formatRelativeTime(new Date(latest).toISOString())}`
}

function NewsImage({
  item,
  className,
  alt,
  priority = false,
}: {
  item: BoardCard
  className: string
  alt: string
  priority?: boolean
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={referenceImageForItem(item)}
      alt={alt}
      className={`${className} ${styles.imageFallback}`}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
    />
  )
}

function NewsCard({
  item,
  index,
  onOpen,
}: {
  item: BoardCard
  index: number
  onOpen: (item: BoardCard) => void
}) {
  return (
    <button
      type="button"
      className={styles.card}
      data-category={item.category}
      data-variant={CARD_PATTERN[index % CARD_PATTERN.length]}
      onClick={() => onOpen(item)}
      style={{ animationDelay: `${Math.min(index * 70, 420)}ms` }}
      aria-label={`Open article: ${item.title}`}
    >
      <NewsImage item={item} className={styles.cardMedia} alt="" priority={index < 2} />
      <span className={styles.cardOverlay} />
      <span className={styles.cardContent}>
        <span className={styles.categoryTag} data-category={item.category}>
          <span className={styles.categoryDot} />
          {CATEGORY_LABELS[item.category]}
        </span>
        <span className={styles.cardTitle}>{item.title}</span>
      </span>
    </button>
  )
}

function SkeletonBoard() {
  return (
    <div className={styles.grid} aria-hidden="true">
      {CARD_PATTERN.map((variant, index) => (
        <div
          key={`${variant}-${index}`}
          className={styles.skeletonCard}
          data-variant={variant}
        >
          <span className={styles.skeletonShimmer} />
          <span className={styles.skeletonTag} />
          <span className={styles.skeletonTitleShort} />
          <span className={styles.skeletonTitleLong} />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={styles.emptyState}>
      <p className={styles.emptyEyebrow}>Feed unavailable</p>
      <h2 className={styles.emptyTitle}>The board could not load any stories.</h2>
      <p className={styles.emptyText}>
        Previous content is preserved when refresh fails, but there is nothing cached for this session yet.
      </p>
      <button type="button" className={styles.retryButton} onClick={onRetry}>
        Retry
      </button>
    </div>
  )
}

function StoryModal({
  item,
  onClose,
}: {
  item: BoardCard | null
  onClose: () => void
}) {
  if (!item) return null

  return (
    <div className={styles.modalBackdrop} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="news-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={styles.modalClose}
          onClick={onClose}
          aria-label="Close article details"
        >
          X
        </button>

        <div className={styles.modalMediaWrap}>
          <NewsImage item={item} className={styles.modalMedia} alt={item.title} priority />
          <span className={styles.modalMediaShade} />
        </div>

        <div className={styles.modalBody}>
          <div className={styles.modalMeta}>
            <span className={styles.categoryTag} data-category={item.category}>
              <span className={styles.categoryDot} />
              {CATEGORY_LABELS[item.category]}
            </span>
            <span className={styles.metaText}>{formatRelativeTime(item.publishedAt)}</span>
          </div>

          <h2 id="news-modal-title" className={styles.modalTitle}>{item.title}</h2>
          <p className={styles.modalSummary}>{item.description}</p>

          <div className={styles.modalFooter}>
            <span className={styles.modalTimestamp}>{formatPublishedAt(item.publishedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NewsClient({
  initialData,
}: {
  initialData: CategorizedNews
}) {
  const [selectedItem, setSelectedItem] = useState<BoardCard | null>(null)
  const [storedData] = useState<CategorizedNews | null>(() => {
    if (typeof window === 'undefined') return null

    try {
      const raw = window.localStorage.getItem(LOCAL_BOARD_CACHE_KEY)
      if (!raw) return null

      const parsed: unknown = JSON.parse(raw)
      return isCategorizedNews(parsed) ? parsed : null
    } catch {
      return null
    }
  })
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<CategorizedNews>(
    NEWS_ENDPOINT,
    fetcher,
    {
      fallbackData: initialData,
      refreshInterval: REFRESH_INTERVAL_MS,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      shouldRetryOnError: false,
    },
  )

  useEffect(() => {
    if (!selectedItem) return

    const previousOverflow = document.body.style.overflow
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedItem(null)
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [selectedItem])

  const liveData = data ?? initialData
  const effectiveData = hasHealthyBoard(liveData) ? liveData : (storedData ?? liveData)
  const usingStoredData = effectiveData === storedData && storedData !== null
  const boardItems = toBoardItems(effectiveData)
  const hasBoardItems = boardItems.length > 0
  const currentData = effectiveData

  useEffect(() => {
    if (!hasHealthyBoard(liveData)) return

    try {
      window.localStorage.setItem(LOCAL_BOARD_CACHE_KEY, JSON.stringify(liveData))
    } catch {
      // Ignore storage quota/privacy errors.
    }
  }, [liveData])

  const statusText = error && hasBoardItems
    ? 'Showing previous update'
    : usingStoredData
      ? 'Showing previous update'
    : isValidating
      ? 'Refreshing board...'
      : latestStamp(boardItems)

  return (
    <main className="page-main">
      <div className="container">
        <section className={styles.section}>
          <div className={styles.header}>
            <div className={styles.headerCopy}>
              <p className={styles.eyebrow}>Live news board</p>
              <h1 className={styles.heading}>News</h1>
              <p className={styles.description}>
                A dynamic collage of stocks, gold, politics, and latest headlines. Click any card for the full summary.
              </p>
            </div>

            <div className={styles.headerPills}>
              <span className={styles.headerPill}>
                <strong>{boardItems.length}</strong>
                stories
              </span>
              <span className={styles.headerPill}>{statusText}</span>
            </div>
          </div>

          <div className={styles.summaryRow}>
            {(Object.keys(CATEGORY_LABELS) as BoardCategory[]).map(category => (
              <span key={category} className={styles.summaryChip} data-category={category}>
                <span className={styles.categoryDot} />
                {CATEGORY_LABELS[category]} {currentData[category].length}
              </span>
            ))}
          </div>

          <div className={styles.boardShell}>
            {hasBoardItems ? (
              <div className={styles.grid}>
                {boardItems.map((item, index) => (
                  <NewsCard
                    key={itemKey(item)}
                    item={item}
                    index={index}
                    onOpen={setSelectedItem}
                  />
                ))}
              </div>
            ) : (isLoading || isValidating) ? (
              <SkeletonBoard />
            ) : (
              <EmptyState onRetry={() => void mutate()} />
            )}

            {error && hasBoardItems && (
              <p className={styles.inlineNotice}>
                Live refresh failed. The board is still showing the previous successful update.
              </p>
            )}
          </div>
        </section>
      </div>

      <StoryModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </main>
  )
}
