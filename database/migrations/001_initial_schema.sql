-- ============================================================
-- Smart Biosecurity Portal — Complete Supabase Schema
-- SIH25006
--
-- Instructions:
--   1. In Supabase Dashboard → Database → Extensions, enable:
--        uuid-ossp  (usually on by default)
--        cube
--        earthdistance
--   2. Paste this ENTIRE file into the SQL Editor and click Run.
--   3. To fix the login bug (if already deployed), re-run just
--      the current_user_role() function block at the bottom.
-- ============================================================


-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "cube";
CREATE EXTENSION IF NOT EXISTS "earthdistance";


-- ============================================================
-- ENUMS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('farmer', 'doctor', 'govt_official');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE sensor_type AS ENUM ('thermal', 'weight', 'temp', 'humidity');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE alert_severity AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE language_code AS ENUM ('en', 'ta', 'hi', 'ml');
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- ============================================================
-- TABLES
-- ============================================================

-- ── farms ─────────────────────────────────────────────────────
-- Created before profiles because profiles.farm_id references it.
CREATE TABLE IF NOT EXISTS farms (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT        NOT NULL,
  owner_id     UUID,                    -- FK to profiles.id (added below)
  region       TEXT        NOT NULL,
  taluk        TEXT,
  latitude     NUMERIC(10, 7),
  longitude    NUMERIC(10, 7),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── profiles ──────────────────────────────────────────────────
-- Mirrors auth.users; auto-populated by the on_auth_user_created trigger.
CREATE TABLE IF NOT EXISTS profiles (
  id                  UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name                TEXT        NOT NULL,
  email               TEXT        NOT NULL,
  phone               TEXT,
  role                user_role   NOT NULL DEFAULT 'farmer',
  farm_id             UUID        REFERENCES farms(id) ON DELETE SET NULL,
  region              TEXT,
  preferred_language  language_code NOT NULL DEFAULT 'en',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Back-fill FK from farms → profiles (circular dependency resolved after both tables exist)
DO $$ BEGIN
  ALTER TABLE farms
    ADD CONSTRAINT fk_farms_owner
    FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── animals ───────────────────────────────────────────────────
-- RFID tag is the primary key — must exist before sensor_readings reference it.
CREATE TABLE IF NOT EXISTS animals (
  id           TEXT        PRIMARY KEY,   -- e.g. "RFID-001"
  farm_id      UUID        NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  species      TEXT        NOT NULL CHECK (species IN ('hen', 'pig', 'other')),
  name         TEXT,
  colour       TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Safe migrations for existing databases
DO $$ BEGIN ALTER TABLE animals  ADD COLUMN colour TEXT;       EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE farms    ADD COLUMN taluk  TEXT;       EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN phone  TEXT;       EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ── sensor_readings ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sensor_readings (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id      UUID        NOT NULL REFERENCES farms(id)    ON DELETE CASCADE,
  animal_id    TEXT        NOT NULL REFERENCES animals(id)  ON DELETE CASCADE,
  type         sensor_type NOT NULL,
  value        NUMERIC     NOT NULL,
  recorded_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_animal_id   ON sensor_readings(animal_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_farm_id     ON sensor_readings(farm_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_recorded_at ON sensor_readings(recorded_at DESC);

-- ── alerts ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id           UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id      UUID           NOT NULL REFERENCES farms(id)   ON DELETE CASCADE,
  animal_id    TEXT           REFERENCES animals(id)          ON DELETE SET NULL,
  risk_type    TEXT           NOT NULL,
  severity     alert_severity NOT NULL DEFAULT 'low',
  resolved     BOOLEAN        NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_farm_id   ON alerts(farm_id);
CREATE INDEX IF NOT EXISTS idx_alerts_animal_id ON alerts(animal_id);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved  ON alerts(resolved);

-- ── appointments ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id           UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id    UUID               NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  doctor_id    UUID               NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  slot_time    TIMESTAMPTZ        NOT NULL,
  status       appointment_status NOT NULL DEFAULT 'pending',
  room_id      TEXT               UNIQUE NOT NULL DEFAULT 'biosec-' || substr(md5(random()::text), 1, 12),
  notes        TEXT,
  animal_id    TEXT               REFERENCES animals(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ        DEFAULT NOW()
);

-- ── behavior_events ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS behavior_events (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id         UUID        NOT NULL REFERENCES farms(id)   ON DELETE CASCADE,
  animal_id       TEXT        NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  behavior_type   TEXT        NOT NULL,   -- 'lethargic' | 'isolated' | 'reduced_activity' | 'normal'
  confidence      NUMERIC     CHECK (confidence >= 0 AND confidence <= 1),
  detected_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_behavior_events_animal_id ON behavior_events(animal_id);
CREATE INDEX IF NOT EXISTS idx_behavior_events_farm_id   ON behavior_events(farm_id);


-- ============================================================
-- TRIGGER: auto-create profile row on signup
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_farm_id    UUID;
  user_role_val  user_role;
BEGIN
  user_role_val := COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'farmer');

  -- 1. Insert profile (farm_id = NULL initially)
  INSERT INTO profiles (id, name, email, role, farm_id, region, preferred_language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    user_role_val,
    NULL,
    NEW.raw_user_meta_data->>'region',
    COALESCE((NEW.raw_user_meta_data->>'preferred_language')::language_code, 'en')
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Create farm if user is a farmer and farm metadata exists
  IF user_role_val = 'farmer' AND NEW.raw_user_meta_data->>'farm_name' IS NOT NULL THEN
    INSERT INTO farms (name, owner_id, region, latitude, longitude)
    VALUES (
      NEW.raw_user_meta_data->>'farm_name',
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'farm_region', 'Unknown'),
      NULLIF(NEW.raw_user_meta_data->>'farm_lat', '')::NUMERIC,
      NULLIF(NEW.raw_user_meta_data->>'farm_lng', '')::NUMERIC
    )
    RETURNING id INTO new_farm_id;

    -- 3. Link farm back to profile
    UPDATE profiles SET farm_id = new_farm_id WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- POSTGRES FUNCTIONS
-- ============================================================

-- ── get_nearby_high_severity_alerts ───────────────────────────
-- Returns nearby unresolved HIGH alerts within radius_km.
-- Does NOT expose farm_id, animal_id, or farm name (privacy-safe).
CREATE OR REPLACE FUNCTION get_nearby_high_severity_alerts(
  requesting_farm_id UUID,
  radius_km          NUMERIC DEFAULT 10
)
RETURNS TABLE (
  risk_type      TEXT,
  severity       alert_severity,
  created_at     TIMESTAMPTZ,
  distance_band  TEXT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  req_lat NUMERIC;
  req_lng NUMERIC;
BEGIN
  SELECT latitude, longitude
  INTO req_lat, req_lng
  FROM farms
  WHERE id = requesting_farm_id;

  IF req_lat IS NULL OR req_lng IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    a.risk_type,
    a.severity,
    a.created_at,
    CASE
      WHEN earth_distance(
             ll_to_earth(req_lat, req_lng),
             ll_to_earth(f.latitude, f.longitude)
           ) / 1000 < 3  THEN '< 3 km'
      WHEN earth_distance(
             ll_to_earth(req_lat, req_lng),
             ll_to_earth(f.latitude, f.longitude)
           ) / 1000 < 7  THEN '3 – 7 km'
      ELSE '7 – 10 km'
    END AS distance_band
  FROM alerts a
  JOIN farms f ON f.id = a.farm_id
  WHERE
    a.farm_id   <> requesting_farm_id
    AND a.severity  = 'high'
    AND a.resolved  = FALSE
    AND earth_distance(
          ll_to_earth(req_lat, req_lng),
          ll_to_earth(f.latitude, f.longitude)
        ) / 1000 <= radius_km
  ORDER BY a.created_at DESC;
END;
$$;

-- ── get_doctors ────────────────────────────────────────────────
-- Returns all doctor profiles (name + email) for appointment booking.
CREATE OR REPLACE FUNCTION get_doctors()
RETURNS TABLE (id UUID, name TEXT, email TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.email
  FROM profiles p
  WHERE p.role = 'doctor'
  ORDER BY p.name;
END;
$$;


-- ============================================================
-- VIEWS (government dashboard)
-- ============================================================

-- Regional alert counts per area
CREATE OR REPLACE VIEW regional_alert_summary AS
SELECT
  f.region,
  COUNT(a.id) FILTER (WHERE a.resolved = FALSE)                           AS active_alert_count,
  COUNT(a.id) FILTER (WHERE a.severity = 'high'   AND a.resolved = FALSE) AS high_severity_count,
  COUNT(a.id) FILTER (WHERE a.severity = 'medium' AND a.resolved = FALSE) AS medium_severity_count,
  COUNT(a.id) FILTER (WHERE a.severity = 'low'    AND a.resolved = FALSE) AS low_severity_count,
  COUNT(DISTINCT a.farm_id)                                               AS affected_farms_count,
  COUNT(DISTINCT f.id)                                                    AS total_farms_count,
  MAX(a.created_at)                                                       AS latest_alert_at
FROM farms f
LEFT JOIN alerts a ON a.farm_id = f.id
GROUP BY f.region;

-- Daily alert trend per region (for chart)
CREATE OR REPLACE VIEW regional_daily_alerts AS
SELECT
  f.region,
  DATE(a.created_at) AS alert_date,
  a.severity,
  COUNT(a.id)        AS alert_count
FROM alerts a
JOIN farms f ON f.id = a.farm_id
GROUP BY f.region, DATE(a.created_at), a.severity
ORDER BY alert_date DESC;

-- Active outbreak list (no raw farm/animal IDs exposed)
CREATE OR REPLACE VIEW active_outbreaks AS
SELECT
  f.region,
  a.risk_type,
  a.severity,
  a.created_at,
  COUNT(a.id) AS outbreak_count
FROM alerts a
JOIN farms f ON f.id = a.farm_id
WHERE a.resolved = FALSE AND a.severity IN ('high', 'medium')
GROUP BY f.region, a.risk_type, a.severity, a.created_at
ORDER BY a.created_at DESC;


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE farms           ENABLE ROW LEVEL SECURITY;
ALTER TABLE animals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_events ENABLE ROW LEVEL SECURITY;


-- ── Helper: current user's role ───────────────────────────────
-- IMPORTANT: Reads from JWT claims — NOT from the profiles table.
-- Reading from profiles here would cause infinite recursion (error 42P17).
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role')::user_role,
    'farmer'
  );
END;
$$;

-- ── Helper: current user's farm_id ────────────────────────────
-- Safe to query profiles here because this function is SECURITY DEFINER
-- (it runs as the function owner, bypassing the caller's RLS context).
CREATE OR REPLACE FUNCTION current_user_farm_id()
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  RETURN (SELECT farm_id FROM public.profiles WHERE id = auth.uid());
END;
$$;


-- ── profiles policies ─────────────────────────────────────────
DROP POLICY IF EXISTS "profiles: own row read"              ON profiles;
CREATE POLICY "profiles: own row read" ON profiles
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles: own row update"            ON profiles;
CREATE POLICY "profiles: own row update" ON profiles
  FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles: doctor sees farmer"        ON profiles;
CREATE POLICY "profiles: doctor sees farmer" ON profiles
  FOR SELECT USING (
    current_user_role() = 'doctor'
    AND (
      id = auth.uid()
      OR id IN (SELECT farmer_id FROM appointments WHERE doctor_id = auth.uid())
    )
  );

-- ── farms policies ────────────────────────────────────────────
DROP POLICY IF EXISTS "farms: farmer sees own"              ON farms;
CREATE POLICY "farms: farmer sees own" ON farms
  FOR SELECT USING (
    current_user_role() = 'farmer' AND id = current_user_farm_id()
  );

DROP POLICY IF EXISTS "farms: farmer inserts own"           ON farms;
CREATE POLICY "farms: farmer inserts own" ON farms
  FOR INSERT WITH CHECK (
    current_user_role() = 'farmer' AND owner_id = auth.uid()
  );

DROP POLICY IF EXISTS "farms: farmer updates own"           ON farms;
CREATE POLICY "farms: farmer updates own" ON farms
  FOR UPDATE USING (
    current_user_role() = 'farmer' AND id = current_user_farm_id()
  );

DROP POLICY IF EXISTS "farms: doctor sees assigned"         ON farms;
CREATE POLICY "farms: doctor sees assigned" ON farms
  FOR SELECT USING (
    current_user_role() = 'doctor'
    AND id IN (
      SELECT p.farm_id
      FROM profiles p
      JOIN appointments a ON a.farmer_id = p.id
      WHERE a.doctor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "farms: govt read"                    ON farms;
CREATE POLICY "farms: govt read" ON farms
  FOR SELECT USING (current_user_role() = 'govt_official');

-- ── animals policies ──────────────────────────────────────────
DROP POLICY IF EXISTS "animals: farmer sees own"            ON animals;
CREATE POLICY "animals: farmer sees own" ON animals
  FOR SELECT USING (farm_id = current_user_farm_id());

DROP POLICY IF EXISTS "animals: farmer inserts own"         ON animals;
CREATE POLICY "animals: farmer inserts own" ON animals
  FOR INSERT WITH CHECK (farm_id = current_user_farm_id());

DROP POLICY IF EXISTS "animals: doctor sees assigned"       ON animals;
CREATE POLICY "animals: doctor sees assigned" ON animals
  FOR SELECT USING (
    current_user_role() = 'doctor'
    AND farm_id IN (
      SELECT p.farm_id
      FROM profiles p
      JOIN appointments a ON a.farmer_id = p.id
      WHERE a.doctor_id = auth.uid()
    )
  );

-- ── sensor_readings policies ──────────────────────────────────
DROP POLICY IF EXISTS "sensor_readings: farmer sees own"    ON sensor_readings;
CREATE POLICY "sensor_readings: farmer sees own" ON sensor_readings
  FOR SELECT USING (farm_id = current_user_farm_id());

DROP POLICY IF EXISTS "sensor_readings: farmer inserts own" ON sensor_readings;
CREATE POLICY "sensor_readings: farmer inserts own" ON sensor_readings
  FOR INSERT WITH CHECK (farm_id = current_user_farm_id());

DROP POLICY IF EXISTS "sensor_readings: doctor sees assigned" ON sensor_readings;
CREATE POLICY "sensor_readings: doctor sees assigned" ON sensor_readings
  FOR SELECT USING (
    current_user_role() = 'doctor'
    AND farm_id IN (
      SELECT p.farm_id
      FROM profiles p
      JOIN appointments a ON a.farmer_id = p.id
      WHERE a.doctor_id = auth.uid()
    )
  );

-- ── alerts policies ───────────────────────────────────────────
DROP POLICY IF EXISTS "alerts: farmer sees own"             ON alerts;
CREATE POLICY "alerts: farmer sees own" ON alerts
  FOR SELECT USING (farm_id = current_user_farm_id());

DROP POLICY IF EXISTS "alerts: farmer inserts own"          ON alerts;
CREATE POLICY "alerts: farmer inserts own" ON alerts
  FOR INSERT WITH CHECK (farm_id = current_user_farm_id());

DROP POLICY IF EXISTS "alerts: doctor sees assigned"        ON alerts;
CREATE POLICY "alerts: doctor sees assigned" ON alerts
  FOR SELECT USING (
    current_user_role() = 'doctor'
    AND farm_id IN (
      SELECT p.farm_id
      FROM profiles p
      JOIN appointments a ON a.farmer_id = p.id
      WHERE a.doctor_id = auth.uid()
    )
  );

-- ── appointments policies ─────────────────────────────────────
DROP POLICY IF EXISTS "appointments: farmer sees own"       ON appointments;
CREATE POLICY "appointments: farmer sees own" ON appointments
  FOR SELECT USING (farmer_id = auth.uid());

DROP POLICY IF EXISTS "appointments: farmer inserts"        ON appointments;
CREATE POLICY "appointments: farmer inserts" ON appointments
  FOR INSERT WITH CHECK (farmer_id = auth.uid());

DROP POLICY IF EXISTS "appointments: farmer updates own"    ON appointments;
CREATE POLICY "appointments: farmer updates own" ON appointments
  FOR UPDATE USING (farmer_id = auth.uid());

DROP POLICY IF EXISTS "appointments: doctor sees assigned"  ON appointments;
CREATE POLICY "appointments: doctor sees assigned" ON appointments
  FOR SELECT USING (doctor_id = auth.uid());

DROP POLICY IF EXISTS "appointments: doctor updates status" ON appointments;
CREATE POLICY "appointments: doctor updates status" ON appointments
  FOR UPDATE USING (doctor_id = auth.uid());

-- ── behavior_events policies ──────────────────────────────────
DROP POLICY IF EXISTS "behavior_events: farmer sees own"    ON behavior_events;
CREATE POLICY "behavior_events: farmer sees own" ON behavior_events
  FOR SELECT USING (farm_id = current_user_farm_id());

DROP POLICY IF EXISTS "behavior_events: farmer inserts"     ON behavior_events;
CREATE POLICY "behavior_events: farmer inserts" ON behavior_events
  FOR INSERT WITH CHECK (farm_id = current_user_farm_id());

DROP POLICY IF EXISTS "behavior_events: doctor sees assigned" ON behavior_events;
CREATE POLICY "behavior_events: doctor sees assigned" ON behavior_events
  FOR SELECT USING (
    current_user_role() = 'doctor'
    AND farm_id IN (
      SELECT p.farm_id
      FROM profiles p
      JOIN appointments a ON a.farmer_id = p.id
      WHERE a.doctor_id = auth.uid()
    )
  );


-- ============================================================
-- REALTIME: enable live subscriptions for key tables
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE sensor_readings;
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE behavior_events;


-- ============================================================
-- DONE
-- Schema version: 001 (2025 — SIH25006)
-- ============================================================
