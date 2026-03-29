import type { Metadata } from 'next'
import { buildNewsPulse, getMetalsSnapshot, getNews } from '@/lib/news'
import { enrichNews } from '@/lib/newsEnrich'
import NewsClient from './NewsClient'

export const metadata: Metadata = {
  title: 'News Radar - NEPSE AI',
  description: 'Visual live feed for Nepal politics, share market signals, metals, and world news',
}

export const revalidate = 0

export default async function NewsPage() {
  const [news, metals] = await Promise.all([
    getNews(),
    getMetalsSnapshot().catch(() => null),
  ])

  const enriched = enrichNews(news)
  const pulse = buildNewsPulse(enriched.map(item => item.title), metals)

  return <NewsClient items={enriched} pulse={pulse} />
}
