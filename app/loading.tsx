// Shown during route transitions TO the home page (Next.js App Router automatic Suspense boundary)

function Pill({ width }: { width: number }) {
  return (
    <div
      className="animate-pulse"
      style={{ width, height: 26, background: 'var(--border2)', borderRadius: 999, flexShrink: 0 }}
    />
  )
}

function Bar({ width, height = 13 }: { width: number; height?: number }) {
  return (
    <div
      className="animate-pulse"
      style={{ width, height, background: 'var(--border2)', borderRadius: 4 }}
    />
  )
}

export default function HomeLoading() {
  return (
    <div style={{
      height: 'calc(100vh - 56px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 640,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
      }}>
        {/* Title — NepseAI */}
        <Bar width={260} height={62} />

        {/* Subtitle — नेपाल स्टक विश्लेषण */}
        <Bar width={190} height={18} />

        {/* Status badges */}
        <div style={{ display: 'flex', gap: 8 }}>
          <Pill width={118} />
          <Pill width={82} />
          <Pill width={94} />
        </div>

        {/* Search bar pill */}
        <div
          className="animate-pulse"
          style={{ width: '100%', height: 52, background: 'var(--border2)', borderRadius: 999 }}
        />

        {/* Popular chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[44, 52, 56, 44, 40, 36, 40, 52, 48, 44].map((w, i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{ width: w, height: 26, background: 'var(--border2)', borderRadius: 6 }}
            />
          ))}
        </div>

        {/* Sector chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[124, 134, 100, 126, 100, 80, 112, 90, 88, 70, 80].map((w, i) => (
            <Pill key={i} width={w} />
          ))}
        </div>
      </div>
    </div>
  )
}
