import { NextResponse } from 'next/server'
import { getCategorizedNews } from '@/lib/news'

export const revalidate = 0

export async function GET() {
  try {
    const news = await getCategorizedNews()
    return NextResponse.json(news)
  } catch (error: unknown) {
    console.error('[api/news]', error)
    return NextResponse.json({ error: 'Service unavailable' }, { status: 500 })
  }
}
