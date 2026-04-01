import type { Metadata } from 'next'
import { getCategorizedNews, type CategorizedNews } from '@/lib/news'
import NewsClient from './NewsClient'

export const metadata: Metadata = {
  title: 'News - NEPSE AI',
  description: 'Live collage board for stocks, gold, politics, and latest market headlines.',
}

export const revalidate = 0

export default async function NewsPage() {
  const initialData: CategorizedNews = await getCategorizedNews().catch(() => ({
    stocks: [],
    gold: [],
    politics: [],
    latest: [],
  }))

  return <NewsClient initialData={initialData} />
}
