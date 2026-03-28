// Shown during navigation to /market — matches MarketDashboard's 3-column grid layout

function SkeletonBar({ width }: { width: number }) {
  return (
    <span
      className="animate-pulse"
      style={{ display: 'inline-block', width, height: 13, background: 'var(--border2)', borderRadius: 3 }}
    />
  )
}

function SkeletonRow() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <SkeletonBar width={52} />
      <div style={{ display: 'flex', gap: 12 }}>
        <SkeletonBar width={60} />
        <SkeletonBar width={44} />
      </div>
    </div>
  )
}

function SectionSkeleton({ title, accent }: { title: string; accent: string }) {
  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderTop: `3px solid ${accent}`,
      borderRadius: 2,
      padding: '20px 20px 12px',
      flex: 1,
      minWidth: 0,
    }}>
      <h2 style={{
        fontSize: '0.7rem',
        fontWeight: 600,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: accent,
        marginBottom: 14,
      }}>
        {title}
      </h2>
      {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
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
          <div className="animate-pulse" style={{ width: 134, height: 18, background: 'var(--border2)', borderRadius: 3 }} />
        </div>

        {/* 3-column grid matching MarketDashboard */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
        }}>
          <SectionSkeleton title="Top Gainers"     accent="var(--teal)"     />
          <SectionSkeleton title="Top Losers"      accent="var(--red-loss)" />
          <SectionSkeleton title="Volume Leaders"  accent="var(--gold)"     />
        </div>
      </div>
    </main>
  )
}
