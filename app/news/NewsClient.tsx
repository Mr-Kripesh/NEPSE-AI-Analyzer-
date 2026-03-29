'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'
import type { NewsPulse } from '@/lib/news'
import type { EnrichedNewsItem } from '@/lib/newsEnrich'
import styles from './news.module.css'

type TileVariant = 'feature' | 'tall' | 'wide' | 'square' | 'compact' | 'panorama'

const CATEGORIES = ['All', 'Share Market', 'Politics', 'Metals', 'World']
const TILE_PATTERN: TileVariant[] = [
  'feature', 'tall', 'wide', 'square', 'compact', 'compact',
  'panorama', 'square', 'compact', 'tall', 'wide', 'compact',
]

function relativeTime(dateStr: string): string {
  if (!dateStr) return ''

  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr

  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`

  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`

  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}

function storyParagraphs(item: EnrichedNewsItem): string[] {
  const sourceText = (item.story || item.summary || item.title).trim()
  const sentences = sourceText
    .split(/(?<=[.!?])\s+/)
    .map(sentence => sentence.trim())
    .filter(Boolean)

  if (sentences.length <= 2) return [sourceText]

  const midpoint = Math.ceil(sentences.length / 2)
  return [
    sentences.slice(0, midpoint).join(' '),
    sentences.slice(midpoint).join(' '),
  ]
}

function placeholderWord(category: string): string {
  if (category === 'Politics') return 'CIVIC'
  if (category === 'Metals') return 'AU / AG'
  if (category === 'World') return 'GLOBAL'
  return 'MARKET'
}

function visualClass(category: string): string {
  if (category === 'Politics') return styles.placeholderPolitics
  if (category === 'Metals') return styles.placeholderMetals
  if (category === 'World') return styles.placeholderWorld
  return styles.placeholderMarket
}

function NewsVisual({
  item,
  className,
  priority = false,
}: {
  item: EnrichedNewsItem
  className: string
  priority?: boolean
}) {
  const [imgError, setImgError] = useState(false)

  if (item.category === 'Metals') {
    return (
      <div className={`${className} ${styles.metalsVisual}`} aria-hidden="true">
        <div className={styles.metalsAura} />
        <div className={styles.metalsBars}>
          <span className={`${styles.metalsBar} ${styles.metalsBarWide}`} />
          <span className={`${styles.metalsBar} ${styles.metalsBarTall}`} />
          <span className={`${styles.metalsCoin} ${styles.metalsCoinGold}`} />
          <span className={`${styles.metalsCoin} ${styles.metalsCoinSilver}`} />
        </div>
        <div className={styles.metalsLabel}>Bullion Pulse</div>
      </div>
    )
  }

  if (item.image && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.image}
        alt=""
        className={className}
        loading={priority ? 'eager' : 'lazy'}
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <div className={`${className} ${styles.visualFallback} ${visualClass(item.category)}`} aria-hidden="true">
      <div className={styles.visualGrid} />
      <div className={styles.visualGlyph}>{placeholderWord(item.category)}</div>
    </div>
  )
}

