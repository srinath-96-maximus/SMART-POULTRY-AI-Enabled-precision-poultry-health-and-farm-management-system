# Database Layer

This folder contains all database-related files for the **Smart Biosecurity Portal**.

## Structure

```
database/
├── migrations/
│   └── 001_initial_schema.sql   ← Full schema: tables, triggers, RLS, functions
└── seeds/
    └── seed_sample_data.sql     ← Sample data for local dev / demos
```

## Applying the Schema

### Initial Setup (first time)

1. Open your [Supabase Dashboard](https://app.supabase.com) → **SQL Editor**
2. Enable required extensions (**Database → Extensions**):
   - `uuid-ossp` ✓ (usually already on)
   - `cube`
   - `earthdistance`
3. Paste the entire contents of `migrations/001_initial_schema.sql` and click **Run**

### Critical RLS Fix (apply if login is broken)

The `current_user_role()` helper function must read from JWT claims — NOT from the profiles table — to avoid infinite recursion:

```sql
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  RETURN COALESCE((auth.jwt() -> 'user_metadata' ->> 'role')::user_role, 'farmer');
END;
$$;
```

### Disable Email Confirmation (development only)

In Supabase Dashboard → **Authentication → Providers → Email**: disable **"Confirm email"**.

## Seeding Sample Data

```sql
-- Optional: Run in SQL Editor to seed demo farms, animals, and readings
\i seeds/seed_sample_data.sql
```

## Schema Overview

| Table | Purpose |
|---|---|
| `profiles` | Mirrors auth.users; role, farm link, language |
| `farms` | Farm name, region, GPS coordinates |
| `animals` | RFID-tagged animals per farm |
| `sensor_readings` | IoT sensor values (thermal, temp, humidity, weight) |
| `alerts` | Risk alerts per animal/farm |
| `appointments` | Farmer↔Doctor video consultations |
| `behavior_events` | YOLO-detected animal behavior events |

## RLS Policy Summary

All tables use Row Level Security. Farmers see only their own farm data.
Doctors see only farms/animals related to their appointments.
Govt officials have read-only access via aggregated views.
