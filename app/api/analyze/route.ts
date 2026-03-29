import { NextRequest, NextResponse } from 'next/server';
import { COMPANIES } from '@/lib/companies';
import { getMarketPriceMap } from '../market-data/route';
import { SignalSchema } from '@/lib/schema';
import { getFundamentals } from '@/lib/nepse-db';
import { load } from 'cheerio';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';
const AI_SYSTEM_PROMPT = `You are an experienced NEPSE stock analyst writing for retail investors.

Analyze the supplied market data and return only valid JSON. Do not return markdown, headings, bullets outside JSON, or any text before or after the JSON object.

The response must use this exact shape:
{
  "signal": "BUY" | "SELL" | "HOLD",
  "confidence": integer from 0 to 100,
  "risk": "Low" | "Medium" | "High",
  "explanation": {
    "summary": "string",
    "financials": "string",
    "context": "string",
    "risks": "string",
    "verdict": "string"
  }
}

Rules:
- Base the signal on the supplied numbers, not on assumptions.
- Write every explanation field in clear, plain English only.
- Do not use Nepali words, Romanized Nepali, Hindi, or mixed-language phrasing.
- Keep the tone professional, direct, and balanced.
- If a metric is unavailable, say that clearly instead of inventing a number.
- Be cautious when valuation is stretched, earnings are weak, or live data is incomplete.

Explanation guidance:
- summary: Start with "You should BUY/HOLD/SELL this stock because..." and explain the decision in 3 to 5 sentences.
- financials: Explain what the valuation, EPS, book value, dividend, and price level mean for an investor in 3 to 5 sentences.
- context: Give 2 to 3 sentences on sector, market conditions, or company backdrop relevant to Nepal.
- risks: Give 2 to 3 sentences on the main downside risks and execution risks.
- verdict: End with 2 to 3 sentences of direct investor guidance tied to the supplied data.

Be honest, data-driven, and easy to understand.`;

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
  const normalized = String(v ?? '')
    .replace(/[−–—]/g, '-')
    .replace(/\(([^)]+)\)/g, '-$1')
    .replace(/,/g, '')
    .trim();
  const match = normalized.match(/-?\d*\.?\d+/);
  return match ? parseFloat(match[0]) : NaN;
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

  const nPositive = (v: string): string => {
    const num = cleanNum(v);
    return (!isNaN(num) && num > 0) ? num.toFixed(2) : '';
  };
  const nSigned = (v: string): string => {
    const num = cleanNum(v);
    return !isNaN(num) ? num.toFixed(2) : '';
  };
  const nNonNegative = (v: string): string => {
    const num = cleanNum(v);
    return (!isNaN(num) && num >= 0) ? num.toFixed(2) : '';
  };

  const ltp       = nPositive(get('marketprice', 'ltp', 'lasttradedprice', 'currentprice', 'closeprice', 'lasttraded'));
  const eps       = nSigned(get('eps', 'epsannualized', 'epsannualised', 'earningpershare', 'earningspershare', 'basiceps', 'epsttm'));
  // Use long-form labels only — short "pe" matches "operationdate", "type", etc.
  const pe        = nSigned(get('peratio', 'priceearning', 'pricetoearn', 'pricetoearning', 'priceearningratio', 'priceearningsratio', 'pettm'));
  const bookValue = nPositive(get('bookvalue', 'bookvaluepershare', 'networthpershare', 'netassetvalue', 'navperunit', 'nabperunit', 'bvps'));
  const dividend  = nNonNegative(get('cashdividend', 'dividendpershare', 'dividendyield', 'dividendyieldpercentage', 'dividend'));
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
  if (!high52) high52 = nPositive(get('52weekhigh', '52whigh', 'yearlyhigh'));
  if (!low52)  low52  = nPositive(get('52weeklow',  '52wlow',  'yearlylow'));

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
async function tryNepseAlphaScoreboard(ticker: string): Promise<Partial<LiveData> | null> {
  try {
    const res = await fetch('https://nepsealpha.com/widget/scoreboard', {
      headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml', 'Referer': 'https://nepsealpha.com/' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;

    const text = load(await res.text()).root().text();
    const lines = text
      .split(/\r?\n/)
      .map(line => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    const row = lines.find(line => new RegExp(`^${ticker}\\b`, 'i').test(line));
    if (!row) return null;

    const tokens = row.split(/\s+/);
    if (tokens.length < 7) return null;

    const ltpNum = cleanNum(tokens[tokens.length - 1] ?? '');
    const peNum = cleanNum(tokens[tokens.length - 4] ?? '');
    const epsNum = cleanNum(tokens[tokens.length - 6] ?? '');
    const bookNum = cleanNum(tokens[tokens.length - 7] ?? '');

    const fields: Partial<LiveData> = {
      ltp: !isNaN(ltpNum) && ltpNum > 0 ? ltpNum.toFixed(2) : '',
      eps: !isNaN(epsNum) ? epsNum.toFixed(2) : '',
      pe: !isNaN(peNum) ? peNum.toFixed(2) : '',
      bookValue: !isNaN(bookNum) && bookNum > 0 ? bookNum.toFixed(2) : '',
    };

    console.log(`[NepseAlpha] ${ticker}: ltp=${fields.ltp || ''} eps=${fields.eps || ''} pe=${fields.pe || ''} bv=${fields.bookValue || ''}`);
    return (fields.ltp || fields.eps || fields.pe || fields.bookValue) ? fields : null;
  } catch { return null; }
}

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

  const [ml, sh, na] = await Promise.all([
    tryMeroLagani(ticker),
    tryShareHub(ticker),
    tryNepseAlphaScoreboard(ticker),
  ]);

  const data: LiveData = {
    ltp:       ml?.ltp       || sh?.ltp       || na?.ltp       || '',
    change1y:  ml?.change1y  || sh?.change1y  || '',
    eps:       na?.eps       || ml?.eps       || sh?.eps       || '',
    pe:        na?.pe        || ml?.pe        || sh?.pe        || '',
    bookValue: na?.bookValue || ml?.bookValue || sh?.bookValue || '',
    dividend:  ml?.dividend  || sh?.dividend  || '',
    high52:    ml?.high52    || sh?.high52    || '',
    low52:     ml?.low52     || sh?.low52     || '',
    marketCap: ml?.marketCap || sh?.marketCap || '',
  };

  const hasData = !!(data.eps || data.pe || data.bookValue || data.ltp);
  const source  = !hasData ? 'unavailable'
    : (na?.eps || na?.pe || na?.bookValue ? 'nepsealpha'
      : ml?.eps || ml?.pe || ml?.ltp ? 'merolagani'
      : 'sharehub');

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

function formatRsMetric(val: string): string {
  const n = parseFloat(val.replace(/[^0-9.-]/g, ''));
  if (isNaN(n)) return 'N/A';
  return n < 0 ? `-Rs.${Math.abs(n).toFixed(2)}` : `Rs.${n.toFixed(2)}`;
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

function hasDisallowedLanguage(value: string): boolean {
  if (!value) return false;
  return /[\u0900-\u097F]/.test(value)
    || /\b(?:yeh|lekin|thik\s+cha|company\s+ko|price\s+range\s+ma|karne|karna)\b/i.test(value)
    || /\bcha\b/i.test(value);
}

function preferEnglishText(value: string, fallback: string): string {
  return value && !hasDisallowedLanguage(value) ? value : fallback;
}

function buildEnglishFallbacks(input: {
  signal: 'BUY' | 'SELL' | 'HOLD';
  risk: 'Low' | 'Medium' | 'High';
  company: string;
  sector: string;
  price: string;
  range52: string;
  return1y: string;
  eps: string;
  pe: string;
  bookValue: string;
  dividend: string;
  marketCap: string;
}) {
  const {
    signal,
    risk,
    company,
    sector,
    price,
    range52,
    return1y,
    eps,
    pe,
    bookValue,
    dividend,
    marketCap,
  } = input;

  const actionLine = signal === 'BUY'
    ? 'The current setup supports a constructive view, but only if earnings continue to hold up.'
    : signal === 'SELL'
      ? 'The current setup does not justify taking or keeping aggressive risk without stronger fundamentals.'
      : 'The current setup supports patience rather than an aggressive buy or a rushed exit.';

  const riskLine = risk === 'High'
    ? 'Risk is elevated, so protecting capital matters more than chasing upside.'
    : risk === 'Low'
      ? 'Risk looks relatively contained, although normal NEPSE volatility still applies.'
      : 'Risk is moderate, so a measured position size and close monitoring make more sense than a bold move.';

  const missingMetrics = [
    pe === 'N/A' ? 'P/E ratio' : '',
    eps === 'N/A' ? 'EPS' : '',
    bookValue === 'N/A' ? 'book value' : '',
  ].filter(Boolean).join(', ');

  const summary = `You should ${signal} this stock because the available market data supports a ${signal.toLowerCase()} view rather than a speculative reaction. ${price !== 'N/A' ? `${company} is trading at ${price}.` : `The latest tradable price for ${company} is not available in the merged feed.`} ${range52 !== 'N/A' ? `Its 52-week range is ${range52}.` : 'Its 52-week range is not available right now.'} ${actionLine}`;
  const financials = `${eps !== 'N/A' ? `EPS stands at ${eps}.` : 'EPS is missing from the current live merge and should be cross-checked against the source sites.'} ${pe !== 'N/A' ? `The stock is trading at a P/E ratio of ${pe}.` : 'A reliable live P/E ratio is not available from the current merged scrape.'} ${bookValue !== 'N/A' ? `Book value is ${bookValue}.` : 'Book value is also unavailable in the current payload.'} ${dividend !== 'N/A' ? `Dividend yield is ${dividend}.` : 'Dividend data is limited.'}`;
  const context = `${company} operates in Nepal's ${sector} sector, so performance will depend on earnings delivery, regulation, liquidity, and overall NEPSE sentiment. ${marketCap !== 'N/A' ? `Its market capitalization is ${marketCap}.` : 'Market-cap data is limited in the current feed.'} ${return1y !== 'N/A' ? `The one-year return is ${return1y}, which gives some context for recent momentum.` : 'One-year return data is currently unavailable.'}`;
  const risks = `${riskLine} ${missingMetrics ? `Some live fundamentals are still incomplete in the merged feed, especially ${missingMetrics}, so the numbers should be verified against Merolagani, NepseAlpha, or the latest filings before acting.` : 'Even when the live metrics look complete, investors should still verify the latest filings before acting.'}`;
  const verdict = `${signal} is the better call for now based on the available price and fundamentals. Investors should act only if the next earnings updates and sector conditions continue to support this view.`;
  const reason = `${price !== 'N/A' ? `${company} is trading at ${price}.` : `${company} has incomplete live pricing data.`} ${pe !== 'N/A' ? `P/E is ${pe}.` : 'Live P/E data is incomplete.'} ${eps !== 'N/A' ? `EPS is ${eps}.` : 'Live EPS data is incomplete.'} ${actionLine}`.slice(0, 300);

  return { summary, financials, context, risks, verdict, reason };
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

    const displayPrice = price        ? formatRsMetric(price)        : 'N/A';
    const displayEps   = ld.eps       ? formatRsMetric(ld.eps)       : 'N/A';
    const displayBV    = ld.bookValue ? formatRsMetric(ld.bookValue) : 'N/A';
    const displayMCap  = ld.marketCap ? formatMCap(ld.marketCap) : 'N/A';
    const displayRange = (ld.high52 && ld.low52) ? `Rs.${ld.low52} - Rs.${ld.high52}` : 'N/A';
    const displayPE    = ld.pe       || 'N/A';
    const displayDiv   = ld.dividend || 'N/A';

    const priceSource = skipPriceCall  ? 'Provided'
      : scrapedLtp                     ? `Live (${liveResult.source === 'merolagani' ? 'MeroLagani' : liveResult.source === 'nepsealpha' ? 'NepseAlpha' : 'ShareHub'})`
      : priceMap.get(t)?.ltp           ? 'Live (NEPSE trade stat)'
      : bulkPrice                      ? 'Live (nepseapi.surajrimal.dev)'
      : dbEntry?.ltp                   ? 'DB (last sync)'
      : 'Unavailable';

    const dataSource = liveResult.source === 'merolagani' ? 'Live fundamentals (MeroLagani)'
      : liveResult.source === 'sharehub'                  ? 'Live fundamentals (ShareHub)'
      : liveResult.source === 'nepsealpha'                ? 'Live fundamentals (NepseAlpha)'
      : liveResult.source === 'cache'                     ? 'Cached live fundamentals (<24h)'
      : liveResult.source === 'db'                        ? 'Database fundamentals (quarterly)'
      : 'Fundamentals unavailable';

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
            content: AI_SYSTEM_PROMPT || `You are a highly experienced NEPSE (Nepal Stock Exchange) stock analyst with over 15 years of experience. Your analysis must be professional, balanced, honest, and easy for retail investors to understand.

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
- Write all explanation fields in clear, plain English only.
- Do not use Nepali words, Romanized Nepali, or mixed-language phrases.

Explanation fields (write in clear, plain English suitable for retail investors):

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

Respond in English only and return only the JSON signal object.`,
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
      reason:     shortReason || 'The available live data does not support a stronger conviction call.',
    };
    const signalResult = SignalSchema.safeParse(normalised);
    const baseSignal = signalResult.success
      ? signalResult.data
      : { signal: 'HOLD' as const, confidence: 50, risk: 'Medium' as const, reason: 'Insufficient data for a clear signal.' };
    const englishFallbacks = buildEnglishFallbacks({
      signal: baseSignal.signal,
      risk: baseSignal.risk,
      company,
      sector,
      price: displayPrice,
      range52: displayRange,
      return1y: change1y,
      eps: displayEps,
      pe: displayPE,
      bookValue: displayBV,
      dividend: displayDiv,
      marketCap: displayMCap,
    });
    const signal = {
      ...baseSignal,
      reason: preferEnglishText(baseSignal.reason, englishFallbacks.reason),
    };

    const snapshot         = preferEnglishText(summaryText, englishFallbacks.summary);
    const business         = `${company} operates in Nepal's ${sector} sector. Market cap: ${displayMCap}.`;
    const financials       = preferEnglishText(financialsText, englishFallbacks.financials);
    const catalysts        = preferEnglishText(contextText, englishFallbacks.context);
    const risks            = preferEnglishText(risksText, englishFallbacks.risks);
    const analystConsensus = preferEnglishText(
      verdictText,
      `${englishFallbacks.verdict} Signal: ${signal.signal} (${signal.confidence}% confidence). Risk: ${signal.risk}.`
    );
    const verdictReasoning = preferEnglishText(verdictText || summaryText, englishFallbacks.verdict);

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
