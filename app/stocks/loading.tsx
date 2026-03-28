// Shown during navigation to /stocks — matches StockList layout

function SkeletonStockRow() {
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
      <div style={{ flex: 1, display: 'flex', gap: 10, alignItems: 'center' }}>
        <div className="animate-pulse" style={{ width: 52, height: 13, background: 'var(--border2)', borderRadius: 3 }} />
        <div className="animate-pulse" style={{ width: 160, height: 11, background: 'var(--border2)', borderRadius: 3 }} />
      </div>
      <div className="animate-pulse" style={{ width: 72, height: 28, background: 'var(--border2)', borderRadius: 2 }} />
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
          <div className="animate-pulse" style={{ width: 88, height: 18, background: 'var(--border2)', borderRadius: 3 }} />
        </div>

        {/* Controls: search input + 2 selects */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <div className="animate-pulse" style={{ flex: 1, minWidth: 180, height: 36, background: 'var(--border2)', borderRadius: 2 }} />
          <div className="animate-pulse" style={{ width: 120, height: 36, background: 'var(--border2)', borderRadius: 2 }} />
          <div className="animate-pulse" style={{ width: 110, height: 36, background: 'var(--border2)', borderRadius: 2 }} />
        </div>

        {/* Count line */}
        <div className="animate-pulse" style={{ width: 120, height: 11, background: 'var(--border2)', borderRadius: 2, marginBottom: 12 }} />

        {/* Stock rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {Array.from({ length: 14 }).map((_, i) => <SkeletonStockRow key={i} />)}
        </div>
      </div>
    </main>
  )
}
