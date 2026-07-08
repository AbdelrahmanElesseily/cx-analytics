import { useState } from 'react'
import {
  ArrowLeft, Download, Plus, X, ChevronUp, ChevronDown,
  FileText, BarChart2, Database, BookOpen, GripVertical, AlignLeft,
} from 'lucide-react'
import ChartsPanel from '../charts/ChartsPanel'
import InlineChart from '../shared/InlineChart'
import styles from './ReportEditorPage.module.css'

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

// ── Left panel components ────────────────────────────────────────────────────

function CoverSection({ cover, onChange }) {
  return (
    <div className={styles.coverCard}>
      <div className={styles.sectionLabel}><FileText size={12}/> Cover page</div>
      <div className={styles.coverGrid}>
        {[
          ['title',      'Report title'],
          ['author',     'Author'],
          ['department', 'Department'],
          ['date',       'Date'],
        ].map(([key, label]) => (
          <div key={key} className={styles.field}>
            <label className={styles.fieldLabel}>{label}</label>
            <input
              className={styles.fieldInput}
              value={cover[key]}
              onChange={e => onChange({ ...cover, [key]: e.target.value })}
              placeholder={key === 'date' ? 'e.g. July 2026' : ''}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function ChartsToggle({ checked, onChange }) {
  return (
    <div className={styles.chartsToggle}>
      <BarChart2 size={14} style={{color:'#6366F1',flexShrink:0}}/>
      <div style={{flex:1}}>
        <p className={styles.chartsTitle}>Dashboard charts</p>
        <p className={styles.chartsSub}>6 charts included in the downloaded report</p>
      </div>
      <label className={styles.toggle}>
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}/>
        <span className={styles.toggleTrack}/>
      </label>
    </div>
  )
}

function FindingCard({ item, index, total, onMove, onRemove, onNoteChange }) {
  const [showNote, setShowNote] = useState(!!item.note)
  return (
    <div className={styles.itemCard}>
      <div className={styles.itemDrag}>
        <GripVertical size={14} className={styles.gripIcon}/>
        <span className={styles.itemNum}>Q{index + 1}</span>
        <span className={`${styles.modeBadge} ${item.mode === 'rag' ? styles.modeRag : styles.modeSql}`}>
          {item.mode === 'rag' ? <><BookOpen size={8}/> RAG</> : <><Database size={8}/> SQL</>}
        </span>
        <div className={styles.itemActions}>
          <button className={styles.actionBtn} onClick={() => onMove(-1)} disabled={index === 0}><ChevronUp size={13}/></button>
          <button className={styles.actionBtn} onClick={() => onMove(1)} disabled={index === total - 1}><ChevronDown size={13}/></button>
          <button className={`${styles.actionBtn} ${styles.actionDel}`} onClick={onRemove}><X size={13}/></button>
        </div>
      </div>
      <div className={styles.itemBody}>
        <p className={styles.itemQ}>{item.question}</p>
        {showNote
          ? <textarea className={styles.noteArea} value={item.note} onChange={e => onNoteChange(e.target.value)} placeholder="Add context or comments…" rows={3} autoFocus={!item.note}/>
          : <button className={styles.addNoteBtn} onClick={() => setShowNote(true)}><AlignLeft size={10}/> Add note</button>
        }
      </div>
    </div>
  )
}

function CustomCard({ item, index, total, onMove, onRemove, onChange }) {
  return (
    <div className={`${styles.itemCard} ${styles.customCard}`}>
      <div className={styles.itemDrag}>
        <GripVertical size={14} className={styles.gripIcon}/>
        <span className={styles.customLabel}>Custom section</span>
        <div className={styles.itemActions}>
          <button className={styles.actionBtn} onClick={() => onMove(-1)} disabled={index === 0}><ChevronUp size={13}/></button>
          <button className={styles.actionBtn} onClick={() => onMove(1)} disabled={index === total - 1}><ChevronDown size={13}/></button>
          <button className={`${styles.actionBtn} ${styles.actionDel}`} onClick={onRemove}><X size={13}/></button>
        </div>
      </div>
      <div className={styles.itemBody}>
        <input className={styles.customTitle} value={item.sectionTitle} onChange={e => onChange({ ...item, sectionTitle: e.target.value })} placeholder="Section title…"/>
        <textarea className={styles.noteArea} value={item.content} onChange={e => onChange({ ...item, content: e.target.value })} placeholder="Write section content…" rows={4}/>
      </div>
    </div>
  )
}

// ── Right panel: live document preview ──────────────────────────────────────

function renderMd(text) {
  // render **bold** and strip leftover * markers
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*/g, '')
}

function PageBreak({ label }) {
  return (
    <div className={styles.pageBreak}>
      <div className={styles.pageBreakLine}/>
      <span className={styles.pageBreakLabel}>{label}</span>
      <div className={styles.pageBreakLine}/>
    </div>
  )
}

function Page({ children, pageNum }) {
  return (
    <div className={styles.page}>
      <div className={styles.pageContent}>{children}</div>
      <div className={styles.pageFooter}>
        <span className={styles.pageFooterLeft}>CX Analytics — Confidential</span>
        <span className={styles.pageFooterRight}>Page {pageNum}</span>
      </div>
    </div>
  )
}

function DocPreview({ report, chartData }) {
  const { cover, sections, includeCharts } = report
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const findings = sections.filter(s => s.type === 'finding')
  let fIdx = 0
  let pageNum = 1

  return (
    <div className={styles.previewWrap}>
      {/* Page 1: Cover */}
      <Page pageNum={pageNum++}>
        <div className={styles.paperCover}>
          <div className={styles.paperCoverAccent}/>
          <h1 className={styles.paperTitle}>{cover.title || 'CX Analytics Report'}</h1>
          <div className={styles.paperCoverDivider}/>
          {cover.author     && <p className={styles.paperMeta}><strong>Prepared by:</strong> {cover.author}</p>}
          {cover.department && <p className={styles.paperMeta}><strong>Department:</strong> {cover.department}</p>}
          <p className={styles.paperMeta}><strong>Date:</strong> {cover.date || today}</p>
        </div>
      </Page>

      {/* Page 2: Dashboard charts (if enabled) */}
      {includeCharts && (
        <>
          <PageBreak label="Page 2 — Dashboard Overview"/>
          <Page pageNum={pageNum++}>
            <h2 className={styles.paperH2}>Dashboard Overview</h2>
            <p className={styles.paperSectionIntro}>The following charts summarise the current state of customer experience across all channels and periods.</p>
            <div className={styles.paperChartsWrap}>
              <ChartsPanel
                filteredFeedback={chartData?.feedback || []}
                filteredImprovements={chartData?.improvements || []}
              />
            </div>
          </Page>
        </>
      )}

      {/* Findings — one page per finding */}
      {findings.length > 0 && sections.map((sec, i) => {
        if (sec.type === 'custom') {
          pageNum++
          return (
            <div key={sec.id}>
              <PageBreak label={`Page ${pageNum - 1} — ${sec.sectionTitle || 'Custom Section'}`}/>
              <Page pageNum={pageNum - 1}>
                <h2 className={styles.paperH2}>{sec.sectionTitle || 'Custom Section'}</h2>
                {sec.content && <p className={styles.paperBody}>{sec.content}</p>}
              </Page>
            </div>
          )
        }
        fIdx++
        const d = sec.data || {}
        const pg = pageNum++
        return (
          <div key={sec.msgId}>
            <PageBreak label={`Page ${pg} — Finding ${fIdx}`}/>
            <Page pageNum={pg}>
              <div className={styles.paperFindingHeader}>
                <span className={styles.paperFindingNum}>Finding {fIdx}</span>
                <span className={`${styles.paperModeBadge} ${sec.mode === 'rag' ? styles.paperModeRag : styles.paperModeSql}`}>
                  {sec.mode === 'rag' ? 'RAG Insight' : 'SQL Analysis'}
                </span>
              </div>
              <h2 className={styles.paperH2}>{sec.question}</h2>
              {sec.note && (
                <div className={styles.paperNoteBox}>
                  <span className={styles.paperNoteIcon}>📝</span>
                  <p className={styles.paperNote}>{sec.note}</p>
                </div>
              )}

              {sec.mode === 'rag' && (
                <div className={styles.paperRag}>
                  {d.answer && <p className={styles.paperBody} dangerouslySetInnerHTML={{__html: renderMd(d.answer)}}/>}
                  {d.sources?.length > 0 && (
                    <div className={styles.paperSources}>
                      <p className={styles.paperSourcesLabel}>Sources</p>
                      {d.sources.slice(0, 3).map((s, i) => (
                        <div key={i} className={styles.paperSource}>
                          <span className={styles.paperSourceTag}>{s.type}</span>
                          <span className={styles.paperSourceMeta}>{s.quarter} · {s.channel}</span>
                          {s.snippet && <p className={styles.paperSourceSnippet}>{s.snippet}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {sec.mode === 'nlq' && (
                <div className={styles.paperNlq}>
                  {d.insights && <p className={styles.paperInsights} dangerouslySetInnerHTML={{__html: renderMd(d.insights)}}/>}
                  <InlineChart data={d} style={{marginBottom: 16}}/>
                  {d.rows?.length > 0 && d.columns?.length > 0 && (
                    <div className={styles.paperTableWrap}>
                      <table className={styles.paperTable}>
                        <thead>
                          <tr>{d.columns.map(c => <th key={c}>{c}</th>)}</tr>
                        </thead>
                        <tbody>
                          {d.rows.slice(0, 20).map((row, i) => (
                            <tr key={i}>
                              {d.columns.map(c => <td key={c}>{row[c] ?? '—'}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {d.row_count > 20 && (
                        <p className={styles.paperMoreRows}>+{d.row_count - 20} more rows included in the downloaded report</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Page>
          </div>
        )
      })}

      {sections.length === 0 && !includeCharts && (
        <Page pageNum={1}>
          <p className={styles.paperEmpty}>Add AI findings or enable dashboard charts to see a preview.</p>
        </Page>
      )}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function ReportEditorPage({
  reports, activeReportId, onSetActive, onNewReport, onDeleteReport,
  onUpdateReport, chartData, onClose,
}) {
  const [downloading, setDownloading] = useState(false)
  const [dlError,     setDlError]     = useState(null)

  const report   = reports.find(r => r.id === activeReportId) || reports[0]
  const sections = report.sections

  function patchReport(patch) { onUpdateReport(report.id, patch) }

  function moveSectionAt(idx, dir) {
    const next = [...sections]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    patchReport({ sections: next })
  }

  function updateSection(idx, patch) {
    patchReport({ sections: sections.map((s, i) => i === idx ? { ...s, ...patch } : s) })
  }

  function addCustomSection() {
    patchReport({ sections: [...sections, { type: 'custom', id: Date.now(), sectionTitle: '', content: '' }] })
  }

  async function handleDownload() {
    setDownloading(true); setDlError(null)
    try { await downloadReport(report, chartData) }
    catch (e) { setDlError(e.message) }
    finally { setDownloading(false) }
  }

  const findings = sections.filter(s => s.type === 'finding')

  return (
    <div className={styles.overlay}>
      {/* Topbar */}
      <div className={styles.topbar}>
        <button className={styles.backBtn} onClick={onClose}>
          <ArrowLeft size={14}/> Back to dashboard
        </button>
        <div className={styles.reportTabs}>
          {reports.map(r => (
            <div key={r.id} className={`${styles.rTab} ${r.id === report.id ? styles.rTabActive : ''}`} onClick={() => onSetActive(r.id)}>
              <span>{r.name}</span>
              {r.sections.filter(s=>s.type==='finding').length > 0 && (
                <span className={styles.rTabCount}>{r.sections.filter(s=>s.type==='finding').length}</span>
              )}
              {reports.length > 1 && (
                <button className={styles.rTabDel} onClick={e => { e.stopPropagation(); onDeleteReport(r.id) }}><X size={8}/></button>
              )}
            </div>
          ))}
          <button className={styles.addTabBtn} onClick={onNewReport}><Plus size={11}/> New</button>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {dlError && <span className={styles.dlError}>{dlError}</span>}
          <button
            className={`${styles.dlBtn} ${findings.length === 0 ? styles.dlBtnDisabled : ''}`}
            onClick={handleDownload}
            disabled={findings.length === 0 || downloading}
          >
            <Download size={14}/> {downloading ? 'Generating…' : 'Download .docx'}
          </button>
        </div>
      </div>

      {/* Body: left controls + right preview */}
      <div className={styles.body}>

        {/* Left: edit controls */}
        <div className={styles.controls}>
          <CoverSection cover={report.cover} onChange={cover => patchReport({ cover })}/>

          <div className={styles.divider}><hr/><span>Dashboard charts</span><hr/></div>
          <ChartsToggle checked={report.includeCharts} onChange={v => patchReport({ includeCharts: v })}/>

          <div className={styles.divider}><hr/><span>AI findings ({findings.length})</span><hr/></div>

          {sections.length === 0 && (
            <div className={styles.emptyFindings}>
              <FileText size={28} style={{opacity:0.2}}/>
              <p>No findings yet. Add answers from the AI chat using the "+ Report" button.</p>
            </div>
          )}

          {sections.map((sec, idx) => {
            const fNum = sections.slice(0, idx).filter(s => s.type === 'finding').length
            return sec.type === 'finding'
              ? <FindingCard key={sec.msgId} item={sec} index={fNum} total={findings.length}
                  onMove={dir => moveSectionAt(idx, dir)} onRemove={() => patchReport({ sections: sections.filter((_,i) => i !== idx) })}
                  onNoteChange={note => updateSection(idx, { note })}/>
              : <CustomCard key={sec.id} item={sec} index={idx} total={sections.length}
                  onMove={dir => moveSectionAt(idx, dir)} onRemove={() => patchReport({ sections: sections.filter((_,i) => i !== idx) })}
                  onChange={patch => updateSection(idx, patch)}/>
          })}

        </div>

        {/* Right: live document preview */}
        <DocPreview report={report} chartData={chartData}/>
      </div>
    </div>
  )
}
