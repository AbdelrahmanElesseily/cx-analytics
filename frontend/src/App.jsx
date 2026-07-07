import { useState } from 'react'
import { BarChart2, Table2 } from 'lucide-react'
import Topbar         from './components/layout/Topbar'
import KpiRow         from './components/layout/KpiRow'
import FilterPanel    from './components/filters/FilterPanel'
import ChartsPanel    from './components/charts/ChartsPanel'
import DataTables     from './components/table/ReservationsTable'
import AiChat         from './components/chat/AiChat'
import ReportPanel    from './components/report/ReportPanel'
import { useFilters } from './hooks/useFilters'
import styles         from './App.module.css'

export default function App() {
  const [view,      setView]      = useState('charts')
  const [activeTab, setActiveTab] = useState('improvements')

  const [reports,        setReports]        = useState([{ id: 1, name: 'Report 1', items: [] }])
  const [activeReportId, setActiveReportId] = useState(1)

  const {
    filters, filteredFeedback, filteredImprovements, kpis,
    updateFilter, toggleArray, resetFilters, activeCount,
  } = useFilters()

  const activeReport = reports.find(r => r.id === activeReportId) || reports[0]

  function addToReport(msg) {
    setReports(prev => prev.map(r =>
      r.id === activeReportId
        ? r.items.find(i => i.msgId === msg.id)
          ? r
          : { ...r, items: [...r.items, { msgId: msg.id, question: msg.question, mode: msg.mode, data: msg.data }] }
        : r
    ))
  }

  function removeFromReport(msgId) {
    setReports(prev => prev.map(r =>
      r.id === activeReportId
        ? { ...r, items: r.items.filter(i => i.msgId !== msgId) }
        : r
    ))
  }

  function clearReport() {
    setReports(prev => prev.map(r =>
      r.id === activeReportId ? { ...r, items: [] } : r
    ))
  }

  function addNewReport() {
    const newId = Date.now()
    setReports(prev => [...prev, { id: newId, name: `Report ${prev.length + 1}`, items: [] }])
    setActiveReportId(newId)
  }

  function deleteReport(id) {
    setReports(prev => {
      const remaining = prev.filter(r => r.id !== id)
      if (remaining.length === 0) {
        const fresh = { id: Date.now(), name: 'Report 1', items: [] }
        setActiveReportId(fresh.id)
        return [fresh]
      }
      if (activeReportId === id) setActiveReportId(remaining[0].id)
      return remaining
    })
  }

  return (
    <div className={styles.root}>
      <Topbar />
      <div className={styles.body}>

        <FilterPanel
          filters={filters}
          updateFilter={updateFilter}
          toggleArray={toggleArray}
          resetFilters={resetFilters}
          activeCount={activeCount}
        />

        <main className={styles.main}>
          <div className={styles.kpiRow}>
            <KpiRow kpis={kpis} />
          </div>
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
              ? <ChartsPanel filteredFeedback={filteredFeedback} filteredImprovements={filteredImprovements}/>
              : <DataTables  filteredFeedback={filteredFeedback} filteredImprovements={filteredImprovements} activeTab={activeTab} setTab={setActiveTab}/>
            }
          </div>
        </main>

      </div>

      <ReportPanel
        reports={reports}
        activeReportId={activeReportId}
        onSetActive={setActiveReportId}
        onNewReport={addNewReport}
        onDeleteReport={deleteReport}
        onRemove={removeFromReport}
        onClear={clearReport}
        chartData={{ feedback: filteredFeedback, improvements: filteredImprovements }}
      />
      <AiChat reportItems={activeReport?.items || []} onAddToReport={addToReport} />
    </div>
  )
}
