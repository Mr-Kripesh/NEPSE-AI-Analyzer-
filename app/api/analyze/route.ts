import { NextRequest, NextResponse } from 'next/server';
import { COMPANIES } from '@/lib/companies';
import { getMarketPriceMap } from '../market-data/route';
import { SignalSchema } from '@/lib/schema';
import { getFundamentals } from '@/lib/nepse-db';
import { load } from 'cheerio';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';

// ── Live data cache (24h TTL — fundamentals change quarterly) ─────────────────
interface LiveData {
  ltp: string; change1y: string;
  eps: string; pe: string; bookValue: string; dividend: string;
  high52: string; low52: string; marketCap: string;
}
const liveCache = new Map<string, { data: LiveData; fetchedAt: number }>();
const LIVE_TTL_MS = 24 * 60 * 60 * 1000;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Strip annotation suffixes: "5.33 (FY:082-083, Q:2)" → 5.33 */
function cleanNum(v: string): number {
  const token = v.split(/[\s(]/)[0].replace(/,/g, '');
  return parseFloat(token);
}

function toArray(json: unknown): Record<string, unknown>[] {
  if (Array.isArray(json)) return json as Record<string, unknown>[];
  const j = json as Record<string, unknown>;
  for (const key of ['object', 'data', 'content', 'stocks', 'result', 'prices', 'body']) {
    if (Array.isArray(j?.[key])) return j[key] as Record<string, unknown>[];
  }
  return [];
}

/**
 * Build a normalised label→value map from raw HTML.
 * Handles: table rows, definition lists, two-child containers (e.g. .metric-row).
 */
function buildKV(html: string): Record<string, string> {
  const $ = load(html);
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const kv: Record<string, string> = {};
  const add = (label: string, value: string) => {
    const k = norm(label); const v = value.trim();
    if (k.length >= 2 && v) kv[k] = v;
  };

  // 1. Table rows (2-cell and 4-cell layouts)
  $('table tr').each((_, tr) => {
    const cells = $(tr).find('td, th');
    for (let i = 0; i + 1 < cells.length; i += 2)
      add($(cells[i]).text(), $(cells[i + 1]).text());
  });

  // 2. Definition lists
  $('dt').each((_, dt) => add($(dt).text(), $(dt).next('dd').text()));

  // 3. Two-child containers — covers .metric-row, .metric-item, stat cards, etc.
  $('div, li, span').each((_, el) => {
    const kids = $(el).children();
    if (kids.length === 2) {
      const label = kids.first().text().trim();
      const value = kids.last().text().trim();
      if (norm(label).length >= 2 && norm(label).length <= 60 && value.length >= 1 && value.length <= 80)
        add(label, value);
    }
  });

  return kv;
}

/**
 * Extract well-known financial fields from a kv map.
 * Uses startsWith matching (not includes) to prevent short keys like "pe"
 * from falsely matching unrelated labels like "operationdate".
 */
function extractFields(kv: Record<string, string>, ticker: string, source: string): Partial<LiveData> {
  const get = (...keys: string[]): string => {
    for (const k of keys)
      for (const [label, value] of Object.entries(kv))
        if (label === k || label.startsWith(k)) return value;
    return '';
  };

  const n = (v: string): string => {
    const num = cleanNum(v);
    return (!isNaN(num) && num > 0) ? num.toFixed(2) : '';
  };

  const ltp       = n(get('marketprice', 'ltp', 'lasttradedprice', 'currentprice', 'closeprice', 'lasttraded'));
  const eps       = n(get('eps', 'earningpershare', 'earningspershare', 'basiceps'));
  // Use long-form labels only — short "pe" matches "operationdate", "type", etc.
  const pe        = n(get('peratio', 'priceearning', 'pricetoearn', 'pricetoearning'));
  const bookValue = n(get('bookvalue', 'networthpershare', 'netassetvalue', 'navperunit', 'nabperunit', 'bvps'));
  const dividend  = n(get('cashdividend', 'dividendpershare', 'dividendyield', 'dividend'));
  const marketCapRaw = get('marketcapitalization', 'marketcap', 'mktcap');
  const marketCap = marketCapRaw ? parseFloat(marketCapRaw.replace(/[^0-9.]/g, '')).toString() : '';

  // 52W range: "344.90-272.30" or "344.90 / 272.30" → split into high + low
  const range52Raw = get('52weekshighlow', '52weekshl', '52week', '52whighlow');
  let high52 = '', low52 = '';
  if (range52Raw) {
    const nums = (range52Raw.match(/[\d,]+\.?\d*/g) ?? [])
      .map(m => parseFloat(m.replace(/,/g, ''))).filter(n => !isNaN(n) && n > 0);
    if (nums.length >= 2) {
      high52 = Math.max(...nums).toFixed(2);
      low52  = Math.min(...nums).toFixed(2);
    }
  }
  if (!high52) high52 = n(get('52weekhigh', '52whigh', 'yearlyhigh'));
  if (!low52)  low52  = n(get('52weeklow',  '52wlow',  'yearlylow'));

  // 1-year yield
  const yieldRaw = get('1yearyield', 'yearyield', '1year', 'oneyearyield');
  const yieldNum = yieldRaw ? cleanNum(yieldRaw) : NaN;
  const change1y = (!isNaN(yieldNum) && yieldNum !== 0)
    ? (yieldNum >= 0 ? '+' : '') + yieldNum.toFixed(2) + '%' : '';

  console.log(`[${source}] ${ticker}: ltp=${ltp} eps=${eps} pe=${pe} bv=${bookValue} div=${dividend}`);
  return { ltp, eps, pe, bookValue, dividend, marketCap, high52, low52, change1y };
}

// ── Source 1: MeroLagani company detail page ──────────────────────────────────
async function tryMeroLagani(ticker: string): Promise<Partial<LiveData> | null> {
  try {
    const res = await fetch(
      `https://merolagani.com/CompanyDetail.aspx?symbol=${ticker}`,
      {
        headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml', 'Referer': 'https://merolagani.com/' },
        signal: AbortSignal.timeout(12000),
      }
    );
    if (!res.ok) return null;
    const fields = extractFields(buildKV(await res.text()), ticker, 'MeroLagani');
    return (fields.ltp || fields.eps || fields.pe || fields.bookValue) ? fields : null;
  } catch { return null; }
}

// ── Source 2: ShareHub Nepal company page ─────────────────────────────────────
async function tryShareHub(ticker: string): Promise<Partial<LiveData> | null> {
  try {
    const res = await fetch(
      `https://sharehubnepal.com/company/${ticker.toLowerCase()}`,
      {
        headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml', 'Referer': 'https://sharehubnepal.com/' },
        signal: AbortSignal.timeout(12000),
      }
    );
    if (!res.ok) return null;
    const fields = extractFields(buildKV(await res.text()), ticker, 'ShareHub');
    return (fields.ltp || fields.eps || fields.pe || fields.bookValue) ? fields : null;
  } catch { return null; }
}

// ── Source 3: Bulk price API — last resort if scraping misses ltp ─────────────
async function tryBulkPrice(ticker: string): Promise<string | null> {
  const BULK = [
    'https://nepseapi.surajrimal.dev/v1/price/today',
    'https://nepseapi.surajrimal.dev/nepse/today',
    'https://nepseapi.surajrimal.dev/market',
    'https://nepseapi.surajrimal.dev/v1/nepse/all',
    'https://nepseapi.surajrimal.dev/nepse/all',
  ];
  for (const url of BULK) {
    try {
      const res = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': UA }, signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const items = toArray(await res.json());
      if (items.length < 10) continue;
      const entry = items.find(i => String(i.symbol ?? i.stockSymbol ?? i.ticker ?? i.scrip ?? '').toUpperCase() === ticker);
      if (!entry) continue;
      for (const k of ['ltp', 'lastTradedPrice', 'close', 'closingPrice', 'price']) {
        const v = (entry as Record<string, unknown>)[k];
        if (v != null) { const num = parseFloat(String(v)); if (!isNaN(num) && num > 0) return num.toFixed(2); }
      }
    } catch { continue; }
  }
  try {
    const res = await fetch(`https://nepsetty.kokomo.workers.dev/api?symbol=${ticker}`,
      { headers: { 'Accept': 'application/json', 'User-Agent': UA }, signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const json = await res.json() as Record<string, unknown>;
      for (const k of ['ltp', 'lastTradedPrice', 'close', 'price', 'closingPrice']) {
        const v = json[k];
        if (v != null) { const num = parseFloat(String(v)); if (!isNaN(num) && num > 0) return num.toFixed(2); }
      }
    }
  } catch { /* no-op */ }
  return null;
}

// ── Orchestrate: run scrapers in parallel, merge, cache 24h ───────────────────
async function getLiveData(ticker: string): Promise<{ data: LiveData; source: string }> {
  const cached = liveCache.get(ticker);
  if (cached && Date.now() - cached.fetchedAt < LIVE_TTL_MS)
    return { data: cached.data, source: 'cache' };

  const [ml, sh] = await Promise.all([tryMeroLagani(ticker), tryShareHub(ticker)]);

  const data: LiveData = {
    ltp:       ml?.ltp       || sh?.ltp       || '',
    change1y:  ml?.change1y  || sh?.change1y  || '',
    eps:       ml?.eps       || sh?.eps       || '',
    pe:        ml?.pe        || sh?.pe        || '',
    bookValue: ml?.bookValue || sh?.bookValue || '',
    dividend:  ml?.dividend  || sh?.dividend  || '',
    high52:    ml?.high52    || sh?.high52    || '',
    low52:     ml?.low52     || sh?.low52     || '',
    marketCap: ml?.marketCap || sh?.marketCap || '',
  };

  const hasData = !!(data.eps || data.pe || data.bookValue || data.ltp);
  const source  = !hasData ? 'unavailable'
    : (ml?.eps || ml?.pe || ml?.ltp ? 'merolagani' : 'sharehub');

  if (hasData) {
    liveCache.set(ticker, { data, fetchedAt: Date.now() });
    return { data, source };
  }

  // DB fallback
  try {
    const db = await getFundamentals(ticker);
    if (db && (db.eps || db.pe || db.bookValue)) {
      const dbData: LiveData = {
        ltp: db.ltp || '', change1y: db.yield1y || '',
        eps: db.eps || '', pe: db.pe || '', bookValue: db.bookValue || '',
        dividend: db.dividend || '', high52: db.high52 || '', low52: db.low52 || '',
        marketCap: db.marketCap || '',
      };
      liveCache.set(ticker, { data: dbData, fetchedAt: Date.now() });
      return { data: dbData, source: 'db' };
    }
  } catch { /* non-fatal */ }

  return { data, source: 'unavailable' };
}

// ── Format market cap for display ─────────────────────────────────────────────
function formatMCap(val: string): string {
  if (val.startsWith('Rs.')) return val;
  const n = parseFloat(val.replace(/[^0-9.]/g, ''));
  if (isNaN(n) || n === 0) return 'N/A';
  if (n >= 1e12) return `Rs.${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `Rs.${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `Rs.${(n / 1e6).toFixed(2)}M`;
  return `Rs.${n.toLocaleString('en-IN')}`;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function extractMessageText(content: unknown): string {
  if (typeof content === 'string') return content.trim();
  if (!Array.isArray(content)) return '';

  return content
    .map((part) => {
      const item = asObject(part);
      return item.type === 'text' ? String(item.text ?? '') : '';
    })
    .join('\n')
    .trim();
}

function cleanText(value: unknown, max = 600): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

// ── POST /api/analyze ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { ticker, company: reqCompany, sector: reqSector, price: reqPrice } = await req.json();
    if (!ticker) throw new Error('No ticker provided');
    const t = ticker.toUpperCase();

    const known         = COMPANIES[t];
    const skipPriceCall = !!(reqPrice && parseFloat(reqPrice) > 0);

    const [liveResult, priceMap, dbEntry] = await Promise.all([
      getLiveData(t),
      getMarketPriceMap(),
      getFundamentals(t),
    ]);

    const ld         = liveResult.data;
    const scrapedLtp = ld.ltp || null;

    // Only call bulk price if scraping didn't get us a price
    const bulkPrice = (!skipPriceCall && !scrapedLtp) ? await tryBulkPrice(t) : null;

    const price = (skipPriceCall ? reqPrice : null)
               || scrapedLtp
               || priceMap.get(t)?.ltp
               || bulkPrice
               || dbEntry?.ltp
               || '';

    const change1y = ld.change1y || dbEntry?.yield1y || 'N/A';
    const company  = reqCompany || known?.name || t;
    const sector   = reqSector  || known?.sector || 'N/A';

    const displayPrice = price        ? `Rs.${parseFloat(price).toFixed(2)}` : 'N/A';
    const displayEps   = ld.eps       ? `Rs.${ld.eps}`       : 'N/A';
    const displayBV    = ld.bookValue ? `Rs.${ld.bookValue}` : 'N/A';
    const displayMCap  = ld.marketCap ? formatMCap(ld.marketCap) : 'N/A';
    const displayRange = (ld.high52 && ld.low52) ? `Rs.${ld.low52} – Rs.${ld.high52}` : 'N/A';
    const displayPE    = ld.pe       || 'N/A';
    const displayDiv   = ld.dividend || 'N/A';

    const priceSource = skipPriceCall  ? 'Provided'
      : scrapedLtp                     ? `Live (${liveResult.source === 'merolagani' ? 'MeroLagani' : 'ShareHub'})`
      : priceMap.get(t)?.ltp           ? 'Live (NEPSE trade stat)'
      : bulkPrice                      ? 'Live (nepseapi.surajrimal.dev)'
      : dbEntry?.ltp                   ? 'DB (last sync)'
      : 'Unavailable';

    const dataSource = liveResult.source === 'merolagani' ? '🟢 Live (MeroLagani)'
      : liveResult.source === 'sharehub'                  ? '🟢 Live (ShareHub)'
      : liveResult.source === 'cache'                     ? '🔵 Cached (<24h)'
      : liveResult.source === 'db'                        ? '🗄️ DB (Quarterly Fundamentals)'
      : '❌ Fundamentals unavailable';

    const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 900,
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content: `You are a highly experienced NEPSE (Nepal Stock Exchange) stock analyst with over 15 years of experience. Your analysis must be professional, balanced, honest, and easy for retail investors to understand.

Analyze the following stock data and generate a trading signal.

**Stock Data:**
- AI Recommendation: HOLD
- PE Ratio: 63.43
- Current Price: Near 52-week high of Rs. 334.00

Reply with **ONLY valid JSON** — no extra text, no markdown, no explanations.

Your entire response must follow this exact structure:
{
  "signal": "BUY" | "SELL" | "HOLD",
  "confidence": integer between 0 and 100,
  "risk": "Low" | "Medium" | "High",
  "explanation": {
    "summary": "string",
    "financials": "string",
    "context": "string",
    "risks": "string",
    "verdict": "string"
  }
}

Rules for each field:
- signal: Must be exactly "BUY", "SELL", or "HOLD". Choose based on real analysis, not just the given AI recommendation.
- confidence: Integer 0–100. Be realistic — high PE near 52W high usually means lower confidence for buying.
- risk: Must be "Low", "Medium", or "High"

Explanation fields (write in clear, simple Nepali-English mixed language suitable for Nepalese retail investors):

- summary: Start with "You should [HOLD/BUY/SELL] this stock because..." then explain in 4-5 sentences in plain language. Make it direct, actionable, and convincing. Explain what the high PE ratio means and why the stock is near its 52-week high.

- financials: 3-5 sentences focusing on valuation (especially PE 63.43), price position near Rs.334, and what these numbers actually mean for the investor.

- context: 2-3 sentences about possible sector trends, company performance, or market conditions in Nepal.

- risks: 2-3 sentences honestly highlighting the main risks, especially high valuation risk and what can go wrong if earnings don't justify the price.

- verdict: 2-3 sentences giving a strong final take — clear advice on what the investor should do now and why.

Be honest and data-driven. A PE ratio of 63.43 is considered very expensive in most markets. Do not sugarcoat it.`
          },
          {
            role: 'user',
            content: `Analyze ${t} — ${company} (${sector})

Market Data:
- Price: ${displayPrice}
- 52W Range: ${displayRange}
- 1Y Return: ${change1y}
- EPS: ${displayEps}
- PE Ratio: ${displayPE}
- Book Value: ${displayBV}
- Market Cap: ${displayMCap}
- Dividend: ${displayDiv}

Respond with only the JSON signal object.`,
          },
        ],
      }),
    });

    const aiData = await aiRes.json();
    if (!aiRes.ok) throw new Error(aiData.error?.message || 'AI error');

    const text  = extractMessageText(aiData.choices?.[0]?.message?.content);
    const match = text.match(/\{[\s\S]*\}/);
    let rawParsed: Record<string, unknown> = {};
    if (match) {
      try {
        rawParsed = asObject(JSON.parse(match[0]));
      } catch (parseError) {
        console.warn('[analyze] Failed to parse AI JSON, falling back to default signal.', {
          error: parseError,
          preview: text.slice(0, 1200),
        });
      }
    } else {
      console.warn('[analyze] AI response did not include a JSON object, falling back to default signal.', {
        preview: text.slice(0, 1200),
      });
    }

    const rawExplanation = asObject(rawParsed.explanation);
    const summaryText = cleanText(rawExplanation.summary, 900);
    const financialsText = cleanText(rawExplanation.financials, 900);
    const contextText = cleanText(rawExplanation.context, 900);
    const risksText = cleanText(rawExplanation.risks, 900);
    const verdictText = cleanText(rawExplanation.verdict, 900);
    const shortReason = cleanText(rawParsed.reason, 300)
      || cleanText(rawExplanation.summary, 300)
      || cleanText(rawExplanation.verdict, 300);

    const riskMap: Record<string, 'Low' | 'Medium' | 'High'> = { low: 'Low', medium: 'Medium', high: 'High' };
    const normalised = {
      signal:     String(rawParsed.signal ?? '').toUpperCase(),
      confidence: Math.round(Number(rawParsed.confidence ?? 50)),
      risk:       riskMap[String(rawParsed.risk ?? '').toLowerCase()] ?? rawParsed.risk,
      reason:     shortReason,
    };
    const signalResult = SignalSchema.safeParse(normalised);
    const signal = signalResult.success
      ? signalResult.data
      : { signal: 'HOLD' as const, confidence: 50, risk: 'Medium' as const, reason: 'Insufficient data for a clear signal.' };

    const snapshot         = summaryText || `${t} trades at ${displayPrice}. PE ${displayPE}, EPS ${displayEps}. 52W range: ${displayRange}.`;
    const business         = `${company} operates in Nepal's ${sector} sector. Market cap: ${displayMCap}.`;
    const financials       = financialsText || `EPS: ${displayEps}. PE: ${displayPE}. Book value: ${displayBV}. Dividend yield: ${displayDiv}.`;
    const catalysts        = contextText || `Growth driven by ${sector} sector dynamics, earnings trajectory, and dividend policy.`;
    const risks            = risksText || `Key risks: NRB regulatory changes, liquidity constraints, ${sector} sector exposure, and market sentiment shifts.`;
    const analystConsensus = verdictText || `Signal: ${signal.signal} (${signal.confidence}% confidence). Risk: ${signal.risk}. ${signal.reason}`;
    const verdictReasoning = verdictText || summaryText || signal.reason;

    const report = {
      signal: signal.signal, confidence: signal.confidence, risk: signal.risk, reason: signal.reason,
      ticker: t, company, sector,
      current_price: displayPrice, price_change_1y: change1y, market_cap: displayMCap,
      pe_ratio: displayPE, eps: displayEps, book_value: displayBV, dividend_yield: displayDiv,
      verdict: signal.signal, verdict_reasoning: verdictReasoning,
      risk_level: signal.risk.toLowerCase(),
      risk_score: signal.risk === 'Low' ? 25 : signal.risk === 'High' ? 80 : 50,
      sections: {
        snapshot, business, financials,
        technical: 'Technical data unavailable.',
        catalysts, risks,
        analyst_consensus: analystConsensus,
      },
      _priceSource: priceSource,
      _dataSource:  dataSource,
      savedAt:      Date.now(),
    };

    return NextResponse.json({ content: [{ type: 'text', text: JSON.stringify(report) }] });

  } catch (error: unknown) {
    console.error('[analyze]', error);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
  }
}
