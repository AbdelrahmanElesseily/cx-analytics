import styles from './Topbar.module.css'

export default function Topbar() {
  const now = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <header className={styles.topbar}>
      <div className={styles.brand}>
        <span className={styles.brandIcon}>◈</span>
        <div>
          <span className={styles.brandName}>CX Analytics</span>
          <span className={styles.brandSub}>Customer Experience Intelligence</span>
        </div>
      </div>
      <div className={styles.meta}>
        <span className={styles.date}>{now}</span>
        <span className={styles.live}>
          <span className={styles.dot} />
          Live
        </span>
      </div>
    </header>
  )
}
