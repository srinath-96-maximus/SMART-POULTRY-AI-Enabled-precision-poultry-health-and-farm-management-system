import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/common/Navbar'
import HensTable from '../components/features/animals/HensTable'
import NearbyAlertsBanner from '../components/features/alerts/NearbyAlertsBanner'
import RegisterAnimalForm from '../components/features/animals/RegisterAnimalForm'
import BookAppointmentModal from '../components/features/appointments/BookAppointmentModal'
import EmptyState from '../components/common/EmptyState'
import { PlusCircle, AlertTriangle, Calendar, CheckCircle, Bird, Thermometer, Building2, MapPin, Compass, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

function useRealtimeFarmerData(farmId) {
  const [animals, setAnimals]       = useState([])
  const [readings, setReadings]     = useState({}) // animalId -> { type: value }
  const [alerts, setAlerts]         = useState({}) // animalId -> activeAlert
  const [behaviors, setBehaviors]   = useState({}) // animalId -> latestBehavior
  const [farmAlerts, setFarmAlerts] = useState([])
  const [ambientTemp, setAmbientTemp] = useState(null) // latest farm-level temp (animal_id IS NULL)
  const [loading, setLoading]       = useState(true)

  const fetch = useCallback(async () => {
    if (!farmId) { setLoading(false); return }

    // Fetch hens
    const { data: animalRows } = await supabase
      .from('animals')
      .select('*')
      .eq('farm_id', farmId)
      .order('created_at', { ascending: true })

    setAnimals(animalRows || [])

    // ── Ambient temperature: farm-level readings where animal_id IS NULL ──
    const { data: ambientRows } = await supabase
      .from('sensor_readings')
      .select('value, recorded_at')
      .eq('farm_id', farmId)
      .eq('type', 'temp')
      .is('animal_id', null)
      .order('recorded_at', { ascending: false })
      .limit(1)

    if (ambientRows?.length) {
      setAmbientTemp(parseFloat(ambientRows[0].value))
    }

    if (!animalRows?.length) { setLoading(false); return }

    const animalIds = animalRows.map(a => a.id)

    // Fetch latest reading per animal per type (last 24h)
    const since = new Date()
    since.setHours(since.getHours() - 24)

    const { data: readingRows } = await supabase
      .from('sensor_readings')
      .select('animal_id, type, value, recorded_at')
      .in('animal_id', animalIds)
      .gte('recorded_at', since.toISOString())
      .order('recorded_at', { ascending: false })

    // Take latest per animal+type
    const readingsMap = {}
    readingRows?.forEach(r => {
      if (!readingsMap[r.animal_id]) readingsMap[r.animal_id] = {}
      if (!readingsMap[r.animal_id][r.type]) {
        readingsMap[r.animal_id][r.type] = parseFloat(r.value)
      }
    })
    setReadings(readingsMap)

    // Fetch active alerts
    const { data: alertRows } = await supabase
      .from('alerts')
      .select('*')
      .eq('farm_id', farmId)
      .eq('resolved', false)
      .order('created_at', { ascending: false })

    const alertsMap = {}
    alertRows?.forEach(a => {
      if (a.animal_id && !alertsMap[a.animal_id]) alertsMap[a.animal_id] = a
    })
    setAlerts(alertsMap)
    setFarmAlerts(alertRows || [])

    // Fetch latest behavior per animal
    const { data: behaviorRows } = await supabase
      .from('behavior_events')
      .select('animal_id, behavior_type, confidence, detected_at')
      .in('animal_id', animalIds)
      .order('detected_at', { ascending: false })

    const behaviorMap = {}
    behaviorRows?.forEach(b => {
      if (!behaviorMap[b.animal_id]) behaviorMap[b.animal_id] = b
    })
    setBehaviors(behaviorMap)

    setLoading(false)
  }, [farmId])

  useEffect(() => {
    fetch()

    const channel = supabase
      .channel(`farm-data-${farmId}`)
      // ── Sensor readings: update state directly from payload, no full refetch ──
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_readings', filter: `farm_id=eq.${farmId}` },
        (payload) => {
          const row = payload.new
          if (!row) return

          // Ambient temperature (farm-level, animal_id is null)
          if (row.animal_id === null && row.type === 'temp') {
            setAmbientTemp(parseFloat(row.value))
            return
          }

          // Per-animal sensor reading — patch just that animal's entry in the map
          if (row.animal_id) {
            setReadings(prev => {
              const animalReadings = prev[row.animal_id] || {}
              // Only overwrite if this reading is newer (readings are ordered desc on load)
              return {
                ...prev,
                [row.animal_id]: {
                  ...animalReadings,
                  [row.type]: parseFloat(row.value),
                },
              }
            })
          }
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'alerts', filter: `farm_id=eq.${farmId}` },
        () => fetch()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'behavior_events', filter: `farm_id=eq.${farmId}` },
        () => fetch()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'animals', filter: `farm_id=eq.${farmId}` },
        () => fetch()
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetch])


  return { animals, readings, alerts, behaviors, farmAlerts, ambientTemp, loading, refetch: fetch }
}

