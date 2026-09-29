/**
 * validators.js — Pure validation helpers for form inputs.
 * Import with: import { isValidEmail, isValidRFID } from '@utils/validators'
 */

/** Validate email format */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/** Password must be ≥ 6 characters */
export function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 6
}

/**
 * RFID tag must be non-empty and alphanumeric (dashes allowed).
 * Example valid values: "RFID-001", "A1B2C3"
 */
export function isValidRFID(rfid) {
  return typeof rfid === 'string' && /^[A-Za-z0-9-]{3,30}$/.test(rfid.trim())
}

/** Latitude: -90 to 90 */
export function isValidLatitude(lat) {
  const n = parseFloat(lat)
  return !isNaN(n) && n >= -90 && n <= 90
}

/** Longitude: -180 to 180 */
export function isValidLongitude(lng) {
  const n = parseFloat(lng)
  return !isNaN(n) && n >= -180 && n <= 180
}

/** Confidence score: 0.0 to 1.0 */
export function isValidConfidence(c) {
  const n = parseFloat(c)
  return !isNaN(n) && n >= 0 && n <= 1
}

/** Returns an array of error messages or empty array if valid */
export function validateFarmForm({ name, region }) {
  const errors = []
  if (!name?.trim()) errors.push('Farm name is required.')
  if (!region) errors.push('Farm region is required.')
  return errors
}

export function validateSignupForm({ email, password, name, role }) {
  const errors = []
  if (!name?.trim()) errors.push('Name is required.')
  if (!isValidEmail(email)) errors.push('A valid email is required.')
  if (!isValidPassword(password)) errors.push('Password must be at least 6 characters.')
  if (!['farmer', 'doctor', 'govt_official'].includes(role)) errors.push('A valid role is required.')
  return errors
}
