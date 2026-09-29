import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import toast from 'react-hot-toast'
import { X, Calendar, User, ChevronDown } from 'lucide-react'

export default function BookAppointmentModal({ animals = [], onClose, onSuccess }) {
  const { t } = useTranslation()
  const { profile } = useAuth()

  const [doctors, setDoctors]     = useState(null)
  const [doctorId, setDoctorId]   = useState('')
  const [slotTime, setSlotTime]   = useState('')
  const [notes, setNotes]         = useState('')
  const [animalId, setAnimalId]   = useState('')
  const [loading, setLoading]     = useState(false)

  // Load doctors on mount
  useEffect(() => {
    supabase.rpc('get_doctors').then(({ data }) => setDoctors(data || []))
  }, [])


  async function handleSubmit(e) {
    e.preventDefault()
    if (!doctorId || !slotTime) return
    setLoading(true)
    try {
      const { error } = await supabase.from('appointments').insert({
        farmer_id: profile.id,
        doctor_id: doctorId,
        slot_time: slotTime,
        notes: notes.trim() || null,
        animal_id: animalId || null,
      })
      if (error) throw error
      toast.success(t('appointments.bookSuccess'))
      onSuccess?.()
      onClose?.()
    } catch (err) {
      toast.error(t('appointments.bookError'))
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass w-full max-w-md p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-surface-100">{t('appointments.book')}</h2>
          <button onClick={onClose} className="btn-ghost p-1"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="input-label">
              <User size={14} className="inline mr-1" />{t('appointments.selectDoctor')} *
            </label>
            <div className="relative">
              <select
                className="select appearance-none pr-8"
                value={doctorId}
                onChange={e => setDoctorId(e.target.value)}
                required
              >
                <option value="">-- {t('appointments.selectDoctor')} --</option>
                {(doctors || []).map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.email})</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
            </div>
            {doctors === null && <p className="text-xs text-surface-500 mt-1">{t('common.loading')}</p>}
          </div>

          <div>
            <label className="input-label">
              <Calendar size={14} className="inline mr-1" />{t('appointments.selectSlot')} *
            </label>
            <input
              type="datetime-local"
              className="input"
              value={slotTime}
              onChange={e => setSlotTime(e.target.value)}
              required
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          {animals.length > 0 && (
            <div>
              <label className="input-label">{t('appointments.relatedAnimal')}</label>
              <div className="relative">
                <select
                  className="select appearance-none pr-8"
                  value={animalId}
                  onChange={e => setAnimalId(e.target.value)}
                >
                  <option value="">-- No specific animal --</option>
                  {animals.map(a => (
                    <option key={a.id} value={a.id}>{a.id} ({t(`animals.species_${a.species}`)})</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
              </div>
            </div>
          )}

          <div>
            <label className="input-label">{t('appointments.notes')}</label>
            <textarea
              className="input resize-none"
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Describe the concern..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? t('common.loading') : t('appointments.book')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
