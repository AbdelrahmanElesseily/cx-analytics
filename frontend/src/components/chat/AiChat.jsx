import { useState, useRef, useEffect } from 'react'
import { X, Send, RotateCcw, Database, BookOpen, MessageCircle } from 'lucide-react'
import InlineChart from '../shared/InlineChart'
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

function Message({ msg, reports, activeReportId, onAddToReportId, onAddNewReport, reportMenu, setReportMenu }) {
  const isUser   = msg.role === 'user'
  const isAi     = msg.role === 'ai' && msg.mode !== 'error'
  const menuOpen = reportMenu === msg.id
  const isInReport = r => r.sections.some(s => s.type === 'finding' && s.msgId === msg.id)

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
          <div className={styles.reportBtnRow} style={{position:'relative'}}>
            <>
              <button
                className={styles.addReportBtn}
                onClick={e => { e.stopPropagation(); setReportMenu(menuOpen ? null : msg.id) }}
              >
                + Report ▾
              </button>
              {menuOpen && (
                <div className={styles.reportMenu} onClick={e => e.stopPropagation()}>
                  <p className={styles.reportMenuLabel}>Add to report</p>
                  {reports.map(r => {
                    const already = isInReport(r)
                    const count = r.sections.filter(s => s.type === 'finding').length
                    return (
                      <button
                        key={r.id}
                        className={`${styles.reportMenuItem} ${r.id === activeReportId ? styles.reportMenuItemActive : ''} ${already ? styles.reportMenuItemDone : ''}`}
                        onClick={() => { if (!already) { onAddToReportId(msg, r.id); setReportMenu(null) } }}
                        disabled={already}
                      >
                        <span className={styles.reportMenuName}>{r.name}</span>
                        <span className={styles.reportMenuCount}>{already ? '✓ added' : `${count} item${count !== 1 ? 's' : ''}`}</span>
                      </button>
                    )
                  })}
                  <button
                    className={`${styles.reportMenuItem} ${styles.reportMenuNew}`}
                    onClick={() => { onAddNewReport(msg); setReportMenu(null) }}
                  >
                    <span>+ New report</span>
                  </button>
                </div>
              )}
            </>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AiChat({ reportItems, reports, activeReportId, onAddToReportId, onAddNewReport }) {
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
                reports={reports}
                activeReportId={activeReportId}
                onAddToReportId={onAddToReportId}
                onAddNewReport={onAddNewReport}
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
