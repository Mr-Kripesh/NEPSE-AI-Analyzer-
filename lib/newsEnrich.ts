import type { NewsItem } from '@/lib/news'

export interface EnrichedNewsItem extends NewsItem {
  category: string
  sentiment: 'bullish' | 'bearish' | 'neutral'
}

const CATEGORY_RULES: Array<{ name: string; pattern: RegExp }> = [
  { name: 'Share Market', pattern: /share market|stock|stock exchange|nepse|ipo|bonus share|right share|allotment|merolagani|sharesansar|bull|bear/i },
  { name: 'Politics', pattern: /politics|parliament|cabinet|minister|government|prime minister|coalition|election|policy/i },
  { name: 'Metals', pattern: /gold|silver|bullion|tola|hallmark|precious metal/i },
  { name: 'World', pattern: /world|international|global|united states|china|india|russia|middle east|europe|asia/i },
]

const BULLISH_PATTERN = /gain|rise|surge|rally|profit|positive|growth|boost|record|high|increase|jump|climb|improve|strong/i
const BEARISH_PATTERN = /fall|drop|decline|loss|down|negative|crash|low|slump|pressure|weak|plunge|tumble|shrink|decrease/i

export function detectCategory(item: NewsItem): string {
  if (item.category) return item.category

  const text = `${item.title} ${item.summary}`
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(text)) return rule.name
  }
  return 'Share Market'
}

export function detectSentiment(item: NewsItem): 'bullish' | 'bearish' | 'neutral' {
  const text = `${item.title} ${item.summary} ${item.story ?? ''}`
  const bullishScore = (text.match(BULLISH_PATTERN) ?? []).length
  const bearishScore = (text.match(BEARISH_PATTERN) ?? []).length

  if (bullishScore > bearishScore) return 'bullish'
  if (bearishScore > bullishScore) return 'bearish'
  return 'neutral'
}

export function enrichNews(items: NewsItem[]): EnrichedNewsItem[] {
  return items.map(item => ({
    ...item,
    category: detectCategory(item),
    sentiment: detectSentiment(item),
  }))
}
