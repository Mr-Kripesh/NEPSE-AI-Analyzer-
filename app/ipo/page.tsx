import type { Metadata } from 'next'
import Link from 'next/link'
import styles from './ipo.module.css'

export const metadata: Metadata = {
  title: 'Active IPOs — NEPSE AI',
  description: 'Currently active IPOs listed on NEPSE via CDSC MeroShare',
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface IpoItem {
  companyShareId?: number
  companyName?: string
  shareTypeName?: string
  openingDate?: string
  closingDate?: string
  statusName?: string
  unitPrice?: string | number
  minimumUnit?: string | number
  maximumUnit?: string | number
  symbol?: string
}

// ── Data fetching (1-hour server-side cache) ──────────────────────────────────

async function fetchIpos(): Promise<IpoItem[]> {
  try {
    const res = await fetch('https://backend.cdsc.com.np/api/meroShare/active/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    const data: unknown = await res.json()
    if (Array.isArray(data)) return data as IpoItem[]
    const obj = data as Record<string, unknown>
    const inner = obj.object ?? obj.data ?? obj.content ?? []
    return Array.isArray(inner) ? (inner as IpoItem[]) : []
  } catch {
    return []
  }
}

// ── UI ────────────────────────────────────────────────────────────────────────

function MetaField({ label, value }: { label: string; value?: string | number }) {
  if (value == null || String(value).trim() === '') return null
  return (
    <div>
      <span className={styles.metaLabel}>{label}</span>
      <span className={styles.metaValue}>{String(value)}</span>
    </div>
  )
}

function IpoCard({ ipo }: { ipo: IpoItem }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h2 className={styles.companyName}>{ipo.companyName ?? 'N/A'}</h2>
          <p className={styles.companyType}>
            {[ipo.symbol, ipo.shareTypeName].filter(Boolean).join(' · ')}
          </p>
        </div>
        {ipo.statusName && (
          <span className={styles.statusBadge}>{ipo.statusName}</span>
        )}
      </div>

      <div className={styles.fieldsGrid}>
        <MetaField label="Opening Date" value={ipo.openingDate?.split(' ')[0]} />
        <MetaField label="Closing Date" value={ipo.closingDate?.split(' ')[0]} />
        <MetaField label="Unit Price" value={ipo.unitPrice != null ? `Rs.${ipo.unitPrice}` : undefined} />
        <MetaField label="Min Units" value={ipo.minimumUnit} />
        <MetaField label="Max Units" value={ipo.maximumUnit} />
      </div>
    </div>
  )
}

// ── Page (async server component) ────────────────────────────────────────────

export default async function IpoPage() {
  const ipos = await fetchIpos()

  return (
    <main className="page-main">
      <div className="container">
        <div className="page-header">
          <Link href="/" className="page-back-link">← Home</Link>
          <h1 className="page-title">Active IPOs</h1>
        </div>


        {ipos.length === 0 ? (
          <p className={styles.noIpos}>
            No active IPOs at the moment. Check back later.
          </p>
        ) : (
          <div className={styles.list}>
            {ipos.map((ipo, i) => (
              <IpoCard key={ipo.companyShareId ?? i} ipo={ipo} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
