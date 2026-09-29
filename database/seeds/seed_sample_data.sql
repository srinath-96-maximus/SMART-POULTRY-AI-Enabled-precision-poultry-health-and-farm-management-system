-- ============================================================
-- Smart Biosecurity Portal — Sample Seed Data
-- Run AFTER applying 001_initial_schema.sql
-- WARNING: For development/demo only. Do NOT run in production.
-- ============================================================

-- NOTE: This seed script creates farms and animals directly.
-- User accounts must be created separately via the Signup page
-- or Supabase Dashboard (Authentication → Users).
-- After creating accounts, update the owner_id / farm_id values
-- below to match your actual user UUIDs.

-- ============================================================
-- Example: Insert a sample farm (replace owner_id with real UUID)
-- ============================================================
/*
INSERT INTO farms (id, name, owner_id, region, latitude, longitude)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'Sundarapandian Poultry Farm',
  'YOUR-USER-UUID-HERE',
  'Coimbatore',
  11.0168,
  76.9558
) ON CONFLICT (id) DO NOTHING;

-- Link farm to the farmer profile
UPDATE profiles
SET farm_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
WHERE id = 'YOUR-USER-UUID-HERE';

-- ============================================================
-- Example: Register animals
-- ============================================================
INSERT INTO animals (id, farm_id, species, name, colour)
VALUES
  ('RFID-001', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'hen', 'Clucky',  'White'),
  ('RFID-002', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'hen', 'Brownie', 'Brown'),
  ('RFID-003', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'hen', NULL,      'Black')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Example: Insert sample sensor readings (last 2 hours)
-- ============================================================
INSERT INTO sensor_readings (farm_id, animal_id, type, value, recorded_at)
VALUES
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'RFID-001', 'thermal',  40.2, NOW() - INTERVAL '30 minutes'),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'RFID-001', 'humidity', 65.1, NOW() - INTERVAL '30 minutes'),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'RFID-001', 'weight',    1.8, NOW() - INTERVAL '30 minutes'),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'RFID-002', 'thermal',  41.5, NOW() - INTERVAL '1 hour'),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'RFID-002', 'temp',     38.9, NOW() - INTERVAL '1 hour'),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'RFID-003', 'thermal',  39.8, NOW() - INTERVAL '2 hours');

-- ============================================================
-- Example: Insert a sample alert
-- ============================================================
INSERT INTO alerts (farm_id, animal_id, risk_type, severity, resolved)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'RFID-002',
  'Avian Influenza risk — elevated temperature detected',
  'high',
  false
);
*/
