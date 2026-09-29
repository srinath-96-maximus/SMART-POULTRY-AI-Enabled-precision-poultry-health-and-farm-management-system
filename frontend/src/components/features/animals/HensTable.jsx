import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../../lib/supabase'
import AnimalDetailModal from './AnimalDetailModal'
import { ArrowUpDown, ChevronDown, ShieldAlert, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'

// Derive status for a hen
function getHenStatus(animal, readings, alerts) {
  const hasAlert  = !!alerts[animal.id]
  const hasData   = readings[animal.id] &&
    Object.keys(readings[animal.id]).length > 0

  if (hasAlert)  return 'unhealthy'
  if (!hasData)  return 'awaiting'
  return 'healthy'
}

// Row background classes per status (normal)
const ROW_BG = {
  healthy:   'bg-emerald-900/40 hover:bg-emerald-900/60',
  unhealthy: 'bg-red-900/40 hover:bg-red-900/60',
  awaiting:  'bg-surface-800/60 hover:bg-surface-700/60',
}

// Row background for isolated rows
const ROW_BG_ISOLATED = {
  healthy:   'bg-amber-900/30 hover:bg-amber-900/50',
  unhealthy: 'bg-amber-900/30 hover:bg-amber-900/50',
  awaiting:  'bg-amber-900/30 hover:bg-amber-900/50',
}

// Status badge colours
const STATUS_BADGE = {
  healthy:   'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  unhealthy: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30',
  awaiting:  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-600/40 text-surface-400 border border-surface-500/30',
}

const SORT_OPTIONS = ['healthy_first', 'unhealthy_first', 'weight_asc', 'weight_desc']

// ── Toggle switch component ───────────────────────────────────
function IsolationToggle({ isOn, onToggle }) {
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onToggle() }}
      title={isOn ? 'Remove from isolation' : 'Move to isolation'}
      className={`
        relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2
        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-surface-900
        ${isOn ? 'bg-amber-500 border-amber-500' : 'bg-surface-600 border-surface-500'}
      `}
      aria-checked={isOn}
      role="switch"
    >
      <span
        className={`
          pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0
          transition duration-200 ease-in-out
          ${isOn ? 'translate-x-4' : 'translate-x-0'}
        `}
      />
    </button>
  )
}

