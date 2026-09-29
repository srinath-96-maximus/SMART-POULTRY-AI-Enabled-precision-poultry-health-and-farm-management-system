# RLS Policies Reference

All tables use Postgres Row Level Security (RLS).

## Known Issue: Infinite Recursion Fix

**Problem**: `current_user_role()` originally queried `public.profiles`, which triggered its own RLS evaluation → infinite loop → login broken.

**Fix** (apply in Supabase SQL Editor):
```sql
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  RETURN COALESCE((auth.jwt() -> 'user_metadata' ->> 'role')::user_role, 'farmer');
END;
$$;
```

## Policy Summary by Table

### `profiles`
| Policy | Operation | Who |
|---|---|---|
| own row read | SELECT | User can read their own row |
| own row update | UPDATE | User can update their own row |
| doctor sees farmer profiles | SELECT | Doctor can see profiles of their appointment farmers |

### `farms`
| Policy | Operation | Who |
|---|---|---|
| farmer sees own | SELECT | Farmer sees only their own farm |
| farmer inserts own | INSERT | Farmer can create their farm |
| farmer updates own | UPDATE | Farmer can update their farm |
| doctor sees assigned farms | SELECT | Doctor sees farms of their appointment farmers |
| govt official read | SELECT | Govt reads all farms (for aggregated views) |

### `animals`, `sensor_readings`, `behavior_events`
Similar pattern: farmers see their own farm's data; doctors see assigned farms.

### `alerts`
Farmers see own farm alerts; doctors see alerts from assigned farms.

### `appointments`
Farmers manage their own; doctors manage their assigned appointments.

## Helper Functions

```sql
-- Returns role from JWT (no recursion risk)
current_user_role() → user_role

-- Returns farm_id from profiles (reads profiles table — safe because
-- it's SECURITY DEFINER and does not trigger profiles RLS)
current_user_farm_id() → uuid
```
