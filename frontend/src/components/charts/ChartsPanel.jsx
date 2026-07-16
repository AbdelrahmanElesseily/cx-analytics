import { useMemo, useState, useEffect, useRef } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import styles from './ChartsPanel.module.css'

const GOLD   = '#B8860B'
const GREEN  = '#059669'
const BLUE   = '#2563EB'
const PURPLE = '#7C3AED'
const AMBER  = '#D97706'
const RED    = '#DC2626'
const SLATE  = '#94A3B8'

const STAGE_COLORS = {
  'Service Application and Submission': BLUE,
  'Communication During Procedures':    GOLD,
  'Receiving Service Information':       GREEN,
  'Service Completion':                  PURPLE,
  'All':                                 SLATE,
}

const tip = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E2E6F0',
  borderRadius: 10,
  color: '#111827',
  fontSize: 12,
  boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
}

const axisLight = { fill: '#9CA3AF', fontSize: 9 }
const axisGrey  = { fill: '#D1D5DB', fontSize: 9 }

function ChartReportBtn({ chart, reports, activeReportId, onAddChartToReportId, onAddChartToNewReport }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = e => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const isInReport = r => r.sections.some(s => s.type === 'chart' && s.chartId === chart.chartId)

  return (
    <div className={styles.chartReportWrap} ref={ref}>
      <button className={styles.chartReportBtn} onClick={e => { e.stopPropagation(); setOpen(o => !o) }}>
        + Report ▾
      </button>
      {open && (
        <div className={styles.chartReportMenu}>
          <p className={styles.chartReportLabel}>Add chart to report</p>
          {reports.map(r => {
            const already = isInReport(r)
            return (
              <button
                key={r.id}
                className={`${styles.chartReportItem} ${r.id === activeReportId ? styles.chartReportItemActive : ''} ${already ? styles.chartReportItemDone : ''}`}
                disabled={already}
                onClick={() => { onAddChartToReportId(chart, r.id); setOpen(false) }}
              >
                <span>{r.name}</span>
                <span className={styles.chartReportMeta}>{already ? '✓ added' : `${r.sections.filter(s=>s.type==='chart').length} charts`}</span>
              </button>
            )
          })}
          <button className={`${styles.chartReportItem} ${styles.chartReportNew}`} onClick={() => { onAddChartToNewReport(chart); setOpen(false) }}>
            + New report
          </button>
        </div>
      )}
    </div>
  )
}

function WrappedTick({ x, y, payload, width }) {
  const words = payload.value.split(' ')
  const mid = Math.ceil(words.length / 2)
  const line1 = words.slice(0, mid).join(' ')
  const line2 = words.slice(mid).join(' ')
  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" fill="#9CA3AF" fontSize={9}>
        <tspan x={0} dy={0}>{line1}</tspan>
        {line2 && <tspan x={0} dy={11}>{line2}</tspan>}
      </text>
    </g>
  )
}

