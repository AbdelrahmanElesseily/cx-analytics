import { useState } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import styles from './ReservationsTable.module.css'

const STAGE_COLORS = {
  'Service Application and Submission': '#5A8DE0',
  'Communication During Procedures':    '#C9A84C',
  'Receiving Service Information':       '#4CAF82',
  'Service Completion':                  '#9B6EE0',
  'All':                                 '#8E9AB8',
}

const RATING_COLOR = { 3:'#E8A94C', 4:'#5A8DE0', 5:'#4CAF82' }

const FB_COLS = [
  { key:'quarter',   label:'Quarter', width:70  },
  { key:'source',    label:'Source',  width:160 },
  { key:'channel',   label:'Channel', width:180 },
  { key:'cx_stage',  label:'CX Stage',width:200 },
  { key:'short',     label:'Value Moment', width:200 },
  { key:'rating',    label:'Rating',  width:80  },
]

const IM_COLS = [
  { key:'quarter',   label:'Quarter', width:70  },
  { key:'source',    label:'Source',  width:160 },
  { key:'channel',   label:'Channel', width:150 },
  { key:'service',   label:'Service', width:130 },
  { key:'cx_stage',  label:'CX Stage',width:200 },
  { key:'problem',   label:'Problem', width:260 },
  { key:'action',    label:'Action',  width:260 },
]

function Table({ cols, rows, emptyMsg }) {
  const [sortKey, setSortKey] = useState(cols[0].key)
  const [sortDir, setSortDir] = useState('asc')
  const [page,    setPage]    = useState(0)
  const PER_PAGE = 15

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d==='asc'?'desc':'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(0)
  }

  const sorted = [...rows].sort((a,b) => {
    const av=a[sortKey], bv=b[sortKey]
    if (av==null) return 1; if (bv==null) return -1
    const cmp = typeof av==='number' ? av-bv : String(av).localeCompare(String(bv))
    return sortDir==='asc' ? cmp : -cmp
  })

  const totalPages = Math.ceil(sorted.length / PER_PAGE)
  const pageRows   = sorted.slice(page*PER_PAGE, (page+1)*PER_PAGE)

  if (!rows.length) return (
    <div className={styles.empty}><p>{emptyMsg}</p></div>
  )

  return (
    <div className={styles.wrap}>
      <div className={styles.meta}>
        Showing {page*PER_PAGE+1}–{Math.min((page+1)*PER_PAGE, rows.length)} of {rows.length}
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {cols.map(col => (
                <th key={col.key} className={styles.th} style={{minWidth:col.width}} onClick={()=>handleSort(col.key)}>
                  <span className={styles.thInner}>
                    {col.label}
                    {sortKey===col.key
                      ? sortDir==='asc' ? <ArrowUp size={11}/> : <ArrowDown size={11}/>
                      : <ArrowUpDown size={11} opacity={0.3}/>}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r,i) => (
              <tr key={r.id||i} className={styles.row}>
                {cols.map(col => (
                  <td key={col.key} className={styles.td}>
                    {col.key==='rating' ? (
                      <span className={styles.rating} style={{color:RATING_COLOR[r.rating]}}>
                        {'★'.repeat(r.rating)} {r.rating}/5
                      </span>
                    ) : col.key==='cx_stage' ? (
                      <span className={styles.stageBadge}
                        style={{color:STAGE_COLORS[r.cx_stage],borderColor:(STAGE_COLORS[r.cx_stage]||'#8E9AB8')+'44',background:(STAGE_COLORS[r.cx_stage]||'#8E9AB8')+'11'}}>
                        {r.cx_stage}
                      </span>
                    ) : col.key==='quarter' ? (
                      <span className={styles.quarter}>{r.quarter}</span>
                    ) : (
                      <span className={col.key==='problem'||col.key==='action'||col.key==='details' ? styles.textWrap : ''}>
                        {r[col.key] || '—'}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button className={styles.pageBtn} disabled={page===0} onClick={()=>setPage(p=>p-1)}>← Previous</button>
          <span className={styles.pageInfo}>Page {page+1} of {totalPages}</span>
          <button className={styles.pageBtn} disabled={page>=totalPages-1} onClick={()=>setPage(p=>p+1)}>Next →</button>
        </div>
      )}
    </div>
  )
}

export default function DataTables({ filteredFeedback, filteredImprovements, activeTab, setTab }) {
  return (
    <div>
      <div className={styles.tabRow}>
        <button className={`${styles.tab} ${activeTab==='improvements'?styles.tabActive:''}`} onClick={()=>setTab('improvements')}>
          Improvement Actions <span className={styles.cnt}>{filteredImprovements.length}</span>
        </button>
        <button className={`${styles.tab} ${activeTab==='feedback'?styles.tabActive:''}`} onClick={()=>setTab('feedback')}>
          Value Moments <span className={styles.cnt}>{filteredFeedback.length}</span>
        </button>
      </div>
      {activeTab==='improvements'
        ? <Table cols={IM_COLS} rows={filteredImprovements} emptyMsg="No improvement actions match the active filters." />
        : <Table cols={FB_COLS} rows={filteredFeedback}     emptyMsg="No feedback entries match the active filters." />
      }
    </div>
  )
}
