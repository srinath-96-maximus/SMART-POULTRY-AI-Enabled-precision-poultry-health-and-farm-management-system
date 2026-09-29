import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/common/Navbar'
import EmptyState from '../components/common/EmptyState'
import BookAppointmentModal from '../components/features/appointments/BookAppointmentModal'
import { Calendar, Video, XCircle, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_BADGE = {
  pending:   'badge-yellow',
  confirmed: 'badge-blue',
  completed: 'badge-green',
  cancelled: 'badge-gray',
}

export default function AppointmentsPage() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showBook, setShowBook] = useState(false)
  const [animals, setAnimals] = useState([])

  const isFarmer = profile?.role === 'farmer'

  async function fetchAppointments() {
    setLoading(true)
    const col = isFarmer ? 'farmer_id' : 'doctor_id'
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq(col, profile.id)
      .order('slot_time', { ascending: false })
    setAppointments(data || [])
    setLoading(false)
  }

  async function fetchAnimals() {
    if (!profile?.farm_id) return
    const { data } = await supabase.from('animals').select('id, species').eq('farm_id', profile.farm_id)
    setAnimals(data || [])
  }

  useEffect(() => {
    fetchAppointments()
    if (isFarmer) fetchAnimals()
  }, [profile.id])

  async function cancelAppointment(id) {
    const { error } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id)
    if (error) toast.error('Failed to cancel')
    else { toast.success('Appointment cancelled'); fetchAppointments() }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-50">{t('appointments.title')}</h1>
            <p className="text-sm text-surface-400 mt-0.5">{profile?.name}</p>
          </div>
          {isFarmer && (
            <button onClick={() => setShowBook(true)} className="btn-primary btn-sm">
              <Calendar size={15} />
              {t('appointments.book')}
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>
        ) : appointments.length === 0 ? (
          <div className="glass">
            <EmptyState
              icon={Calendar}
              title={t('appointments.noAppointments')}
              description={t('appointments.noAppointmentsDesc')}
              action={isFarmer && (
                <button onClick={() => setShowBook(true)} className="btn-primary">
                  <Calendar size={16} />
                  {t('appointments.book')}
                </button>
              )}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map(appt => (
              <div key={appt.id} className="glass p-5 space-y-3 animate-fade-in">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Calendar size={15} className="text-brand-400" />
                      <span className="font-medium text-surface-100">
                        {new Date(appt.slot_time).toLocaleString()}
                      </span>
                    </div>
                    {appt.animal_id && (
                      <div className="text-sm text-surface-400 mt-1">
                        Animal: <span className="font-mono text-brand-400">{appt.animal_id}</span>
                      </div>
                    )}
                    {appt.notes && <p className="text-xs text-surface-500 mt-1 italic">"{appt.notes}"</p>}
                    <div className="text-xs text-surface-600 mt-1 font-mono">Room: {appt.room_id}</div>
                  </div>
                  <span className={`badge ${STATUS_BADGE[appt.status] || 'badge-gray'}`}>
                    {t(`appointments.status_${appt.status}`)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {appt.status === 'confirmed' && (
                    <button onClick={() => navigate(`/session/${appt.id}`)} className="btn-primary btn-sm">
                      <Video size={14} />
                      {t('appointments.joinSession')}
                    </button>
                  )}
                  {isFarmer && appt.status === 'pending' && (
                    <button onClick={() => cancelAppointment(appt.id)} className="btn-secondary btn-sm text-red-400 hover:text-red-300">
                      <XCircle size={14} />
                      {t('appointments.cancel')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showBook && (
        <BookAppointmentModal
          animals={animals}
          onClose={() => setShowBook(false)}
          onSuccess={fetchAppointments}
        />
      )}
    </div>
  )
}
