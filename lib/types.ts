export type Stock = {
  symbol: string;
  name:   string;
  sector: string;
  ltp?:   string;
  change?: string;
};

export interface Report {
  ticker:           string;
  company:          string;
  sector:           string;
  current_price:    string;
  price_change_1y:  string;
  market_cap:       string;
  pe_ratio:         string;
  eps:              string;
  book_value:       string;
  dividend_yield:   string;
  verdict:          string;
  verdict_reasoning:string;
  risk_level:       string;
  risk_score:       number;
  sections:         Record<string, string>;
  savedAt?:         number;
  _priceSource?:    string;
  _dataSource?:     string;
}

export interface PortfolioItem {
  ticker:   string;
  shares:   number;
  buyPrice: number;
  label:    string;
  added:    number;
}
