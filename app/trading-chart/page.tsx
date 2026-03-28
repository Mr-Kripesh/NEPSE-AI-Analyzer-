import type { Metadata } from 'next'
import Link from 'next/link'
import TradingChartClient from './TradingChartClient'

export const metadata: Metadata = {
  title: 'Trading Chart — NEPSE AI',
  description: 'Interactive NEPSE stock charts with drawing tools, indicators, and full charting features',
}

export default function TradingChartPage() {
  return (
    <main className="page-main">
      {/* TradingView widget library */}
      <script src="https://s3.tradingview.com/tv.js" async />

      <div className="container tc-container">
        <div className="page-header">
          <Link href="/" className="page-back-link">← Home</Link>
          <h1 className="page-title">Trading Chart</h1>
        </div>

        <TradingChartClient />
      </div>
    </main>
  )
}
