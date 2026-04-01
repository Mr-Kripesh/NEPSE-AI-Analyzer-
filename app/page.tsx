'use client';
import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { STATIC_STOCKS } from '@/lib/companies';
import { LOADING_MSGS } from '@/lib/constants';
import { getWatchlist, addToWatchlist, removeFromWatchlist, type WatchlistItem } from '@/lib/watchlist';
import type { Stock, Report, PortfolioItem } from '@/lib/types';
import AppHeader from '@/components/AppHeader';
import SearchBar from '@/components/SearchBar';
import LoadingBar from '@/components/LoadingBar';
import ErrorBanner from '@/components/ErrorBanner';
import TabBar from '@/components/TabBar';

// LandingHero uses client-only state (marketOpen, reportsCount, portfolio)
// — skip SSR entirely to prevent hydration mismatches
const LandingHero = dynamic(() => import('@/components/LandingHero'), { ssr: false });

// Lazy-load below-the-fold panels — excluded from the landing-page bundle
const AnalysisPanel = dynamic(() => import('@/components/AnalysisPanel'), {
  ssr: false,
  loading: () => <div className="report-wrap report-wrap-skeleton" />,
});
const HistoryTab   = dynamic(() => import('@/components/HistoryTab'));
const PortfolioTab = dynamic(() => import('@/components/PortfolioTab'));

