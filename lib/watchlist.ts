const KEY = 'nepsai_watchlist';

export interface WatchlistItem {
  ticker:  string;
  name:    string;
  sector:  string;
  addedAt: number;
}

export function getWatchlist(): WatchlistItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}

export function addToWatchlist(item: Omit<WatchlistItem, 'addedAt'>): void {
  const list = getWatchlist().filter(i => i.ticker !== item.ticker);
  list.unshift({ ...item, addedAt: Date.now() });
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function removeFromWatchlist(ticker: string): void {
  localStorage.setItem(KEY, JSON.stringify(getWatchlist().filter(i => i.ticker !== ticker)));
}
