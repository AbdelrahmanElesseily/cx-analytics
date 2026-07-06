import { useState, useRef, useEffect } from 'react'
import { X, Send, RotateCcw, Database, BookOpen, FileText, Plus, Download, Trash2, ChevronLeft } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import styles from './AiChat.module.css'

const SUGGESTIONS = [
  'Which channel has the most improvement actions?',
  'What is the average rating per channel?',
  'How many actions were taken in Q3?',
  'What did customers say about Live Chat?',
  'Summarize the main themes in Q3 feedback',
  'What are the recurring problems on the Website?',
]

const CHART_COLORS = ['#4F46E5','#3B82F6','#10B981','#F59E0B','#8B5CF6','#EF4444','#06B6D4','#84CC16']

const tipStyle = {
  backgroundColor:'#fff', border:'1px solid #E2E8F0',
  borderRadius:8, fontSize:11, color:'#111827',
  boxShadow:'0 4px 12px rgba(0,0,0,0.08)',
}

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

function detectChartData(data) {
  if (!data?.rows?.length || !data?.columns?.length) return null
  const numCols = data.columns.filter(c => {
    const vals = data.rows.map(r => r[c])
    return vals.every(v => v !== null && v !== undefined && !isNaN(Number(v)))
  })
  const catCols = data.columns.filter(c => !numCols.includes(c))
  if (numCols.length === 0 || catCols.length === 0) return null
  return { labelKey: catCols[0], valueKey: numCols[0] }
}

function InlineChart({ data }) {
  const chart = detectChartData(data)
  if (!chart) return null
  const chartData = data.rows.slice(0, 8).map(r => ({
    name: String(r[chart.labelKey] ?? '').slice(0, 14),
    value: Number(r[chart.valueKey]),
  }))
  const isHorizontal = chartData.length > 4

  return (
    <div className={styles.inlineChart}>
      <span className={styles.inlineChartLabel}>{chart.valueKey} by {chart.labelKey}</span>
      <ResponsiveContainer width="100%" height={isHorizontal ? chartData.length * 22 + 16 : 100}>
        {isHorizontal
          ? (
            <BarChart data={chartData} layout="vertical" margin={{left:0,right:8,top:4,bottom:0}}>
              <XAxis type="number" tick={{fontSize:9,fill:'#94A3B8'}} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="name" tick={{fontSize:9,fill:'#64748B'}} axisLine={false} tickLine={false} width={70}/>
              <Tooltip contentStyle={tipStyle} formatter={v=>[v, chart.valueKey]}/>
              <Bar dataKey="value" radius={[0,4,4,0]}>
                {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]}/>)}
              </Bar>
            </BarChart>
          )
          : (
            <BarChart data={chartData} margin={{left:-8,right:4,top:4,bottom:0}}>
              <XAxis dataKey="name" tick={{fontSize:9,fill:'#94A3B8'}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:9,fill:'#94A3B8'}} axisLine={false} tickLine={false} width={22}/>
              <Tooltip contentStyle={tipStyle} formatter={v=>[v, chart.valueKey]}/>
              <Bar dataKey="value" radius={[4,4,0,0]}>
                {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]}/>)}
              </Bar>
            </BarChart>
          )
        }
      </ResponsiveContainer>
    </div>
  )
}

