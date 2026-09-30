-- ============================================================
-- Smart Biosecurity Portal — RPC Helper Functions
-- Migration: 002_rpc_helpers.sql
--
-- SECURITY DEFINER functions run as the function owner (postgres),
-- bypassing the caller's RLS context. This allows the frontend to
-- perform necessary writes without exposing the service-role key.
--
-- Run this in Supabase Dashboard → SQL Editor after 001_initial_schema.sql
-- ============================================================


-- ── register_animal ─────────────────────────────────────────────
-- Inserts a new animal. Validates that the farm actually exists.
CREATE OR REPLACE FUNCTION register_animal(
  p_id       TEXT,
  p_farm_id  UUID,
  p_species  TEXT    DEFAULT 'hen',
  p_name     TEXT    DEFAULT NULL,
  p_colour   TEXT    DEFAULT NULL
)
RETURNS animals
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_animal animals;
BEGIN
  -- Validate farm exists
  IF NOT EXISTS (SELECT 1 FROM public.farms WHERE id = p_farm_id) THEN
    RAISE EXCEPTION 'Farm % does not exist', p_farm_id;
  END IF;

  INSERT INTO public.animals (id, farm_id, species, name, colour)
  VALUES (
    UPPER(TRIM(p_id)),
    p_farm_id,
    p_species,
    NULLIF(TRIM(COALESCE(p_name, '')), ''),
    NULLIF(TRIM(COALESCE(p_colour, '')), '')
  )
  RETURNING * INTO v_animal;

  RETURN v_animal;
END;
$$;

GRANT EXECUTE ON FUNCTION register_animal(TEXT, UUID, TEXT, TEXT, TEXT) TO anon, authenticated;


-- ── create_farm_for_user ─────────────────────────────────────────
-- Creates a farm and links it to the user's profile.
CREATE OR REPLACE FUNCTION create_farm_for_user(
  p_user_id   UUID,
  p_name      TEXT,
  p_region    TEXT    DEFAULT NULL,
  p_latitude  NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL
)
RETURNS farms
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_farm farms;
BEGIN
  INSERT INTO public.farms (name, owner_id, region, latitude, longitude)
  VALUES (
    TRIM(p_name),
    p_user_id,
    NULLIF(TRIM(COALESCE(p_region, '')), ''),
    p_latitude,
    p_longitude
  )
  RETURNING * INTO v_farm;

  UPDATE public.profiles
  SET farm_id = v_farm.id
  WHERE id = p_user_id;

  RETURN v_farm;
END;
$$;

GRANT EXECUTE ON FUNCTION create_farm_for_user(UUID, TEXT, TEXT, NUMERIC, NUMERIC) TO anon, authenticated;


-- ── resolve_alert ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION resolve_alert(
  p_alert_id  UUID,
  p_farm_id   UUID
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.alerts
  SET resolved = TRUE
  WHERE id = p_alert_id AND farm_id = p_farm_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Alert % not found for farm %', p_alert_id, p_farm_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION resolve_alert(UUID, UUID) TO anon, authenticated;


-- ── upsert_sensor_reading ────────────────────────────────────────
CREATE OR REPLACE FUNCTION upsert_sensor_reading(
  p_farm_id     UUID,
  p_animal_id   TEXT    DEFAULT NULL,
  p_type        TEXT    DEFAULT 'temp',
  p_value       NUMERIC DEFAULT 0,
  p_recorded_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS sensor_readings
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row sensor_readings;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.farms WHERE id = p_farm_id) THEN
    RAISE EXCEPTION 'Farm % does not exist', p_farm_id;
  END IF;

  INSERT INTO public.sensor_readings (farm_id, animal_id, type, value, recorded_at)
  VALUES (p_farm_id, p_animal_id, p_type, p_value, p_recorded_at)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_sensor_reading(UUID, TEXT, TEXT, NUMERIC, TIMESTAMPTZ) TO anon, authenticated;


-- ============================================================
-- DONE -- Migration 002
-- ============================================================
