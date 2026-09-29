import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Thermometer, Droplets, Weight, Activity, ChevronRight, AlertTriangle, Clock } from 'lucide-react'
import AnimalDetailModal from './AnimalDetailModal'

function RiskBadge({ riskLevel }) {
  const { t } = useTranslation()
  const config = {
    none:     { cls: 'badge-green',  dot: 'risk-dot-none',     key: 'risk_none' },
    low:      { cls: 'badge-yellow', dot: 'risk-dot-low',      key: 'risk_low' },
    medium:   { cls: 'badge-orange', dot: 'risk-dot-medium',   key: 'risk_medium' },
    high:     { cls: 'badge-red',    dot: 'risk-dot-high',     key: 'risk_high' },
    awaiting: { cls: 'badge-gray',   dot: 'risk-dot-awaiting', key: 'risk_awaiting' },
  }
  const { cls, dot, key } = config[riskLevel] || config.awaiting
  return (
    <span className={`badge ${cls}`}>
      <span className={dot} />
      {t(`animals.${key}`)}
    </span>
  )
}

function SensorValue({ icon: Icon, label, value, unit, noDataLabel }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1 text-xs text-surface-500">
        <Icon size={12} />
        {label}
      </div>
      {value != null ? (
        <span className="text-sm font-semibold text-surface-100">
          {typeof value === 'number' ? value.toFixed(1) : value}{unit}
        </span>
      ) : (
        <span className="text-xs text-surface-600 italic">{noDataLabel}</span>
      )}
    </div>
  )
}

export default function AnimalCard({ animal, latestReadings, latestBehavior, activeAlert }) {
  const { t } = useTranslation()
  const [showDetail, setShowDetail] = useState(false)

  // Derive risk level
  let riskLevel = 'awaiting'
  if (activeAlert) {
    riskLevel = activeAlert.severity === 'high' ? 'high'
              : activeAlert.severity === 'medium' ? 'medium' : 'low'
  } else if (latestReadings && Object.keys(latestReadings).length > 0) {
    riskLevel = 'none'
  }

  const thermal  = latestReadings?.thermal
  const temp     = latestReadings?.temp
  const humidity = latestReadings?.humidity
  const weight   = latestReadings?.weight

  return (
    <>
      <div
        className={`glass-hover p-5 cursor-pointer group transition-all duration-200 ${
          riskLevel === 'high' ? 'border-red-500/40 bg-red-500/5' :
          riskLevel === 'medium' ? 'border-orange-500/30' : ''
        }`}
        onClick={() => setShowDetail(true)}
      >
        {/* Top row */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="font-mono text-brand-400 font-bold text-sm">{animal.id}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-surface-500">{t(`animals.species_${animal.species}`)}</span>
              {animal.name && (
                <><span className="text-surface-700">·</span><span className="text-xs text-surface-500">{animal.name}</span></>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RiskBadge riskLevel={riskLevel} />
            <ChevronRight size={14} className="text-surface-600 group-hover:text-surface-400 transition-colors" />
          </div>
        </div>

        {/* Sensor grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SensorValue icon={Thermometer} label={t('animals.thermal')} value={thermal} unit="°C" noDataLabel={t('animals.noDataYet')} />
          <SensorValue icon={Thermometer} label={t('animals.temperature')} value={temp} unit="°C" noDataLabel={t('animals.noDataYet')} />
          <SensorValue icon={Droplets}    label={t('animals.humidity')} value={humidity} unit="%" noDataLabel={t('animals.noDataYet')} />
          <SensorValue icon={Weight}      label={t('animals.weight')} value={weight} unit=" kg" noDataLabel={t('animals.noDataYet')} />
        </div>

        {/* Bottom row */}
        {(latestBehavior || activeAlert) && (
          <div className="mt-4 pt-3 border-t border-surface-700/40 flex items-center gap-4">
            {latestBehavior && (
              <div className="flex items-center gap-1.5 text-xs text-surface-400">
                <Activity size={12} className="text-purple-400" />
                <span className="capitalize">{latestBehavior.behavior_type.replace('_', ' ')}</span>
                {latestBehavior.confidence && (
                  <span className="text-surface-600">({Math.round(latestBehavior.confidence * 100)}%)</span>
                )}
              </div>
            )}
            {activeAlert && (
              <div className="flex items-center gap-1.5 text-xs text-red-400">
                <AlertTriangle size={12} />
                <span>{activeAlert.risk_type}</span>
              </div>
            )}
          </div>
        )}

        {/* No data hint */}
        {!thermal && !temp && !humidity && !weight && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-surface-600">
            <Clock size={11} />
            <span>{t('animals.connectDevice')}</span>
          </div>
        )}
      </div>

      {showDetail && (
        <AnimalDetailModal
          animal={animal}
          onClose={() => setShowDetail(false)}
        />
      )}
    </>
  )
}