// ── Shared table structure ─────────────────────────────────────
function HenTableBody({ rows, isolated, onToggleIsolation, onSelectAnimal, onResetWeight, fmtVal, t, isIsolation }) {
  if (rows.length === 0) {
    return (
      <tr>
        <td colSpan={7} className="px-4 py-8 text-center text-sm text-surface-500 italic">
          {isIsolation ? 'No hens in isolation.' : t('hens.noHens')}
        </td>
      </tr>
    )
  }

  return rows.map(row => (
    <tr
      key={row.animal.id}
      className={`cursor-pointer transition-colors ${isIsolation ? ROW_BG_ISOLATED[row.status] : ROW_BG[row.status]}`}
      onClick={() => onSelectAnimal(row.animal)}
    >
      <td className="px-4 py-3 text-surface-400 font-mono text-xs">{row.sno}</td>
      <td className="px-4 py-3 font-mono font-medium text-brand-300 text-xs">{row.animal.id}</td>
      <td className="px-4 py-3 text-surface-300">
        {row.animal.colour
          ? <span className="capitalize">{row.animal.colour}</span>
          : <span className="text-surface-500 italic text-xs">{t('hens.noColour')}</span>
        }
      </td>
      <td className="px-4 py-3 text-surface-200">{fmtVal(row.temp, '°C')}</td>
      <td className="px-4 py-3 text-surface-200">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
            {row.weight != null
              ? <span className="font-medium tabular-nums">{row.weight.toFixed(2)} kg</span>
              : <span className="text-surface-500 italic text-xs">{t('hens.noDataYet')}</span>
            }
            {row.weight != null && (
              <button
                title="Reset weight"
                onClick={e => { e.stopPropagation(); onResetWeight(row.animal.id) }}
                className="p-0.5 rounded text-surface-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
              >
                <RotateCcw size={11} />
              </button>
            )}
          </div>
          {row.weightUpdatedAt && (
            <span className="text-xs text-surface-600">
              {new Date(row.weightUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={STATUS_BADGE[row.status]}>
          {t(`hens.status_${row.status}`)}
        </span>
      </td>
      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <IsolationToggle
            isOn={isolated.has(row.animal.id)}
            onToggle={() => onToggleIsolation(row.animal.id)}
          />
          {isolated.has(row.animal.id) && (
            <span className="text-xs text-amber-400 font-medium">On</span>
          )}
        </div>
      </td>
    </tr>
  ))
}

// ── Column headers (shared) ───────────────────────────────────
function TableHeaders({ t }) {
  const headers = [
    t('hens.col_sno'),
    t('hens.col_id'),
    t('hens.col_colour'),
    t('hens.col_temperature'),
    t('hens.col_weight'),
    t('hens.col_status'),
    'Isolation',
  ]
  return (
    <thead>
      <tr className="border-b border-surface-700/50 bg-surface-800/80">
        {headers.map(h => (
          <th
            key={h}
            className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider whitespace-nowrap"
          >
            {h}
          </th>
        ))}
      </tr>
    </thead>
  )
}

// ── Main export ───────────────────────────────────────────────
export default function HensTable({ animals, readings, alerts, behaviors, ambientTemp }) {
  const { t } = useTranslation()
  const [selectedAnimal, setSelectedAnimal] = useState(null)
  const [sortBy, setSortBy]                 = useState('healthy_first')
  const [isolated, setIsolated]             = useState(new Set())

  function toggleIsolation(id) {
    setIsolated(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function resetWeight(animalId) {
    try {
      const { error } = await supabase
        .from('animals')
        .update({ current_weight: null, current_weight_updated_at: null })
        .eq('id', animalId)
      if (error) throw error
      toast.success('Weight reset successfully')
    } catch (err) {
      toast.error('Failed to reset weight')
      console.error(err)
    }
  }

  // Build enriched row data
  const rows = animals.map((animal, idx) => {
    const r      = readings[animal.id] || {}
    const status = getHenStatus(animal, readings, alerts)
    const isRed  = animal.colour?.toLowerCase() === 'red'
    return {
      idx:    idx + 1,
      animal,
      status,
      // Red hen shows ambient temp (= hen 202 reading); others use own sensor data
      temp:   isRed && ambientTemp !== null
             ? ambientTemp
             : typeof r.thermal === 'number' ? r.thermal
             : typeof r.temp   === 'number' ? r.temp
             : null,
      weight:          animal.current_weight != null ? parseFloat(animal.current_weight) : null,
      weightUpdatedAt: animal.current_weight_updated_at || null,
    }
  })

  // Sort
  const ORDER = { healthy: 0, awaiting: 1, unhealthy: 2 }
  const sorted = [...rows].sort((a, b) => {
    switch (sortBy) {
      case 'healthy_first':   return ORDER[a.status] - ORDER[b.status]
      case 'unhealthy_first': return ORDER[b.status] - ORDER[a.status]
      case 'weight_asc':
        if (a.weight == null && b.weight == null) return 0
        if (a.weight == null) return 1
        if (b.weight == null) return -1
        return a.weight - b.weight
      case 'weight_desc':
        if (a.weight == null && b.weight == null) return 0
        if (a.weight == null) return 1
        if (b.weight == null) return -1
        return b.weight - a.weight
      default: return 0
    }
  })

  // Split into active vs isolated, preserve sort order, re-number each table
  const activeRows    = sorted.filter(r => !isolated.has(r.animal.id)).map((r, i) => ({ ...r, sno: i + 1 }))
  const isolationRows = sorted.filter(r =>  isolated.has(r.animal.id)).map((r, i) => ({ ...r, sno: i + 1 }))

  function fmtVal(val, unit) {
    if (val == null) return <span className="text-surface-500 italic text-xs">{t('hens.noDataYet')}</span>
    return <span>{val.toFixed(1)}{unit}</span>
  }

  const sharedProps = { isolated, onToggleIsolation: toggleIsolation, onSelectAnimal: setSelectedAnimal, onResetWeight: resetWeight, fmtVal, t }

  return (
    <>
      {/* ── Sort control ─────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4">
        <ArrowUpDown size={15} className="text-surface-400" />
        <span className="text-sm text-surface-400">{t('hens.sortBy')}:</span>
        <div className="relative">
          <select
            className="select appearance-none pr-8 py-1.5 text-sm"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{t(`hens.sort_${opt}`)}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
        </div>

        {isolated.size > 0 && (
          <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
            <ShieldAlert size={12} />
            {isolated.size} in isolation
          </span>
        )}
      </div>

      {/* ── My Hens table ────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-surface-700/50 mb-8">
        <table className="w-full text-sm">
          <TableHeaders t={t} />
          <tbody className="divide-y divide-surface-700/30">
            <HenTableBody rows={activeRows} isIsolation={false} {...sharedProps} />
          </tbody>
        </table>
      </div>

      {/* ── Isolation table (shown only when at least 1 hen is isolated) ── */}
      {isolationRows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-amber-400" />
            <h3 className="text-base font-semibold text-amber-300">Isolation</h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {isolationRows.length} {isolationRows.length === 1 ? 'hen' : 'hens'}
            </span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-amber-700/50 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
            <table className="w-full text-sm">
              <TableHeaders t={t} />
              <tbody className="divide-y divide-amber-900/30">
                <HenTableBody rows={isolationRows} isIsolation={true} {...sharedProps} />
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedAnimal && (
        <AnimalDetailModal
          animal={selectedAnimal}
          onClose={() => setSelectedAnimal(null)}
        />
      )}
    </>
  )
}
