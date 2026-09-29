/**
 * sensorService.js — All Supabase queries for sensor_readings and behavior_events.
 * Import with: import { getLatestReadings, getBehaviorEvents } from '@services/sensorService'
 */

import { supabase } from '../lib/supabase'

/**
 * Fetch the latest sensor readings per animal per type, within the last 24 hours.
 * Returns a map: { animalId -> { type -> value } }
 */
export async function getLatestReadingsByFarm(animalIds) {
  if (!animalIds?.length) return {}

  const since = new Date()
  since.setHours(since.getHours() - 24)

  const { data, error } = await supabase
    .from('sensor_readings')
    .select('animal_id, type, value, recorded_at')
    .in('animal_id', animalIds)
    .gte('recorded_at', since.toISOString())
    .order('recorded_at', { ascending: false })

  if (error) throw error

  // Deduplicate: first-seen = latest per animal+type
  const map = {}
  data?.forEach(r => {
    if (!map[r.animal_id]) map[r.animal_id] = {}
    if (!map[r.animal_id][r.type]) {
      map[r.animal_id][r.type] = parseFloat(r.value)
    }
  })
  return map
}

/**
 * Fetch historical sensor readings for a single animal (for chart display).
 * @param {string} animalId
 * @param {number} hoursBack - how many hours of history to fetch
 */
export async function getReadingHistory(animalId, hoursBack = 24) {
  const since = new Date()
  since.setHours(since.getHours() - hoursBack)

  const { data, error } = await supabase
    .from('sensor_readings')
    .select('type, value, recorded_at')
    .eq('animal_id', animalId)
    .gte('recorded_at', since.toISOString())
    .order('recorded_at', { ascending: true })

  if (error) throw error
  return data
}

/**
 * Fetch the latest behavior event per animal.
 * Returns a map: { animalId -> behaviorEvent }
 */
export async function getLatestBehaviorsByFarm(animalIds) {
  if (!animalIds?.length) return {}

  const { data, error } = await supabase
    .from('behavior_events')
    .select('animal_id, behavior_type, confidence, detected_at')
    .in('animal_id', animalIds)
    .order('detected_at', { ascending: false })

  if (error) throw error

  const map = {}
  data?.forEach(b => {
    if (!map[b.animal_id]) map[b.animal_id] = b
  })
  return map
}

/**
 * Fetch full behavior history for a single animal (for chart display).
 */
export async function getBehaviorHistory(animalId, hoursBack = 24) {
  const since = new Date()
  since.setHours(since.getHours() - hoursBack)

  const { data, error } = await supabase
    .from('behavior_events')
    .select('*')
    .eq('animal_id', animalId)
    .gte('detected_at', since.toISOString())
    .order('detected_at', { ascending: true })

  if (error) throw error
  return data
}