export default function ChartsPanel({ filteredFeedback, filteredImprovements, reports=[], activeReportId, onAddChartToReportId, onAddChartToNewReport }) {
  const reportProps = { reports, activeReportId, onAddChartToReportId, onAddChartToNewReport }
  const ratingByChannel = useMemo(() => {
    const map = {}
    filteredFeedback.forEach(r => {
      if (!map[r.channel]) map[r.channel] = { sum: 0, count: 0 }
      map[r.channel].sum += r.rating
      map[r.channel].count++
    })
    return Object.entries(map)
      .map(([name, { sum, count }]) => ({ name, avg: +(sum/count).toFixed(1) }))
      .sort((a,b) => b.avg - a.avg)
  }, [filteredFeedback])

  const actionsByQuarter = useMemo(() => {
    const map = {}
    filteredImprovements.forEach(r => { map[r.quarter] = (map[r.quarter]||0)+1 })
    return Object.entries(map).sort(([a],[b])=>a.localeCompare(b))
      .map(([quarter, count]) => ({ quarter, count }))
  }, [filteredImprovements])

  const byCxStage = useMemo(() => {
    const map = {}
    filteredImprovements.forEach(r => { map[r.cx_stage] = (map[r.cx_stage]||0)+1 })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [filteredImprovements])

  const byChannel = useMemo(() => {
    const map = {}
    filteredImprovements.forEach(r => { map[r.channel] = (map[r.channel]||0)+1 })
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a,b) => b.count - a.count).slice(0,8)
  }, [filteredImprovements])

  const bySource = useMemo(() => {
    const map = {}
    filteredImprovements.forEach(r => {
      const s = r.source.replace('Employee S&F & Contact Center Suggestion','Emp+CC')
      map[s] = (map[s]||0)+1
    })
    return Object.entries(map).map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count)
  }, [filteredImprovements])

  const ratingDist = useMemo(() => {
    const map = {3:0,4:0,5:0}
    filteredFeedback.forEach(r => { map[r.rating]++ })
    return Object.entries(map).map(([rating,count])=>({rating:`★${rating}`,count}))
  }, [filteredFeedback])

  const isEmpty = filteredFeedback.length === 0 && filteredImprovements.length === 0

  if (isEmpty) return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon}>◈</span>
      <p>No data matches the active filters.</p>
      <p className={styles.emptyHint}>Try removing a filter to see data.</p>
    </div>
  )

  return (
    <div className={styles.grid}>

      {/* Avg rating by channel */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Avg Satisfaction by Channel</h3>
          <div className={styles.cardActions}>
            <span className={styles.cardBadge} style={{color:GOLD,background:'rgba(184,134,11,0.08)',border:'1px solid rgba(184,134,11,0.2)'}}>Rating</span>
            {onAddChartToReportId && <ChartReportBtn chart={{chartId:'ratingByChannel',chartTitle:'Avg Satisfaction by Channel',chartType:'bar',data:ratingByChannel,dataKey:'avg',labelKey:'name'}} {...reportProps}/>}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={ratingByChannel} margin={{left:-8,right:8,top:8,bottom:8}} barCategoryGap="35%">
            <XAxis dataKey="name" tick={<WrappedTick/>} axisLine={false} tickLine={false} interval={0} height={44}/>
            <YAxis domain={[0,5]} tick={axisLight} axisLine={false} tickLine={false} width={24}/>
            <Tooltip formatter={v=>[v,'Avg Rating']} contentStyle={tip} cursor={{fill:'rgba(184,134,11,0.04)'}}/>
            <Bar dataKey="avg" fill={GOLD} radius={[6,6,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Improvement actions by quarter */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Improvement Actions by Quarter</h3>
          <div className={styles.cardActions}>
            <span className={styles.cardBadge} style={{color:BLUE,background:'rgba(37,99,235,0.08)',border:'1px solid rgba(37,99,235,0.2)'}}>Trend</span>
            {onAddChartToReportId && <ChartReportBtn chart={{chartId:'actionsByQuarter',chartTitle:'Improvement Actions by Quarter',chartType:'bar',data:actionsByQuarter,dataKey:'count',labelKey:'quarter'}} {...reportProps}/>}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={actionsByQuarter} margin={{left:-8,right:8,top:8,bottom:24}} barCategoryGap="35%">
            <XAxis dataKey="quarter" tick={axisLight} axisLine={false} tickLine={false} interval={0}/>
            <YAxis tick={axisLight} axisLine={false} tickLine={false} width={24}/>
            <Tooltip formatter={v=>[v,'Actions']} contentStyle={tip} cursor={{fill:'rgba(37,99,235,0.04)'}}/>
            <Bar dataKey="count" fill={BLUE} radius={[6,6,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* By CX Stage donut */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Issues by CX Stage</h3>
          <div className={styles.cardActions}>
            <span className={styles.cardBadge} style={{color:PURPLE,background:'rgba(124,58,237,0.08)',border:'1px solid rgba(124,58,237,0.2)'}}>Stage</span>
            {onAddChartToReportId && <ChartReportBtn chart={{chartId:'byCxStage',chartTitle:'Issues by CX Stage',chartType:'pie',data:byCxStage,dataKey:'value',labelKey:'name'}} {...reportProps}/>}
          </div>
        </div>
        <div className={styles.pieWrap}>
          <ResponsiveContainer width="50%" height={130}>
            <PieChart>
              <Pie data={byCxStage} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3}>
                {byCxStage.map(e=><Cell key={e.name} fill={STAGE_COLORS[e.name]||SLATE}/>)}
              </Pie>
              <Tooltip contentStyle={tip}/>
            </PieChart>
          </ResponsiveContainer>
          <div className={styles.legend}>
            {byCxStage.map(d=>(
              <div key={d.name} className={styles.legendItem}>
                <span className={styles.legendDot} style={{background:STAGE_COLORS[d.name]||SLATE}}/>
                <span className={styles.legendLabel}>{d.name}</span>
                <span className={styles.legendVal}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rating distribution */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Feedback Rating Distribution</h3>
          <div className={styles.cardActions}>
            <span className={styles.cardBadge} style={{color:GREEN,background:'rgba(5,150,105,0.08)',border:'1px solid rgba(5,150,105,0.2)'}}>Score</span>
            {onAddChartToReportId && <ChartReportBtn chart={{chartId:'ratingDist',chartTitle:'Feedback Rating Distribution',chartType:'bar',data:ratingDist,dataKey:'count',labelKey:'rating'}} {...reportProps}/>}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={ratingDist} margin={{left:-8,right:8,top:8,bottom:24}} barCategoryGap="35%">
            <XAxis dataKey="rating" tick={{...axisLight, fontSize:14}} axisLine={false} tickLine={false} interval={0}/>
            <YAxis tick={axisLight} axisLine={false} tickLine={false} width={24}/>
            <Tooltip formatter={v=>[v,'Entries']} contentStyle={tip} cursor={{fill:'rgba(124,58,237,0.04)'}}/>
            <Bar dataKey="count" fill={GREEN} radius={[6,6,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* By channel horizontal */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Improvement Actions by Channel</h3>
          <div className={styles.cardActions}>
            <span className={styles.cardBadge} style={{color:AMBER,background:'rgba(217,119,6,0.08)',border:'1px solid rgba(217,119,6,0.2)'}}>Channel</span>
            {onAddChartToReportId && <ChartReportBtn chart={{chartId:'byChannel',chartTitle:'Improvement Actions by Channel',chartType:'hbar',data:byChannel,dataKey:'count',labelKey:'name'}} {...reportProps}/>}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={byChannel} layout="vertical" margin={{left:0,right:16,top:4,bottom:0}}>
            <XAxis type="number" tick={axisLight} axisLine={false} tickLine={false}/>
            <YAxis type="category" dataKey="name" tick={axisLight} axisLine={false} tickLine={false} width={120}/>
            <Tooltip formatter={v=>[v,'Actions']} contentStyle={tip} cursor={{fill:'rgba(217,119,6,0.04)'}}/>
            <Bar dataKey="count" fill={AMBER} radius={[0,6,6,0]} maxBarSize={20}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* By source horizontal */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Improvement Actions by Source</h3>
          <div className={styles.cardActions}>
            <span className={styles.cardBadge} style={{color:GREEN,background:'rgba(5,150,105,0.08)',border:'1px solid rgba(5,150,105,0.2)'}}>Source</span>
            {onAddChartToReportId && <ChartReportBtn chart={{chartId:'bySource',chartTitle:'Improvement Actions by Source',chartType:'hbar',data:bySource,dataKey:'count',labelKey:'name'}} {...reportProps}/>}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={bySource} layout="vertical" margin={{left:0,right:16,top:4,bottom:0}}>
            <XAxis type="number" tick={axisLight} axisLine={false} tickLine={false}/>
            <YAxis type="category" dataKey="name" tick={axisLight} axisLine={false} tickLine={false} width={120}/>
            <Tooltip formatter={v=>[v,'Actions']} contentStyle={tip} cursor={{fill:'rgba(5,150,105,0.04)'}}/>
            <Bar dataKey="count" fill={GREEN} radius={[0,6,6,0]} maxBarSize={20}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  )
}
