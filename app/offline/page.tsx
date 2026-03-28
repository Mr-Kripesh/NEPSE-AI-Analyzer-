import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Offline — NEPSE AI',
}

export default function OfflinePage() {
  return (
    <main style={{ position: 'relative', zIndex: 1 }}>
      <div className="container" style={{ textAlign: 'center', paddingTop: 80, paddingBottom: 80 }}>
        <div style={{ fontSize: '3rem', marginBottom: 20 }}>📡</div>
        <h1 style={{
          fontFamily: 'var(--font-stack-sans)',
          fontWeight: 600,
          fontSize: '1.4rem',
          color: 'var(--white)',
          marginBottom: 10,
        }}>
          You&apos;re offline
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: 8, lineHeight: 1.6 }}>
          No internet connection. Previously cached pages are still available.
        </p>
        <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 32 }}>
          Live prices and AI analysis require an active connection.
        </p>
        <Link
          href="/"
          style={{
            fontSize: '0.8rem',
            fontWeight: 600,
            color: '#fff',
            background: 'var(--crimson)',
            padding: '10px 20px',
            textDecoration: 'none',
          }}
        >
          ← Back to Home
        </Link>
      </div>
    </main>
  )
}
