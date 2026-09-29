/**
 * alertService.js — All Supabase queries for the alerts table.
 * Import with: import { getActiveAlertsByFarm, getNearbyAlerts } from '@services/alertService'
 */

import { supabase } from '../lib/supabase'

/** Fetch all unresolved alerts for a farm, newest first. */
export async function getActiveAlertsByFarm(farmId) {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('farm_id', farmId)
    .eq('resolved', false)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

/** Fetch nearby high-severity alerts using the Postgres RPC function. */
export async function getNearbyHighSeverityAlerts(farmId, radiusKm = 10) {
  const { data, error } = await supabase
    .rpc('get_nearby_high_severity_alerts', {
      requesting_farm_id: farmId,
      radius_km: radiusKm,
    })
  if (error) throw error
  return data
}

/** Insert a new alert row (for Pi agent or admin use). */
export async function createAlert({ farmId, animalId, riskType, severity }) {
  const { error } = await supabase.from('alerts').insert({
    farm_id:   farmId,
    animal_id: animalId || null,
    risk_type: riskType,
    severity,
    resolved:  false,
  })
  if (error) throw error
}

/** Resolve (close) an alert by ID. */
export async function resolveAlert(alertId) {
  const { error } = await supabase
    .from('alerts')
    .update({ resolved: true })
    .eq('id', alertId)
  if (error) throw error
}
