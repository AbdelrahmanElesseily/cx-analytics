import { useState, useRef, useEffect } from 'react'
import { X, Download, Trash2, FileText, Database, BookOpen, Plus, ChevronDown } from 'lucide-react'
import styles from './ReportPanel.module.css'

async function downloadReport(items, chartData) {
  const res = await fetch('http://localhost:8000/api/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: items.map(i => ({ question: i.question, mode: i.mode, data: i.data })),
      chart_data: chartData,
    }),
  })
  if (!res.ok) throw new Error('Failed to generate report')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'cx-report.docx'; a.click()
  URL.revokeObjectURL(url)
}

function getPreview(item) {
  if (item.mode === 'rag') {
    const answer = item.data?.answer || ''
    return answer.length > 80 ? answer.slice(0, 80) + '…' : answer
  }
  if (item.mode === 'nlq') {
    const rows = item.data?.rows || []
    const cols = item.data?.columns || []
    if (!rows.length || !cols.length) return null
    return rows.slice(0, 2).map(r => cols.map(c => r[c] ?? '—').join(': ')).join(' · ')
  }
  return null
}

export default function ReportPanel({
  reports, activeReportId, onSetActive, onNewReport,
  onDeleteReport, onRemove, onClear, chartData,
}) {
  const [open,          setOpen]          = useState(false)
  const [dlMenu,        setDlMenu]        = useState(false)
  const [downloading,   setDownloading]   = useState(null) // report id being downloaded
  const [dlError,       setDlError]       = useState(null)
  const dlMenuRef = useRef(null)

  const activeReport = reports.find(r => r.id === activeReportId) || reports[0]
  const totalItems   = reports.reduce((s, r) => s + r.items.length, 0)

  useEffect(() => {
    if (!dlMenu) return
    const close = (e) => { if (!dlMenuRef.current?.contains(e.target)) setDlMenu(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [dlMenu])

  async function handleDownload(report) {
    setDownloading(report.id); setDlError(null); setDlMenu(false)
    try { await downloadReport(report.items, chartData) }
    catch (e) { setDlError(e.message) }
    finally { setDownloading(null) }
  }

  function handleDownloadClick() {
    if (reports.length === 1) {
      handleDownload(activeReport)
    } else {
      setDlMenu(o => !o)
    }
  }

  return (
    <>
      {/* Floating pill */}
      <button
        className={`${styles.pill} ${open ? styles.pillOpen : ''}`}
        onClick={() => setOpen(o => !o)}
        title="Report"
      >
        {open ? <X size={16}/> : <FileText size={16}/>}
        {!open && <span className={styles.pillLabel}>Report</span>}
        {!open && totalItems > 0 && (
          <span className={styles.pillBadge}>{totalItems}</span>
        )}
      </button>

      {/* Popup */}
      {open && (
        <div className={styles.popup}>

          {/* Header */}
          <div className={styles.popupHeader}>
            <div className={styles.titleRow}>
              <FileText size={13} style={{color:'#6366F1', flexShrink:0}}/>
              <div>
                <span className={styles.title}>Report</span>
                <span className={styles.sub}>{reports.length} report{reports.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <div style={{display:'flex',gap:4,alignItems:'center'}}>
              <button className={styles.newBtn} onClick={onNewReport} title="New report">
                <Plus size={11}/> New
              </button>
              <button className={styles.closeBtn} onClick={() => setOpen(false)}>
                <X size={14}/>
              </button>
            </div>
          </div>

          {/* Report tabs */}
          <div className={styles.tabs}>
            {reports.map(r => (
              <div
                key={r.id}
                className={`${styles.tabItem} ${r.id === activeReportId ? styles.tabActive : ''}`}
                onClick={() => onSetActive(r.id)}
              >
                <span className={styles.tabName}>{r.name}</span>
                {r.items.length > 0 && (
                  <span className={styles.tabCount}>{r.items.length}</span>
                )}
                {reports.length > 1 && (
                  <button
                    className={styles.tabDel}
                    onClick={e => { e.stopPropagation(); onDeleteReport(r.id) }}
                    title="Delete report"
                  >
                    <X size={8}/>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Items */}
          <div className={styles.list}>
            {activeReport.items.length === 0 && (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}>📄</span>
                <p className={styles.emptyText}>No items yet</p>
                <p className={styles.emptySub}>Click "+ Report" on any AI answer to add it here</p>
              </div>
            )}
            {activeReport.items.map((item, i) => {
              const preview = getPreview(item)
              return (
                <div key={item.msgId} className={styles.item}>
                  <div className={styles.itemHeader}>
                    <span className={styles.itemNum}>Q{i + 1}</span>
                    <span className={styles.itemMode}>
                      {item.mode === 'rag'
                        ? <><BookOpen size={8}/> RAG</>
                        : <><Database size={8}/> SQL</>
                      }
                    </span>
                    <button className={styles.removeBtn} onClick={() => onRemove(item.msgId)}>
                      <X size={9}/>
                    </button>
                  </div>
                  <p className={styles.itemQ}>{item.question}</p>
                  {preview && <p className={styles.itemPreview}>{preview}</p>}
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <div className={styles.footerNote}>
              <FileText size={10}/> Dashboard charts auto-included in download
            </div>
            {dlError && <p className={styles.dlError}>{dlError}</p>}
            <div className={styles.footerBtns}>
              <button
                className={styles.clearBtn}
                onClick={onClear}
                disabled={activeReport.items.length === 0}
              >
                <Trash2 size={11}/> Clear
              </button>

              {/* Download button — picker if multiple reports */}
              <div className={styles.dlWrap} ref={dlMenuRef}>
                <button
                  className={`${styles.dlBtn} ${activeReport.items.length === 0 ? styles.dlBtnDisabled : ''}`}
                  onClick={handleDownloadClick}
                  disabled={activeReport.items.length === 0 || downloading !== null}
                >
                  <Download size={12}/>
                  {downloading !== null ? 'Generating…' : 'Download'}
                  {reports.length > 1 && activeReport.items.length > 0 && (
                    <ChevronDown size={11} style={{marginLeft:2}}/>
                  )}
                </button>

                {dlMenu && (
                  <div className={styles.dlDropdown}>
                    <p className={styles.dlDropdownLabel}>Choose report to download</p>
                    {reports.map(r => (
                      <div key={r.id} className={styles.dlDropdownItem}>
                        <div>
                          <p className={styles.dlDropdownName}>{r.name}</p>
                          <p className={styles.dlDropdownMeta}>
                            {r.items.length} item{r.items.length !== 1 ? 's' : ''}
                            {r.id === activeReportId ? ' · active' : ''}
                          </p>
                        </div>
                        <button
                          className={`${styles.dlDropdownBtn} ${r.items.length === 0 ? styles.dlDropdownBtnDisabled : ''}`}
                          onClick={() => handleDownload(r)}
                          disabled={r.items.length === 0 || downloading !== null}
                        >
                          {downloading === r.id ? '…' : <Download size={10}/>}
                        </button>
                      </div>
                    ))}
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
