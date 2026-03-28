import Anthropic from '@anthropic-ai/sdk'

interface Insight {
  text: string
  confidence: number
  sentiment: 'bullish' | 'bearish' | 'neutral'
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'API key not configured' }, { status: 503 })
  }

  let headlines: string[] = []
  try {
    const body = await request.json() as { headlines?: unknown }
    if (Array.isArray(body.headlines)) {
      headlines = body.headlines.filter((h): h is string => typeof h === 'string').slice(0, 15)
    }
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (headlines.length === 0) {
    return Response.json({ insights: [] })
  }

  const client = new Anthropic({ apiKey })

  const prompt = `You are a NEPSE (Nepal Stock Exchange) market analyst. Analyze these headlines and return exactly 3 JSON insights about sector trends. Each insight must be ≤10 words.

Headlines:
${headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}

Respond with ONLY a valid JSON array, no other text:
[{"text":"insight here","confidence":75,"sentiment":"bullish"},...]

sentiment must be "bullish", "bearish", or "neutral". confidence is 0-100.`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

    // Extract JSON array from response
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) return Response.json({ error: 'Bad model response' }, { status: 502 })

    const parsed: unknown = JSON.parse(match[0])
    if (!Array.isArray(parsed)) return Response.json({ error: 'Bad model response' }, { status: 502 })

    const insights: Insight[] = (parsed as Record<string, unknown>[])
      .slice(0, 3)
      .map(item => ({
        text: String(item.text ?? '').trim(),
        confidence: Math.min(100, Math.max(0, Number(item.confidence ?? 50))),
        sentiment: (['bullish', 'bearish', 'neutral'].includes(String(item.sentiment)))
          ? (item.sentiment as Insight['sentiment'])
          : 'neutral',
      }))
      .filter(i => i.text.length > 0)

    return Response.json({ insights })
  } catch (err) {
    console.error('[news-insights] Claude error:', err)
    return Response.json({ error: 'AI request failed' }, { status: 502 })
  }
}