export default function Home() {
  const [allStocks, setAllStocks]     = useState<Stock[]>(STATIC_STOCKS);
  const [stocksCount, setStocksCount] = useState(STATIC_STOCKS.length);
  const [query, setQuery]             = useState('');
  const [suggestions, setSuggestions] = useState<Stock[]>([]);
  const [showSugg, setShowSugg]       = useState(false);
  const [loading, setLoading]         = useState(false);
  const [loadMsg, setLoadMsg]         = useState('');
  const [loadPct, setLoadPct]         = useState(0);
  const [error, setError]             = useState('');
  const [report, setReport]           = useState<Report | null>(null);
  const [reports, setReports]         = useState<Report[]>([]);
  const [portfolio, setPortfolio]     = useState<PortfolioItem[]>([]);
  const [tab, setTab]                 = useState<'search' | 'history' | 'portfolio'>('search');
  const [marketOpen, setMarketOpen]   = useState(false);
  const [marketStatus, setMarketStatus] = useState('');
  const [portTicker, setPortTicker]   = useState('');
  const [portShares, setPortShares]   = useState('');
  const [portPrice, setPortPrice]     = useState('');
  const [portLabel, setPortLabel]     = useState('');
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [watchlist, setWatchlist]         = useState<WatchlistItem[]>([]);

  // ── Init: restore state from localStorage ──
  useEffect(() => {
    try {
      setPortfolio(JSON.parse(localStorage.getItem('nepsai_portfolio') || '[]'));
      setReports(JSON.parse(localStorage.getItem('nepsai_reports') || '[]'));
      setWatchlist(getWatchlist());
    } catch {}
  }, []);

  // ── Fetch live stock list from NEPSE API ──
  useEffect(() => {
    fetch('/api/stocks')
      .then(r => r.json())
      .then(data => {
        if (data.stocks?.length > 0) {
          setAllStocks(data.stocks);
          setStocksCount(data.stocks.length);
        }
      })
      .catch(() => {});
  }, []);

  // ── Market status timer ──
  useEffect(() => {
    const check = () => {
      const now   = new Date();
      const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
      const nst   = new Date(utcMs + (5 * 60 + 45) * 60000);
      const day   = nst.getDay();
      const mins  = nst.getHours() * 60 + nst.getMinutes();
      const open  = day >= 0 && day <= 4 && mins >= 660 && mins < 900;
      setMarketOpen(open);
      if (!open && (day === 5 || day === 6))
        setMarketStatus('Closed · Opens Sunday');
      else if (!open && mins < 660) {
        const m = 660 - mins;
        setMarketStatus(`Opens in ${Math.floor(m / 60)}h ${m % 60}m`);
      } else if (!open && mins >= 900)
        setMarketStatus('Closed · Opens Tomorrow');
      else {
        const m = 900 - mins;
        setMarketStatus(`Market Open · Closes in ${Math.floor(m / 60)}h ${m % 60}m`);
      }
    };
    check();
    const iv = setInterval(check, 30000);
    return () => clearInterval(iv);
  }, []);

  // ── Auto-analyze from ?q= URL param (e.g. from /stocks page) ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (!q) return;
    // Clean up the URL immediately so Back button works cleanly
    window.history.replaceState({}, '', '/');
    runAnalysis(q.toUpperCase());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Live price refresh (polls every 60 s + on tab focus) ──
  const refreshPrices = useCallback(async () => {
    try {
      const data = await fetch('/api/market-data').then(r => r.json());
      if (!data.prices || Object.keys(data.prices).length === 0) return;
      setAllStocks(prev => prev.map(s => {
        const p = data.prices[s.symbol];
        return p ? { ...s, ltp: p.ltp, change: p.change } : s;
      }));
    } catch { /* silent — stale data is acceptable */ }
  }, []);

  useEffect(() => {
    refreshPrices();
    const iv = setInterval(refreshPrices, 60_000);
    const onVisible = () => { if (document.visibilityState === 'visible') refreshPrices(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', onVisible); };
  }, [refreshPrices]);

  // ── Search / autocomplete ──
  const handleSearch = useCallback((val: string) => {
    setQuery(val);
    if (!val.trim()) { setSuggestions([]); setShowSugg(false); return; }
    const q = val.toUpperCase();
    const filtered = allStocks
      .filter(s =>
        s.symbol.startsWith(q) || s.symbol.includes(q) ||
        s.name.toUpperCase().includes(q) || s.sector.toUpperCase().includes(q)
      )
      .sort((a, b) => {
        if (a.symbol === q) return -1;
        if (b.symbol === q) return 1;
        if (a.symbol.startsWith(q) && !b.symbol.startsWith(q)) return -1;
        if (!a.symbol.startsWith(q) && b.symbol.startsWith(q)) return 1;
        return a.symbol.localeCompare(b.symbol);
      })
      .slice(0, 8);
    setSuggestions(filtered);
    setShowSugg(filtered.length > 0);
  }, [allStocks]);

  // ── Run AI analysis ──
  const runAnalysis = async (sym: string) => {
    const t = sym.trim().toUpperCase();
    if (!t) return;
    const stockInfo = allStocks.find(s => s.symbol === t);
    setQuery(stockInfo ? `${stockInfo.symbol} — ${stockInfo.name}` : t);
    setShowSugg(false);
    setLoading(true);
    setLoadPct(0);
    setError('');
    setReport(null);
    setTab('search');

    let i = 0;
    setLoadMsg(LOADING_MSGS[0]);
    const iv = setInterval(() => {
      i++;
      setLoadMsg(LOADING_MSGS[i % LOADING_MSGS.length]);
      setLoadPct(Math.min(90, (i / LOADING_MSGS.length) * 100));
    }, 1800);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker:  t,
          company: stockInfo?.name   || '',
          sector:  stockInfo?.sector || '',
          price:   stockInfo?.ltp    || '',
        }),
      });
      clearInterval(iv);
      setLoadPct(100);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'API error');
      const textBlock = data.content?.find((b: any) => b.type === 'text');
      if (!textBlock) throw new Error('No analysis returned.');
      let raw = textBlock.text.replace(/```json|```/g, '').trim();
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) raw = match[0];
      const parsed: Report = { ...JSON.parse(raw), savedAt: Date.now() };
      if (stockInfo) {
        if (!parsed.company || parsed.company === t) parsed.company = stockInfo.name;
        if (!parsed.sector  || parsed.sector  === 'N/A') parsed.sector = stockInfo.sector;
      }
      const updated = [parsed, ...reports.filter(r => r.ticker !== parsed.ticker)].slice(0, 50);
      setReports(updated);
      localStorage.setItem('nepsai_reports', JSON.stringify(updated));
      setReport(parsed);
    } catch (e: any) {
      clearInterval(iv);
      setError(e.message || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
      setLoadPct(0);
    }
  };

  // ── Portfolio ──
  const addPortfolioItem = () => {
    if (!portTicker) return alert('Enter a symbol');
    const shares = parseFloat(portShares), price = parseFloat(portPrice);
    if (!shares || shares <= 0) return alert('Enter valid units');
    if (!price  || price  <= 0) return alert('Enter valid avg cost');
    const updated = [
      ...portfolio,
      { ticker: portTicker.toUpperCase(), shares, buyPrice: price, label: portLabel, added: Date.now() },
    ];
    setPortfolio(updated);
    localStorage.setItem('nepsai_portfolio', JSON.stringify(updated));
    setPortTicker(''); setPortShares(''); setPortPrice(''); setPortLabel('');
  };

  const removePortfolioItem = (idx: number) => {
    const updated = portfolio.filter((_, i) => i !== idx);
    setPortfolio(updated);
    localStorage.setItem('nepsai_portfolio', JSON.stringify(updated));
  };

  const deleteReport = (ticker: string) => {
    const updated = reports.filter(r => r.ticker !== ticker);
    setReports(updated);
    localStorage.setItem('nepsai_reports', JSON.stringify(updated));
  };

  const toggleWatchlist = (ticker: string) => {
    const isWatched = watchlist.some(i => i.ticker === ticker);
    if (isWatched) {
      removeFromWatchlist(ticker);
    } else {
      const stockInfo = allStocks.find(s => s.symbol === ticker);
      addToWatchlist({ ticker, name: stockInfo?.name || ticker, sector: stockInfo?.sector || '' });
    }
    setWatchlist(getWatchlist());
  };

  const showLanding = tab === 'search' && !report;

  // Lock/unlock page scroll for landing vs dashboard
  useEffect(() => {
    document.documentElement.classList.toggle('landing-mode', showLanding);
    return () => document.documentElement.classList.remove('landing-mode');
  }, [showLanding]);

  const searchProps = {
    query, suggestions, showSugg, loading, stocksCount,
    onQueryChange: handleSearch,
    onAnalyze: runAnalysis,
    onSelect: (s: Stock) => { setQuery(`${s.symbol} — ${s.name}`); setShowSugg(false); runAnalysis(s.symbol); },
    onClear: () => { setQuery(''); setSuggestions([]); setShowSugg(false); setReport(null); setError(''); },
    onHideSugg: () => setShowSugg(false),
    onShowSugg: () => setShowSugg(true),
  };

  return (
    <>
      <div className="container">
        {showLanding ? (
          <LandingHero
            marketOpen={marketOpen} marketStatus={marketStatus}
            loadMsg={loadMsg} loadPct={loadPct} error={error}
            reportsCount={reports.length} portfolioCount={portfolio.length}
            onSectorClick={handleSearch}
            onHistoryClick={() => setTab('history')}
            onPortfolioClick={() => setTab('portfolio')}
            {...searchProps}
          />
        ) : (
          <>
            <AppHeader marketOpen={marketOpen} marketStatus={marketStatus} />
            <SearchBar {...searchProps} />
            <LoadingBar show={loading} loadMsg={loadMsg} loadPct={loadPct} />
            <ErrorBanner error={error} loading={loading} />
            <TabBar
              show={!!(report || reports.length || portfolio.length)}
              tab={tab} reportCount={reports.length} portfolioCount={portfolio.length}
              onTabChange={setTab}
            />
            {tab === 'search' && report && (
              <AnalysisPanel
                report={report} activeSection={activeSection}
                isWatched={watchlist.some(i => i.ticker === report.ticker)}
                onSectionToggle={setActiveSection}
                onAddToPortfolio={ticker => { setPortTicker(ticker); setTab('portfolio'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                onWatchlistToggle={toggleWatchlist}
              />
            )}
            {tab === 'history' && (
              <HistoryTab
                reports={reports}
                onSelect={r => { setReport(r); setTab('search'); }}
                onDelete={deleteReport}
                onClearAll={() => { setReports([]); localStorage.removeItem('nepsai_reports'); }}
              />
            )}
            {tab === 'portfolio' && (
              <PortfolioTab
                portfolio={portfolio}
                portTicker={portTicker} portShares={portShares}
                portPrice={portPrice}  portLabel={portLabel}
                onPortTickerChange={setPortTicker}
                onPortSharesChange={setPortShares}
                onPortPriceChange={setPortPrice}
                onPortLabelChange={setPortLabel}
                onAdd={addPortfolioItem}
                onRemove={removePortfolioItem}
                onAnalyze={ticker => { runAnalysis(ticker); setTab('search'); }}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}
