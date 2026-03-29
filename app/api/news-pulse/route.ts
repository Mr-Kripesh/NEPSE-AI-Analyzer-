import { NextResponse } from 'next/server'
import { buildNewsPulse, getMetalsSnapshot, getNews } from '@/lib/news'
import { enrichNews } from '@/lib/newsEnrich'

export const revalidate = 0

export async function GET() {
  try {
    const [news, metals] = await Promise.all([
      getNews(),
      getMetalsSnapshot().catch(() => null),
    ])

    const pulse = buildNewsPulse(enrichNews(news).map(item => item.title), metals)
    return NextResponse.json(pulse)
  } catch (error: unknown) {
    console.error('[news-pulse]', error)
    return NextResponse.json({ error: 'Service unavailable' }, { status: 500 })
  }
}
