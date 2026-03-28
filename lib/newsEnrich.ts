import type { NewsItem } from '@/lib/news'

export interface EnrichedNewsItem extends NewsItem {
  category: string
  sentiment: 'bullish' | 'bearish' | 'neutral'
}

const CATEGORY_RULES: Array<{ name: string; pattern: RegExp }> = [
  { name: 'Banking',  pattern: /bank|bfi|commercial bank|nabil|nica|sunrise|sbi|ncc|kumari|global ime|prime bank|laxmi|citizens/i },
  { name: 'Hydro',   pattern: /hydro|hydropower|electricity|megawatt|\bmw\b|nhpc|water|energy|power plant/i },
  { name: 'Finance', pattern: /finance|microfinance|nbfi|financial|mfi|goodwill|janaki|guheswori/i },
  { name: 'IPO',     pattern: /ipo|public offering|listing|allotment|share issue|fpo|right share/i },
  { name: 'Economy', pattern: /economy|gdp|inflation|budget|monetary|nrb|interest rate|remittance|trade deficit/i },
  { name: 'Global',  pattern: /global|international|world|us dollar|india|china|fed|federal reserve|import|export/i },
]

const BULLISH_PATTERN = /gain|rise|surge|rally|profit|positive|growth|boost|record|high|increase|jump|climb|improve|strong/i
const BEARISH_PATTERN = /fall|drop|decline|loss|down|negative|crash|low|slump|pressure|weak|plunge|tumble|shrink|decrease/i

export function detectCategory(item: NewsItem): string {
  const text = `${item.title} ${item.summary}`
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(text)) return rule.name
  }
  return 'General'
}

export function detectSentiment(item: NewsItem): 'bullish' | 'bearish' | 'neutral' {
  const text = `${item.title} ${item.summary}`
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
