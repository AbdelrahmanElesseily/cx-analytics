import { useState } from 'react'
import { X, Download, Trash2, FileText } from 'lucide-react'
import styles from './ReportPanel.module.css'

async function downloadReport(items) {
  const res = await fetch('http://localhost:8000/api/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: items.map(i => ({ question: i.question, mode: i.mode, data: i.data })) }),
  })
  if (!res.ok) throw new Error('Failed to generate report')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'cx-report.docx'; a.click()
  URL.revokeObjectURL(url)
}

export default function ReportPanel({ items, onRemove, onClear }) {
  const [downloading, setDownloading] = useState(false)
  const [dlError,     setDlError]     = useState(null)

  async function handleDownload() {
    setDownloading(true); setDlError(null)
    try { await downloadReport(items) }
    catch (e) { setDlError(e.message) }
    finally { setDownloading(false) }
  }

  return (
    <aside className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <FileText size={14} className={styles.headerIcon}/>
          <div>
            <span className={styles.title}>Report</span>
            <span className={styles.sub}>{items.length} item{items.length !== 1 ? 's' : ''} · .docx</span>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className={styles.list}>
        {items.length === 0 && (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>📄</span>
            <p className={styles.emptyText}>No items yet</p>
            <p className={styles.emptySub}>Click "+ Report" on any AI answer to add it here</p>
          </div>
        )}
        {items.map((item, i) => (
          <div key={item.msgId} className={styles.item}>
            <div className={styles.itemHeader}>
              <span className={styles.itemNum}>Q{i + 1}</span>
              <span className={styles.itemMode}>{item.mode === 'rag' ? 'RAG' : 'SQL'}</span>
              <button className={styles.removeBtn} onClick={() => onRemove(item.msgId)} title="Remove">
                <X size={9}/>
              </button>
            </div>
            <p className={styles.itemQ}>{item.question}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        {dlError && <p className={styles.dlError}>{dlError}</p>}
        <div className={styles.footerBtns}>
          <button className={styles.clearBtn} onClick={onClear} disabled={items.length === 0}>
            <Trash2 size={11}/> Clear
          </button>
          <button
            className={`${styles.dlBtn} ${items.length === 0 ? styles.dlBtnDisabled : ''}`}
            onClick={handleDownload}
            disabled={items.length === 0 || downloading}
          >
            <Download size={12}/> {downloading ? 'Generating…' : 'Download .docx'}
          </button>
        </div>
      </div>
    </aside>
  )
}
