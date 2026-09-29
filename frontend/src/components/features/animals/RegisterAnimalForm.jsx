import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import toast from 'react-hot-toast'
import { X, Tag, Bird, ChevronDown, Palette } from 'lucide-react'

export default function RegisterAnimalForm({ onClose, onSuccess }) {
  const { t } = useTranslation()
  const { profile } = useAuth()

  const [rfid, setRfid]       = useState('')
  const [name, setName]       = useState('')
  const [colour, setColour]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!profile?.farm_id) {
      toast.error('No farm associated with your account.')
      return
    }
    setLoading(true)
    try {
      // Use admin client to bypass RLS for animal insert
      const { createClient } = await import('@supabase/supabase-js')
      const adminClient = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_SERVICE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )
      const { error } = await adminClient.from('animals').insert({
        id:      rfid.trim().toUpperCase(),
        farm_id: profile.farm_id,
        species: 'hen',
        name:    name.trim() || null,
        colour:  colour.trim() || null,
      })
      if (error) {
        if (error.code === '23505') toast.error(t('hens.rfidExists'))
        else throw error
      } else {
        toast.success(t('hens.registerSuccess'))
        onSuccess?.()
        onClose?.()
      }
    } catch (err) {
      toast.error(t('hens.registerError') + ': ' + (err.message || ''))
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass w-full max-w-md p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-surface-100">{t('hens.registerTitle')}</h2>
          <button onClick={onClose} className="btn-ghost p-1"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Hen ID (RFID) */}
          <div>
            <label className="input-label">
              <Tag size={14} className="inline mr-1" />{t('hens.henId')} *
            </label>
            <input
              type="text"
              className="input font-mono"
              value={rfid}
              onChange={e => setRfid(e.target.value)}
              required
              placeholder={t('hens.rfidPlaceholder')}
            />
            <p className="text-xs text-surface-500 mt-1">{t('hens.rfidHint')}</p>
          </div>

          {/* Colour / Breed Marking */}
          <div>
            <label className="input-label">
              <Palette size={14} className="inline mr-1" />{t('hens.colour')}
            </label>
            <input
              type="text"
              className="input"
              value={colour}
              onChange={e => setColour(e.target.value)}
              placeholder={t('hens.colourPlaceholder')}
            />
          </div>

          {/* Optional name */}
          <div>
            <label className="input-label">{t('hens.optionalName')}</label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('hens.namePlaceholder')}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
