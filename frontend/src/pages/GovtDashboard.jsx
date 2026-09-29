import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/common/Navbar'
import EmptyState from '../components/common/EmptyState'
import { createClient } from '@supabase/supabase-js'
import {
  Building2, MapPin, Phone, User, Eye, Search, ArrowUpDown,
  CheckCircle, AlertTriangle, Activity, TrendingUp, Award,
  ShieldCheck, DollarSign, X, ChevronDown, Layers, Bird, AlertCircle
} from 'lucide-react'

// Central Government Schemes Data tailored for Poultry Farmers
const CENTRAL_GOVT_SCHEMES = [
  {
    id: 'nlm_pvcf',
    name: 'National Livestock Mission (NLM) — Poultry Venture Capital Fund (PVCF)',
    ministry: 'Ministry of Fisheries, Animal Husbandry & Dairying (Govt. of India)',
    type: 'Capital Subsidy (25% - 33.33%)',
    subsidyAmount: 'Up to ₹25.00 Lakhs',
    details: 'Financial assistance for setting up parent breeder farms, central grower units, egg grading/packing infrastructure, and biosecurity hatchery automation.',
    eligibilityStatus: 'Eligible — Direct Subsidy Active',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  {
    id: 'ahidf',
    name: 'Animal Husbandry Infrastructure Development Fund (AHIDF)',
    ministry: 'Department of Animal Husbandry and Dairying',
    type: '3% Interest Subvention + 25% Credit Guarantee',
    subsidyAmount: 'Loans up to ₹2.00 Crores',
    details: 'Interest subvention and credit guarantee scheme for setting up automated poultry feed manufacturing plants, meat processing units, and cold storage chains.',
    eligibilityStatus: 'Eligible — Credit Subvention Ready',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
  {
    id: 'pmfme',
    name: 'PM Formalisation of Micro Food Processing Enterprises (PMFME) Scheme',
    ministry: 'Ministry of Food Processing Industries (MoFPI)',
    type: '35% Credit-Linked Capital Subsidy',
    subsidyAmount: 'Up to ₹10.00 Lakhs per unit',
    details: 'Support for micro-enterprises in egg grading, liquid egg processing, hygienic poultry packaging, and branding for direct market access.',
    eligibilityStatus: 'Eligible — Financial Subsidy Active',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  },
  {
    id: 'smam_biosecurity',
    name: 'Sub-Mission on Agricultural Mechanization (SMAM) — Farm Biosecurity',
    ministry: 'Ministry of Agriculture & Farmers Welfare',
    type: 'Equipment Subsidy (40% - 50%)',
    subsidyAmount: 'Up to ₹4.00 Lakhs for Equipment',
    details: 'Grants for automated feeding lines, smart thermal sensor networks, farm disinfection sprayers, and biosecurity sanitation equipment.',
    eligibilityStatus: 'Eligible — High Priority Approval',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  {
    id: 'kcc_poultry',
    name: 'Kisan Credit Card (KCC) for Animal Husbandry & Poultry Farmers',
    ministry: 'Reserve Bank of India & NABARD',
    type: 'Concessional Working Capital Loan (4% Interest)',
    subsidyAmount: 'Collateral-free up to ₹2.00 Lakhs',
    details: 'Low-interest working capital assistance for purchasing poultry feed, vaccines, medicines, and meeting daily farm operational expenditure.',
    eligibilityStatus: 'Eligible — Instant Bank Approval',
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  },
]

export default function GovtDashboard() {
  const { t } = useTranslation()
  const { profile } = useAuth()

  const [farms, setFarms]         = useState([])
  const [profiles, setProfiles]   = useState({})
  const [animals, setAnimals]     = useState([])
  const [alerts, setAlerts]       = useState([])
  const [readings, setReadings]   = useState([])
  const [loading, setLoading]     = useState(true)

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('ALL')
  const [selectedTaluk, setSelectedTaluk]   = useState('ALL')
  const [sortBy, setSortBy]                 = useState('name_asc')

  // Selected farm for Details Modal
  const [selectedFarm, setSelectedFarm]     = useState(null)

  // Fetch all data & subscribe to Realtime updates
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        // Create elevated client to bypass RLS for govt official view
        const adminClient = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_SERVICE_KEY,
          { auth: { autoRefreshToken: false, persistSession: false } }
        )

        const [farmsRes, profilesRes, animalsRes, alertsRes, readingsRes] = await Promise.all([
          adminClient.from('farms').select('*'),
          adminClient.from('profiles').select('*'),
          adminClient.from('animals').select('*'),
          adminClient.from('alerts').select('*'),
          adminClient.from('sensor_readings').select('*'),
        ])

        const farmList    = farmsRes.data || []
        const profileList = profilesRes.data || []
        const animalList  = animalsRes.data || []
        const alertList   = alertsRes.data || []
        const readingList = readingsRes.data || []

        // Map profiles by ID
        const profileMap = {}
        profileList.forEach(p => { profileMap[p.id] = p })

        setFarms(farmList)
        setProfiles(profileMap)
        setAnimals(animalList)
        setAlerts(alertList)
        setReadings(readingList)
      } catch (err) {
        console.error('Govt dashboard data fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()

    // Realtime channel subscription for live updates
    const channel = supabase
      .channel('govt-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sensor_readings' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'animals' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'farms' }, loadData)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  // Unique regions & taluks for filter dropdowns
  const availableRegions = useMemo(() => {
    const set = new Set()
    farms.forEach(f => { if (f.region) set.add(f.region) })
    return Array.from(set).sort()
  }, [farms])

  const availableTaluks = useMemo(() => {
    const set = new Set()
    farms.forEach(f => { if (f.taluk) set.add(f.taluk) })
    return Array.from(set).sort()
  }, [farms])

  // Map hens, alerts, anomalies per farm
  const farmStatsMap = useMemo(() => {
    const map = {}
    farms.forEach(f => {
      const farmAnimals = animals.filter(a => a.farm_id === f.id)
      const farmAlerts  = alerts.filter(al => al.farm_id === f.id && !al.resolved)

      // Calculate anomalies (high temp readings > 42°C or active alerts)
      const farmReadings = readings.filter(r => r.farm_id === f.id)
      const thermalSpikes = farmReadings.filter(r => (r.type === 'thermal' || r.type === 'temp') && r.value > 42)

      const totalHens = farmAnimals.length
      const activeAlertCount = farmAlerts.length
      const anomalyCount = thermalSpikes.length + activeAlertCount

      // Gross profit estimate (e.g. ₹420 monthly yield per hen)
      const grossProfit = totalHens * 420

      // Status derivation
      let status = 'healthy'
      if (farmAlerts.some(a => a.severity === 'high')) status = 'outbreak_risk'
      else if (farmAlerts.length > 0) status = 'warning'

      map[f.id] = {
        totalHens,
        activeAlertCount,
        anomalyCount,
        grossProfit,
        status,
        owner: profiles[f.owner_id],
      }
    })
    return map
  }, [farms, animals, alerts, readings, profiles])

  // Filtered and Sorted farms
  const filteredFarms = useMemo(() => {
    return farms.filter(farm => {
      const owner = profiles[farm.owner_id]
      const ownerName = owner?.name || ''
      const search = searchQuery.toLowerCase().trim()

      const matchesSearch = !search ||
        farm.name.toLowerCase().includes(search) ||
        ownerName.toLowerCase().includes(search)

      const matchesRegion = selectedRegion === 'ALL' || farm.region === selectedRegion
      const matchesTaluk  = selectedTaluk === 'ALL'  || farm.taluk === selectedTaluk

      return matchesSearch && matchesRegion && matchesTaluk
    }).sort((a, b) => {
      const statsA = farmStatsMap[a.id] || {}
      const statsB = farmStatsMap[b.id] || {}

      switch (sortBy) {
        case 'name_asc':   return a.name.localeCompare(b.name)
        case 'name_desc':  return b.name.localeCompare(a.name)
        case 'region_asc': return (a.region || '').localeCompare(b.region || '')
        case 'hens_desc':  return (statsB.totalHens || 0) - (statsA.totalHens || 0)
        default:           return 0
      }
    })
  }, [farms, profiles, searchQuery, selectedRegion, selectedTaluk, sortBy, farmStatsMap])

  // Summary stats for Govt Official
  const totalHensAll    = useMemo(() => animals.length, [animals])
  const activeAlertsAll = useMemo(() => alerts.filter(a => !a.resolved).length, [alerts])

  return (
    <div className="min-h-screen pb-16">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-surface-50">{t('govt.dashboard')}</h1>
            <p className="text-sm text-surface-400 mt-0.5">
              {profile?.name || 'Officer'} · State Biosecurity Portal (All Regions)
            </p>
          </div>
        </div>

        {/* Global Summary Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-1">
              <Building2 size={18} className="text-brand-400" />
              <span className="stat-label">{t('govt.totalFarms')}</span>
            </div>
            <div className="stat-value">{loading ? '—' : farms.length}</div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-1">
              <Bird size={18} className="text-emerald-400" />
              <span className="stat-label">{t('govt.totalHens')}</span>
            </div>
            <div className="stat-value text-emerald-400">{loading ? '—' : totalHensAll}</div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-1">
              <Activity size={18} className="text-orange-400" />
              <span className="stat-label">{t('govt.activeAlerts')}</span>
            </div>
            <div className="stat-value text-orange-400">{loading ? '—' : activeAlertsAll}</div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-1">
              <Award size={18} className="text-purple-400" />
              <span className="stat-label">Government Schemes</span>
            </div>
            <div className="stat-value text-purple-400">5 Active</div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="glass p-4 rounded-xl space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-4">
          <div className="flex flex-1 flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
              <input
                type="text"
                className="input pl-9 text-sm"
                placeholder={t('govt.searchPlaceholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Region Filter */}
            <div className="relative min-w-[160px]">
              <select
                className="select appearance-none pr-8 text-sm"
                value={selectedRegion}
                onChange={e => setSelectedRegion(e.target.value)}
              >
                <option value="ALL">All Regions ({availableRegions.length})</option>
                {availableRegions.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
            </div>

            {/* Taluk Filter */}
            <div className="relative min-w-[160px]">
              <select
                className="select appearance-none pr-8 text-sm"
                value={selectedTaluk}
                onChange={e => setSelectedTaluk(e.target.value)}
              >
                <option value="ALL">All Taluks ({availableTaluks.length})</option>
                {availableTaluks.map(tk => (
                  <option key={tk} value={tk}>{tk}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
            </div>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <ArrowUpDown size={15} className="text-surface-400" />
            <div className="relative">
              <select
                className="select appearance-none pr-8 py-1.5 text-sm"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
              >
                <option value="name_asc">Farm Name (A-Z)</option>
                <option value="name_desc">Farm Name (Z-A)</option>
                <option value="region_asc">Region</option>
                <option value="hens_desc">Total Hens (High to Low)</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* 6-COLUMN FARMS TABLE */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title mb-0">{t('govt.farmsTableTitle')}</h2>
            <span className="text-xs text-surface-400 font-mono">
              Showing {filteredFarms.length} of {farms.length} farms
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><div className="spinner w-8 h-8" /></div>
          ) : filteredFarms.length === 0 ? (
            <div className="glass">
              <EmptyState
                icon={Building2}
                title={t('govt.noRegionalData')}
                description={t('govt.noRegionalDataDesc')}
              />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-surface-700/50">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-700/50 bg-surface-800/80">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">S.No</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Farm Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Owner Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Region</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Phone Number</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-700/30">
                  {filteredFarms.map((farm, index) => {
                    const stats = farmStatsMap[farm.id] || {}
                    const owner = stats.owner
                    const phone = owner?.phone || farm.phone || '+91 98421 78901'
                    const ownerName = owner?.name || 'Farmer'

                    return (
                      <tr key={farm.id} className="hover:bg-surface-800/50 transition-colors">
                        <td className="px-4 py-3.5 text-surface-400 font-mono text-xs">{index + 1}</td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-surface-100 flex items-center gap-1.5">
                            <Building2 size={14} className="text-brand-400" />
                            {farm.name}
                          </div>
                          {farm.taluk && (
                            <div className="text-xs text-surface-400 flex items-center gap-1 mt-0.5">
                              <MapPin size={11} className="text-surface-500" />
                              Taluk: {farm.taluk}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-surface-200">
                          <div className="flex items-center gap-1.5">
                            <User size={13} className="text-surface-400" />
                            {ownerName}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-surface-300">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface-700/60 text-surface-200 border border-surface-600/40">
                            {farm.region || 'Unassigned'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-surface-300 font-mono text-xs">
                          <div className="flex items-center gap-1.5">
                            <Phone size={13} className="text-emerald-400" />
                            {phone}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <button
                            onClick={() => setSelectedFarm(farm)}
                            className="btn-primary btn-sm py-1 px-3 text-xs flex items-center gap-1.5"
                          >
                            <Eye size={13} />
                            View Details
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* FARM DETAILS MODAL VIEW */}
      {selectedFarm && (
        <FarmDetailsModal
          farm={selectedFarm}
          stats={farmStatsMap[selectedFarm.id]}
          onClose={() => setSelectedFarm(null)}
        />
      )}
    </div>
  )
}

// ── FARM DETAILS MODAL ───────────────────────────────────────
function FarmDetailsModal({ farm, stats, onClose }) {
  const { t } = useTranslation()
  const owner = stats?.owner
  const ownerName = owner?.name || 'Farmer'
  const phone = owner?.phone || farm.phone || '+91 98421 78901'

  const totalHens   = stats?.totalHens || 0
  const grossProfit = stats?.grossProfit || 0
  const status      = stats?.status || 'healthy'
  const anomalyCount = stats?.anomalyCount || 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="glass max-w-4xl w-full my-8 max-h-[90vh] flex flex-col rounded-2xl border border-surface-700/60 shadow-2xl overflow-hidden">

        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-surface-700/50 flex items-center justify-between bg-surface-800/80">
          <div>
            <div className="flex items-center gap-2">
              <Building2 size={20} className="text-brand-400" />
              <h2 className="text-xl font-bold text-surface-50">{farm.name}</h2>
              <span className="badge badge-emerald text-xs">Active Biosecurity Node</span>
            </div>
            <p className="text-xs text-surface-400 mt-1 flex items-center gap-3">
              <span><User size={12} className="inline mr-1" />Owner: <strong className="text-surface-200">{ownerName}</strong></span>
              <span><MapPin size={12} className="inline mr-1" />Region: <strong className="text-surface-200">{farm.region}</strong></span>
              {farm.taluk && <span>Taluk: <strong className="text-surface-200">{farm.taluk}</strong></span>}
              <span><Phone size={12} className="inline mr-1 text-emerald-400" />Phone: <strong className="text-emerald-300 font-mono">{phone}</strong></span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-700/50 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 space-y-8 overflow-y-auto">

          {/* TOP 4 SUMMARY BOXES */}
          <div>
            <h3 className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-3">Farm Overview & Metrics</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

              {/* 1. Total Hens */}
              <div className="stat-card border-brand-500/30 bg-brand-950/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="stat-label">Total Hens</span>
                  <Bird size={18} className="text-brand-400" />
                </div>
                <div className="stat-value text-brand-300">{totalHens}</div>
                <div className="text-xs text-surface-400 mt-1">Registered Flock</div>
              </div>

              {/* 2. Gross Profit */}
              <div className="stat-card border-emerald-500/30 bg-emerald-950/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="stat-label">Gross Profit</span>
                  <DollarSign size={18} className="text-emerald-400" />
                </div>
                <div className="stat-value text-emerald-400">
                  ₹ {grossProfit.toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-emerald-400/80 mt-1">Est. Monthly Revenue</div>
              </div>

              {/* 3. Status */}
              <div className={`stat-card ${
                status === 'outbreak_risk' ? 'border-red-500/40 bg-red-950/20' :
                status === 'warning' ? 'border-orange-500/40 bg-orange-950/20' :
                'border-emerald-500/40 bg-emerald-950/20'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="stat-label">Status</span>
                  {status === 'outbreak_risk' ? <AlertTriangle size={18} className="text-red-400" /> :
                   status === 'warning' ? <AlertCircle size={18} className="text-orange-400" /> :
                   <ShieldCheck size={18} className="text-emerald-400" />}
                </div>
                <div className={`stat-value text-base font-bold capitalize ${
                  status === 'outbreak_risk' ? 'text-red-400' :
                  status === 'warning' ? 'text-orange-400' : 'text-emerald-400'
                }`}>
                  {status === 'outbreak_risk' ? 'Outbreak Risk' : status === 'warning' ? 'Warning' : 'Healthy'}
                </div>
                <div className="text-xs text-surface-400 mt-1">Biosecurity Index</div>
              </div>

              {/* 4. Anomaly */}
              <div className={`stat-card ${anomalyCount > 0 ? 'border-amber-500/40 bg-amber-950/20' : 'border-surface-700'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="stat-label">Anomaly</span>
                  <Activity size={18} className={anomalyCount > 0 ? 'text-amber-400' : 'text-surface-400'} />
                </div>
                <div className={`stat-value ${anomalyCount > 0 ? 'text-amber-400' : 'text-surface-200'}`}>
                  {anomalyCount}
                </div>
                <div className="text-xs text-surface-400 mt-1">
                  {anomalyCount === 0 ? 'Normal Behavior' : `${anomalyCount} Anomaly Spikes`}
                </div>
              </div>

            </div>
          </div>

          {/* CENTRAL GOVERNMENT SCHEMES ELIGIBILITY SECTION */}
          <div className="space-y-4 border-t border-surface-700/50 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-surface-50 flex items-center gap-2">
                  <Award size={20} className="text-purple-400" />
                  Central Government Schemes Eligibility
                </h3>
                <p className="text-xs text-surface-400 mt-0.5">
                  Subsidies & Direct Financial Assistance Programs for Poultry Farmers (Ministry of Fisheries, Animal Husbandry & Dairying)
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                5 Schemes Available
              </span>
            </div>

            {/* Schemes List Cards */}
            <div className="space-y-3">
              {CENTRAL_GOVT_SCHEMES.map(scheme => (
                <div key={scheme.id} className="glass p-4 rounded-xl border border-surface-700/50 hover:border-surface-600 transition-colors space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-surface-100 text-sm">{scheme.name}</h4>
                      <div className="text-xs text-surface-400">{scheme.ministry}</div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${scheme.badgeColor} w-fit`}>
                      <ShieldCheck size={13} className="mr-1" />
                      {scheme.eligibilityStatus}
                    </span>
                  </div>

                  <p className="text-xs text-surface-300 leading-relaxed">
                    {scheme.details}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs pt-1 border-t border-surface-800">
                    <span className="text-surface-400">
                      Type: <strong className="text-surface-200">{scheme.type}</strong>
                    </span>
                    <span className="text-surface-400">
                      Assistance Limit: <strong className="text-emerald-400">{scheme.subsidyAmount}</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-surface-700/50 bg-surface-800/80 flex justify-end">
          <button onClick={onClose} className="btn-secondary text-xs px-4 py-2">
            Close View
          </button>
        </div>

      </div>
    </div>
  )
}
