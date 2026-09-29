/**
 * authService.js — All Supabase Auth operations in one place.
 * Import with: import { signIn, signUp, signOut } from '@services/authService'
 */

import { supabase } from '../lib/supabase'

/** Sign in an existing user with email + password. Throws on error. */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

/**
 * Register a new user with extended metadata.
 * The DB trigger handle_new_user() will auto-create their profile row.
 */
export async function signUp({ email, password, name, role, farmName, farmRegion, farmLat, farmLng, region, preferredLanguage }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role,
        preferred_language: preferredLanguage || 'en',
        farm_name:   role === 'farmer' ? farmName   : undefined,
        farm_region: role === 'farmer' ? farmRegion : undefined,
        farm_lat:    role === 'farmer' && farmLat ? parseFloat(farmLat) : undefined,
        farm_lng:    role === 'farmer' && farmLng ? parseFloat(farmLng) : undefined,
        region:      role === 'govt_official' ? region : undefined,
      },
    },
  })
  if (error) throw error
  return data
}

/** Sign out the current session. */
export async function signOut() {
  return supabase.auth.signOut()
}

/** Get the currently active session (null if not logged in). */
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

/** Subscribe to auth state changes. Returns the unsubscribe function. */
export function onAuthStateChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback)
  return () => subscription.unsubscribe()
}

/** Fetch the profile row for a given user ID. */
export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

/** Update the preferred_language field on a profile. */
export async function updateProfileLanguage(userId, lang) {
  const { error } = await supabase
    .from('profiles')
    .update({ preferred_language: lang })
    .eq('id', userId)
  if (error) throw error
}
