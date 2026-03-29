const pulse = {
  background: 'var(--border2)',
  borderRadius: 999,
  animation: 'pulse 1.5s ease-in-out infinite',
} as const

function SkeletonFrame({
  gridColumn,
  gridRow,
}: {
  gridColumn: string
  gridRow: string
}) {
  return (
    <div
      className="animate-pulse"
      style={{
        ...pulse,
        gridColumn,
        gridRow,
        minHeight: 140,
        borderRadius: 22,
      }}
    />
  )
}

export default function Loading() {
  return (
    <main className="page-main">
      <div className="container">
        <div style={{ paddingTop: 40, marginBottom: 20 }}>
          <div className="animate-pulse" style={{ ...pulse, width: 88, height: 10, marginBottom: 12 }} />
          <div className="animate-pulse" style={{ ...pulse, width: 260, height: 52, borderRadius: 18, marginBottom: 14 }} />
          <div className="animate-pulse" style={{ ...pulse, width: '60%', maxWidth: 560, height: 14, borderRadius: 8 }} />
        </div>

        <div
          style={{
            border: '1px solid var(--glass-border)',
            background: 'var(--glass-bg)',
            borderRadius: 24,
            overflow: 'hidden',
            marginBottom: 18,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse"
                style={{
                  ...pulse,
                  height: 82,
                  borderRadius: 0,
                  borderRight: index === 2 ? 'none' : '1px solid var(--glass-border)',
                }}
              />
            ))}
          </div>
          <div className="animate-pulse" style={{ ...pulse, height: 42, borderRadius: 0 }} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 20, overflow: 'hidden' }}>
          {[66, 116, 92, 86, 74].map((width, index) => (
            <div key={index} className="animate-pulse" style={{ ...pulse, width, height: 36, flexShrink: 0 }} />
          ))}
        </div>

        <div
          style={{
            border: '1px solid var(--glass-border)',
            background: 'var(--glass-bg)',
            borderRadius: 28,
            padding: 18,
          }}
        >
          <div className="animate-pulse" style={{ ...pulse, width: 160, height: 12, marginBottom: 16, borderRadius: 6 }} />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
              gridAutoRows: 62,
              gap: 12,
            }}
          >
            <SkeletonFrame gridColumn="span 5" gridRow="span 5" />
            <SkeletonFrame gridColumn="span 3" gridRow="span 5" />
            <SkeletonFrame gridColumn="span 4" gridRow="span 3" />
            <SkeletonFrame gridColumn="span 3" gridRow="span 4" />
            <SkeletonFrame gridColumn="span 2" gridRow="span 3" />
            <SkeletonFrame gridColumn="span 2" gridRow="span 3" />
            <SkeletonFrame gridColumn="span 6" gridRow="span 3" />
            <SkeletonFrame gridColumn="span 3" gridRow="span 4" />
          </div>
        </div>
      </div>
    </main>
  )
}
