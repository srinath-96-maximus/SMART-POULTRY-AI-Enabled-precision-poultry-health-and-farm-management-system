/**
 * formatters.js — Pure utility functions for formatting display values.
 * Import with: import { formatDateTime, formatSensorValue } from '@utils/formatters'
 */

/**
 * Format a UTC timestamp to a locale-friendly date+time string.
 * @param {string|Date} ts - ISO timestamp or Date object
 * @param {string} locale  - BCP 47 locale tag (default: 'en-IN')
 */
export function formatDateTime(ts, locale = 'en-IN') {
  if (!ts) return '—'
  return new Date(ts).toLocaleString(locale, {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/**
 * Format a date only (no time).
 */
export function formatDate(ts, locale = 'en-IN') {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString(locale, {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

/**
 * Format a numeric sensor reading.
 * @param {number|null|undefined} value
 * @param {string} unit  - e.g. '°C', '%', 'kg'
 * @param {number} decimals
 */
export function formatSensorValue(value, unit = '', decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) return '—'
  return `${Number(value).toFixed(decimals)}${unit}`
}

/**
 * Capitalise first letter and replace underscores.
 * e.g. 'reduced_activity' → 'Reduced activity'
 */
export function humanise(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ')
}

/**
 * Calculate average of a numeric array. Returns null for empty arrays.
 */
export function average(values) {
  const nums = values.filter(v => typeof v === 'number' && !isNaN(v))
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}
