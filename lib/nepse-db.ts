/**
 * lib/nepse-db.ts
 *
 * Lightweight JSON-file database for NEPSE stock data.
 *
 * Architecture:
 *   Persistent store : data/nepse-fundamentals.json  (committed to git)
 *   In-memory cache  : 5-minute TTL for read performance
 *
 * Price fields  (ltp, change, yield1y, fetchedAt) → updated daily via GitHub Actions
 * Fundamental fields (eps, pe, bookValue, …)       → updated manually once per quarter
 *
 * On Vercel the filesystem is read-only, so writeDB() will return false gracefully.
 * GitHub Actions handles the actual persistence by committing the JSON file.
 */

import { promises as fs } from 'fs';
import path from 'path';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StockFundamentals {
  /** Last traded price, e.g. "1234.56" */
  ltp: string;
  /** Daily % change with sign, e.g. "+1.23" or "-0.50" */
  change: string;
  /** Earnings per share */
  eps: string;
  /** Price-to-earnings ratio */
  pe: string;
  /** Book value per share */
  bookValue: string;
  /** Market capitalisation (raw string as returned by the source) */
  marketCap: string;
  /** Cash + stock dividend percentage */
  dividend: string;
  /** 52-week high */
  high52: string;
  /** 52-week low */
  low52: string;
  /** 1-year price yield, e.g. "+12.34%" */
  yield1y: string;
  /** Unix-ms timestamp of the last price update */
  fetchedAt: number;
}

export interface NepseDB {
  /** ISO-8601 timestamp of the last writeDB() call */
  updatedAt: string;
  /** Convenience count — set automatically by writeDB() */
  totalStocks: number;
  /** TICKER → fundamentals map */
  stocks: Record<string, StockFundamentals>;
}

// ── Config ────────────────────────────────────────────────────────────────────

const DB_PATH = path.join(process.cwd(), 'data', 'nepse-fundamentals.json');

// ── In-memory cache ───────────────────────────────────────────────────────────

let _cache: NepseDB | null = null;
let _cacheAt = 0;
// 5 minutes — short enough to pick up a freshly written file
const CACHE_TTL_MS = 5 * 60 * 1000;

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Read the full database.
 * Returns cached data when the cache is still warm.
 * Returns an empty DB on any read/parse error (graceful degradation).
 */
export async function readDB(): Promise<NepseDB> {
  if (_cache && Date.now() - _cacheAt < CACHE_TTL_MS) return _cache;

  try {
    const raw  = await fs.readFile(DB_PATH, 'utf-8');
    const data = JSON.parse(raw) as NepseDB;
    // Guard against a malformed file missing the stocks map
    if (!data.stocks || typeof data.stocks !== 'object') data.stocks = {};
    _cache   = data;
    _cacheAt = Date.now();
    return data;
  } catch (err) {
    console.warn('[nepse-db] readDB: could not read file, returning empty DB.', err);
    return { updatedAt: new Date().toISOString(), totalStocks: 0, stocks: {} };
  }
}

/**
 * Write the full database to disk.
 * Automatically updates `updatedAt` and `totalStocks` before writing.
 *
 * Returns true on success, false on failure (e.g. read-only FS on Vercel).
 * A false return is not fatal — the in-memory cache is still updated.
 */
export async function writeDB(data: NepseDB): Promise<boolean> {
  const toWrite: NepseDB = {
    ...data,
    updatedAt:   new Date().toISOString(),
    totalStocks: Object.keys(data.stocks).length,
  };

  // Always warm the cache, even if the disk write fails
  _cache   = toWrite;
  _cacheAt = Date.now();

  try {
    // Ensure the data/ directory exists (safe no-op if already present)
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    await fs.writeFile(DB_PATH, JSON.stringify(toWrite, null, 2), 'utf-8');
    return true;
  } catch (err) {
    // Expected on Vercel (read-only FS) — log as info, not error
    console.info('[nepse-db] writeDB: disk write failed (read-only FS on Vercel?).', err);
    return false;
  }
}

/**
 * Get a single stock's fundamentals.
 * Returns null if the ticker is not yet in the store.
 */
export async function getFundamentals(ticker: string): Promise<StockFundamentals | null> {
  const db = await readDB();
  return db.stocks[ticker.toUpperCase()] ?? null;
}

/**
 * Invalidate the in-memory cache.
 * The next readDB() call will re-read from disk.
 */
export function invalidateCache(): void {
  _cache   = null;
  _cacheAt = 0;
}
