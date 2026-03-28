import type { Metadata } from 'next'
import Link from 'next/link'
import { STATIC_STOCKS } from '@/lib/companies'
import StockList from './StockList'

export const metadata: Metadata = {
  title: 'All Stocks — NEPSE AI',
  description: 'Browse all NEPSE-listed companies with search, filter by sector, and sort',
}

export default function StocksPage() {
  // Derive unique sectors from the static company list, sorted alphabetically
  const sectors = Array.from(new Set(STATIC_STOCKS.map(s => s.sector))).sort()

  return (
    <main className="page-main">
      <div className="container">
        <div className="page-header">
          <Link href="/" className="page-back-link">← Home</Link>
          <h1 className="page-title">All Stocks</h1>
        </div>

        <StockList stocks={STATIC_STOCKS} sectors={sectors} />
      </div>
    </main>
  )
}
