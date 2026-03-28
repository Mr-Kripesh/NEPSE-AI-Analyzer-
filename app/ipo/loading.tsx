// Server component — shown while IpoPage awaits the CDSC fetch
import styles from './loading.module.css'

function SkeletonCard() {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <div className={`animate-pulse ${styles.barCardTitle}`} />
          <div className={`animate-pulse ${styles.barCardSubtitle}`} />
        </div>
        <div className={`animate-pulse ${styles.barCardBadge}`} />
      </div>
      <div className={styles.fields}>
        <div className={styles.field}>
          <div className={`animate-pulse ${styles.barFieldLabel1}`} />
          <div className={`animate-pulse ${styles.barFieldValue1}`} />
        </div>
        <div className={styles.field}>
          <div className={`animate-pulse ${styles.barFieldLabel2}`} />
          <div className={`animate-pulse ${styles.barFieldValue2}`} />
        </div>
        <div className={styles.field}>
          <div className={`animate-pulse ${styles.barFieldLabel3}`} />
          <div className={`animate-pulse ${styles.barFieldValue3}`} />
        </div>
        <div className={styles.field}>
          <div className={`animate-pulse ${styles.barFieldLabel4}`} />
          <div className={`animate-pulse ${styles.barFieldValue4}`} />
        </div>
      </div>
    </div>
  )
}

export default function Loading() {
  return (
    <main className={styles.main}>
      <div className="container">
        <div className={styles.header}>
          <div className={`animate-pulse ${styles.bar} ${styles.barNav}`} />
          <div className={`animate-pulse ${styles.bar} ${styles.barTitle}`} />
        </div>
        <div className={`animate-pulse ${styles.bar} ${styles.barCount}`} />
        <div className={styles.list}>
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    </main>
  )
}
