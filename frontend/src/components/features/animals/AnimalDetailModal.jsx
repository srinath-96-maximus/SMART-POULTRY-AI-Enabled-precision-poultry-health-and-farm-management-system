import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { X, Thermometer, Weight, Droplets, Activity, AlertTriangle, ChevronDown } from 'lucide-react'
import EmptyState from '../../common/EmptyState'

const SENSOR_CONFIG = {
  thermal:  { color: '#f97316', label: 'Thermal (°C)', icon: Thermometer },
  temp:     { color: '#eab308', label: 'Ambient Temp (°C)', icon: Thermometer },
  humidity: { color: '#3b82f6', label: 'Humidity (%)', icon: Droplets },
  weight:   { color: '#8b5cf6', label: 'Weight (kg)', icon: Weight },
}

function useAnimalHistory(animalId, range) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!animalId) return
    setLoading(true)
    const since = new Date()
    since.setHours(since.getHours() - (range === '7d' ? 168 : 24))

    supabase
      .from('sensor_readings')
      .select('type, value, recorded_at')
      .eq('animal_id', animalId)
      .gte('recorded_at', since.toISOString())
      .order('recorded_at', { ascending: true })
      .then(({ data: rows }) => {
        // Pivot: group by time buckets, merge sensor types
        const buckets = {}
        rows?.forEach(row => {
          const key = new Date(row.recorded_at).toLocaleString()
          if (!buckets[key]) buckets[key] = { time: key }
          buckets[key][row.type] = parseFloat(row.value)
        })
        setData(Object.values(buckets))
        setLoading(false)
      })
  }, [animalId, range])

  return { data, loading }
}

function useAnimalAlerts(animalId) {
  const [alerts, setAlerts] = useState([])
  useEffect(() => {
    if (!animalId) return
    supabase
      .from('alerts')
      .select('*')
      .eq('animal_id', animalId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setAlerts(data || []))
  }, [animalId])
  return alerts
}

function useAnimalBehavior(animalId) {
  const [events, setEvents] = useState([])
  useEffect(() => {
    if (!animalId) return
    supabase
      .from('behavior_events')
      .select('*')
      .eq('animal_id', animalId)
      .order('detected_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setEvents(data || []))
  }, [animalId])
  return events
}

const SEVERITY_CLASS = {
  high:   'badge-red',
  medium: 'badge-orange',
  low:    'badge-yellow',
}

export default function AnimalDetailModal({ animal, onClose }) {
  const { t } = useTranslation()
  const [range, setRange] = useState('24h')
  const { data: chartData, loading: chartLoading } = useAnimalHistory(animal.id, range)
  const alerts   = useAnimalAlerts(animal.id)
  const behaviors = useAnimalBehavior(animal.id)

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-10 overflow-y-auto">
      <div className="glass w-full max-w-3xl p-6 mb-10 animate-slide-up">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-brand-400 font-bold text-lg">{animal.id}</span>
              <span className="badge badge-gray">{t(`animals.species_${animal.species}`)}</span>
              {animal.name && <span className="text-surface-400 text-sm">· {animal.name}</span>}
            </div>
            <p className="text-sm text-surface-500 mt-0.5">Animal History & Sensor Detail</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1"><X size={20} /></button>
        </div>

        {/* Range selector */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-surface-400">{t('animals.viewHistory')}:</span>
          {['24h', '7d'].map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                range === r ? 'bg-brand-600 text-white' : 'btn-ghost'
              }`}
            >
              {r === '24h' ? t('animals.last24h') : t('animals.last7d')}
            </button>
          ))}
        </div>

        {/* Charts */}
        {chartLoading ? (
          <div className="flex justify-center py-10"><div className="spinner w-8 h-8" /></div>
        ) : chartData.length === 0 ? (
          <EmptyState
            icon={Activity}
            title={t('emptyState.noSensorData')}
            description={t('emptyState.noSensorDataDesc')}
          />
        ) : (
          <div className="space-y-5">
            {Object.entries(SENSOR_CONFIG).map(([key, cfg]) => {
              const hasData = chartData.some(d => d[key] != null)
              if (!hasData) return null
              return (
                <div key={key} className="glass-inset p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <cfg.icon size={16} style={{ color: cfg.color }} />
                    <span className="text-sm font-medium text-surface-300">{cfg.label}</span>
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} width={35} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: '#94a3b8' }}
                        itemStyle={{ color: cfg.color }}
                      />
                      <Line
                        type="monotone"
                        dataKey={key}
                        stroke={cfg.color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )
            })}
          </div>
        )}

        <div className="divider" />

        {/* Alerts */}
        <div className="mb-5">
          <h3 className="section-title text-base">{t('animals.alertHistory')}</h3>
          {alerts.length === 0 ? (
            <p className="text-sm text-surface-500">{t('animals.noAlerts')}</p>
          ) : (
            <div className="space-y-2">
              {alerts.map(a => (
                <div key={a.id} className="glass-inset px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className={a.severity === 'high' ? 'text-red-400' : a.severity === 'medium' ? 'text-orange-400' : 'text-yellow-400'} />
                    <span className="text-sm text-surface-200">{a.risk_type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={SEVERITY_CLASS[a.severity] + ' badge'}>{t(`alerts.severity_${a.severity}`)}</span>
                    <span className={`text-xs ${a.resolved ? 'text-emerald-400' : 'text-red-400'}`}>
                      {a.resolved ? t('alerts.resolved') : t('alerts.unresolved')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Behavior Events */}
        <div>
          <h3 className="section-title text-base">{t('animals.behaviorHistory')}</h3>
          {behaviors.length === 0 ? (
            <p className="text-sm text-surface-500">{t('animals.noBehaviorEvents')}</p>
          ) : (
            <div className="space-y-2">
              {behaviors.map(b => (
                <div key={b.id} className="glass-inset px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-purple-400" />
                    <span className="text-sm text-surface-200 capitalize">{b.behavior_type.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {b.confidence && (
                      <span className="text-xs text-surface-500">{Math.round(b.confidence * 100)}% conf.</span>
                    )}
                    <span className="text-xs text-surface-500">
                      {new Date(b.detected_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
