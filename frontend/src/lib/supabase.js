import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key'

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('⚠️  Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env – running in demo mode.')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

/**
 * Returns adminClient if VITE_SUPABASE_SERVICE_KEY is configured;
 * otherwise gracefully falls back to the standard supabase client.
 * This prevents the "supabaseKey is required" crash.
 */
export function getAdminClient() {
  const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY
  if (serviceKey && typeof serviceKey === 'string' && serviceKey.trim().length > 0) {
    try {
      return createClient(SUPABASE_URL, serviceKey.trim(), {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    } catch (e) {
      console.warn('Failed to initialize elevated client, falling back to standard client:', e)
      return supabase
    }
  }
  return supabase
}
