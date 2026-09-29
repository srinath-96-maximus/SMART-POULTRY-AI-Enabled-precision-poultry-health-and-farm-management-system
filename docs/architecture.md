# System Architecture

## Overview

The Smart Biosecurity Portal is a three-tier IoT system:

```
┌──────────────────────────────────────────────────────────────┐
│                        BROWSER (Users)                       │
│   Farmer Dashboard  │  Doctor Dashboard  │  Govt Dashboard   │
│              React + Vite + Tailwind CSS                     │
└──────────────────────────┬───────────────────────────────────┘
                           │ HTTPS / WebSocket (Supabase JS SDK)
┌──────────────────────────▼───────────────────────────────────┐
│                   SUPABASE BACKEND (BaaS)                    │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │  Auth (JWT) │  │  Postgres DB │  │  Realtime (CDC)     │ │
│  └─────────────┘  └──────────────┘  └─────────────────────┘ │
│                                                              │
│  Tables: profiles, farms, animals, sensor_readings,         │
│          alerts, appointments, behavior_events              │
│  RLS: Row-Level Security per user role                      │
└──────────────────────────▲───────────────────────────────────┘
                           │ service_role key (bypasses RLS)
┌──────────────────────────┴───────────────────────────────────┐
│              RASPBERRY PI AGENT (IoT Edge)                   │
│                                                              │
│  Sensors: DHT22, MLX90640, HX711, RC522 RFID               │
│  Runtime: Python 3 + supabase-py                           │
│  Optional: YOLOv8 for behavior classification               │
└──────────────────────────────────────────────────────────────┘
```

## User Roles & Access

| Role | Route | Access |
|---|---|---|
| `farmer` | `/farmer` | Own farm, animals, sensors, alerts |
| `doctor` | `/doctor` | Appointments + assigned farm animals |
| `govt_official` | `/govt` | Regional aggregated views (read-only) |

## Data Flow

1. **Sensor → DB**: Pi agent reads sensors every 30s, inserts into `sensor_readings` / `behavior_events`
2. **DB → Browser**: Supabase Realtime CDC pushes changes to subscribed React clients instantly
3. **Browser → DB**: Users create farms, register animals, book appointments via the Supabase JS SDK

## Key Design Decisions

- **No separate API server**: Supabase is the backend; all business logic is in DB functions + RLS
- **JWT-based roles**: `current_user_role()` reads from JWT claims (not the profiles table) to avoid RLS recursion
- **Service role in browser**: Used only for farm setup / animal registration where RLS would block new users
- **Jitsi for video**: Embeds `meet.jit.si` rooms — no backend required, room ID is stored in `appointments.room_id`
