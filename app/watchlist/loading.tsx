// Shown during navigation to /watchlist — matches WatchlistPage card layout

function SkeletonWatchlistRow() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '9px 14px',
      background: 'var(--card)',
      border: '1px solid var(--border)',
      gap: 12,
    }}>
      {/* Ticker + name + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 5 }}>
          <div className="animate-pulse" style={{ width: 52, height: 13, background: 'var(--border2)', borderRadius: 3 }} />
          <div className="animate-pulse" style={{ width: 140, height: 11, background: 'var(--border2)', borderRadius: 3 }} />
        </div>
        <div className="animate-pulse" style={{ width: 110, height: 9, background: 'var(--border2)', borderRadius: 2 }} />
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <div className="animate-pulse" style={{ width: 72, height: 28, background: 'var(--border2)', borderRadius: 2 }} />
        <div className="animate-pulse" style={{ width: 60, height: 28, background: 'var(--border2)', borderRadius: 2 }} />
      </div>
    </div>
  )
}

export default function Loading() {
  return (
    <main style={{ position: 'relative', zIndex: 1 }}>
      <div className="container">
        {/* Page header */}
        <div style={{
          paddingTop: 40,
          paddingBottom: 20,
          marginBottom: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          borderBottom: '1px solid var(--border)',
        }}>
          <div className="animate-pulse" style={{ width: 48, height: 13, background: 'var(--border2)', borderRadius: 3 }} />
          <div className="animate-pulse" style={{ width: 78, height: 18, background: 'var(--border2)', borderRadius: 3 }} />
          <div className="animate-pulse" style={{ width: 48, height: 11, background: 'var(--border2)', borderRadius: 2, marginLeft: 'auto' }} />
        </div>

        {/* Watchlist rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonWatchlistRow key={i} />)}
        </div>
      </div>
    </main>
  )
}
