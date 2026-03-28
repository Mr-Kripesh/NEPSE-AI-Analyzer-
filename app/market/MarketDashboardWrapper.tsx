'use client'

import dynamic from 'next/dynamic'

// ssr: false is only valid inside a Client Component
const MarketDashboard = dynamic(() => import('./MarketDashboard'), { ssr: false })

export default function MarketDashboardWrapper() {
  return <MarketDashboard />
}
