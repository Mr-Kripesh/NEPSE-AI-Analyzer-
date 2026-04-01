# NEPSE AI — Nepal Stock Exchange Intelligence Platform

> AI-powered stock analysis, live market data, and investment signals for the Nepal Stock Exchange — built for retail investors who deserve institutional-grade tools.

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?logo=tailwind-css)](https://tailwindcss.com)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)](https://vercel.com)

---

## Overview

NEPSE AI is a full-stack financial intelligence platform that combines real-time web scraping, multi-source data aggregation, and Groq LLaMA AI to deliver actionable BUY / SELL / HOLD signals for every listed stock on the Nepal Stock Exchange.

The system resolves NEPSE's fundamental data accessibility problem: live prices and fundamentals are scattered across MeroLagani, NepseAlpha, ShareHub, and the official NEPSE API — each with partial, inconsistent, or stale data. NEPSE AI aggregates all sources in parallel, validates and merges the result, then feeds it to an LLM to produce a structured analysis in under 10 seconds.

---

## Features

| Feature | Description |
| --- | --- |
| **AI Stock Analysis** | BUY / SELL / HOLD signals with confidence score, risk rating, and 6-section written analysis powered by Groq LLaMA 3.3 70B |
| **Live Price Feed** | Real-time LTP, % change, volume, and 52W range from multiple NEPSE data sources |
| **NEPSE Oracle** | Cinematic fortune wheel that picks a random stock and delivers a full AI reading — built with Framer Motion, Web Audio API, and canvas confetti |
| **Portfolio Tracker** | Client-side portfolio with P&L tracking, quantity, average cost, and custom labels — stored in localStorage |
| **Watchlist** | Star stocks for one-click re-analysis; persisted locally with sector and timestamp metadata |
| **Analysis History** | Last 50 reports saved locally, browsable and deletable from the history tab |
| **IPO Center** | Live active IPOs from CDSC MeroShare with unit price, min/max units, opening and closing dates |
| **Market News** | Scraped and categorized news board: Stocks / Gold / Politics / Latest with 24h caching |
| **Trading Charts** | TradingView widget integration for chart-supported NEPSE securities |
| **PWA Support** | Service worker with offline fallback page and installable app manifest |
| **Dark / Light Mode** | System-preference aware theming with zero flash on load via `beforeInteractive` script |

---

## Architecture

```text
┌─────────────────────────────────────────────────────────┐
│                    Next.js 16 App Router                │
│                                                         │
│  ┌─────────────┐   ┌─────────────┐   ┌──────────────┐  │
│  │  RSC Pages  │   │  API Routes │   │   Client     │  │
│  │  (SSR/ISR)  │   │  (Node.js)  │   │  Components  │  │
│  └──────┬──────┘   └──────┬──────┘   └──────┬───────┘  │
│         └────────────────┬┘                 │           │
│                          ▼                  │           │
│              ┌─────────────────────┐        │           │
│              │   Data Aggregator   │◄───────┘           │
│              │  (parallel fetch)   │                    │
│              └──────────┬──────────┘                    │
└─────────────────────────┼────────────────────────────── ┘
                          │
          ┌───────────────┼────────────────┐
          ▼               ▼                ▼
   ┌────────────┐  ┌────────────┐  ┌────────────────┐
   │ MeroLagani │  │ NepseAlpha │  │ nepseapi       │
   │ (scrape)   │  │ (scrape)   │  │ .surajrimal    │
   └────────────┘  └────────────┘  │ .dev (bulk)    │
                                   └────────────────┘
          │               │                │
          └───────────────▼────────────────┘
                    ┌───────────┐
                    │  Groq API │
                    │ LLaMA 3.3 │
                    │   70B     │
                    └───────────┘
```

### Data Fallback Chain

Every price lookup follows a strict priority cascade:

```text
1. MeroLagani / NepseAlpha scrape   ← most accurate, live
2. nepseapi.surajrimal.dev bulk     ← fast, sometimes stale
3. nepalstock.com official API      ← rate-limited fallback
4. data/nepse-fundamentals.json     ← local DB, cold-start safe
```

The bulk API layer uses `Promise.any()` across 5 endpoints in parallel — the fastest valid response wins, eliminating sequential timeout waits.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16.2 (App Router, Turbopack) |
| Language | TypeScript 5 (strict) |
| UI | React 19 with React Compiler |
| Styling | Tailwind CSS v4 + CSS custom properties |
| Animation | Framer Motion 12 + canvas-confetti |
| Scraping | Cheerio 1.2 (server-side HTML parsing) |
| AI | Groq API — `llama-3.3-70b-versatile` |
| Validation | Zod 4 |
| Dates | date-fns 4 |
| Data Fetching | SWR + native fetch with ISR |
| State | React hooks + localStorage (no external store) |
| Deployment | Vercel (serverless functions + edge CDN) |

---

## Project Structure

```text
nepse-ai/
├── app/
│   ├── layout.tsx              # Root layout — fonts, Navbar, Footer, PWA Script
│   ├── page.tsx                # Home — search, analysis, portfolio, watchlist, history
│   ├── globals.css             # Design system tokens (light/dark), component styles
│   ├── manifest.ts             # PWA manifest (Next.js metadata route)
│   ├── stocks/page.tsx         # Full NEPSE stock directory with live prices
│   ├── market/page.tsx         # Market overview — gainers, losers, volume leaders
│   ├── news/page.tsx           # News collage board (stocks, gold, politics, latest)
│   ├── watchlist/page.tsx      # Watchlist management
│   ├── ipo/page.tsx            # Active IPOs from CDSC MeroShare (1h ISR)
│   ├── nepse-oracle/page.tsx   # Fortune wheel stock picker with AI insight
│   ├── trading-chart/page.tsx  # TradingView widget integration
│   ├── offline/page.tsx        # PWA offline fallback
│   └── api/
│       ├── analyze/route.ts        # POST — core AI analysis pipeline
│       ├── market-data/route.ts    # GET  — bulk live NEPSE prices (60s TTL)
│       ├── oracle-prices/route.ts  # GET  — per-symbol price lookup with cache
│       ├── stocks/route.ts         # GET  — full stock list + merged live prices
│       ├── news/route.ts           # GET  — categorized scraped news
│       ├── news-insights/route.ts  # POST — additional news enrichment
│       ├── news-pulse/route.ts     # POST — metals + flash data
│       └── debug/route.ts          # GET  — health diagnostics
│
├── components/
│   ├── Navbar.tsx              # Global navigation with theme toggle (CSS-driven, hydration-safe)
│   ├── LandingHero.tsx         # Hero section — market status, sector chips, search
│   ├── SearchBar.tsx           # Autocomplete stock search
│   ├── AnalysisPanel.tsx       # Full report container
│   ├── VerdictCard.tsx         # BUY/SELL/HOLD signal card
│   ├── MetricsGrid.tsx         # 8-tile key metrics display
│   ├── RiskMeter.tsx           # Visual risk gauge
│   ├── AnalysisAccordion.tsx   # Expandable 6-section written analysis
│   ├── StockIdBar.tsx          # Ticker identity + action buttons
│   ├── PortfolioTab.tsx        # Portfolio P&L tracker
│   ├── HistoryTab.tsx          # Saved reports browser
│   ├── TabBar.tsx              # Search / History / Portfolio tabs
│   ├── LoadingBar.tsx          # Progress bar with rotating messages
│   ├── ErrorBanner.tsx         # Error notification
│   └── ServiceWorkerReg.tsx    # PWA service worker registration
│
├── lib/
│   ├── types.ts                # Core interfaces: Stock, Report, PortfolioItem
│   ├── schema.ts               # Zod schemas + inferred types
│   ├── companies.ts            # Master list of 100+ NEPSE companies
│   ├── constants.ts            # Sector colors, TV symbols, loading messages
│   ├── utils.ts                # Formatting helpers (rupees, verdict class, sector)
│   ├── cache.ts                # In-memory Map cache with TTL
│   ├── fetcher.ts              # Generic fetch wrapper
│   ├── nepse-db.ts             # JSON file DB reader/writer (5min memory cache)
│   ├── price-scraper.ts        # Per-stock MeroLagani/NepseAlpha scraper (10min TTL)
│   ├── news.ts                 # News scraper + categorizer
│   ├── newsEnrich.ts           # News enrichment pipeline
│   └── watchlist.ts            # localStorage watchlist helpers
│
├── public/
│   ├── sw.js                   # Service worker (network-first for API, cache-first for assets)
│   ├── theme-init.js           # beforeInteractive theme script (prevents flash)
│   └── icon.svg                # App icon
│
└── data/
    ├── nepse-fundamentals.json     # 104-stock fundamentals DB (cold-start fallback)
    └── last-market-snapshot.json   # Persisted last trading session snapshot
```

---

## API Reference

### `POST /api/analyze`

Core analysis endpoint. Fetches live fundamentals from all sources in parallel, then queries Groq AI.

#### Request

```json
{
  "ticker": "NABIL",
  "company": "Nabil Bank Limited",
  "sector": "Commercial Banks",
  "price": 1250
}
```

#### Response

```json
{
  "signal": "BUY",
  "confidence": 78,
  "risk": "Medium",
  "ticker": "NABIL",
  "current_price": "Rs. 1,250.00",
  "pe_ratio": "18.4",
  "eps": "67.93",
  "book_value": "Rs. 820.00",
  "dividend_yield": "4.20%",
  "market_cap": "Rs. 180B",
  "sections": {
    "summary": "...",
    "financials": "...",
    "context": "...",
    "risks": "...",
    "verdict": "..."
  },
  "_priceSource": "Live (MeroLagani)",
  "_dataSource": "Live fundamentals (MeroLagani)"
}
```

### `GET /api/oracle-prices?symbols=NABIL,NTC,HIDCL`

Returns live LTP and daily % change for a comma-separated list of symbols. Implements a three-tier cache:

1. **Fast path** — in-memory scraper cache (0ms, if < 10min old)
2. **Parallel fetch** — MeroLagani scrape + bulk API + local DB simultaneously
3. **Fallback** — local DB entry

#### Response Body

```json
{
  "prices": {
    "NABIL": { "ltp": 1250, "change": -1.17 },
    "NTC":   { "ltp": 890,  "change": 0.45 }
  },
  "updatedAt": "2026-03-31T16:45:00.000Z"
}
```

### `GET /api/market-data`

Returns the full NEPSE market price map. Tries 5 bulk endpoints in parallel (`Promise.any()`), 60-second in-memory TTL. Serves last trading session snapshot when market is closed.

### `GET /api/stocks`

Full stock directory with live price merge. 60-second ISR revalidation.

---

## Analysis Pipeline

```text
POST /api/analyze
    │
    ├─ parallel fetch
    │   ├─ scrapeMeroLagani(ticker)     → ltp, eps, pe, bookValue, dividend, 52W, marketCap
    │   ├─ scrapeShareHub(ticker)       → supplementary fundamentals
    │   ├─ scrapeNepseAlpha(ticker)     → alternative pricing
    │   └─ fetchBulkPrice(ticker)       → fast fallback via Promise.any() on 5 endpoints
    │
    ├─ merge & validate
    │   └─ priority: MeroLagani > NepseAlpha > Bulk API > local DB
    │
    ├─ build prompt context
    │   └─ formatted market snapshot + instruction schema
    │
    ├─ POST api.groq.com/openai/v1/chat/completions
    │   └─ model: llama-3.3-70b-versatile
    │
    ├─ parse & validate JSON via Zod
    │
    └─ return Report object
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- A free [Groq API key](https://console.groq.com)

### Installation

```bash
git clone https://github.com/Mr-Kripesh/NEPSE-AI-Analyzer-.git
cd NEPSE-AI-Analyzer-
npm install
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

```env
# Required — AI analysis engine
GROQ_API_KEY=gsk_your_key_here

# Required — protects the /api/update-fundamentals endpoint
NEPSE_UPDATE_SECRET=generate_with_openssl_rand_hex_32

# Required — used for internal API routing
BASE_URL=http://localhost:3000
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

---

## Deployment

The project is optimised for Vercel. All API routes run as serverless functions; the `data/` directory is bundled at build time as the cold-start fallback.

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Set the three environment variables in **Vercel Dashboard → Project → Settings → Environment Variables** before the first production deployment.

The live site auto-deploys on every push to `main` via the Vercel GitHub integration.

---

## Key Design Decisions

**Why Groq instead of OpenAI or Anthropic?**
Groq's LPU inference hardware delivers LLaMA 3.3 70B responses in 1–3 seconds with a generous free tier — critical for a stock analysis tool where latency directly affects UX.

**Why localStorage for portfolio/watchlist?**
No backend database means zero infrastructure cost, full user privacy, and instant reads. The tradeoff — data doesn't sync across devices — is acceptable for a personal analysis tool.

**Why multi-source scraping instead of a single API?**
No single NEPSE data source is complete or reliable. MeroLagani has the best fundamentals but slow page loads; NepseAlpha has faster prices but incomplete metrics; the bulk API is fast but occasionally stale. The parallel fallback cascade combines their strengths.

**Why `Promise.any()` for bulk API endpoints?**
Sequential endpoint probing had a worst-case latency of 50 seconds (5 endpoints × 10s timeout). Racing all 5 in parallel drops this to the latency of the single fastest responder.

**Why CSS-driven theme icons instead of conditional JSX?**
React 19's compiler can cause hydration mismatches when client-side state (localStorage theme) differs from the server-rendered default. Rendering both icons in HTML and toggling visibility via `[data-theme]` CSS selectors eliminates the mismatch entirely.

---

## License

© 2026 Kripesh Panta. All rights reserved.
