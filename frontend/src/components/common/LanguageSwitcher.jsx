import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { Globe } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

const LANGS = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'ta', label: 'Tamil',   native: 'தமிழ்' },
  { code: 'hi', label: 'Hindi',   native: 'हिंदी' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
]

export default function LanguageSwitcher({ className = '' }) {
  const { i18n } = useTranslation()
  const { updateLanguage } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const current = LANGS.find(l => l.code === i18n.language) || LANGS[0]

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleChange(code) {
    setOpen(false)
    try {
      await updateLanguage(code)
    } catch {
      i18n.changeLanguage(code)
    }
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="btn-ghost text-sm flex items-center gap-1.5"
        aria-label="Switch language"
      >
        <Globe size={16} className="text-brand-400" />
        <span>{current.native}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-44 glass border border-surface-600 rounded-lg shadow-xl z-50 animate-fade-in">
          {LANGS.map(lang => (
            <button
              key={lang.code}
              onClick={() => handleChange(lang.code)}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors first:rounded-t-lg last:rounded-b-lg flex justify-between items-center
                ${lang.code === i18n.language
                  ? 'bg-brand-600/20 text-brand-400'
                  : 'text-surface-300 hover:bg-surface-700/60'
                }`}
            >
              <span>{lang.native}</span>
              <span className="text-xs text-surface-500">{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
