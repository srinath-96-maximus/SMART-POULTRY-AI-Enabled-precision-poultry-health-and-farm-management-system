import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import LanguageSwitcher from '../../components/common/LanguageSwitcher'
import toast from 'react-hot-toast'
import { Shield, ChevronDown } from 'lucide-react'

const ROLES = ['farmer', 'doctor', 'govt_official']
const REGIONS = [
  'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem',
  'Tirunelveli', 'Vellore', 'Erode', 'Thanjavur', 'Dindigul',
  'Kanchipuram', 'Nagapattinam', 'Other'
]

export default function SignupPage() {
  const { t } = useTranslation()
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '', email: '', password: '',
    role: 'farmer',
    farmName: '', farmRegion: '', farmLat: '', farmLng: '',
    region: '',
    preferredLanguage: 'en',
  })
  const [loading, setLoading] = useState(false)

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      await signUp(form)
      toast.success('Account created! Please check your email to confirm.')
      navigate('/login')
    } catch (err) {
      toast.error(t('auth.signupError'))
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-hero-pattern">
      <div className="fixed top-4 right-4">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-lg animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-brand-900/50 mb-4">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-surface-50">{t('auth.createAccount')}</h1>
          <p className="text-sm text-surface-400 mt-1">{t('auth.signupSubtitle')}</p>
        </div>

        <div className="glass p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="input-label">{t('auth.name')}</label>
                <input type="text" className="input" value={form.name} onChange={set('name')} required placeholder="John Doe" />
              </div>
              <div className="sm:col-span-2">
                <label className="input-label">{t('auth.email')}</label>
                <input type="email" className="input" value={form.email} onChange={set('email')} required placeholder="you@example.com" />
              </div>
              <div className="sm:col-span-2">
                <label className="input-label">{t('auth.password')}</label>
                <input type="password" className="input" value={form.password} onChange={set('password')} required placeholder="Min. 6 characters" />
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="input-label">{t('auth.role')}</label>
              <div className="relative">
                <select className="select appearance-none pr-8" value={form.role} onChange={set('role')}>
                  {ROLES.map(r => (
                    <option key={r} value={r}>{t(`auth.roles.${r}`)}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
              </div>
            </div>

            {/* Farmer-specific */}
            {form.role === 'farmer' && (
              <div className="glass-inset p-4 space-y-3 animate-fade-in">
                <p className="text-xs font-medium text-brand-400 uppercase tracking-wide">Farm Details</p>
                <div>
                  <label className="input-label">{t('auth.farmName')}</label>
                  <input type="text" className="input" value={form.farmName} onChange={set('farmName')} required placeholder="Sundarapandian Poultry Farm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="input-label">{t('auth.farmRegion')}</label>
                    <div className="relative">
                      <select className="select appearance-none pr-6 text-sm" value={form.farmRegion} onChange={set('farmRegion')}>
                        <option value="">Select region</option>
                        {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="input-label text-xs">{t('auth.farmCoords')}</label>
                    <p className="text-xs text-surface-500 mb-1.5">(optional — enables nearby farm alerts)</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="input-label">{t('auth.farmLatitude')}</label>
                    <input type="number" step="any" className="input text-sm" value={form.farmLat} onChange={set('farmLat')} placeholder="11.0168" />
                  </div>
                  <div>
                    <label className="input-label">{t('auth.farmLongitude')}</label>
                    <input type="number" step="any" className="input text-sm" value={form.farmLng} onChange={set('farmLng')} placeholder="76.9558" />
                  </div>
                </div>
              </div>
            )}

            {/* Govt-specific */}
            {form.role === 'govt_official' && (
              <div className="glass-inset p-4 space-y-3 animate-fade-in">
                <p className="text-xs font-medium text-purple-400 uppercase tracking-wide">Region Assignment</p>
                <div>
                  <label className="input-label">{t('auth.yourRegion')}</label>
                  <div className="relative">
                    <select className="select appearance-none pr-8" value={form.region} onChange={set('region')} required={form.role === 'govt_official'}>
                      <option value="">Select your region</option>
                      {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full btn-lg justify-center mt-2">
              {loading ? t('auth.creatingAccount') : t('auth.signup')}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-surface-400">
            {t('auth.signupPrompt')}{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">{t('auth.login')}</Link>
          </div>
        </div>

        <p className="text-center text-xs text-surface-600 mt-6">Smart Biosecurity Portal · SIH25006</p>
      </div>
    </div>
  )
}
