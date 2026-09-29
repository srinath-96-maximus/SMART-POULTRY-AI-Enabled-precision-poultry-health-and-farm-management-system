import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { useNavigate, NavLink } from 'react-router-dom'
import LanguageSwitcher from './LanguageSwitcher'
import { Shield, LogOut, LayoutDashboard, Calendar, Leaf } from 'lucide-react'

export default function Navbar() {
  const { t } = useTranslation()
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  const navLinks = {
    farmer: [
      { to: '/farmer',       label: t('nav.dashboard'),    icon: LayoutDashboard },
      { to: '/appointments', label: t('nav.appointments'), icon: Calendar },
    ],
    doctor: [
      { to: '/doctor',       label: t('nav.dashboard'),    icon: LayoutDashboard },
      { to: '/appointments', label: t('nav.appointments'), icon: Calendar },
    ],
    govt_official: [
      { to: '/govt',         label: t('nav.dashboard'),    icon: LayoutDashboard },
    ],
  }

  const links = navLinks[profile?.role] || []

  const roleLabel = {
    farmer:       t('auth.roles.farmer'),
    doctor:       t('auth.roles.doctor'),
    govt_official: t('auth.roles.govt_official'),
  }[profile?.role] || ''

  const roleColor = {
    farmer:       'text-emerald-400',
    doctor:       'text-blue-400',
    govt_official: 'text-purple-400',
  }[profile?.role] || 'text-surface-400'

  return (
    <nav className="sticky top-0 z-40 border-b border-surface-700/60 bg-[#111827]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-emerald-600 flex items-center justify-center shadow-md shadow-brand-900/40">
              <Shield size={18} className="text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-surface-100 text-sm">{t('nav.portal')}</span>
            </div>
            <div className="sm:hidden">
              <Leaf size={20} className="text-brand-400" />
            </div>
          </div>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {links.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-brand-600/20 text-brand-400'
                      : 'text-surface-400 hover:text-surface-100 hover:bg-surface-700/50'
                  }`
                }
              >
                <link.icon size={15} />
                <span className="hidden md:inline">{link.label}</span>
              </NavLink>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <LanguageSwitcher />

            {/* Profile pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 glass-inset rounded-lg">
              <div className="w-6 h-6 rounded-full bg-surface-600 flex items-center justify-center text-xs font-bold text-surface-200">
                {profile?.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="text-xs">
                <div className="text-surface-200 font-medium truncate max-w-[100px]">{profile?.name}</div>
                <div className={`${roleColor} font-medium`}>{roleLabel}</div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="btn-ghost text-sm text-surface-400 hover:text-red-400"
              title={t('nav.logout')}
            >
              <LogOut size={16} />
              <span className="hidden md:inline">{t('nav.logout')}</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
