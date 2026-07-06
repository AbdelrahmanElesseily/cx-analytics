import { useState, useRef, useEffect } from 'react'
import { X, Send, RotateCcw, Database, BookOpen, MessageCircle } from 'lucide-react'
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

function Message({ msg, inReport, onAddToReport, reportMenu, setReportMenu }) {
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
            <button
              className={`${styles.addReportBtn} ${inReport ? styles.addReportBtnAdded : ''}`}
              onClick={() => { if (!inReport) onAddToReport(msg) }}
              title={inReport ? 'Added to report' : 'Add to report'}
            >
              {inReport ? '✓ In report' : '+ Report'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AiChat({ reportItems, onAddToReport }) {
  const [open,     setOpen]     = useState(false)
  const [input,    setInput]    = useState('')
  const [messages, setMessages] = useState([])
  const [loading,  setLoading]  = useState(false)
  const [reportMenu, setReportMenu] = useState(null)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80)
  }, [open])

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
      setMessages(prev => [...prev, { role: 'ai', id: Date.now() + 1, mode: data.mode, data, question }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', id: Date.now() + 1, mode: 'error', error: err.message }])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <>
      {/* Floating pill */}
      <button
        className={`${styles.pill} ${open ? styles.pillOpen : ''}`}
        onClick={() => setOpen(o => !o)}
        title="Ask AI"
      >
        {open ? <X size={16}/> : <MessageCircle size={16}/>}
        {!open && <span className={styles.pillLabel}>Ask AI</span>}
        {!open && reportItems.length > 0 && (
          <span className={styles.pillBadge}>{reportItems.length}</span>
        )}
      </button>

      {/* Chat popup */}
      {open && (
        <div className={styles.popup}>
          {/* Header */}
          <div className={styles.popupHeader}>
            <div className={styles.panelTitle}>
              <span className={styles.panelIcon}>◈</span>
              <div>
                <span className={styles.panelName}>CX Assistant</span>
                <span className={styles.panelSub}>NLQ · RAG · Inline Charts</span>
              </div>
            </div>
            <div className={styles.panelActions}>
              {messages.length > 0 && (
                <button className={styles.clearBtn} onClick={() => setMessages([])} title="Clear chat">
                  <RotateCcw size={12}/>
                </button>
              )}
              <button className={styles.closeBtn} onClick={() => setOpen(false)}>
                <X size={14}/>
              </button>
            </div>
          </div>

          {/* Thread */}
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
                inReport={reportItems.some(i => i.msgId === msg.id)}
                onAddToReport={m => onAddToReport(m)}
                reportMenu={reportMenu}
                setReportMenu={setReportMenu}
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

          {/* Input */}
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
              <Send size={13}/>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
