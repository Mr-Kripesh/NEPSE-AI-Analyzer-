import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';

export interface MarketPrice {
  ltp: string; change: string; open: string; high: string; low: string; volume: string;
}

interface Snapshot {
  savedAt: string;
  prices: Record<string, MarketPrice>;
}

// ── Snapshot file (persists last trading day data across restarts) ─────────────
const SNAPSHOT_PATH = path.join(process.cwd(), 'data', 'last-market-snapshot.json');

async function loadSnapshot(): Promise<{ map: Map<string, MarketPrice>; savedAt: number } | null> {
  try {
    const raw  = await fs.readFile(SNAPSHOT_PATH, 'utf-8');
    const snap = JSON.parse(raw) as Snapshot;
    if (!snap.prices || typeof snap.prices !== 'object') return null;
    const map = new Map<string, MarketPrice>(Object.entries(snap.prices));
    return map.size > 0 ? { map, savedAt: new Date(snap.savedAt).getTime() } : null;
  } catch { return null; }
}

async function saveSnapshot(map: Map<string, MarketPrice>): Promise<void> {
  try {
    const prices: Record<string, MarketPrice> = {};
    map.forEach((v, k) => { prices[k] = v; });
    const snap: Snapshot = { savedAt: new Date().toISOString(), prices };
    await fs.mkdir(path.dirname(SNAPSHOT_PATH), { recursive: true });
    await fs.writeFile(SNAPSHOT_PATH, JSON.stringify(snap, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[market-data] Could not write snapshot:', err);
  }
}

// ── Module-level cache ────────────────────────────────────────────────────────
const MARKET_TTL = 60 * 1000;
let marketCache: Map<string, MarketPrice> | null = null;
let marketCacheAt = 0;
let marketCacheSource = 'unavailable';

// Last valid snapshot — has real gains/losses from the last trading session
let lastValidCache: Map<string, MarketPrice> | null = null;
let lastValidCacheAt = 0;
let snapshotLoaded = false;   // load from disk only once per process
let isLastTradingDay = false;

// ── Helpers ───────────────────────────────────────────────────────────────────
function toArray(json: unknown): Record<string, unknown>[] {
  if (Array.isArray(json)) return json as Record<string, unknown>[];
  const j = json as Record<string, unknown>;
  for (const key of ['object', 'data', 'content', 'stocks', 'result', 'prices', 'body']) {
    if (Array.isArray(j?.[key])) return j[key] as Record<string, unknown>[];
  }
  return [];
}

// Find first positive number across multiple field names
function pickPositive(item: Record<string, unknown>, ...keys: string[]): number {
  for (const k of keys) {
    const v = item[k];
    if (v != null) {
      const n = parseFloat(String(v));
      if (!isNaN(n) && n > 0) return n;
    }
  }
  return 0;
}

function pickStr(item: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = item[k];
    if (v != null && v !== '') {
      const n = parseFloat(String(v));
      return isNaN(n) ? '' : n.toFixed(2);
    }
  }
  return '';
}

function itemsToMap(items: Record<string, unknown>[]): Map<string, MarketPrice> {
  const map = new Map<string, MarketPrice>();
  for (const item of items) {
    const sym = String(
      item.symbol ?? item.stockSymbol ?? item.securitySymbol ?? item.ticker ?? item.scrip ?? ''
    ).toUpperCase().trim();
    if (!sym) continue;
    const ltp = pickPositive(item, 'lastTradedPrice', 'ltp', 'closingPrice', 'close', 'price');
    if (ltp <= 0) continue;
    const chg = parseFloat(String(
      item.percentageChange ?? item.priceChangePercent ?? item.change ?? item.changePercent ?? 0
    ));
    map.set(sym, {
      ltp:    ltp.toFixed(2),
      change: (chg >= 0 ? '+' : '') + chg.toFixed(2),
      open:   pickStr(item, 'openPrice',  'open', 'openingPrice'),
      high:   pickStr(item, 'highPrice',  'high', 'highestPrice'),
      low:    pickStr(item, 'lowPrice',   'low',  'lowestPrice'),
      volume: pickStr(item, 'totalTradedQuantity', 'tradedQuantity', 'volume', 'qty'),
    });
  }
  return map;
}

// ── Primary: nepseapi.surajrimal.dev (bulk) ───────────────────────────────────
async function fetchFromBulkAPI(): Promise<Map<string, MarketPrice>> {
  const ENDPOINTS = [
    'https://nepseapi.surajrimal.dev/v1/price/today',
    'https://nepseapi.surajrimal.dev/nepse/today',
    'https://nepseapi.surajrimal.dev/market',
    'https://nepseapi.surajrimal.dev/v1/nepse/all',
    'https://nepseapi.surajrimal.dev/nepse/all',
  ];
  for (const url of ENDPOINTS) {
    try {
      const r = await fetch(url, {
        headers: { 'Accept': 'application/json', 'User-Agent': UA },
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) continue;
      const items = toArray(await r.json());
      if (items.length < 10) continue;
      const map = itemsToMap(items);
      if (map.size > 0) return map;
    } catch { continue; }
  }
  return new Map();
}

// ── Fallback: NEPSE official securityDailyTradeStat ───────────────────────────
const NEPSE_H = {
  'User-Agent': UA, 'Accept': 'application/json',
  'Referer': 'https://www.nepalstock.com/', 'Origin': 'https://www.nepalstock.com',
};
let nepseToken: string | null = null;
let nepseTokenAt = 0;

async function getNepseToken(): Promise<string | null> {
  if (nepseToken && Date.now() - nepseTokenAt < 55 * 60 * 1000) return nepseToken;
  try {
    const r = await fetch('https://www.nepalstock.com/api/authenticate/prove', { headers: NEPSE_H, signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const d = await r.json();
    const tok = d?.accessToken ?? null;
    if (tok) { nepseToken = tok; nepseTokenAt = Date.now(); }
    return tok;
  } catch { return null; }
}

async function fetchFromNEPSE(): Promise<Map<string, MarketPrice>> {
  const ENDPOINT = 'https://www.nepalstock.com/api/nots/securityDailyTradeStat';
  const token    = await getNepseToken();
  const headers  = token ? { ...NEPSE_H, 'Authorization': `Salter ${token}` } : NEPSE_H;
  for (const method of ['GET', 'POST'] as const) {
    try {
      const r = await fetch(ENDPOINT, {
        method,
        headers: method === 'POST' ? { ...headers, 'Content-Type': 'application/json' } : headers,
        body: method === 'POST' ? '{}' : undefined,
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) continue;
      const items = toArray(await r.json());
      if (items.length > 0) return itemsToMap(items);
    } catch { continue; }
  }
  return new Map();
}

// ── Shared accessor ───────────────────────────────────────────────────────────
export async function getMarketPriceMap(): Promise<Map<string, MarketPrice>> {
  // Lazy-load snapshot from disk on first request after server start
  if (!snapshotLoaded) {
    snapshotLoaded = true;
    const saved = await loadSnapshot();
    if (saved) {
      lastValidCache   = saved.map;
      lastValidCacheAt = saved.savedAt;
      isLastTradingDay = true; // assume closed until proven otherwise
    }
  }

  if (marketCache && Date.now() - marketCacheAt < MARKET_TTL) return marketCache;

  let fresh = await fetchFromBulkAPI();
  let source = 'nepseapi.surajrimal.dev';
  if (fresh.size === 0) {
    fresh  = await fetchFromNEPSE();
    source = 'nepalstock.com';
  }

  if (fresh.size > 0) {
    marketCache = fresh; marketCacheAt = Date.now(); marketCacheSource = source;

    // Non-zero changes = market is active → update the persistent snapshot
    const hasActivity = [...fresh.values()].some(p => parseFloat(p.change) !== 0);
    if (hasActivity) {
      lastValidCache   = fresh;
      lastValidCacheAt = Date.now();
      isLastTradingDay = false;
      // Persist to disk so next restart has today's data ready
      saveSnapshot(fresh); // fire-and-forget
    } else {
      isLastTradingDay = true;
    }
  } else if (!marketCache) {
    marketCache = new Map();
  }

  return marketCache;
}

// ── GET /api/market-data ──────────────────────────────────────────────────────
export async function GET() {
  try {
    await getMarketPriceMap();

    // When market is closed, serve last valid snapshot (has real gains/losses)
    const serveMap = (isLastTradingDay && lastValidCache && lastValidCache.size > 0)
      ? lastValidCache
      : (marketCache ?? new Map());

    const prices: Record<string, MarketPrice> = {};
    serveMap.forEach((v, k) => { prices[k] = v; });

    return NextResponse.json({
      prices,
      count: serveMap.size,
      cachedAt: marketCacheAt ? new Date(marketCacheAt).toISOString() : null,
      lastValidAt: lastValidCacheAt ? new Date(lastValidCacheAt).toISOString() : null,
      source: marketCacheSource,
      isLastTradingDay,
    });
  } catch (error: unknown) {
    console.error('[market-data]', error);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
  }
}
