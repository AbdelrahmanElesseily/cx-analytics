import { useState } from 'react'
import { BarChart2, Table2 } from 'lucide-react'
import Topbar         from './components/layout/Topbar'
import KpiRow         from './components/layout/KpiRow'
import FilterPanel    from './components/filters/FilterPanel'
import ChartsPanel    from './components/charts/ChartsPanel'
import DataTables     from './components/table/ReservationsTable'
import AiChat         from './components/chat/AiChat'
import { useFilters } from './hooks/useFilters'
import styles         from './App.module.css'

export default function App() {
  const [view,      setView]      = useState('charts')
  const [activeTab, setActiveTab] = useState('improvements')

  const {
    filters, filteredFeedback, filteredImprovements, kpis,
    updateFilter, toggleArray, resetFilters, activeCount,
  } = useFilters()

  return (
    <div className={styles.root}>
      <Topbar />
      <div className={styles.body}>

        {/* Left — filter sidebar */}
        <FilterPanel
          filters={filters}
          updateFilter={updateFilter}
          toggleArray={toggleArray}
          resetFilters={resetFilters}
          activeCount={activeCount}
        />

        {/* Centre — KPIs + charts/table */}
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

        {/* Right — AI chat panel (always visible) */}
        <AiChat />
      </div>
    </div>
  )
}
