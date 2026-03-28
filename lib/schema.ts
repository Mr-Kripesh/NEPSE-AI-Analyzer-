import { z } from "zod";

export const StockSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  sector: z.string().min(1),
  ltp: z.string().optional(),
  change: z.string().optional(),
});

// ── New compact signal schema (Step 8 output format) ─────────────────────────
export const SignalSchema = z.object({
  signal:     z.enum(["BUY", "SELL", "HOLD"]),
  confidence: z.number().int().min(0).max(100),
  risk:       z.enum(["Low", "Medium", "High"]),
  reason:     z.string().min(1).max(300),
});

export type Signal = z.infer<typeof SignalSchema>;

// ── Full report schema (signal fields + backward-compat fields) ───────────────
export const ReportSchema = z.object({
  // New primary signal fields
  signal:     z.enum(["BUY", "SELL", "HOLD"]).optional(),
  confidence: z.number().int().min(0).max(100).optional(),
  risk:       z.enum(["Low", "Medium", "High"]).optional(),
  reason:     z.string().optional(),

  // Factual market data (hard-injected, never AI-generated)
  ticker:         z.string().min(1),
  company:        z.string().min(1),
  sector:         z.string().min(1),
  current_price:  z.string(),
  price_change_1y:z.string(),
  market_cap:     z.string(),
  pe_ratio:       z.string(),
  eps:            z.string(),
  book_value:     z.string(),
  dividend_yield: z.string(),

  // Backward-compat aliases (mapped from signal fields)
  verdict:          z.string(),
  verdict_reasoning:z.string(),
  risk_level:       z.string(),
  risk_score:       z.number().min(0).max(100),
  sections:         z.record(z.string(), z.string()),

  // Metadata
  savedAt:      z.number().optional(),
  _priceSource: z.string().optional(),
  _dataSource:  z.string().optional(),
});

export const PortfolioItemSchema = z.object({
  ticker:   z.string().min(1),
  shares:   z.number().positive(),
  buyPrice: z.number().positive(),
  label:    z.string(),
  added:    z.number(),
});

export type StockInput         = z.infer<typeof StockSchema>;
export type ReportInput        = z.infer<typeof ReportSchema>;
export type PortfolioItemInput = z.infer<typeof PortfolioItemSchema>;
