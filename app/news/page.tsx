import type { Metadata } from 'next'
import { getNews } from '@/lib/news'
import { enrichNews } from '@/lib/newsEnrich'
import NewsClient from './NewsClient'

export const metadata: Metadata = {
  title: 'Market News — NEPSE AI',
  description: 'Latest Nepal stock market news from ShareSansar',
}

export default async function NewsPage() {
  const news = await getNews()
  const enriched = enrichNews(news)
  return <NewsClient items={enriched} />
}
