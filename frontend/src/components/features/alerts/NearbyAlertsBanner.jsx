import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import { AlertOctagon, MapPin } from 'lucide-react'

export default function NearbyAlertsBanner() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchNearby() {
    if (!profile?.farm_id) { setLoading(false); return }
    const { data, error } = await supabase
      .rpc('get_nearby_high_severity_alerts', { requesting_farm_id: profile.farm_id })
    if (!error) setAlerts(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchNearby()

    // Re-fetch when any alert changes
    const channel = supabase
      .channel('nearby-alerts-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, fetchNearby)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [profile?.farm_id])

  if (loading) return null

  if (alerts.length === 0) {
    return (
      <div className="glass-inset px-4 py-3 flex items-center gap-2 text-emerald-400 border-emerald-500/20">
        <MapPin size={16} className="flex-shrink-0" />
        <div>
          <span className="text-sm font-medium">{t('farmer.noNearbyAlerts')}</span>
          <p className="text-xs text-emerald-600">{t('farmer.noNearbyAlertsDesc')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => (
        <div
          key={i}
          className="border border-orange-500/30 bg-orange-500/10 rounded-lg px-4 py-3 flex items-start gap-3"
        >
          <AlertOctagon size={18} className="text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-orange-300">
              {t('farmer.nearbyAlertDesc', {
                riskType: alert.risk_type,
                distance: alert.distance_band,
              })}
            </p>
            <p className="text-xs text-orange-500 mt-0.5">
              Detected {new Date(alert.created_at).toLocaleString()} · Increase biosecurity precautions immediately.
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
