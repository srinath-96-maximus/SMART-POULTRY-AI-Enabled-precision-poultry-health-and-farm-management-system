#!/usr/bin/env python3
"""
pi-agent/src/agent.py
Smart Biosecurity Portal — Raspberry Pi Sensor Ingestion Agent

Reads from connected sensors and writes rows to Supabase.
See pi-agent/README.md for full setup instructions.

Hardware supported:
  - DHT22     : ambient temperature + humidity
  - MLX90640  : thermal body temperature (via YOLO bounding boxes)
  - HX711     : weight (load cell)
  - RC522/USB : RFID animal identification
"""

import os
import time
import logging
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

# ─── Configuration ────────────────────────────────────────────────────────────

SUPABASE_URL             = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
FARM_ID                  = os.environ["FARM_ID"]

POLL_INTERVAL_SECONDS = 30  # How often to read sensors

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger(__name__)

# ─── Supabase Client ──────────────────────────────────────────────────────────

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# ─── Sensor Stubs (replace with real hardware calls) ──────────────────────────

def read_rfid() -> str | None:
    """Return the RFID tag of the animal being scanned, or None."""
    # TODO: Implement RC522 or USB RFID reader
    return None

def read_dht22() -> dict:
    """Return {'temp': float, 'humidity': float} from DHT22 sensor."""
    # TODO: import adafruit_dht, read D4 pin
    return {"temp": None, "humidity": None}

def read_thermal() -> float | None:
    """Return body temperature in °C from MLX90640 thermal camera."""
    # TODO: Implement MLX90640 + optional YOLO bounding-box detection
    return None

def read_weight() -> float | None:
    """Return weight in kg from HX711 load cell."""
    # TODO: Implement HX711 library
    return None

# ─── Data Push ────────────────────────────────────────────────────────────────

def push_reading(animal_id: str, sensor_type: str, value: float):
    """Insert a sensor_readings row into Supabase."""
    try:
        supabase.table("sensor_readings").insert({
            "farm_id":     FARM_ID,
            "animal_id":   animal_id,
            "type":        sensor_type,
            "value":       value,
            "recorded_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
        log.info("Pushed %s=%.2f for animal %s", sensor_type, value, animal_id)
    except Exception as e:
        log.error("Failed to push %s reading: %s", sensor_type, e)

def push_behavior(animal_id: str, behavior_type: str, confidence: float):
    """Insert a behavior_events row into Supabase."""
    try:
        supabase.table("behavior_events").insert({
            "farm_id":       FARM_ID,
            "animal_id":     animal_id,
            "behavior_type": behavior_type,
            "confidence":    confidence,
            "detected_at":   datetime.now(timezone.utc).isoformat(),
        }).execute()
        log.info("Pushed behavior=%s (%.0f%%) for animal %s", behavior_type, confidence * 100, animal_id)
    except Exception as e:
        log.error("Failed to push behavior event: %s", e)

# ─── Main Loop ────────────────────────────────────────────────────────────────

def main():
    log.info("Pi-Agent started. Farm: %s | Poll: %ds", FARM_ID, POLL_INTERVAL_SECONDS)
    while True:
        try:
            animal_id = read_rfid()
            if not animal_id:
                log.debug("No RFID detected, skipping cycle.")
            else:
                dht = read_dht22()
                if dht["temp"]     is not None: push_reading(animal_id, "temp",     dht["temp"])
                if dht["humidity"] is not None: push_reading(animal_id, "humidity", dht["humidity"])

                thermal = read_thermal()
                if thermal is not None: push_reading(animal_id, "thermal", thermal)

                weight = read_weight()
                if weight is not None: push_reading(animal_id, "weight", weight)

        except KeyboardInterrupt:
            log.info("Stopping agent.")
            break
        except Exception as e:
            log.error("Unhandled error in main loop: %s", e)

        time.sleep(POLL_INTERVAL_SECONDS)

if __name__ == "__main__":
    main()
