'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import styles from './StockList.module.css'

interface Stock {
  symbol: string
  name: string
  sector: string
}

interface Props {
  stocks: Stock[]
  sectors: string[]
}

type SortKey = 'symbol-asc' | 'symbol-desc' | 'name-asc' | 'sector-asc'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'symbol-asc',  label: 'Symbol A → Z' },
  { value: 'symbol-desc', label: 'Symbol Z → A' },
  { value: 'name-asc',   label: 'Name A → Z'   },
  { value: 'sector-asc', label: 'Sector'        },
]

export default function StockList({ stocks, sectors }: Props) {
  const [query,  setQuery]  = useState('')
  const [sector, setSector] = useState('All')
  const [sort,   setSort]   = useState<SortKey>('symbol-asc')

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase()
    return stocks
      .filter(s =>
        (sector === 'All' || s.sector === sector) &&
        (!q || s.symbol.includes(q) || s.name.toUpperCase().includes(q))
      )
      .sort((a, b) => {
        switch (sort) {
          case 'symbol-desc': return b.symbol.localeCompare(a.symbol)
          case 'name-asc':   return a.name.localeCompare(b.name)
          case 'sector-asc': return a.sector.localeCompare(b.sector) || a.symbol.localeCompare(b.symbol)
          default:           return a.symbol.localeCompare(b.symbol)
        }
      })
  }, [stocks, query, sector, sort])

  return (
    <div>
      {/* ── Controls ── */}
      <div className={styles.controls}>
        <input
          type="text"
          placeholder="Search symbol or name…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className={styles.searchInput}
        />
        <select
          aria-label="Filter by sector"
          value={sector}
          onChange={e => setSector(e.target.value)}
          className={styles.select}
        >
          <option value="All">All Sectors</option>
          {sectors.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          aria-label="Sort order"
          value={sort}
          onChange={e => setSort(e.target.value as SortKey)}
          className={styles.select}
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* ── Count ── */}
      <p className={styles.count}>
        {filtered.length} of {stocks.length} companies
      </p>

      {/* ── List ── */}
      {filtered.length === 0 ? (
        <p className={styles.noResults}>
          No stocks match your search.
        </p>
      ) : (
        <div className={styles.list}>
          {filtered.map(stock => (
            <div key={stock.symbol} className={styles.row}>
              {/* Symbol + Name */}
              <div className={styles.info}>
                <span className={styles.symbol}>{stock.symbol}</span>
                <span className={styles.name}>{stock.name}</span>
              </div>

              {/* Sector badge */}
              <span className={styles.sector}>{stock.sector}</span>

              {/* Analyze button */}
              <Link
                href={`/?q=${encodeURIComponent(stock.symbol)}`}
                className={styles.analyzeLink}
              >
                Analyze →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
