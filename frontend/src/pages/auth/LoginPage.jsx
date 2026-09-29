import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import LanguageSwitcher from '../../components/common/LanguageSwitcher'
import toast from 'react-hot-toast'
import {
  Shield, Bird, Stethoscope, Building2, Check, ArrowRight,
  Sparkles, Award, CheckCircle2, ChevronRight
} from 'lucide-react'

const ROLE_OPTIONS = [
  {
    key: 'farmer',
    labelKey: 'auth.roles.farmer',
    badge: 'IoT & Health Telemetry',
    identityName: 'Ramesh Kumar',
    identityDetail: 'Sundarapandian Poultry Farm · Coimbatore',
    icon: Bird,
    theme: {
      border: 'border-emerald-500/40 hover:border-emerald-500',
      activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/50',
      activeBg: 'bg-emerald-950/40',
      iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      tagBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
      button: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40',
      accentText: 'text-emerald-400',
    },
    features: [
      'Real-time IoT sensor telemetry (thermal, temp, humidity)',
      'Individual hen RFID tracking & fever anomaly detection',
      'One-tap tele-veterinary consultation booking',
    ],
  },
  {
    key: 'doctor',
    labelKey: 'auth.roles.doctor',
    badge: 'Tele-Veterinary Clinic',
    identityName: 'Dr. Ananya Sharma, BVSc',
    identityDetail: 'Avian Biosecurity & Pathology Specialist',
    icon: Stethoscope,
    theme: {
      border: 'border-blue-500/40 hover:border-blue-500',
      activeBorder: 'border-blue-500 ring-2 ring-blue-500/50',
      activeBg: 'bg-blue-950/40',
      iconBg: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      tagBg: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
      button: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40',
      accentText: 'text-blue-400',
    },
    features: [
      'Farmer consultation appointment queue & reviews',
      'Live Jitsi video call room with real-time patient vitals',
      'Clinical context & hen thermal anomaly diagnostics',
    ],
  },
  {
    key: 'govt_official',
    labelKey: 'auth.roles.govt_official',
    badge: 'Regional Biosecurity & Policy',
    identityName: 'Rajesh Varma, IAS',
    identityDetail: 'Animal Husbandry & Veterinary Services',
    icon: Building2,
    theme: {
      border: 'border-purple-500/40 hover:border-purple-500',
      activeBorder: 'border-purple-500 ring-2 ring-purple-500/50',
      activeBg: 'bg-purple-950/40',
      iconBg: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      tagBg: 'bg-purple-500/15 text-purple-300 border-purple-500/20',
      button: 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/40',
      accentText: 'text-purple-400',
    },
    features: [
      'Regional disease outbreak alert & quarantine surveillance',
      'Poultry farm biosecurity compliance audit directory',
      'Central Government poultry schemes & subsidy administration',
    ],
  },
]

function getRoleHome(role) {
  switch (role) {
    case 'farmer': return '/farmer'
    case 'doctor': return '/doctor'
    case 'govt_official': return '/govt'
    default: return '/farmer'
  }
}

export default function LoginPage() {
  const { t } = useTranslation()
  const { loginAsRole } = useAuth()
  const navigate = useNavigate()

  const [selectedRole, setSelectedRole] = useState('farmer')
  const [loading, setLoading] = useState(false)

  const activeOption = ROLE_OPTIONS.find(r => r.key === selectedRole) || ROLE_OPTIONS[0]

  function handleLogin(roleKey = selectedRole) {
    setLoading(true)
    try {
      const profile = loginAsRole(roleKey)
      toast.success(`${t(activeOption.labelKey)}: ${profile.name}`, {
        icon: '👋',
      })
      navigate(getRoleHome(roleKey))
    } catch {
      toast.error('Could not log in')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between px-4 py-8 bg-hero-pattern">
      {/* Top Header bar */}
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-brand-900/50">
            <Shield size={22} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-surface-100 text-base tracking-wide flex items-center gap-2">
              Smart Biosecurity Portal
            </span>
            <span className="text-xs text-brand-400 flex items-center gap-1 font-medium">
              <Award size={12} /> SIH26210 · Poultry Health Monitoring
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">

          <LanguageSwitcher />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto w-full my-auto py-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles size={12} />
            Quick Role Selection
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-surface-50 tracking-tight">
            Choose Your Role to Enter
          </h1>
          <p className="text-surface-400 text-sm sm:text-base mt-2">

          </p>
        </div>

        {/* 3 Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ROLE_OPTIONS.map((opt) => {
            const isSelected = selectedRole === opt.key
            const Icon = opt.icon
            return (
              <div
                key={opt.key}
                onClick={() => setSelectedRole(opt.key)}
                onDoubleClick={() => handleLogin(opt.key)}
                className={`relative rounded-2xl p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between glass ${isSelected
                  ? `${opt.theme.activeBorder} ${opt.theme.activeBg} shadow-xl shadow-brand-950/50 scale-[1.02]`
                  : `${opt.theme.border} hover:bg-surface-800/40 hover:scale-[1.01]`
                  }`}
              >
                {/* Active check pill */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-sm ${opt.theme.iconBg}`}>
                    <Icon size={24} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${opt.theme.tagBg}`}>
                      {opt.badge}
                    </span>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${isSelected
                        ? 'bg-brand-500 border-brand-400 text-white'
                        : 'border-surface-600 bg-surface-800'
                        }`}
                    >
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </div>
                  </div>
                </div>

                {/* Role Titles */}
                <div>
                  <h3 className="text-xl font-bold text-surface-50 flex items-center gap-2">
                    {t(opt.labelKey)}
                  </h3>
                  <div className="mt-1 text-xs text-surface-300">
                    <span className={`font-semibold ${opt.theme.accentText}`}>{opt.identityName}</span>
                    <p className="text-surface-400 truncate">{opt.identityDetail}</p>
                  </div>

                  {/* Highlights list */}
                  <ul className="mt-4 space-y-2 text-xs text-surface-300 border-t border-surface-700/60 pt-3">
                    {opt.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 size={13} className={`${opt.theme.accentText} flex-shrink-0 mt-0.5`} />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Card footer CTA */}
                <div className="mt-6 pt-4 border-t border-surface-700/40">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleLogin(opt.key)
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md ${isSelected
                      ? `${opt.theme.button}`
                      : 'bg-surface-700/70 hover:bg-surface-700 text-surface-200'
                      }`}
                  >
                    <span>Login as {t(opt.labelKey)}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Primary Bottom Action Button */}
        <div className="mt-8 flex flex-col items-center justify-center gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleLogin(selectedRole)}
            className="btn-primary px-8 py-3.5 text-base font-bold rounded-xl shadow-xl shadow-brand-900/50 flex items-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <span>Enter Portal as {t(activeOption.labelKey)}</span>
            <ChevronRight size={18} />
          </button>
          <p className="text-xs text-surface-400">
            Double-click any card or click &quot;Login as {t(activeOption.labelKey)}&quot; for instant entry
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full pt-4 border-t border-surface-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-surface-400 gap-2">
        <p>Smart Biosecurity Portal · SIH26210 · Smart Poultry Health Monitoring &amp; Optimisation</p>

      </footer>
    </div>
  )
}
