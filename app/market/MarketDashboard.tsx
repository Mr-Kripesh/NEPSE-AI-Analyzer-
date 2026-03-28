'use client'

import clsx from 'clsx'
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'
import styles from './MarketDashboard.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────

type Price = {
  ltp: string
  change: string
  open: string
  high: string
  low: string
  volume: string
}

type MarketData = {
  prices: Record<string, Price>
  count: number
  cachedAt: string | null
  lastValidAt: string | null
  source: string
  isLastTradingDay: boolean
  error?: string
}

type StockRow = {
  symbol: string
  ltp: string
  changePct: number
  volume: number
}

type Accent = 'teal' | 'red' | 'gold'

// ── Accent class maps ──────────────────────────────────────────────────────────

const SECTION_ACCENT: Record<Accent, string> = {
  teal: styles.sectionTeal,
  red:  styles.sectionRed,
  gold: styles.sectionGold,
}

const HEADING_ACCENT: Record<Accent, string> = {
  teal: styles.headingTeal,
  red:  styles.headingRed,
  gold: styles.headingGold,
}

// ── Data derivation ───────────────────────────────────────────────────────────

function toRows(prices: Record<string, Price>): StockRow[] {
  return Object.entries(prices).map(([symbol, p]) => ({
    symbol,
    ltp: p.ltp,
    changePct: parseFloat(p.change) || 0,
    volume: parseFloat(p.volume) || 0,
  }))
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonBar({ className }: { className: string }) {
  return <span className={clsx('animate-pulse', styles.skeletonBar, className)} />
}

function SkeletonRow() {
  return (
    <div className={styles.skeletonRow}>
      <SkeletonBar className={styles.skeletonW52} />
      <div className={styles.skeletonRowRight}>
        <SkeletonBar className={styles.skeletonW60} />
        <SkeletonBar className={styles.skeletonW44} />
      </div>
    </div>
  )
}

function SectionSkeleton({ title, accent }: { title: string; accent: Accent }) {
  return (
    <section className={clsx(styles.section, SECTION_ACCENT[accent])}>
      <h2 className={clsx(styles.heading, HEADING_ACCENT[accent])}>{title}</h2>
      {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
    </section>
  )
}

// ── Stock row ─────────────────────────────────────────────────────────────────

function StockRow({ row, showVolume }: { row: StockRow; showVolume?: boolean }) {
  const isUp = row.changePct >= 0

  const formattedVolume =
    row.volume >= 1_000_000
      ? `${(row.volume / 1_000_000).toFixed(2)}M`
      : row.volume >= 1_000
      ? `${(row.volume / 1_000).toFixed(1)}K`
      : String(row.volume)

  return (
    <div className={styles.stockRow}>
      <span className={styles.stockSymbol}>{row.symbol}</span>
      <div className={styles.stockRight}>
        {showVolume ? (
          <span className={styles.stockVolume}>{formattedVolume}</span>
        ) : (
          <span className={styles.stockPrice}>Rs.{row.ltp}</span>
        )}
        <span className={isUp ? styles.changeUp : styles.changeDown}>
          {isUp && row.changePct !== 0 ? '+' : ''}{row.changePct.toFixed(2)}%
        </span>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function MarketDashboard() {
  const { data, error, isLoading } = useSWR<MarketData>(
    '/api/market-data',
    fetcher,
    { refreshInterval: 30_000 },
  )

  if (isLoading) {
    return (
      <div className={styles.grid}>
        <SectionSkeleton title="Top Gainers"    accent="teal" />
        <SectionSkeleton title="Top Losers"     accent="red"  />
        <SectionSkeleton title="Volume Leaders" accent="gold" />
      </div>
    )
  }

  if (error || !data?.prices) {
    return (
      <p className={styles.errorMsg}>
        Market data unavailable. Please try again later.
      </p>
    )
  }

  const rows = toRows(data.prices)
  const gainers = rows
    .filter(r => r.changePct > 0)
    .sort((a, b) => b.changePct - a.changePct)
    .slice(0, 5)
  const losers = rows
    .filter(r => r.changePct < 0)
    .sort((a, b) => a.changePct - b.changePct)
    .slice(0, 5)
  const volumeLeaders = [...rows]
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5)

  const displayAt = data.isLastTradingDay ? data.lastValidAt : data.cachedAt
  const updatedAt = displayAt
    ? new Date(displayAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <div>
      {data.isLastTradingDay && (
        <p className={styles.lastDayNote}>
          📅 Market closed · Showing last trading day data
        </p>
      )}
      {updatedAt && (
        <p className={styles.updatedAt}>
          Updated {updatedAt} · Refreshes every 30s · {data.count} stocks tracked
        </p>
      )}

      <div className={styles.grid}>
        <section className={clsx(styles.section, styles.sectionTeal)}>
          <h2 className={clsx(styles.heading, styles.headingTeal)}>Top Gainers</h2>
          {gainers.length === 0 ? (
            <p className={styles.noData}>No gainers right now</p>
          ) : (
            gainers.map(r => <StockRow key={r.symbol} row={r} />)
          )}
        </section>

        <section className={clsx(styles.section, styles.sectionRed)}>
          <h2 className={clsx(styles.heading, styles.headingRed)}>Top Losers</h2>
          {losers.length === 0 ? (
            <p className={styles.noData}>No losers right now</p>
          ) : (
            losers.map(r => <StockRow key={r.symbol} row={r} />)
          )}
        </section>

        <section className={clsx(styles.section, styles.sectionGold)}>
          <h2 className={clsx(styles.heading, styles.headingGold)}>Volume Leaders</h2>
          {volumeLeaders.length === 0 ? (
            <p className={styles.noData}>No data right now</p>
          ) : (
            volumeLeaders.map(r => <StockRow key={r.symbol} row={r} showVolume />)
          )}
        </section>
      </div>
    </div>
  )
}
