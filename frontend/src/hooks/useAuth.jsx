import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import i18n from '../lib/i18n'

export const ROLE_PROFILES = {
  farmer: {
    id: '11111111-bbbb-cccc-dddd-eeeeeeeeeeee',
    name: 'Ramesh Kumar',
    email: 'farmer@smartpoultry.in',
    role: 'farmer',
    farm_id: 'e0fbcc28-6e39-472c-8b42-c96f70c386d3',   // real farm ID from Supabase
    farm_name: 'Sundarapandian Poultry Farm',
    farm_region: 'Coimbatore',
    region: 'Coimbatore',
    farm_lat: 11.0168,
    farm_lng: 76.9558,
    preferred_language: 'en',
  },
  doctor: {
    id: '22222222-bbbb-cccc-dddd-eeeeeeeeeeee',
    name: 'Dr. Ananya Sharma, BVSc',
    email: 'doctor@smartpoultry.in',
    role: 'doctor',
    region: 'Coimbatore North',
    specialization: 'Avian Biosecurity & Poultry Pathology',
    preferred_language: 'en',
  },
  govt_official: {
    id: '33333333-bbbb-cccc-dddd-eeeeeeeeeeee',
    name: 'Rajesh Varma, IAS',
    email: 'govt@smartpoultry.in',
    role: 'govt_official',
    region: 'Tamil Nadu Central Zone',
    department: 'Animal Husbandry & Veterinary Services',
    preferred_language: 'en',
  },
}

const STORAGE_KEY = 'smart_biosecurity_profile'
// Bump this version whenever ROLE_PROFILES changes, to auto-clear stale sessions.
const PROFILE_VERSION = 'v3'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Check local storage for competition/demo role session
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Auto-invalidate stale sessions when ROLE_PROFILES changes
        const role = parsed?.role
        const activeProfile =
          parsed?._version !== PROFILE_VERSION && role && ROLE_PROFILES[role]
            ? { ...ROLE_PROFILES[role], _version: PROFILE_VERSION }
            : parsed

        if (activeProfile !== parsed) {
          // Refresh localStorage with updated profile
          localStorage.setItem(STORAGE_KEY, JSON.stringify(activeProfile))
        }

        setProfile(activeProfile)
        setSession({
          user: {
            id: activeProfile.id,
            email: activeProfile.email,
            user_metadata: { ...activeProfile },
          },
        })
        if (activeProfile.preferred_language) {
          i18n.changeLanguage(activeProfile.preferred_language)
        }
        setLoading(false)
        return
      } catch (err) {
        localStorage.removeItem(STORAGE_KEY)
      }
    }

    // 2. Fallback check for Supabase session if no local role session
    let isMounted = true
    try {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!isMounted) return
        setSession(session)
        if (session) fetchProfile(session.user.id, session)
        else setLoading(false)
      }).catch(() => {
        if (isMounted) setLoading(false)
      })

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!isMounted) return
        setSession(session)
        if (session) fetchProfile(session.user.id, session)
        else {
          const currentSaved = localStorage.getItem(STORAGE_KEY)
          if (!currentSaved) {
            setProfile(null)
            setLoading(false)
          }
        }
      })

      return () => {
        isMounted = false
        subscription?.unsubscribe?.()
      }
    } catch {
      setLoading(false)
    }
  }, [])

  async function fetchProfile(userId, currentSession) {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (!error && data) {
        setProfile(data)
        if (data.preferred_language) {
          i18n.changeLanguage(data.preferred_language)
        }
      } else {
        const s = currentSession || session
        const user = s?.user
        if (user) {
          const meta = user.user_metadata || {}
          const fallback = {
            id: user.id,
            name: meta.name || user.email?.split('@')[0] || 'User',
            email: user.email,
            role: meta.role || 'farmer',
            farm_id: meta.farm_id || null,
            region: meta.region || meta.farm_region || null,
            preferred_language: meta.preferred_language || 'en',
          }
          setProfile(fallback)
          if (fallback.preferred_language) {
            i18n.changeLanguage(fallback.preferred_language)
          }
        }
      }
    } catch (err) {
      console.warn('Profile fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  function loginAsRole(roleKey) {
    const selectedProfile = { ...(ROLE_PROFILES[roleKey] || ROLE_PROFILES.farmer), _version: PROFILE_VERSION }
    const mockSession = {
      user: {
        id: selectedProfile.id,
        email: selectedProfile.email,
        user_metadata: { ...selectedProfile },
      },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedProfile))
    setProfile(selectedProfile)
    setSession(mockSession)
    setLoading(false)

    if (selectedProfile.preferred_language) {
      i18n.changeLanguage(selectedProfile.preferred_language)
    }
    return selectedProfile
  }

  async function signIn(roleOrEmail, password) {
    // If role key was passed (e.g. 'farmer', 'doctor', 'govt_official')
    if (typeof roleOrEmail === 'string' && ROLE_PROFILES[roleOrEmail]) {
      return loginAsRole(roleOrEmail)
    }
    if (typeof roleOrEmail === 'object' && roleOrEmail?.role && ROLE_PROFILES[roleOrEmail.role]) {
      return loginAsRole(roleOrEmail.role)
    }

    // Default credential attempt if credentials provided
    const { data, error } = await supabase.auth.signInWithPassword({ email: roleOrEmail, password })
    if (error) throw error
    return data
  }

  async function signUp({ email, password, name, role, farmName, farmRegion, farmLat, farmLng, region, preferredLanguage }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
          preferred_language: preferredLanguage || 'en',
          farm_name: role === 'farmer' ? farmName : undefined,
          farm_region: role === 'farmer' ? farmRegion : undefined,
          farm_lat: role === 'farmer' && farmLat ? parseFloat(farmLat) : undefined,
          farm_lng: role === 'farmer' && farmLng ? parseFloat(farmLng) : undefined,
          region: role === 'govt_official' ? region : undefined,
        },
      },
    })
    if (error) throw error
    return data
  }

  async function signOut() {
    localStorage.removeItem(STORAGE_KEY)
    try {
      await supabase.auth.signOut()
    } catch {
      // Ignore network errors
    }
    setProfile(null)
    setSession(null)
  }

  async function updateLanguage(lang) {
    i18n.changeLanguage(lang)
    if (profile) {
      const updated = { ...profile, preferred_language: lang }
      setProfile(updated)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      try {
        await supabase
          .from('profiles')
          .update({ preferred_language: lang })
          .eq('id', profile.id)
      } catch {
        // Ignore offline error
      }
    }
  }

  const value = {
    session,
    profile,
    loading,
    loginAsRole,
    signIn,
    signUp,
    signOut,
    updateLanguage,
    refetchProfile: () => session && fetchProfile(session.user.id),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    return {
      session: null, profile: null, loading: false,
      loginAsRole: (role) => ROLE_PROFILES[role] || ROLE_PROFILES.farmer,
      signIn: async () => {}, signUp: async () => {},
      signOut: async () => {},
      updateLanguage: async (lang) => { i18n.changeLanguage(lang) },
      refetchProfile: async () => {},
    }
  }
  return ctx
}
