# Pi-Agent — Future Raspberry Pi Integration

This folder is a placeholder for the future Raspberry Pi sensor ingestion script.

## Overview

The Raspberry Pi runs a Python script that reads data from:
- **DHT22** — ambient temperature + humidity
- **Thermal camera (MLX90640)** — body temperature via YOLO-detected animal bounding boxes
- **Load cell (HX711)** — weight readings
- **RFID reader (RC522 / USB)** — animal identification by RFID tag

After optional local YOLO inference (hen/pig detection + behavior classification), the Pi writes rows directly to Supabase.

## Required Python Libraries

```bash
pip install supabase-py python-dotenv adafruit-circuitpython-dht RPi.GPIO
```

## Pi `.env` (on-device only, never committed to git)

```env
SUPABASE_URL=https://vwfrhldcibcrkacuxucv.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
FARM_ID=<uuid-of-this-pi's-farm>
```

## Expected Row Formats

### sensor_readings
```python
{
  "farm_id":     "uuid-of-farm",
  "animal_id":   "RFID-001",        # must already exist in animals table
  "type":        "thermal",          # or "temp", "humidity", "weight"
  "value":       41.2,               # numeric
  "recorded_at": "2025-01-01T10:00:00+05:30"
}
```

### behavior_events
```python
{
  "farm_id":       "uuid-of-farm",
  "animal_id":     "RFID-001",
  "behavior_type": "lethargic",     # or "normal", "isolated", "reduced_activity"
  "confidence":    0.87,             # 0.0–1.0 from YOLO model
  "detected_at":   "2025-01-01T10:00:00+05:30"
}
```

### alerts (when YOLO flags an anomaly)
```python
{
  "farm_id":   "uuid-of-farm",
  "animal_id": "RFID-001",
  "risk_type": "Avian Influenza risk",
  "severity":  "high",              # "low", "medium", or "high"
  "resolved":  False
}
```

## How to Connect

1. Install dependencies above on the Pi
2. Copy `.env` to the Pi (never commit it)
3. Implement the sensor read loop using `supabase-py`:
   ```python
   from supabase import create_client
   client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
   client.table("sensor_readings").insert({...}).execute()
   ```
4. The frontend will automatically display live data once rows start arriving — no code changes needed.

## Notes

- The Pi uses `service_role` key to bypass RLS (it writes on behalf of the farm).
- All animals must be pre-registered in the `animals` table via the Farmer Dashboard before any sensor readings can reference them.
- If deploying many Pis across farms, consider using an Express relay API with per-device API keys instead of putting service_role on each device.
