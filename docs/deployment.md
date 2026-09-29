# Deployment Guide

## Frontend — Vercel (Recommended)

### First Deploy

1. Push the repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your repo
3. Set **Root Directory** to `frontend`
4. Set **Framework Preset** to `Vite`
5. Add Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_SERVICE_KEY`
6. Click **Deploy**

### Subsequent Deploys

Push to `main` — Vercel auto-deploys.

### Custom Domain

In Vercel → Project Settings → Domains → Add your domain.

---

## Database — Supabase

### Initial Setup

1. Create a project at [app.supabase.com](https://app.supabase.com)
2. SQL Editor → paste `database/migrations/001_initial_schema.sql` → Run
3. Authentication → Providers → Email → disable **"Confirm email"** (for dev)

### Production Checklist

- [ ] Enable email confirmation for production
- [ ] Set up a custom SMTP sender in Auth → SMTP Settings
- [ ] Review RLS policies in Database → Policies
- [ ] Enable Realtime for: `sensor_readings`, `alerts`, `appointments`, `behavior_events`
- [ ] Set up database backups (Pro plan)

---

## Pi Agent — Raspberry Pi

### Setup

```bash
git clone <your-repo>
cd pi-agent
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Supabase URL, service key, and farm UUID
```

### Run

```bash
python src/agent.py
```

### Run as Service (systemd)

```bash
# /etc/systemd/system/biosec-agent.service
[Unit]
Description=Smart Biosecurity Pi Agent
After=network.target

[Service]
WorkingDirectory=/home/pi/pi-agent
ExecStart=/usr/bin/python3 src/agent.py
Restart=always
EnvironmentFile=/home/pi/pi-agent/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable biosec-agent
sudo systemctl start biosec-agent
```
