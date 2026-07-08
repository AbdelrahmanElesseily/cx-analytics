import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const COLORS = ['#4F46E5','#3B82F6','#10B981','#F59E0B','#8B5CF6','#EF4444','#06B6D4','#84CC16']
const tipStyle = {
  backgroundColor:'#fff', border:'1px solid #E2E8F0',
  borderRadius:8, fontSize:11, color:'#111827',
  boxShadow:'0 4px 12px rgba(0,0,0,0.08)',
}

export function detectChartData(data) {
  if (!data?.rows?.length || !data?.columns?.length) return null
  const numCols = data.columns.filter(c => {
    const vals = data.rows.map(r => r[c])
    return vals.every(v => v !== null && v !== undefined && !isNaN(Number(v)))
  })
  const catCols = data.columns.filter(c => !numCols.includes(c))
  if (numCols.length === 0 || catCols.length === 0) return null
  return { labelKey: catCols[0], valueKey: numCols[0] }
}

export default function InlineChart({ data, style }) {
  const chart = detectChartData(data)
  if (!chart) return null
  const chartData = data.rows.slice(0, 8).map(r => ({
    name: String(r[chart.labelKey] ?? '').slice(0, 14),
    value: Number(r[chart.valueKey]),
  }))
  const isHorizontal = chartData.length > 4

  return (
    <div style={{ marginTop: 8, ...style }}>
      <p style={{ fontSize: 9, color: '#94A3B8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {chart.valueKey} by {chart.labelKey}
      </p>
      <ResponsiveContainer width="100%" height={isHorizontal ? chartData.length * 24 + 16 : 110}>
        {isHorizontal ? (
          <BarChart data={chartData} layout="vertical" margin={{left:0,right:8,top:4,bottom:0}}>
            <XAxis type="number" tick={{fontSize:9,fill:'#94A3B8'}} axisLine={false} tickLine={false}/>
            <YAxis type="category" dataKey="name" tick={{fontSize:9,fill:'#64748B'}} axisLine={false} tickLine={false} width={80}/>
            <Tooltip contentStyle={tipStyle} formatter={v=>[v, chart.valueKey]}/>
            <Bar dataKey="value" radius={[0,4,4,0]}>
              {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
            </Bar>
          </BarChart>
        ) : (
          <BarChart data={chartData} margin={{left:-8,right:4,top:4,bottom:0}}>
            <XAxis dataKey="name" tick={{fontSize:9,fill:'#94A3B8'}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fontSize:9,fill:'#94A3B8'}} axisLine={false} tickLine={false} width={22}/>
            <Tooltip contentStyle={tipStyle} formatter={v=>[v, chart.valueKey]}/>
            <Bar dataKey="value" radius={[4,4,0,0]}>
              {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