export default function FarmerDashboard() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const [showRegister, setShowRegister] = useState(false)
  const [showBook, setShowBook]         = useState(false)

  const farmId = profile?.farm_id
  const { animals, readings, alerts, behaviors, farmAlerts, ambientTemp, loading, refetch } =
    useRealtimeFarmerData(farmId)

  // Stats
  const unhealthyCount = Object.keys(alerts).length
  const healthyCount   = animals.filter(a => {
    const hasData  = readings[a.id] && Object.keys(readings[a.id]).length > 0
    const hasAlert = !!alerts[a.id]
    return hasData && !hasAlert
  }).length

  // TODO: temporary — use hen '202' temp as ambient display
  const hen202 = animals.find(a =>
    (a.rfid_tag && a.rfid_tag.includes('202')) || a.id.includes('202')
  )
  const hen202Temp = hen202
    ? (readings[hen202.id]?.thermal ?? readings[hen202.id]?.temp ?? null)
    : null

  const avgTemp = loading
    ? '—'
    : hen202Temp !== null
      ? `${hen202Temp.toFixed(1)}°C`
      : ambientTemp !== null
        ? `${ambientTemp.toFixed(1)}°C`   // fallback to farm-level reading
        : '—'


  if (!loading && !farmId) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-16 flex items-center justify-center">
          <FarmSetupForm userId={profile?.id} onSuccess={refetch} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-surface-50">{t('farmer.dashboard')}</h1>
            <p className="text-sm text-surface-400 mt-0.5">
              {profile?.name} · {t('farmer.myFarm')}
              {!farmId && <span className="text-orange-400 ml-2">⚠ No farm linked — contact support</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowBook(true)} className="btn-secondary btn-sm">
              <Calendar size={15} />
              <span className="hidden sm:inline">{t('farmer.bookAppointment')}</span>
            </button>
            <button onClick={() => setShowRegister(true)} className="btn-primary btn-sm">
              <PlusCircle size={15} />
              {t('hens.registerHen')}
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-1">
              <Bird size={18} className="text-brand-400" />
              <span className="stat-label">{t('farmer.totalAnimals')}</span>
            </div>
            <div className="stat-value">{loading ? '—' : animals.length}</div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-1">
              <Thermometer size={18} className="text-red-400" />
              <span className="stat-label">{t('farmer.activeAlerts')}</span>
            </div>
            <div className="stat-value">{loading ? '—' : avgTemp}</div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={18} className="text-emerald-400" />
              <span className="stat-label">{t('farmer.healthyHens')}</span>
            </div>
            <div className="stat-value text-emerald-400">
              {loading ? '—' : healthyCount}
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={18} className="text-orange-400" />
              <span className="stat-label">{t('farmer.unhealthyHens')}</span>
            </div>
            <div className={`stat-value ${unhealthyCount > 0 ? 'text-orange-400' : ''}`}>
              {loading ? '—' : unhealthyCount}
            </div>
          </div>
        </div>

        {/* Nearby alerts */}
        <div>
          <h2 className="section-title">{t('farmer.nearbyAlerts')}</h2>
          <NearbyAlertsBanner />
        </div>

        {/* Farm alerts panel */}
        {farmAlerts.length > 0 && (
          <div>
            <h2 className="section-title">{t('alerts.title')}</h2>
            <div className="space-y-2">
              {farmAlerts.map(a => (
                <div key={a.id} className="glass-inset px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className={
                      a.severity === 'high' ? 'text-red-400' :
                      a.severity === 'medium' ? 'text-orange-400' : 'text-yellow-400'
                    } />
                    <span className="text-sm text-surface-200">{a.risk_type}</span>
                    {a.animal_id && <span className="text-xs text-surface-500 font-mono">· {a.animal_id}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${
                      a.severity === 'high' ? 'badge-red' :
                      a.severity === 'medium' ? 'badge-orange' : 'badge-yellow'
                    }`}>{t(`alerts.severity_${a.severity}`)}</span>
                    <span className="text-xs text-surface-500">
                      {new Date(a.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hens table */}
        <div>
          <h2 className="section-title">{t('hens.myHens')}</h2>

          {loading ? (
            <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>
          ) : animals.length === 0 ? (
            <div className="glass">
              <EmptyState
                icon={Bird}
                title={t('hens.noHens')}
                description={t('hens.noHensDesc')}
                action={
                  <button onClick={() => setShowRegister(true)} className="btn-primary">
                    <PlusCircle size={16} />
                    {t('hens.registerHen')}
                  </button>
                }
              />
            </div>
          ) : (
            <HensTable
              animals={animals}
              readings={readings}
              alerts={alerts}
              behaviors={behaviors}
              ambientTemp={ambientTemp}
            />
          )}
        </div>

        {/* No alerts (only when animals exist) */}
        {!loading && animals.length > 0 && farmAlerts.length === 0 && (
          <div className="glass">
            <EmptyState
              icon={CheckCircle}
              title={t('alerts.noAlerts')}
              description={t('alerts.noAlertsDesc')}
            />
          </div>
        )}
      </div>

      {showRegister && (
        <RegisterAnimalForm
          onClose={() => setShowRegister(false)}
          onSuccess={refetch}
        />
      )}
      {showBook && (
        <BookAppointmentModal
          animals={animals}
          onClose={() => setShowBook(false)}
          onSuccess={() => {}}
        />
      )}
    </div>
  )
}

const REGIONS = [
  'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem',
  'Tirunelveli', 'Vellore', 'Erode', 'Thanjavur', 'Dindigul',
  'Kanchipuram', 'Nagapattinam', 'Other'
]

function FarmSetupForm({ userId, onSuccess }) {
  const { t } = useTranslation()
  const { refetchProfile } = useAuth()
  const [name, setName]       = useState('')
  const [region, setRegion]   = useState('Chennai')
  const [lat, setLat]         = useState('')
  const [lng, setLng]         = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Please enter a farm name')
      return
    }
    setLoading(true)
    try {
      // Use a service-role client to bypass RLS for farm creation
      // This is the only write that needs elevated access (the user has no farm yet)
      const { createClient } = await import('@supabase/supabase-js')
      const adminClient = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_SERVICE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )

      const { data: farm, error: farmErr } = await adminClient
        .from('farms')
        .insert({
          name: name.trim(),
          owner_id: userId,
          region,
          latitude: lat ? parseFloat(lat) : null,
          longitude: lng ? parseFloat(lng) : null
        })
        .select()
        .single()

      if (farmErr) throw farmErr

      const { error: profileErr } = await adminClient
        .from('profiles')
        .update({ farm_id: farm.id })
        .eq('id', userId)

      if (profileErr) throw profileErr

      toast.success('Farm setup complete! Loading your dashboard...')
      await refetchProfile()
      onSuccess?.()
    } catch (err) {
      toast.error('Failed to set up farm: ' + (err.message || 'Please try again.'))
      console.error('Farm setup error:', err)
    } finally {
      setLoading(false)
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6))
        setLng(pos.coords.longitude.toFixed(6))
        toast.success('Location updated!')
      },
      (err) => {
        toast.error('Failed to detect location')
        console.error(err)
      }
    )
  }

  return (
    <div className="glass p-6 max-w-md mx-auto w-full animate-slide-up space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center mx-auto">
          <Building2 size={24} />
        </div>
        <h2 className="text-xl font-bold text-surface-50">Set Up Your Farm</h2>
        <p className="text-sm text-surface-400">
          Create a farm profile to start registering and monitoring your hens.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="input-label">Farm Name *</label>
          <input
            type="text"
            className="input"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            placeholder="e.g. Sunny Brook Farms"
          />
        </div>

        <div>
          <label className="input-label">Farm Region *</label>
          <div className="relative">
            <select
              className="select appearance-none pr-8"
              value={region}
              onChange={e => setRegion(e.target.value)}
            >
              {REGIONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="input-label">Latitude</label>
            <input
              type="number"
              step="any"
              className="input font-mono text-sm"
              value={lat}
              onChange={e => setLat(e.target.value)}
              placeholder="e.g. 13.0827"
            />
          </div>
          <div>
            <label className="input-label">Longitude</label>
            <input
              type="number"
              step="any"
              className="input font-mono text-sm"
              value={lng}
              onChange={e => setLng(e.target.value)}
              placeholder="e.g. 80.2707"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={useCurrentLocation}
          className="btn-secondary w-full justify-center text-xs py-2"
        >
          <Compass size={14} className="mr-1" />
          Detect Current Coordinates
        </button>

        <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
          {loading ? 'Setting up...' : 'Save & Continue'}
        </button>
      </form>
    </div>
  )
}
