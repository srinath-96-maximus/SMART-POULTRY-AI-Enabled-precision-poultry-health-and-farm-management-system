/**
 * animalService.js — All Supabase queries for the animals table.
 * Import with: import { getAnimalsByFarm, registerAnimal } from '@services/animalService'
 */

import { supabase } from '../lib/supabase'

/** Fetch all animals belonging to a farm, ordered by creation time. */
export async function getAnimalsByFarm(farmId) {
  const { data, error } = await supabase
    .from('animals')
    .select('*')
    .eq('farm_id', farmId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

/** Fetch a single animal by its RFID id. */
export async function getAnimalById(animalId) {
  const { data, error } = await supabase
    .from('animals')
    .select('*')
    .eq('id', animalId)
    .single()
  if (error) throw error
  return data
}

/**
 * Register a new animal. Requires a service-role client to bypass RLS
 * when the farmer's RLS policy hasn't propagated yet.
 */
export async function registerAnimal({ rfid, farmId, name, colour, species = 'hen' }, adminClient = supabase) {
  const { error } = await adminClient.from('animals').insert({
    id:      rfid.trim().toUpperCase(),
    farm_id: farmId,
    species,
    name:    name?.trim() || null,
    colour:  colour?.trim() || null,
  })
  if (error) throw error
}

/** Fetch animals as a lightweight list for dropdowns (id + species only). */
export async function getAnimalOptions(farmId) {
  const { data, error } = await supabase
    .from('animals')
    .select('id, species')
    .eq('farm_id', farmId)
  if (error) throw error
  return data
}
