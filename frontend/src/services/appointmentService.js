/**
 * appointmentService.js — All Supabase queries for the appointments table.
 * Import with: import { getAppointmentsByUser, bookAppointment } from '@services/appointmentService'
 */

import { supabase } from '../lib/supabase'

/**
 * Fetch appointments for the current user (farmer or doctor).
 * @param {'farmer_id'|'doctor_id'} column - which column to filter on
 * @param {string} userId
 */
export async function getAppointmentsByUser(column, userId, includeProfile = false) {
  let query = supabase
    .from('appointments')
    .select(includeProfile ? '*, profiles!appointments_farmer_id_fkey (name, email)' : '*')
    .eq(column, userId)
    .order('slot_time', { ascending: false })

  const { data, error } = await query
  if (error) throw error
  return data
}

/** Fetch a single appointment with farmer profile (for LiveSessionPage). */
export async function getAppointmentById(appointmentId) {
  const { data, error } = await supabase
    .from('appointments')
    .select('*, profiles!appointments_farmer_id_fkey(name)')
    .eq('id', appointmentId)
    .single()
  if (error) throw error
  return data
}

/** Book a new appointment. */
export async function bookAppointment({ farmerId, doctorId, slotTime, notes, animalId }) {
  const { error } = await supabase.from('appointments').insert({
    farmer_id: farmerId,
    doctor_id: doctorId,
    slot_time: slotTime,
    notes:     notes?.trim() || null,
    animal_id: animalId || null,
  })
  if (error) throw error
}

/** Update appointment status (e.g. confirmed, completed, cancelled). */
export async function updateAppointmentStatus(appointmentId, status) {
  const { error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', appointmentId)
  if (error) throw error
}

/** Fetch all doctors (name + email) via the get_doctors() RPC. */
export async function getDoctors() {
  const { data, error } = await supabase.rpc('get_doctors')
  if (error) throw error
  return data
}
