import { useState, useMemo } from 'react'
import { FEEDBACK, IMPROVEMENTS } from '../data/mockData'

export const DEFAULT_FILTERS = {
  quarters:   [],
  sources:    [],
  channels:   [],
  cx_stages:  [],
  services:   [],
  ratings:    [],
  tab:        'improvements',  // 'feedback' | 'improvements'
}

export function useFilters() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  const updateFilter = (key, value) =>
    setFilters(prev => ({ ...prev, [key]: value }))

  const toggleArray = (key, value) =>
    setFilters(prev => {
      const arr = prev[key]
      return { ...prev, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] }
    })

  const resetFilters = () => setFilters(DEFAULT_FILTERS)

  const activeCount = useMemo(() => {
    let n = 0
    if (filters.quarters.length)  n++
    if (filters.sources.length)   n++
    if (filters.channels.length)  n++
    if (filters.cx_stages.length) n++
    if (filters.services.length)  n++
    if (filters.ratings.length)   n++
    return n
  }, [filters])

  // Filtered FEEDBACK
  const filteredFeedback = useMemo(() => FEEDBACK.filter(r => {
    if (filters.quarters.length  && !filters.quarters.includes(r.quarter))   return false
    if (filters.sources.length   && !filters.sources.includes(r.source))     return false
    if (filters.channels.length  && !filters.channels.includes(r.channel))   return false
    if (filters.cx_stages.length && !filters.cx_stages.includes(r.cx_stage)) return false
    if (filters.ratings.length   && !filters.ratings.includes(r.rating))     return false
    return true
  }), [filters])

  // Filtered IMPROVEMENTS
  const filteredImprovements = useMemo(() => IMPROVEMENTS.filter(r => {
    if (filters.quarters.length  && !filters.quarters.includes(r.quarter))   return false
    if (filters.sources.length   && !filters.sources.includes(r.source))     return false
    if (filters.channels.length  && !filters.channels.includes(r.channel))   return false
    if (filters.cx_stages.length && !filters.cx_stages.includes(r.cx_stage)) return false
    if (filters.services.length  && !filters.services.includes(r.service))   return false
    return true
  }), [filters])

  // KPIs
  const kpis = useMemo(() => {
    const avgRating    = filteredFeedback.length
      ? +(filteredFeedback.reduce((s,r) => s + r.rating, 0) / filteredFeedback.length).toFixed(1)
      : 0
    const rating5      = filteredFeedback.filter(r => r.rating === 5).length
    const totalActions = filteredImprovements.length
    const withAction   = filteredImprovements.filter(r => r.action).length
    const channels     = new Set(filteredImprovements.map(r => r.channel)).size
    const q3Actions    = filteredImprovements.filter(r => r.quarter === 'Q3').length

    return { avgRating, rating5, totalActions, withAction, channels, q3Actions,
             totalFeedback: filteredFeedback.length }
  }, [filteredFeedback, filteredImprovements])

  return {
    filters, filteredFeedback, filteredImprovements, kpis,
    updateFilter, toggleArray, resetFilters, activeCount,
  }
}
