import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { ArrowLeft, Video } from 'lucide-react'

export default function LiveSessionPage() {
  const { t } = useTranslation()
  const { appointmentId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [appointment, setAppointment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('appointments')
        .select('*, profiles!appointments_farmer_id_fkey(name)')
        .eq('id', appointmentId)
        .single()

      if (error || !data) {
        setError('Appointment not found or access denied.')
      } else {
        setAppointment(data)
      }
      setLoading(false)
    }
    load()
  }, [appointmentId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner w-10 h-10" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-400">{error}</p>
        <button onClick={() => navigate(-1)} className="btn-secondary btn-sm">
          <ArrowLeft size={14} /> Back
        </button>
      </div>
    )
  }

  const roomId = appointment.room_id
  const jitsiUrl = `https://meet.jit.si/${roomId}`

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700/60 bg-surface-900/80 backdrop-blur-md">
        <button onClick={() => navigate(-1)} className="btn-ghost btn-sm">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-2">
          <Video size={18} className="text-brand-400" />
          <span className="font-medium text-surface-100">{t('nav.liveSession')}</span>
          <span className="badge badge-green animate-pulse">Live</span>
        </div>
        <div className="text-xs text-surface-500 font-mono">Room: {roomId}</div>
      </div>

      {/* Session info bar */}
      <div className="px-4 py-2 bg-surface-900/60 border-b border-surface-800 text-sm text-surface-400 flex items-center gap-4">
        <span>Farmer: <span className="text-surface-200">{appointment.profiles?.name || appointment.farmer_id}</span></span>
        <span>Time: <span className="text-surface-200">{new Date(appointment.slot_time).toLocaleString()}</span></span>
        {appointment.animal_id && (
          <span>Animal: <span className="font-mono text-brand-400">{appointment.animal_id}</span></span>
        )}
      </div>

      {/* Jitsi iframe */}
      <div className="flex-1">
        <iframe
          src={jitsiUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          style={{ width: '100%', height: '100%', border: 'none', minHeight: 'calc(100vh - 120px)' }}
          title="Live Video Session"
        />
      </div>
    </div>
  )
}
