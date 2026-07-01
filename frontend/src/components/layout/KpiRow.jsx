import styles from './KpiRow.module.css'

export default function KpiRow({ kpis }) {
  const cards = [
    { label: 'Feedback entries',     value: kpis.totalFeedback,  sub: 'value moments captured',          color: 'gold'   },
    { label: 'Avg satisfaction',     value: `${kpis.avgRating}/5`, sub: 'average HM rating',             color: 'green'  },
    { label: 'Rating 5 moments',     value: kpis.rating5,        sub: 'top-rated experiences',           color: 'blue'   },
    { label: 'Improvement actions',  value: kpis.totalActions,   sub: `${kpis.withAction} with action plan`, color: 'purple' },
    { label: 'Channels affected',    value: kpis.channels,       sub: 'unique touchpoints',              color: 'amber'  },
  ]

  return (
    <div className={styles.row}>
      {cards.map(c => (
        <div key={c.label} className={`${styles.card} ${styles[c.color]}`}>
          <span className={styles.label}>{c.label}</span>
          <span className={styles.value}>{c.value}</span>
          <span className={styles.sub}>{c.sub}</span>
        </div>
      ))}
    </div>
  )
}
