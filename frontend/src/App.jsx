import { useState } from 'react'
import { BarChart2, Table2 } from 'lucide-react'
import Topbar           from './components/layout/Topbar'
import KpiRow           from './components/layout/KpiRow'
import FilterPanel      from './components/filters/FilterPanel'
import ChartsPanel      from './components/charts/ChartsPanel'
import DataTables       from './components/table/ReservationsTable'
import AiChat           from './components/chat/AiChat'
import ReportEditorPage from './components/report/ReportEditorPage'
import { useFilters }   from './hooks/useFilters'
import styles           from './App.module.css'

function makeReport(n) {
  return {
    id: Date.now() + n,
    name: `Report ${n}`,
    sections: [],
    cover: { title: 'CX Analytics Report', author: '', department: '', date: '' },
    includeCharts: false,
  }
}

export default function App() {
  const [view,        setView]        = useState('charts')
  const [activeTab,   setActiveTab]   = useState('improvements')
  const [showEditor,  setShowEditor]  = useState(false)
  const [reports,        setReports]        = useState([makeReport(1)])
  const [activeReportId, setActiveReportId] = useState(reports[0].id)

  const {
    filters, filteredFeedback, filteredImprovements, kpis,
    updateFilter, toggleArray, resetFilters, activeCount,
  } = useFilters()

  const activeReport = reports.find(r => r.id === activeReportId) || reports[0]
  const chartData    = { feedback: filteredFeedback, improvements: filteredImprovements }

  function updateReport(id, patch) {
    setReports(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }

  function addToReportId(msg, reportId) {
    setReports(prev => prev.map(r => {
      if (r.id !== reportId) return r
      if (r.sections.find(s => s.type === 'finding' && s.msgId === msg.id)) return r
      return {
        ...r,
        sections: [...r.sections, {
          type: 'finding', msgId: msg.id,
          question: msg.question, mode: msg.mode, data: msg.data, note: '',
        }],
      }
    }))
  }

  function addToReport(msg) { addToReportId(msg, activeReportId) }

  function addChartToReportId(chart, reportId) {
    setReports(prev => prev.map(r => {
      if (r.id !== reportId) return r
      if (r.sections.find(s => s.type === 'chart' && s.chartId === chart.chartId)) return r
      return { ...r, sections: [...r.sections, { type: 'chart', id: Date.now(), ...chart }] }
    }))
  }

  function addChartToNewReport(chart) {
    const r = makeReport(reports.length + 1)
    setReports(prev => [...prev, { ...r, sections: [{ type: 'chart', id: Date.now(), ...chart }] }])
    setActiveReportId(r.id)
  }

  function addToNewReport(msg) {
    const r = makeReport(reports.length + 1)
    setReports(prev => [...prev, {
      ...r,
      sections: [{
        type: 'finding', msgId: msg.id,
        question: msg.question, mode: msg.mode, data: msg.data, note: '',
      }],
    }])
    setActiveReportId(r.id)
  }

  function removeSection(msgId) {
    setReports(prev => prev.map(r =>
      r.id === activeReportId
        ? { ...r, sections: r.sections.filter(s => !(s.type === 'finding' && s.msgId === msgId)) }
        : r
    ))
  }

  function clearReport() {
    updateReport(activeReportId, { sections: [] })
  }

  function addNewReport() {
    const r = makeReport(reports.length + 1)
    setReports(prev => [...prev, r])
    setActiveReportId(r.id)
  }

  function deleteReport(id) {
    setReports(prev => {
      const remaining = prev.filter(r => r.id !== id)
      if (remaining.length === 0) {
        const fresh = makeReport(1)
        setActiveReportId(fresh.id)
        return [fresh]
      }
      if (activeReportId === id) setActiveReportId(remaining[0].id)
      return remaining
    })
  }

  return (
    <div className={styles.root}>
      <Topbar
        reportCount={reports.reduce((s, r) => s + r.sections.filter(x => x.type === 'finding').length, 0)}
        onOpenReport={() => setShowEditor(true)}
      />
      <div className={styles.body}>

        <FilterPanel
          filters={filters}
          updateFilter={updateFilter}
          toggleArray={toggleArray}
          resetFilters={resetFilters}
          activeCount={activeCount}
        />

        <main className={styles.main}>
          <div className={styles.kpiRow}><KpiRow kpis={kpis} /></div>
          <div className={styles.toolbar}>
            <div className={styles.tabs}>
              <button className={`${styles.tab} ${view==='charts'?styles.tabActive:''}`} onClick={()=>setView('charts')}>
                <BarChart2 size={13}/> Charts
              </button>
              <button className={`${styles.tab} ${view==='table'?styles.tabActive:''}`} onClick={()=>setView('table')}>
                <Table2 size={13}/> Data
                <span className={styles.tabCount}>{filteredFeedback.length + filteredImprovements.length}</span>
              </button>
            </div>
          </div>
          <div className={styles.content}>
            {view === 'charts'
              ? <ChartsPanel
                  filteredFeedback={filteredFeedback}
                  filteredImprovements={filteredImprovements}
                  reports={reports}
                  activeReportId={activeReportId}
                  onAddChartToReportId={addChartToReportId}
                  onAddChartToNewReport={addChartToNewReport}
                />
              : <DataTables  filteredFeedback={filteredFeedback} filteredImprovements={filteredImprovements} activeTab={activeTab} setTab={setActiveTab}/>
            }
          </div>
        </main>
      </div>

<AiChat
        reportItems={activeReport?.sections || []}
        reports={reports}
        activeReportId={activeReportId}
        onAddToReportId={addToReportId}
        onAddNewReport={addToNewReport}
      />

      {showEditor && (
        <ReportEditorPage
          reports={reports}
          activeReportId={activeReportId}
          onSetActive={setActiveReportId}
          onNewReport={addNewReport}
          onDeleteReport={deleteReport}
          onUpdateReport={updateReport}
          chartData={chartData}
          onClose={() => setShowEditor(false)}
        />
      )}
    </div>
  )
}
