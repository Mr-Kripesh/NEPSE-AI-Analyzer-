import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import Loading from './loading'
import MarketDashboardWrapper from './MarketDashboardWrapper'

export const metadata: Metadata = {
  title: 'Market Overview — NEPSE AI',
  description: 'Live NEPSE market movers: top gainers, losers, and volume leaders',
}

export default function MarketPage() {
  return (
    <main className="page-main">
      <div className="container">
        <div className="page-header">
          <Link href="/" className="page-back-link">← Home</Link>
          <h1 className="page-title">Market Overview</h1>
        </div>

        <Suspense fallback={<Loading />}>
          <MarketDashboardWrapper />
        </Suspense>
      </div>
    </main>
  )
}
