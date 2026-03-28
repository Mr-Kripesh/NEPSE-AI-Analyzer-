const pulse = {
  background: 'var(--border2)',
  borderRadius: 4,
  animation: 'pulse 1.5s ease-in-out infinite',
} as const

function SkeletonThumb({ height }: { height: number }) {
  return <div className="animate-pulse" style={{ ...pulse, height, width: '100%' }} />
}

function SkeletonCard() {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
      <SkeletonThumb height={100} />
      <div style={{ padding: '10px 12px' }}>
        <div className="animate-pulse" style={{ ...pulse, height: 13, width: '80%', marginBottom: 6 }} />
        <div className="animate-pulse" style={{ ...pulse, height: 11, width: '95%', marginBottom: 4 }} />
        <div className="animate-pulse" style={{ ...pulse, height: 11, width: '65%', marginBottom: 10 }} />
        <div style={{ display: 'flex', gap: 6 }}>
          <div className="animate-pulse" style={{ ...pulse, height: 16, width: 48, borderRadius: 20 }} />
          <div className="animate-pulse" style={{ ...pulse, height: 16, width: 40, borderRadius: 20 }} />
        </div>
      </div>
    </div>
  )
}

function SkeletonHeroCard() {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      <SkeletonThumb height={180} />
      <div style={{ padding: '14px 16px' }}>
        <div className="animate-pulse" style={{ ...pulse, height: 18, width: '90%', marginBottom: 8 }} />
        <div className="animate-pulse" style={{ ...pulse, height: 18, width: '70%', marginBottom: 10 }} />
        <div className="animate-pulse" style={{ ...pulse, height: 12, width: '55%', marginBottom: 12 }} />
        <div style={{ display: 'flex', gap: 6 }}>
          <div className="animate-pulse" style={{ ...pulse, height: 16, width: 52, borderRadius: 20 }} />
          <div className="animate-pulse" style={{ ...pulse, height: 16, width: 44, borderRadius: 20 }} />
        </div>
      </div>
    </div>
  )
}

function SkeletonSecondaryCard() {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6,
      overflow: 'hidden', display: 'flex',
    }}>
      <div className="animate-pulse" style={{ ...pulse, width: 80, flexShrink: 0 }} />
      <div style={{ padding: '10px 12px', flex: 1 }}>
        <div className="animate-pulse" style={{ ...pulse, height: 12, width: '90%', marginBottom: 6 }} />
        <div className="animate-pulse" style={{ ...pulse, height: 12, width: '60%', marginBottom: 6 }} />
        <div className="animate-pulse" style={{ ...pulse, height: 10, width: '40%' }} />
      </div>
    </div>
  )
}

export default function Loading() {
  return (
    <main style={{ position: 'relative', zIndex: 1 }}>
      <div className="container">
        {/* Header skeleton */}
        <div style={{
          paddingTop: 40, paddingBottom: 20, marginBottom: 0,
          display: 'flex', flexDirection: 'column', gap: 6,
          borderBottom: '1px solid var(--border)',
        }}>
          <div className="animate-pulse" style={{ ...pulse, width: 80, height: 11 }} />
          <div className="animate-pulse" style={{ ...pulse, width: 140, height: 20 }} />
          <div className="animate-pulse" style={{ ...pulse, width: 220, height: 12 }} />
        </div>

        {/* Filter chips skeleton */}
        <div style={{ display: 'flex', gap: 8, padding: '16px 0 12px', overflow: 'hidden' }}>
          {[48, 60, 44, 32, 36, 56, 48].map((w, i) => (
            <div key={i} className="animate-pulse" style={{ ...pulse, height: 26, width: w, borderRadius: 20, flexShrink: 0 }} />
          ))}
        </div>

        {/* Hero skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <SkeletonHeroCard />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Array.from({ length: 3 }).map((_, i) => <SkeletonSecondaryCard key={i} />)}
          </div>
        </div>

        {/* Main layout skeleton */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          {/* Feed */}
          <div style={{ flex: '0 0 calc(65% - 10px)', minWidth: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ flex: '0 0 calc(35% - 10px)' }}>
            {/* AI panel skeleton */}
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 8, padding: 16, marginBottom: 14,
            }}>
              <div className="animate-pulse" style={{ ...pulse, height: 11, width: 100, marginBottom: 16 }} />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div className="animate-pulse" style={{ ...pulse, height: 12, width: '80%', marginBottom: 6 }} />
                  <div className="animate-pulse" style={{ ...pulse, height: 3, width: '100%', borderRadius: 2 }} />
                </div>
              ))}
            </div>

            {/* Trending skeleton */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
              <div className="animate-pulse" style={{ ...pulse, height: 11, width: 60, marginBottom: 14 }} />
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid var(--border)' }}>
                  <div className="animate-pulse" style={{ ...pulse, width: 18, height: 12, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="animate-pulse" style={{ ...pulse, height: 11, width: '90%', marginBottom: 5 }} />
                    <div className="animate-pulse" style={{ ...pulse, height: 11, width: '60%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
