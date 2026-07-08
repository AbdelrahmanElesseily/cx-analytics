import { useState, useRef, useEffect } from 'react'
import { X, Download, Trash2, FileText, Database, BookOpen, Plus, ChevronDown, Edit3 } from 'lucide-react'
import styles from './ReportPanel.module.css'

async function downloadReport(report, chartData) {
  const res = await fetch('http://localhost:8000/api/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sections: report.sections,
      cover: report.cover,
      include_charts: report.includeCharts,
      chart_data: chartData,
    }),
  })
  if (!res.ok) throw new Error('Failed to generate report')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `${report.name}.docx`; a.click()
  URL.revokeObjectURL(url)
}

export default function ReportPanel({
  open, onClose,
  reports, activeReportId, onSetActive, onNewReport,
  onDeleteReport, onRemove, onClear, chartData, onOpenEditor,
}) {
  const [dlMenu,      setDlMenu]      = useState(false)
  const [downloading, setDownloading] = useState(null)
  const [dlError,     setDlError]     = useState(null)
  const dlMenuRef = useRef(null)

  const activeReport  = reports.find(r => r.id === activeReportId) || reports[0]
  const findings      = activeReport.sections.filter(s => s.type === 'finding')
  const totalFindings = reports.reduce((s, r) => s + r.sections.filter(x => x.type === 'finding').length, 0)

  useEffect(() => {
    if (!dlMenu) return
    const close = e => { if (!dlMenuRef.current?.contains(e.target)) setDlMenu(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [dlMenu])

  async function handleDownload(report) {
    setDownloading(report.id); setDlError(null); setDlMenu(false)
    try { await downloadReport(report, chartData) }
    catch (e) { setDlError(e.message) }
    finally { setDownloading(null) }
  }

  function handleDownloadClick() {
    if (reports.length === 1) handleDownload(activeReport)
    else setDlMenu(o => !o)
  }

  return (
    <>
      {open && (
        <div className={styles.popup}>
          <div className={styles.popupHeader}>
            <div className={styles.titleRow}>
              <FileText size={13} style={{color:'#6366F1',flexShrink:0}}/>
              <div>
                <span className={styles.title}>Report</span>
                <span className={styles.sub}>{reports.length} report{reports.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <div style={{display:'flex',gap:4,alignItems:'center'}}>
              <button className={styles.editorBtn} onClick={() => { onClose(); onOpenEditor() }} title="Open full editor">
                <Edit3 size={11}/> Editor
              </button>
              <button className={styles.newBtn} onClick={onNewReport}><Plus size={11}/> New</button>
              <button className={styles.closeBtn} onClick={onClose}><X size={14}/></button>
            </div>
          </div>

          <div className={styles.tabs}>
            {reports.map(r => (
              <div key={r.id} className={`${styles.tabItem} ${r.id === activeReportId ? styles.tabActive : ''}`} onClick={() => onSetActive(r.id)}>
                <span className={styles.tabName}>{r.name}</span>
                {r.sections.filter(s=>s.type==='finding').length > 0 && (
                  <span className={styles.tabCount}>{r.sections.filter(s=>s.type==='finding').length}</span>
                )}
                {reports.length > 1 && (
                  <button className={styles.tabDel} onClick={e=>{e.stopPropagation();onDeleteReport(r.id)}}><X size={8}/></button>
                )}
              </div>
            ))}
          </div>

          <div className={styles.list}>
            {findings.length === 0 && (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}>📄</span>
                <p className={styles.emptyText}>No items yet</p>
                <p className={styles.emptySub}>Click "+ Report" on any AI answer to add it here</p>
              </div>
            )}
            {findings.map((item, i) => (
              <div key={item.msgId} className={styles.item}>
                <div className={styles.itemHeader}>
                  <span className={styles.itemNum}>Q{i + 1}</span>
                  <span className={styles.itemMode}>
                    {item.mode === 'rag' ? <><BookOpen size={8}/> RAG</> : <><Database size={8}/> SQL</>}
                  </span>
                  <button className={styles.removeBtn} onClick={() => onRemove(item.msgId)}><X size={9}/></button>
                </div>
                <p className={styles.itemQ}>{item.question}</p>
                {item.note && <p className={styles.itemNote}>{item.note}</p>}
              </div>
            ))}
          </div>

          <div className={styles.footer}>
            <div className={styles.footerNote}><FileText size={10}/> Dashboard charts auto-included</div>
            {dlError && <p className={styles.dlError}>{dlError}</p>}
            <div className={styles.footerBtns}>
              <button className={styles.clearBtn} onClick={onClear} disabled={findings.length === 0}>
                <Trash2 size={11}/> Clear
              </button>
              <div className={styles.dlWrap} ref={dlMenuRef}>
                <button
                  className={`${styles.dlBtn} ${findings.length === 0 ? styles.dlBtnDisabled : ''}`}
                  onClick={handleDownloadClick}
                  disabled={findings.length === 0 || downloading !== null}
                >
                  <Download size={12}/>
                  {downloading !== null ? 'Generating…' : 'Download'}
                  {reports.length > 1 && findings.length > 0 && <ChevronDown size={11} style={{marginLeft:2}}/>}
                </button>
                {dlMenu && (
                  <div className={styles.dlDropdown}>
                    <p className={styles.dlDropdownLabel}>Choose report</p>
                    {reports.map(r => {
                      const count = r.sections.filter(s=>s.type==='finding').length
                      return (
                        <div key={r.id} className={styles.dlDropdownItem}>
                          <div>
                            <p className={styles.dlDropdownName}>{r.name}</p>
                            <p className={styles.dlDropdownMeta}>{count} item{count!==1?'s':''}{r.id===activeReportId?' · active':''}</p>
                          </div>
                          <button
                            className={`${styles.dlDropdownBtn} ${count===0?styles.dlDropdownBtnDisabled:''}`}
                            onClick={() => handleDownload(r)}
                            disabled={count === 0 || downloading !== null}
                          >
                            {downloading === r.id ? '…' : <Download size={10}/>}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
