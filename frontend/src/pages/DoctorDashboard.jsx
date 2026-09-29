import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/common/Navbar'
import EmptyState from '../components/common/EmptyState'
import AnimalDetailModal from '../components/features/animals/AnimalDetailModal'
import {
  Calendar, CheckCircle2,
  Video, Thermometer, AlertTriangle, ChevronDown, ChevronUp
} from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_BADGE = {
  pending:   { cls: 'badge-yellow',  label: 'appointments.status_pending' },
  confirmed: { cls: 'badge-blue',    label: 'appointments.status_confirmed' },
  completed: { cls: 'badge-green',   label: 'appointments.status_completed' },
  cancelled: { cls: 'badge-gray',    label: 'appointments.status_cancelled' },
}

function AppointmentCard({ appt, onUpdate }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [expanded, setExpanded]   = useState(false)
  const [animal, setAnimal]       = useState(null)
  const [loadingAction, setLoadingAction] = useState(false)

  async function loadAnimal() {
    if (!appt.animal_id || animal) return
    const { data } = await supabase.from('animals').select('*').eq('id', appt.animal_id).single()
    setAnimal(data)
  }

  async function updateStatus(status) {
    setLoadingAction(true)
    const { error } = await supabase.from('appointments').update({ status }).eq('id', appt.id)
    if (error) toast.error('Failed to update')
    else { toast.success('Updated'); onUpdate() }
    setLoadingAction(false)
  }

  const badge = STATUS_BADGE[appt.status] || STATUS_BADGE.pending

  return (
    <div className="glass p-5 space-y-4 animate-fade-in">
      {/* Top */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-brand-400" />
            <span className="font-medium text-surface-100">
              {new Date(appt.slot_time).toLocaleString()}
            </span>
          </div>
          <div className="text-sm text-surface-400 mt-1">
            {t('appointments.farmer')}: <span className="text-surface-200">{appt.profiles?.name || appt.farmer_id}</span>
          </div>
          {appt.animal_id && (
            <div className="text-sm text-surface-400">
              Animal: <span className="font-mono text-brand-400">{appt.animal_id}</span>
            </div>
          )}
          {appt.notes && <p className="text-xs text-surface-500 mt-1 italic">"{appt.notes}"</p>}
        </div>
        <span className={`badge ${badge.cls}`}>{t(badge.label)}</span>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {appt.status === 'pending' && (
          <button
            onClick={() => updateStatus('confirmed')}
            disabled={loadingAction}
            className="btn-primary btn-sm"
          >
            <CheckCircle2 size={14} />
            {t('doctor.confirmAppointment')}
          </button>
        )}
        {appt.status === 'confirmed' && (
          <>
            <button
              onClick={() => navigate(`/session/${appt.id}`)}
              className="btn-primary btn-sm"
            >
              <Video size={14} />
              {t('doctor.joinSession')}
            </button>
            <button
              onClick={() => updateStatus('completed')}
              disabled={loadingAction}
              className="btn-secondary btn-sm"
            >
              <CheckCircle2 size={14} />
              {t('doctor.completeAppointment')}
            </button>
          </>
        )}

        {appt.animal_id && (
          <button
            onClick={() => { setExpanded(e => !e); loadAnimal() }}
            className="btn-ghost btn-sm"
          >
            <Thermometer size={14} />
            {t('doctor.animalContext')}
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>

      {/* Expandable animal context — opens full modal */}
      {expanded && animal && (
        <AnimalDetailModal
          animal={animal}
          onClose={() => setExpanded(false)}
        />
      )}
    </div>
  )
}

export default function DoctorDashboard() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')

  const filters = ['all', 'pending', 'confirmed', 'completed']

  async function fetchAppointments() {
    setLoading(true)
    const { data } = await supabase
      .from('appointments')
      .select(`
        *,
        profiles!appointments_farmer_id_fkey (name, email)
      `)
      .eq('doctor_id', profile.id)
      .order('slot_time', { ascending: false })
    setAppointments(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchAppointments()
    const ch = supabase.channel('doctor-appts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, fetchAppointments)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [profile.id])

  const filtered = filter === 'all'
    ? appointments
    : appointments.filter(a => a.status === filter)

  const pendingCount   = appointments.filter(a => a.status === 'pending').length
  const confirmedCount = appointments.filter(a => a.status === 'confirmed').length

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-50">{t('doctor.dashboard')}</h1>
          <p className="text-sm text-surface-400 mt-0.5">{profile?.name} · {t('auth.roles.doctor')}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Pending',   value: pendingCount,           color: 'text-yellow-400' },
            { label: 'Confirmed', value: confirmedCount,         color: 'text-blue-400' },
            { label: 'Total',     value: appointments.length,    color: 'text-surface-100' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <span className="stat-label">{s.label}</span>
              <span className={`stat-value ${s.color}`}>{loading ? '—' : s.value}</span>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 glass-inset p-1 rounded-lg w-fit">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${
                filter === f ? 'bg-surface-700 text-surface-100' : 'text-surface-500 hover:text-surface-300'
              }`}
            >
              {f === 'all' ? 'All' : t(`appointments.status_${f}`)}
            </button>
          ))}
        </div>

        {/* List */}
        <div>
          <h2 className="section-title">{t('doctor.myAppointments')}</h2>
          {loading ? (
            <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>
          ) : filtered.length === 0 ? (
            <div className="glass">
              <EmptyState
                icon={Calendar}
                title={t('doctor.noAppointments')}
                description={t('doctor.noAppointmentsDesc')}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map(appt => (
                <AppointmentCard key={appt.id} appt={appt} onUpdate={fetchAppointments} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