function PulseBar({ pulse }: { pulse: NewsPulse }) {
  const marqueeItems = pulse.flashes.length > 0
    ? [...pulse.flashes, ...pulse.flashes]
    : ['Live headlines syncing', 'Checking sources', 'Stand by for the next update']

  return (
    <section className={styles.pulseBar} aria-label="Live market pulse">
      <div className={styles.pulseMetrics}>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Gold</span>
          <strong className={styles.metricValue}>{pulse.gold}</strong>
          <span className={styles.metricMeta}>per tola</span>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Silver</span>
          <strong className={styles.metricValue}>{pulse.silver}</strong>
          <span className={styles.metricMeta}>per tola</span>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Update</span>
          <strong className={styles.metricValue}>{pulse.metalsUpdatedAt || 'Live'}</strong>
          <span className={styles.metricMeta}>scraped every 5 min</span>
        </div>
      </div>

      <div className={styles.flashRail}>
        <span className={styles.flashLabel}>Flash Feed</span>
        <div className={styles.flashViewport}>
          <div className={styles.flashTrack}>
            {marqueeItems.map((headline, index) => (
              <span key={`${headline.slice(0, 24)}-${index}`} className={styles.flashItem}>
                {headline}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function CategoryBar({
  active,
  onChange,
}: {
  active: string
  onChange: (value: string) => void
}) {
  return (
    <div className={styles.categoryBar} role="tablist" aria-label="News categories">
      {CATEGORIES.map(category => (
        <button
          key={category}
          type="button"
          role="tab"
          aria-selected={active === category}
          className={`${styles.categoryChip} ${active === category ? styles.categoryChipActive : ''}`}
          onClick={() => onChange(category)}
        >
          {category}
        </button>
      ))}
    </div>
  )
}

function tileVariantClass(variant: TileVariant): string {
  if (variant === 'feature') return styles.tileFeature
  if (variant === 'tall') return styles.tileTall
  if (variant === 'wide') return styles.tileWide
  if (variant === 'panorama') return styles.tilePanorama
  if (variant === 'compact') return styles.tileCompact
  return styles.tileSquare
}

function MosaicTile({
  item,
  variant,
  index,
  onOpen,
}: {
  item: EnrichedNewsItem
  variant: TileVariant
  index: number
  onOpen: (item: EnrichedNewsItem) => void
}) {
  return (
    <button
      type="button"
      className={`${styles.tile} ${tileVariantClass(variant)}`}
      onClick={() => onOpen(item)}
      aria-label={`Open story: ${item.title}`}
      title={item.title}
    >
      <span className={styles.tilePrint}>
        <NewsVisual item={item} className={styles.tileMedia} priority={index < 5} />
      </span>
    </button>
  )
}

function StoryModal({
  item,
  onClose,
}: {
  item: EnrichedNewsItem | null
  onClose: () => void
}) {
  if (!item) return null

  const paragraphs = storyParagraphs(item)

  return (
    <div className={styles.modalBackdrop} onClick={onClose} role="presentation">
      <div
        className={styles.modalCard}
        role="dialog"
        aria-modal="true"
        aria-labelledby="news-story-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Close story">
          Close
        </button>

        <div className={styles.modalVisualWrap}>
          <NewsVisual item={item} className={styles.modalVisual} priority />
          <div className={styles.modalVisualShade} />
        </div>

        <div className={styles.modalBody}>
          <div className={styles.modalMetaRow}>
            <span className={styles.modalMetaPill}>{item.category}</span>
            <span>News</span>
            {item.date && <span>{relativeTime(item.date)}</span>}
          </div>

          <h2 id="news-story-title" className={styles.modalTitle}>{item.title}</h2>

          <div className={styles.modalStory}>
            {paragraphs.map((paragraph, index) => (
              <p key={`${item.title.slice(0, 24)}-${index}`}>{paragraph}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  const router = useRouter()

  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyGlyph}>NO FEED</div>
      <h2 className={styles.emptyTitle}>The visual feed is quiet right now</h2>
      <p className={styles.emptySubtitle}>
        The sources did not return enough stories for the mosaic. Refresh to try the live collectors again.
      </p>
      <button type="button" className={styles.emptyButton} onClick={() => router.refresh()}>
        Refresh feed
      </button>
    </div>
  )
}

export default function NewsClient({
  items,
  pulse,
}: {
  items: EnrichedNewsItem[]
  pulse: NewsPulse
}) {
  const [activeCategory, setActiveCategory] = useState('All')
  const [selectedItem, setSelectedItem] = useState<EnrichedNewsItem | null>(null)
  const { data: livePulse } = useSWR<NewsPulse>(
    '/api/news-pulse',
    fetcher,
    {
      fallbackData: pulse,
      refreshInterval: 5 * 60 * 1000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
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

  const filteredItems = activeCategory === 'All'
    ? items
    : items.filter(item => item.category === activeCategory)
  const currentPulse = livePulse ?? pulse

  return (
    <main className="page-main">
      <div className="container">
        <div className={styles.heroHeader}>
          <div>
            <div className={styles.breadcrumb}>
              <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link>
              <span>›</span>
              <span>News</span>
            </div>
            <p className={styles.kicker}>Visual Signal Board</p>
            <h1 className={styles.title}>News Radar</h1>
            <p className={styles.subtitle}>
              Image-first collage for Nepal politics, share market flow, metals, and world signals. Tap any frame to open a short direct story.
            </p>
          </div>

          <div className={styles.headerStats}>
            <div className={styles.headerStat}>
              <strong>{items.length}</strong>
              <span>live frames</span>
            </div>
            <div className={styles.headerStat}>
              <strong>{currentPulse.flashes.length || 0}</strong>
              <span>headlines live</span>
            </div>
            <div className={styles.headerStat}>
              <strong>{currentPulse.metalsUpdatedAt || 'Live'}</strong>
              <span>metals pulse</span>
            </div>
          </div>
        </div>

        <PulseBar pulse={currentPulse} />
        <CategoryBar active={activeCategory} onChange={setActiveCategory} />

        {filteredItems.length === 0 ? (
          <EmptyState />
        ) : (
          <section className={styles.stage}>
            <div className={styles.stageTopline}>
              <span className={styles.stageLabel}>Collage board</span>
              <span className={styles.stageHint}>Hover to enlarge a frame, click to open the mini story box</span>
            </div>

            <div className={styles.mosaicGrid}>
              {filteredItems.map((item, index) => (
                <MosaicTile
                  key={`${item.title.slice(0, 42)}-${index}`}
                  item={item}
                  index={index}
                  variant={TILE_PATTERN[index % TILE_PATTERN.length]}
                  onOpen={setSelectedItem}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <StoryModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </main>
  )
}
