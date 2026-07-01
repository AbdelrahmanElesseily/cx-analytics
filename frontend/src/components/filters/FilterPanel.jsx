import { X, SlidersHorizontal } from 'lucide-react'
import { QUARTERS, SOURCES_FB, SOURCES_IM, CHANNELS_FB, CHANNELS_IM, CX_STAGES, SERVICES, RATINGS } from '../../data/mockData'
import styles from './FilterPanel.module.css'

const CX_STAGE_COLORS = {
  'Service Application and Submission': '#5A8DE0',
  'Communication During Procedures':    '#C9A84C',
  'Receiving Service Information':       '#4CAF82',
  'Service Completion':                  '#9B6EE0',
  'All':                                 '#8E9AB8',
}

export default function FilterPanel({ filters, updateFilter, toggleArray, resetFilters, activeCount }) {
  const allSources = [...new Set([...SOURCES_FB, ...SOURCES_IM])]
  const allChannels = [...new Set([...CHANNELS_FB, ...CHANNELS_IM])]

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}><SlidersHorizontal size={14} />Filters</span>
        {activeCount > 0 && (
          <button className={styles.reset} onClick={resetFilters}>
            <X size={12} />Clear {activeCount}
          </button>
        )}
      </div>

      <Section label="Quarter">
        {QUARTERS.map(q => (
          <Chip key={q} active={filters.quarters.includes(q)} onClick={() => toggleArray('quarters', q)}>{q}</Chip>
        ))}
      </Section>

      <Section label="Source">
        {allSources.map(s => (
          <Chip key={s} active={filters.sources.includes(s)} onClick={() => toggleArray('sources', s)}>{s}</Chip>
        ))}
      </Section>

      <Section label="Channel">
        {allChannels.map(c => (
          <Chip key={c} active={filters.channels.includes(c)} onClick={() => toggleArray('channels', c)}>{c}</Chip>
        ))}
      </Section>

      <Section label="CX Stage">
        {CX_STAGES.map(s => (
          <Chip key={s} active={filters.cx_stages.includes(s)} onClick={() => toggleArray('cx_stages', s)}
            dot={CX_STAGE_COLORS[s]}>{s}</Chip>
        ))}
      </Section>

      <Section label="Service">
        {SERVICES.map(s => (
          <Chip key={s} active={filters.services.includes(s)} onClick={() => toggleArray('services', s)}>{s}</Chip>
        ))}
      </Section>

      <Section label="Feedback Rating">
        {RATINGS.map(r => (
          <Chip key={r} active={filters.ratings.includes(r)} onClick={() => toggleArray('ratings', r)}>
            {'★'.repeat(r)} {r}/5
          </Chip>
        ))}
      </Section>
    </aside>
  )
}

function Section({ label, children }) {
  return (
    <div className={styles.section}>
      <span className={styles.sectionLabel}>{label}</span>
      <div className={styles.chips}>{children}</div>
    </div>
  )
}

function Chip({ active, onClick, children, dot }) {
  return (
    <button className={`${styles.chip} ${active ? styles.chipActive : ''}`} onClick={onClick}>
      {dot && <span className={styles.dot} style={{ background: dot }} />}
      {children}
    </button>
  )
}
