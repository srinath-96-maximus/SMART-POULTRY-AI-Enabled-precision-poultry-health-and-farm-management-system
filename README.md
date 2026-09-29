# Dev names and emails
1.SRINATH S\
2.SHANMUGARAJA D\
3.THENAPPAN S\
4.SAI GANESH S V\
5.SUNDARAM S S \
6.SANJAY A\
7.ANDREW MATHEWS\
8.SAVARI SANTHOSH A

---

## Project Structure

```
smart-biosecurity-portal/
│
├── frontend/                        ← React + Vite + Tailwind CSS
│   └── src/
│       ├── components/
│       │   ├── common/              ← Navbar, EmptyState, LanguageSwitcher
│       │   └── features/            ← animals/, appointments/, alerts/
│       ├── hooks/                   ← useAuth (context + Supabase auth)
│       ├── lib/                     ← supabase.js, i18n.js
│       ├── locales/                 ← en, ta, hi, ml translations
│       ├── pages/
│       │   ├── auth/                ← LoginPage, SignupPage
│       │   └── *Dashboard.jsx       ← Role dashboards
│       ├── services/                ← All Supabase API calls extracted
│       ├── styles/                  ← globals.css (Tailwind + custom)
│       └── utils/                   ← formatters.js, validators.js
│
├── database/                        ← Supabase Postgres
│   ├── migrations/
│   │   └── 001_initial_schema.sql  ← Full schema — run once in Supabase SQL Editor
│   └── seeds/
│       └── seed_sample_data.sql    ← Sample data for development
│
├── pi-agent/                        ← Raspberry Pi Python ingestion agent
│   ├── src/agent.py                ← Main sensor read + Supabase push loop
│   ├── requirements.txt
│   └── .env.example
│
├── docs/                            ← Documentation
│   ├── architecture.md
│   ├── deployment.md
│   └── rls-policies.md
│
├── tests/                           ← Test suite
│   └── frontend/
│
├── .gitignore
├── .env.example                     ← Combined env template
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS v3 |
| Auth | Supabase Auth (email + password) |
| Database | Supabase Postgres + RLS |
| Real-time | Supabase Realtime (Postgres CDC) |
| Charts | Recharts |
| i18n | react-i18next (English, Tamil, Hindi, Malayalam) |
| Video | Jitsi Meet embed |
| IoT Agent | Python 3 (Raspberry Pi) |

---

## Quick Start

### 1. Apply the Database Schema

```
Supabase Dashboard → SQL Editor → paste database/migrations/001_initial_schema.sql → Run
```

### 2. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### 3. Start the Pi Agent (optional)

```bash
cd pi-agent
pip install -r requirements.txt
cp .env.example .env   # Fill in your credentials
python src/agent.py
```

---

## User Roles

| Role | Dashboard | Capabilities |
|---|---|---|
| `farmer` | `/farmer` | Monitor animals, register hens, book vet appointments |
| `doctor` | `/doctor` | Manage appointments, view patient animal data |
| `govt_official` | `/govt` | Regional outbreak overview, policy schemes |

---

## Documentation

- [Architecture](docs/architecture.md) — System design and data flow
- [Deployment](docs/deployment.md) — Vercel, Supabase, and Pi setup
- [RLS Policies](docs/rls-policies.md) — Database security policies + known fixes

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit: `git commit -m 'feat: add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

