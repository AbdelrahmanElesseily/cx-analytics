import { useState, useRef, useEffect } from 'react'
import { X, Send, Sparkles, RotateCcw, Database, BookOpen, FileText, Plus, Download, Trash2, ChevronLeft } from 'lucide-react'
import styles from './AiChat.module.css'

const SUGGESTIONS = [
  'Which channel has the most improvement actions?',
  'What is the average rating per channel?',
  'How many actions were taken in Q3?',
  'What did customers say about Live Chat?',
  'Summarize the main themes in Q3 feedback',
  'What are the recurring problems on the Website?',
]

async function callAPI(question) {
  const res = await fetch('http://localhost:8000/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, include_insights: true }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'API error')
  }
  return res.json()
}

async function downloadReport(items) {
  const payload = items.map(item => ({
    question: item.question,
    mode: item.mode,
    data: item.data,
  }))
  const res = await fetch('http://localhost:8000/api/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: payload }),
  })
  if (!res.ok) throw new Error('Failed to generate report')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'cx-report.docx'
  a.click()
  URL.revokeObjectURL(url)
}

function RagAnswer({ data }) {
  return (
    <div className={styles.ragBlock}>
      <p className={styles.ragAnswer}>{data.answer}</p>
      {data.sources?.length > 0 && (
        <div className={styles.sources}>
          <span className={styles.sourcesLabel}>Sources used</span>
          {data.sources.slice(0, 3).map((s, i) => (
            <div key={i} className={styles.source}>
              <span className={styles.sourceTag}>{s.type}</span>
              <span className={styles.sourceMeta}>{s.quarter} · {s.channel}</span>
              <span className={styles.sourceSnippet}>{s.snippet}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function NlqAnswer({ data }) {
  if (!data.rows?.length) return <p className={styles.noData}>No results found.</p>
  return (
    <div className={styles.nlqBlock}>
      {data.insights && <p className={styles.insights}>{data.insights}</p>}
      <div className={styles.tableWrap}>
        <table className={styles.miniTable}>
          <thead>
            <tr>{data.columns.map(c => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {data.rows.slice(0, 6).map((r, i) => (
              <tr key={i}>
                {data.columns.map(c => <td key={c}>{r[c] ?? '—'}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {data.row_count > 6 && (
          <p className={styles.moreRows}>+{data.row_count - 6} more rows</p>
        )}
      </div>
    </div>
  )
}

function Message({ msg, onAddToReport, reportMenu, setReportMenu }) {
  const isUser = msg.role === 'user'
  const isAi   = msg.role === 'ai' && msg.mode !== 'error'
  const menuOpen = reportMenu === msg.id

  if (isUser) {
    return (
      <div className={`${styles.msg} ${styles.msgUser}`}>
        <div className={`${styles.bubble} ${styles.bubbleUser}`}>{msg.text}</div>
      </div>
    )
  }
  return (
    <div className={styles.msg}>
      <span className={styles.aiAvatar}>◈</span>
      <div className={styles.aiBubbleWrap}>
        <div className={`${styles.bubble} ${styles.bubbleAi}`}>
          {msg.mode === 'rag' && (
            <span className={styles.modeBadge} style={{color:'var(--purple)'}}>
              <BookOpen size={10}/> RAG
            </span>
          )}
          {msg.mode === 'nlq' && (
            <span className={styles.modeBadge} style={{color:'var(--blue)'}}>
              <Database size={10}/> NLQ → SQL
            </span>
          )}
          {msg.error && <p className={styles.errorText}>{msg.error}</p>}
          {msg.mode === 'rag' && msg.data && <RagAnswer data={msg.data} />}
          {msg.mode === 'nlq' && msg.data && <NlqAnswer data={msg.data} />}
        </div>

        {isAi && (
          <div className={styles.reportBtnRow}>
            <div className={styles.reportMenuWrap}>
              <button
                className={`${styles.addReportBtn} ${msg.inReport ? styles.addReportBtnAdded : ''}`}
                onClick={(e) => {
                  if (msg.inReport) return
                  e.stopPropagation()
                  setReportMenu(menuOpen ? null : msg.id)
                }}
                title={msg.inReport ? 'Added to report' : 'Add to report'}
              >
                <FileText size={10}/>
                {msg.inReport ? 'In report' : '+ Report'}
              </button>

              {menuOpen && !msg.inReport && (
                <div className={styles.reportMenu} onClick={e => e.stopPropagation()}>
                  <button onClick={() => onAddToReport(msg, 'current')}>
                    <Plus size={10}/> Add to current report
                  </button>
                  <button onClick={() => onAddToReport(msg, 'new')}>
                    <Trash2 size={10}/> Start new report
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ReportPanel({ items, onBack, onRemove, onClear }) {
  const [downloading, setDownloading] = useState(false)
  const [dlError, setDlError] = useState(null)

  async function handleDownload() {
    setDownloading(true)
    setDlError(null)
    try {
      await downloadReport(items)
    } catch (e) {
      setDlError(e.message)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className={styles.reportPanel}>
      <div className={styles.reportList}>
        {items.length === 0 && (
          <p className={styles.reportEmpty}>No items yet. Add answers from the chat.</p>
        )}
        {items.map((item, i) => (
          <div key={item.msgId} className={styles.reportItem}>
            <div className={styles.reportItemHeader}>
              <span className={styles.reportItemNum}>Q{i + 1}</span>
              <button className={styles.reportRemoveBtn} onClick={() => onRemove(item.msgId)} title="Remove">
                <X size={10}/>
              </button>
            </div>
            <p className={styles.reportItemQ}>{item.question}</p>
            <p className={styles.reportItemMode}>{item.mode === 'rag' ? 'RAG insight' : 'SQL result'}</p>
          </div>
        ))}
      </div>

      <div className={styles.reportFooter}>
        {dlError && <p className={styles.reportDlError}>{dlError}</p>}
        <div className={styles.reportFooterBtns}>
          <button className={styles.reportClearBtn} onClick={onClear} disabled={items.length === 0}>
            <Trash2 size={11}/> Clear
          </button>
          <button
            className={`${styles.reportDlBtn} ${items.length === 0 ? styles.reportDlBtnDisabled : ''}`}
            onClick={handleDownload}
            disabled={items.length === 0 || downloading}
          >
            <Download size={12}/> {downloading ? 'Generating…' : 'Download .docx'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AiChat() {
  const [open,        setOpen]        = useState(false)
  const [input,       setInput]       = useState('')
  const [messages,    setMessages]    = useState([])
  const [loading,     setLoading]     = useState(false)
  const [reportItems, setReportItems] = useState([])
  const [showReport,  setShowReport]  = useState(false)
  const [reportMenu,  setReportMenu]  = useState(null)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 300) }, [open])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  // close report menu when clicking outside
  useEffect(() => {
    if (!reportMenu) return
    const close = () => setReportMenu(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [reportMenu])

  async function send(text) {
    const question = (text || input).trim()
    if (!question || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: question, id: Date.now() }])
    setLoading(true)
    try {
      const data = await callAPI(question)
      setMessages(prev => [...prev, {
        role: 'ai', id: Date.now() + 1,
        mode: data.mode,
        data,
        question,
        inReport: false,
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'ai', id: Date.now() + 1,
        mode: 'error',
        error: err.message,
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function addToReport(msg, mode) {
    setReportMenu(null)
    if (mode === 'new') {
      setReportItems([])
      // Mark all as not in report, then add this one
      setMessages(prev => prev.map(m => ({ ...m, inReport: false })))
    }
    setReportItems(prev => {
      if (prev.find(i => i.msgId === msg.id)) return prev
      return [...prev, { msgId: msg.id, question: msg.question, mode: msg.mode, data: msg.data }]
    })
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, inReport: true } : m))
  }

  function removeFromReport(msgId) {
    setReportItems(prev => prev.filter(i => i.msgId !== msgId))
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, inReport: false } : m))
  }

  function clearReport() {
    setReportItems([])
    setMessages(prev => prev.map(m => ({ ...m, inReport: false })))
  }

  const aiCount = messages.filter(m => m.role === 'ai' && m.mode !== 'error').length

  function handleAddReportBtn(msg, choice) {
    // if no existing items, skip menu and add directly
    if (choice === 'current' && reportItems.length === 0) {
      addToReport(msg, 'current')
    } else {
      addToReport(msg, choice)
    }
  }

  return (
    <>
      <div className={`${styles.panel} ${open ? styles.panelOpen : ''}`} role="dialog" aria-label="AI assistant">
        {/* ── Header ── */}
        <div className={styles.panelHeader}>
          <div className={styles.panelTitle}>
            {showReport
              ? (
                <>
                  <button className={styles.backBtn} onClick={() => setShowReport(false)}>
                    <ChevronLeft size={15}/>
                  </button>
                  <div>
                    <span className={styles.panelName}>Report</span>
                    <span className={styles.panelSub}>{reportItems.length} item{reportItems.length !== 1 ? 's' : ''} · Word .docx</span>
                  </div>
                </>
              )
              : (
                <>
                  <span className={styles.panelIcon}>◈</span>
                  <div>
                    <span className={styles.panelName}>CX Assistant</span>
                    <span className={styles.panelSub}>NLQ · RAG · Powered by GitHub Models</span>
                  </div>
                </>
              )
            }
          </div>
          <div className={styles.panelActions}>
            {!showReport && reportItems.length > 0 && (
              <button className={styles.reportHeaderBtn} onClick={() => setShowReport(true)} title="View report">
                <FileText size={13}/>
                <span className={styles.reportHeaderCount}>{reportItems.length}</span>
              </button>
            )}
            {!showReport && messages.length > 0 && (
              <button className={styles.clearBtn} onClick={() => setMessages([])} title="Clear chat">
                <RotateCcw size={13}/>
              </button>
            )}
            <button className={styles.closeBtn} onClick={() => setOpen(false)}>
              <X size={15}/>
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        {showReport
          ? (
            <ReportPanel
              items={reportItems}
              onBack={() => setShowReport(false)}
              onRemove={removeFromReport}
              onClear={clearReport}
            />
          )
          : (
            <>
              <div className={styles.thread}>
                {messages.length === 0 && (
                  <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>◈</span>
                    <p className={styles.emptyTitle}>Ask about your CX data</p>
                    <p className={styles.emptySub}>
                      Structured questions → SQL results<br/>
                      Open questions → AI-generated insights
                    </p>
                    <div className={styles.suggestions}>
                      {SUGGESTIONS.map(s => (
                        <button key={s} className={styles.suggestion} onClick={() => send(s)}>{s}</button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map(msg => (
                  <Message
                    key={msg.id}
                    msg={msg}
                    onAddToReport={addToReport}
                    reportMenu={reportMenu}
                    setReportMenu={(id) => {
                      // if no existing items, skip menu — add directly
                      if (id !== null && reportItems.length === 0) {
                        const m = messages.find(m => m.id === id)
                        if (m) addToReport(m, 'current')
                      } else {
                        setReportMenu(id)
                      }
                    }}
                  />
                ))}

                {loading && (
                  <div className={styles.msg}>
                    <span className={styles.aiAvatar}>◈</span>
                    <div className={`${styles.bubble} ${styles.bubbleAi} ${styles.thinking}`}>
                      <span/><span/><span/>
                    </div>
                  </div>
                )}
                <div ref={bottomRef}/>
              </div>

              <div className={styles.inputRow}>
                <input
                  ref={inputRef}
                  className={styles.input}
                  placeholder="Ask anything about your CX data…"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  disabled={loading}
                />
                <button
                  className={`${styles.sendBtn} ${input.trim() ? styles.sendBtnActive : ''}`}
                  onClick={() => send()}
                  disabled={!input.trim() || loading}
                >
                  <Send size={14}/>
                </button>
              </div>
            </>
          )
        }
      </div>

      <button
        className={`${styles.pill} ${open ? styles.pillHidden : ''}`}
        onClick={() => setOpen(true)}
        aria-label="Open AI assistant"
      >
        <Sparkles size={15}/>
        <span>Ask AI</span>
        {aiCount > 0 && (
          <span className={styles.pillBadge}>{aiCount}</span>
        )}
      </button>
    </>
  )
}