function RagAnswer({ data }) {
  return (
    <div className={styles.ragBlock}>
      <p className={styles.ragAnswer}>{data.answer}</p>
      {data.sources?.length > 0 && (
        <div className={styles.sources}>
          <span className={styles.sourcesLabel}>Sources</span>
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
      <InlineChart data={data} />
      <div className={styles.tableWrap}>
        <table className={styles.miniTable}>
          <thead>
            <tr>{data.columns.map(c => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {data.rows.slice(0, 5).map((r, i) => (
              <tr key={i}>
                {data.columns.map(c => <td key={c}>{r[c] ?? '—'}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {data.row_count > 5 && (
          <p className={styles.moreRows}>+{data.row_count - 5} more rows</p>
        )}
      </div>
    </div>
  )
}

function Message({ msg, onAddToReport, reportMenu, setReportMenu }) {
  const isUser  = msg.role === 'user'
  const isAi    = msg.role === 'ai' && msg.mode !== 'error'
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
              <BookOpen size={9}/> RAG insight
            </span>
          )}
          {msg.mode === 'nlq' && (
            <span className={styles.modeBadge} style={{color:'var(--blue)'}}>
              <Database size={9}/> NLQ → SQL
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
                onClick={e => { if (msg.inReport) return; e.stopPropagation(); setReportMenu(menuOpen ? null : msg.id) }}
                title={msg.inReport ? 'Added to report' : 'Add to report'}
              >
                <FileText size={9}/>
                {msg.inReport ? '✓ In report' : '+ Report'}
              </button>
              {menuOpen && !msg.inReport && (
                <div className={styles.reportMenu} onClick={e => e.stopPropagation()}>
                  <button onClick={() => onAddToReport(msg, 'current')}><Plus size={9}/> Add to current report</button>
                  <button onClick={() => onAddToReport(msg, 'new')}><Trash2 size={9}/> Start new report</button>
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
    setDownloading(true); setDlError(null)
    try { await downloadReport(items) }
    catch (e) { setDlError(e.message) }
    finally { setDownloading(false) }
  }

  return (
    <div className={styles.reportPanel}>
      <div className={styles.reportList}>
        {items.length === 0 && <p className={styles.reportEmpty}>No items yet. Add answers from the chat.</p>}
        {items.map((item, i) => (
          <div key={item.msgId} className={styles.reportItem}>
            <div className={styles.reportItemHeader}>
              <span className={styles.reportItemNum}>Q{i + 1}</span>
              <button className={styles.reportRemoveBtn} onClick={() => onRemove(item.msgId)}><X size={9}/></button>
            </div>
            <p className={styles.reportItemQ}>{item.question}</p>
            <p className={styles.reportItemMode}>{item.mode === 'rag' ? 'RAG insight' : 'SQL result'}</p>
          </div>
        ))}
      </div>
      <div className={styles.reportFooter}>
        {dlError && <p className={styles.reportDlError}>{dlError}</p>}
        <div className={styles.reportFooterBtns}>
          <button className={styles.reportClearBtn} onClick={onClear} disabled={items.length === 0}><Trash2 size={10}/> Clear</button>
          <button className={`${styles.reportDlBtn} ${items.length === 0 ? styles.reportDlBtnDisabled : ''}`} onClick={handleDownload} disabled={items.length === 0 || downloading}>
            <Download size={11}/> {downloading ? 'Generating…' : 'Download .docx'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AiChat() {
  const [input,       setInput]       = useState('')
  const [messages,    setMessages]    = useState([])
  const [loading,     setLoading]     = useState(false)
  const [reportItems, setReportItems] = useState([])
  const [showReport,  setShowReport]  = useState(false)
  const [reportMenu,  setReportMenu]  = useState(null)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

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
      setMessages(prev => [...prev, { role: 'ai', id: Date.now() + 1, mode: data.mode, data, question, inReport: false }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', id: Date.now() + 1, mode: 'error', error: err.message }])
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

  return (
    <aside className={styles.panel}>
      {/* Header */}
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          {showReport ? (
            <>
              <button className={styles.backBtn} onClick={() => setShowReport(false)}><ChevronLeft size={14}/></button>
              <div>
                <span className={styles.panelName}>Report</span>
                <span className={styles.panelSub}>{reportItems.length} item{reportItems.length !== 1 ? 's' : ''} · .docx</span>
              </div>
            </>
          ) : (
            <>
              <span className={styles.panelIcon}>◈</span>
              <div>
                <span className={styles.panelName}>CX Assistant</span>
                <span className={styles.panelSub}>NLQ · RAG · Charts · Reports</span>
              </div>
            </>
          )}
        </div>
        <div className={styles.panelActions}>
          {!showReport && reportItems.length > 0 && (
            <button className={styles.reportHeaderBtn} onClick={() => setShowReport(true)} title="View report">
              <FileText size={12}/>
              <span className={styles.reportHeaderCount}>{reportItems.length}</span>
            </button>
          )}
          {!showReport && messages.length > 0 && (
            <button className={styles.clearBtn} onClick={() => setMessages([])} title="Clear chat"><RotateCcw size={12}/></button>
          )}
        </div>
      </div>

      {/* Body */}
      {showReport ? (
        <ReportPanel items={reportItems} onBack={() => setShowReport(false)} onRemove={removeFromReport} onClear={clearReport}/>
      ) : (
        <>
          <div className={styles.thread}>
            {messages.length === 0 && (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>◈</span>
                <p className={styles.emptyTitle}>Ask about your CX data</p>
                <p className={styles.emptySub}>Structured → SQL results with charts<br/>Open questions → AI insights</p>
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
                setReportMenu={id => {
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
              autoFocus
            />
            <button
              className={`${styles.sendBtn} ${input.trim() ? styles.sendBtnActive : ''}`}
              onClick={() => send()}
              disabled={!input.trim() || loading}
            >
              <Send size={13}/>
            </button>
          </div>
        </>
      )}
    </aside>
  )
}
