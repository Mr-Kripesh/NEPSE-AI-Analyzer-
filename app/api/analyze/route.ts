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
        max_tokens: 300,
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content: `You are an expert NEPSE (Nepal Stock Exchange) stock analyst.
Analyze the provided market data and output a trading signal.
Reply with ONLY valid JSON — no markdown fences, no explanation, no extra text.
Your entire response must be exactly this structure:
{"signal":"BUY","confidence":75,"risk":"Medium","reason":"1-2 sentences citing specific numbers"}
Rules:
- signal: must be exactly "BUY", "SELL", or "HOLD"
- confidence: integer 0–100 reflecting conviction level
- risk: must be exactly "Low", "Medium", or "High"
- reason: maximum 200 characters, must cite at least one specific metric`,
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

    const text  = aiData.choices?.[0]?.message?.content?.trim() || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Could not parse AI response');
    const rawParsed = JSON.parse(match[0]);

    const riskMap: Record<string, 'Low' | 'Medium' | 'High'> = { low: 'Low', medium: 'Medium', high: 'High' };
    const normalised = {
      signal:     String(rawParsed.signal ?? '').toUpperCase(),
      confidence: Math.round(Number(rawParsed.confidence ?? 50)),
      risk:       riskMap[String(rawParsed.risk ?? '').toLowerCase()] ?? rawParsed.risk,
      reason:     String(rawParsed.reason ?? '').slice(0, 300),
    };
    const signalResult = SignalSchema.safeParse(normalised);
    const signal = signalResult.success
      ? signalResult.data
      : { signal: 'HOLD' as const, confidence: 50, risk: 'Medium' as const, reason: 'Insufficient data for a clear signal.' };

    const snapshot         = `${t} trades at ${displayPrice}. PE ${displayPE}, EPS ${displayEps}. 52W range: ${displayRange}.`;
    const business         = `${company} operates in Nepal's ${sector} sector. Market cap: ${displayMCap}.`;
    const financials       = `EPS: ${displayEps}. PE: ${displayPE}. Book value: ${displayBV}. Dividend yield: ${displayDiv}.`;
    const catalysts        = `Growth driven by ${sector} sector dynamics, earnings trajectory, and dividend policy.`;
    const risks            = `Key risks: NRB regulatory changes, liquidity constraints, ${sector} sector exposure, and market sentiment shifts.`;
    const analystConsensus = `Signal: ${signal.signal} (${signal.confidence}% confidence). Risk: ${signal.risk}. ${signal.reason}`;

    const report = {
      signal: signal.signal, confidence: signal.confidence, risk: signal.risk, reason: signal.reason,
      ticker: t, company, sector,
      current_price: displayPrice, price_change_1y: change1y, market_cap: displayMCap,
      pe_ratio: displayPE, eps: displayEps, book_value: displayBV, dividend_yield: displayDiv,
      verdict: signal.signal, verdict_reasoning: signal.reason,
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
