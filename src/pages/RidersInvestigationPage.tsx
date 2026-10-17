import React, { useState } from 'react'
import {
  Users,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Smartphone,
  MapPin,
  Clock,
  Activity,
  RotateCcw,
  Camera,
  CheckCircle2,
  Ban,
  ArrowRight,
  TrendingUp,
  Cpu,
  Wifi,
  History,
  Info,
  Calendar,
} from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'
import { cn } from '@/lib/utils'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { EvidenceGauge } from '@/components/ui/EvidenceGauge'
import { DecisionLevel } from '@/types'

interface RiderProfile {
  id: string
  name: string
  archetype: string
  cityHome: string
  currentZone: string
  status: 'active' | 'watch' | 'pending_stepup' | 'under_review' | 'suspended'
  currentLevel: DecisionLevel
  accountCreated: string
  sessionsScored: number
  passRate: number
  primaryDevice: string
  os: string
  carrier: string
  ipAsn: string
  contextScore: number
  habitScore: number
  evidenceScore: number
  threshold: number
  reasons: string[]
  explanation: string
  habits: {
    name: string
    baseline: string
    current: string
    deltaZ: string
    status: 'normal' | 'drift' | 'severe'
  }[]
  contextHistory: {
    date: string
    device: string
    os: string
    city: string
    zone: string
    flag: string
  }[]
  timeline: {
    session: number
    label: string
    evidence: number
    habitDev: number
    contextNovelty: number
    level: DecisionLevel
    isContextChange: boolean
    contextFlag?: string
  }[]
}

const RIDERS: RiderProfile[] = [
  {
    id: 'R00007',
    name: 'Marcus Chen',
    archetype: 'Full-Time Day Courier',
    cityHome: 'London',
    currentZone: 'Soho Central (Z1)',
    status: 'pending_stepup',
    currentLevel: 'L2',
    accountCreated: '14 months ago',
    sessionsScored: 248,
    passRate: 98.4,
    primaryDevice: 'Apple iPhone 13 Pro',
    os: 'iOS 17.4.1',
    carrier: 'EE Mobile UK',
    ipAsn: 'AS55836',
    contextScore: 0.08,
    habitScore: 0.82,
    evidenceScore: 4.12,
    threshold: 3.12,
    reasons: [
      'swipe_speed -2.84σ (motor signature slowed)',
      'accept_latency_ms +3.60σ (order hesitation)',
      'known device and home location',
      '4 consecutive sessions above threshold',
    ],
    explanation:
      'Device, carrier, and zone are 100% identical to the registered baseline, but kinetic swipe speed and order acceptance latency have diverged sharply (+3.60σ). Signature of physical phone handover to an unauthorized secondary rider.',
    habits: [
      { name: 'Acceptance Latency', baseline: '1,840 ms', current: '6,420 ms', deltaZ: '+3.60σ', status: 'severe' },
      { name: 'Swipe Gesture Speed', baseline: '0.62 m/s', current: '0.28 m/s', deltaZ: '-2.84σ', status: 'severe' },
      { name: 'Tap Interval Cadence', baseline: '212 ms', current: '394 ms', deltaZ: '+2.45σ', status: 'drift' },
      { name: 'Route Suggested Deviation', baseline: '14.2%', current: '38.6%', deltaZ: '+1.90σ', status: 'drift' },
      { name: 'Transit Speed Variance', baseline: '23.4 km/h', current: '24.1 km/h', deltaZ: '+0.15σ', status: 'normal' },
      { name: 'Order Throughput / Hr', baseline: '3.2 / hr', current: '2.1 / hr', deltaZ: '-1.40σ', status: 'drift' },
    ],
    contextHistory: [
      { date: 'Today 14:18', device: 'iPhone 13 Pro', os: 'iOS 17.4.1', city: 'London', zone: 'Soho Z1', flag: 'Known' },
      { date: 'Yesterday 18:30', device: 'iPhone 13 Pro', os: 'iOS 17.4.1', city: 'London', zone: 'Covent Garden', flag: 'Known' },
      { date: '3 days ago', device: 'iPhone 13 Pro', os: 'iOS 17.4.1', city: 'London', zone: 'Westminster', flag: 'Known' },
      { date: '12 days ago', device: 'iPhone 13 Pro', os: 'iOS 17.4.0', city: 'London', zone: 'Soho Z1', flag: 'Minor OS' },
    ],
    timeline: [
      { session: 1, label: 'S-240', evidence: 0.4, habitDev: 0.12, contextNovelty: 0.05, level: 'L0', isContextChange: false },
      { session: 2, label: 'S-241', evidence: 0.5, habitDev: 0.15, contextNovelty: 0.05, level: 'L0', isContextChange: false },
      { session: 3, label: 'S-242', evidence: 0.6, habitDev: 0.18, contextNovelty: 0.08, level: 'L0', isContextChange: false },
      { session: 4, label: 'S-243', evidence: 0.4, habitDev: 0.14, contextNovelty: 0.05, level: 'L0', isContextChange: false },
      { session: 5, label: 'S-244', evidence: 1.2, habitDev: 0.48, contextNovelty: 0.05, level: 'L1', isContextChange: false },
      { session: 6, label: 'S-245', evidence: 2.1, habitDev: 0.65, contextNovelty: 0.06, level: 'L1', isContextChange: false },
      { session: 7, label: 'S-246', evidence: 3.3, habitDev: 0.78, contextNovelty: 0.08, level: 'L2', isContextChange: false },
      { session: 8, label: 'S-247', evidence: 4.12, habitDev: 0.82, contextNovelty: 0.08, level: 'L2', isContextChange: false },
    ],
  },
  {
    id: 'R00245',
    name: 'Elena Rostova',
    archetype: 'Scooter Express Courier',
    cityHome: 'London',
    currentZone: 'Camden Town (Z3)',
    status: 'active',
    currentLevel: 'L0',
    accountCreated: '9 months ago',
    sessionsScored: 182,
    passRate: 99.1,
    primaryDevice: 'Samsung Galaxy S24 Ultra',
    os: 'Android 14 (OneUI 6.1)',
    carrier: 'Vodafone UK',
    ipAsn: 'AS12576',
    contextScore: 0.88,
    habitScore: 0.16,
    evidenceScore: 0.38,
    threshold: 3.12,
    reasons: [
      'new_device model detected (Samsung Galaxy S24 Ultra)',
      'new_zone delivery shift (Camden Town Z3)',
      'touch motor cadence strictly matches 30-day baseline (-0.12σ)',
      'benign life event confirmed: hardware upgrade',
    ],
    explanation:
      'Brand-new handset model and unfamiliar cellular subnet detected, yet swipe gesture cadence, acceptance latency, and route deviation match the rider’s historical fingerprint within 0.16σ. Benign hardware upgrade correctly recognized without worker lockout.',
    habits: [
      { name: 'Acceptance Latency', baseline: '2,100 ms', current: '2,180 ms', deltaZ: '+0.12σ', status: 'normal' },
      { name: 'Swipe Gesture Speed', baseline: '0.54 m/s', current: '0.52 m/s', deltaZ: '-0.08σ', status: 'normal' },
      { name: 'Tap Interval Cadence', baseline: '295 ms', current: '302 ms', deltaZ: '+0.10σ', status: 'normal' },
      { name: 'Route Suggested Deviation', baseline: '11.8%', current: '12.4%', deltaZ: '+0.14σ', status: 'normal' },
      { name: 'Transit Speed Variance', baseline: '28.2 km/h', current: '27.9 km/h', deltaZ: '-0.05σ', status: 'normal' },
      { name: 'Order Throughput / Hr', baseline: '2.8 / hr', current: '2.9 / hr', deltaZ: '+0.11σ', status: 'normal' },
    ],
    contextHistory: [
      { date: 'Today 13:45', device: 'Galaxy S24 Ultra', os: 'Android 14', city: 'London', zone: 'Camden Z3', flag: 'New Phone' },
      { date: 'Yesterday', device: 'Galaxy S21 5G', os: 'Android 13', city: 'London', zone: 'Islington', flag: 'Old Handset' },
      { date: '3 days ago', device: 'Galaxy S21 5G', os: 'Android 13', city: 'London', zone: 'Islington', flag: 'Old Handset' },
      { date: '5 days ago', device: 'Galaxy S21 5G', os: 'Android 13', city: 'London', zone: 'Islington', flag: 'Old Handset' },
    ],
    timeline: [
      { session: 1, label: 'S-175', evidence: 0.2, habitDev: 0.12, contextNovelty: 0.05, level: 'L0', isContextChange: false },
      { session: 2, label: 'S-176', evidence: 0.3, habitDev: 0.14, contextNovelty: 0.05, level: 'L0', isContextChange: false },
      { session: 3, label: 'S-177', evidence: 0.2, habitDev: 0.11, contextNovelty: 0.05, level: 'L0', isContextChange: false },
      { session: 4, label: 'S-178', evidence: 0.3, habitDev: 0.15, contextNovelty: 0.05, level: 'L0', isContextChange: false },
      { session: 5, label: 'S-179', evidence: 0.4, habitDev: 0.16, contextNovelty: 0.88, level: 'L0', isContextChange: true, contextFlag: 'New Phone' },
      { session: 6, label: 'S-180', evidence: 0.35, habitDev: 0.14, contextNovelty: 0.82, level: 'L0', isContextChange: false },
      { session: 7, label: 'S-181', evidence: 0.38, habitDev: 0.15, contextNovelty: 0.65, level: 'L0', isContextChange: false },
    ],
  },
  {
    id: 'R00412',
    name: 'Devon Vance',
    archetype: 'Night Shift Courier',
    cityHome: 'Birmingham',
    currentZone: 'Digbeth Creative Hub (Z2)',
    status: 'under_review',
    currentLevel: 'L3',
    accountCreated: '6 months ago',
    sessionsScored: 115,
    passRate: 91.2,
    primaryDevice: 'Google Pixel 7a',
    os: 'Android 14',
    carrier: 'Three UK',
    ipAsn: 'AS2856',
    contextScore: 0.15,
    habitScore: 0.74,
    evidenceScore: 6.84,
    threshold: 3.12,
    reasons: [
      'recurrent bimodal habit divergence (> 2.8σ delta between shifts)',
      'order cancellation spike 24.5% vs baseline 3.2%',
      'transit velocity variance outside 98th percentile',
      'timeshare rental signature: daytime and nighttime distinct operators',
    ],
    explanation:
      'Account demonstrates consistent daytime motor habits alternating with erratic late-night delivery patterns on the same device. High probability of structured account timesharing or credential subletting.',
    habits: [
      { name: 'Acceptance Latency', baseline: '1,420 ms', current: '5,840 ms', deltaZ: '+3.10σ', status: 'severe' },
      { name: 'Swipe Gesture Speed', baseline: '0.71 m/s', current: '0.34 m/s', deltaZ: '-2.55σ', status: 'severe' },
      { name: 'Tap Interval Cadence', baseline: '185 ms', current: '360 ms', deltaZ: '+2.60σ', status: 'severe' },
      { name: 'Route Suggested Deviation', baseline: '8.4%', current: '42.1%', deltaZ: '+3.40σ', status: 'severe' },
      { name: 'Transit Speed Variance', baseline: '31.2 km/h', current: '18.4 km/h', deltaZ: '-2.10σ', status: 'severe' },
      { name: 'Order Throughput / Hr', baseline: '3.6 / hr', current: '1.4 / hr', deltaZ: '-2.40σ', status: 'severe' },
    ],
    contextHistory: [
      { date: 'Today 22:15', device: 'Pixel 7a', os: 'Android 14', city: 'Birmingham', zone: 'Digbeth Z2', flag: 'Known' },
      { date: 'Yesterday 23:40', device: 'Pixel 7a', os: 'Android 14', city: 'Birmingham', zone: 'City Centre', flag: 'Known' },
      { date: '2 days ago', device: 'Pixel 7a', os: 'Android 14', city: 'Birmingham', zone: 'Edgbaston', flag: 'Known' },
    ],
    timeline: [
      { session: 1, label: 'S-109', evidence: 0.6, habitDev: 0.22, contextNovelty: 0.1, level: 'L0', isContextChange: false },
      { session: 2, label: 'S-110', evidence: 1.8, habitDev: 0.58, contextNovelty: 0.1, level: 'L1', isContextChange: false },
      { session: 3, label: 'S-111', evidence: 3.4, habitDev: 0.72, contextNovelty: 0.15, level: 'L2', isContextChange: false },
      { session: 4, label: 'S-112', evidence: 4.8, habitDev: 0.76, contextNovelty: 0.12, level: 'L2', isContextChange: false },
      { session: 5, label: 'S-113', evidence: 5.9, habitDev: 0.79, contextNovelty: 0.15, level: 'L3', isContextChange: false },
      { session: 6, label: 'S-114', evidence: 6.84, habitDev: 0.74, contextNovelty: 0.15, level: 'L3', isContextChange: false },
    ],
  },
  {
    id: 'R01089',
    name: 'Asha Patel',
    archetype: 'Electric Bike Specialist',
    cityHome: 'Bengaluru',
    currentZone: 'Indiranagar Hub (Z4)',
    status: 'active',
    currentLevel: 'L0',
    accountCreated: '11 months ago',
    sessionsScored: 210,
    passRate: 100.0,
    primaryDevice: 'OnePlus 11R 5G',
    os: 'OxygenOS 14',
    carrier: 'Jio 5G',
    ipAsn: 'AS55836',
    contextScore: 0.72,
    habitScore: 0.14,
    evidenceScore: 0.29,
    threshold: 3.12,
    reasons: [
      'relocated city from Pune to Bengaluru',
      'cellular ASN and IP range unfamiliar (+4.2σ)',
      'cycling pace and swipe interaction strictly align with registered baseline (-0.05σ)',
      'allow session (L0) and adapt geographic priors',
    ],
    explanation:
      'Rider permanently relocated from Pune to Bengaluru. IP subnet and city GPS are novel, yet interaction speed, braking deceleration, and map gestures match baseline within 0.14σ. Zero friction applied.',
    habits: [
      { name: 'Acceptance Latency', baseline: '1,620 ms', current: '1,680 ms', deltaZ: '+0.09σ', status: 'normal' },
      { name: 'Swipe Gesture Speed', baseline: '0.58 m/s', current: '0.59 m/s', deltaZ: '+0.04σ', status: 'normal' },
      { name: 'Tap Interval Cadence', baseline: '225 ms', current: '230 ms', deltaZ: '+0.08σ', status: 'normal' },
      { name: 'Route Suggested Deviation', baseline: '15.0%', current: '14.8%', deltaZ: '-0.02σ', status: 'normal' },
      { name: 'Transit Speed Variance', baseline: '19.8 km/h', current: '19.5 km/h', deltaZ: '-0.06σ', status: 'normal' },
      { name: 'Order Throughput / Hr', baseline: '3.4 / hr', current: '3.5 / hr', deltaZ: '+0.05σ', status: 'normal' },
    ],
    contextHistory: [
      { date: 'Today 12:20', device: 'OnePlus 11R', os: 'OxygenOS 14', city: 'Bengaluru', zone: 'Indiranagar', flag: 'City Move' },
      { date: 'Yesterday', device: 'OnePlus 11R', os: 'OxygenOS 14', city: 'Bengaluru', zone: 'Koramangala', flag: 'City Move' },
      { date: '1 week ago', device: 'OnePlus 11R', os: 'OxygenOS 14', city: 'Pune', zone: 'Kothrud', flag: 'Origin City' },
    ],
    timeline: [
      { session: 1, label: 'S-201', evidence: 0.2, habitDev: 0.1, contextNovelty: 0.05, level: 'L0', isContextChange: false },
      { session: 2, label: 'S-202', evidence: 0.3, habitDev: 0.12, contextNovelty: 0.05, level: 'L0', isContextChange: false },
      { session: 3, label: 'S-203', evidence: 0.32, habitDev: 0.15, contextNovelty: 0.72, level: 'L0', isContextChange: true, contextFlag: 'City Move' },
      { session: 4, label: 'S-204', evidence: 0.28, habitDev: 0.13, contextNovelty: 0.65, level: 'L0', isContextChange: false },
      { session: 5, label: 'S-205', evidence: 0.29, habitDev: 0.14, contextNovelty: 0.58, level: 'L0', isContextChange: false },
    ],
  },
  {
    id: 'R01432',
    name: 'Tariq Al-Mansoor',
    archetype: 'Automobile Fleet Courier',
    cityHome: 'Manchester',
    currentZone: 'Trafford Centre (Z5)',
    status: 'suspended',
    currentLevel: 'L4',
    accountCreated: '3 months ago',
    sessionsScored: 74,
    passRate: 54.0,
    primaryDevice: 'Emulated Android 12',
    os: 'Android 12 (SDK 31)',
    carrier: 'Datacenter VPN (M247)',
    ipAsn: 'AS9009',
    contextScore: 0.94,
    habitScore: 0.92,
    evidenceScore: 8.95,
    threshold: 3.12,
    reasons: [
      'impossible tap interval (82 ms) indicative of automated clicker/script',
      'datacenter hosting IP ASN (AS9009 M247 Europe)',
      'failed 2 consecutive biometric selfie challenges',
      'evidence accumulator 8.95 (exceeds L4 suspension boundary 7.8)',
    ],
    explanation:
      'High-velocity bot automation and proxy IP detected. Interaction latency is physically impossible for human drivers (82ms), and the user failed two consecutive live liveness checks. Dispatch suspended pending ID upload.',
    habits: [
      { name: 'Acceptance Latency', baseline: '2,200 ms', current: '110 ms', deltaZ: '-4.80σ', status: 'severe' },
      { name: 'Swipe Gesture Speed', baseline: '0.45 m/s', current: '0.01 m/s', deltaZ: '-5.20σ', status: 'severe' },
      { name: 'Tap Interval Cadence', baseline: '260 ms', current: '82 ms', deltaZ: '-4.95σ', status: 'severe' },
      { name: 'Route Suggested Deviation', baseline: '9.2%', current: '78.5%', deltaZ: '+5.40σ', status: 'severe' },
      { name: 'Transit Speed Variance', baseline: '35.0 km/h', current: '68.4 km/h', deltaZ: '+4.10σ', status: 'severe' },
      { name: 'Order Throughput / Hr', baseline: '2.5 / hr', current: '7.8 / hr', deltaZ: '+5.10σ', status: 'severe' },
    ],
    contextHistory: [
      { date: 'Today 10:04', device: 'Emulated SDK 31', os: 'Android 12', city: 'Manchester', zone: 'Trafford', flag: 'Bot Script' },
      { date: 'Yesterday 14:20', device: 'Emulated SDK 31', os: 'Android 12', city: 'Manchester', zone: 'Trafford', flag: 'Proxy IP' },
    ],
    timeline: [
      { session: 1, label: 'S-70', evidence: 1.5, habitDev: 0.45, contextNovelty: 0.4, level: 'L1', isContextChange: false },
      { session: 2, label: 'S-71', evidence: 3.8, habitDev: 0.85, contextNovelty: 0.8, level: 'L2', isContextChange: false },
      { session: 3, label: 'S-72', evidence: 5.9, habitDev: 0.91, contextNovelty: 0.9, level: 'L3', isContextChange: false },
      { session: 4, label: 'S-73', evidence: 7.4, habitDev: 0.94, contextNovelty: 0.92, level: 'L4', isContextChange: false },
      { session: 5, label: 'S-74', evidence: 8.95, habitDev: 0.92, contextNovelty: 0.94, level: 'L4', isContextChange: false },
    ],
  },
]

export const RidersInvestigationPage: React.FC = () => {
  const [selectedRiderId, setSelectedRiderId] = useState<string>('R00007')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [actionFeedback, setActionFeedback] = useState<string | null>(null)

  const selectedRider = RIDERS.find((r) => r.id === selectedRiderId) || RIDERS[0]

  const filteredRiders = RIDERS.filter((rider) => {
    const matchesSearch =
      rider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rider.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rider.cityHome.toLowerCase().includes(searchQuery.toLowerCase())

    if (statusFilter === 'all') return matchesSearch
    if (statusFilter === 'watch') return matchesSearch && (rider.status === 'watch' || rider.currentLevel === 'L1')
    if (statusFilter === 'stepup') return matchesSearch && (rider.status === 'pending_stepup' || rider.currentLevel === 'L2')
    if (statusFilter === 'review') return matchesSearch && (rider.status === 'under_review' || rider.currentLevel === 'L3')
    if (statusFilter === 'suspended') return matchesSearch && (rider.status === 'suspended' || rider.currentLevel === 'L4')
    if (statusFilter === 'active') return matchesSearch && rider.status === 'active'
    return matchesSearch
  })

  const triggerAction = (msg: string) => {
    setActionFeedback(msg)
    setTimeout(() => {
      setActionFeedback(null)
    }, 3500)
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Breadcrumb Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            <span>Investigation</span>
            <span>/</span>
            <span className="text-[#0F3B2C] dark:text-emerald-400">Rider Longitudinal Dossier</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Rider Identity & Behavioral Investigation
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Deep-dive multi-session evidence accumulator, context marker history, and kinetic motor baseline calibration.
          </p>
        </div>

        {/* Global Action Feedback Toast */}
        {actionFeedback && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0F3B2C] text-white text-xs shadow-md animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
            <span>{actionFeedback}</span>
          </div>
        )}
      </div>

      {/* Main Grid: Left Rider Selector (w-80) | Right Detailed Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Rider Roster & Search (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by ID, name, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-border/70 bg-secondary/40 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F3B2C]"
              />
            </div>

            {/* Status Filter Chips */}
            <div className="flex flex-wrap gap-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'active', label: 'Active (L0)' },
                { id: 'stepup', label: 'Step-Up (L2)' },
                { id: 'review', label: 'Review (L3)' },
                { id: 'suspended', label: 'Suspended (L4)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors',
                    statusFilter === tab.id
                      ? 'bg-[#0F3B2C] text-white'
                      : 'bg-secondary/60 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rider Cards List */}
          <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
            {filteredRiders.map((rider) => {
              const isSelected = rider.id === selectedRider.id
              return (
                <div
                  key={rider.id}
                  onClick={() => setSelectedRiderId(rider.id)}
                  className={cn(
                    'p-3.5 rounded-xl border transition-all cursor-pointer text-left',
                    isSelected
                      ? 'border-[#0F3B2C] bg-[#0F3B2C]/5 dark:bg-emerald-500/10 shadow-xs ring-1 ring-[#0F3B2C]'
                      : 'border-border/70 bg-card hover:border-border hover:bg-secondary/30'
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-foreground">{rider.id}</span>
                      <span className="text-xs font-semibold text-foreground truncate max-w-[110px]">
                        {rider.name}
                      </span>
                    </div>
                    <RiskBadge decision={rider.currentLevel} size="sm" />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2">
                    <span className="truncate">{rider.archetype}</span>
                    <span className="font-mono">{rider.cityHome}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono">
                      <span>Evidence Accumulator</span>
                      <span className={cn('font-bold', rider.evidenceScore >= rider.threshold ? 'text-amber-600' : 'text-foreground')}>
                        {rider.evidenceScore.toFixed(2)} / {rider.threshold.toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-300',
                          rider.evidenceScore >= rider.threshold ? 'bg-amber-500' : 'bg-emerald-500'
                        )}
                        style={{ width: `${Math.min(100, (rider.evidenceScore / (rider.threshold * 1.5)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Column: Selected Rider Detailed Dossier (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Header Card: Identity, Device Fingerprint & Quick Actions */}
          <div className="p-5 rounded-2xl border border-border/80 bg-card shadow-xs space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#0F3B2C] text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                  {selectedRider.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-bold text-foreground">{selectedRider.name}</h2>
                    <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-secondary text-foreground font-semibold">
                      {selectedRider.id}
                    </span>
                    <RiskBadge decision={selectedRider.currentLevel} size="md" showAction />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                      {selectedRider.archetype}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      {selectedRider.cityHome} — {selectedRider.currentZone}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      {selectedRider.accountCreated}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => triggerAction(`L2 biometric selfie challenge dispatched to ${selectedRider.name}`)}
                  className="px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Dispatch Selfie</span>
                </button>
                <button
                  onClick={() => triggerAction(`Baseline reset & retraining queued for ${selectedRider.name}`)}
                  className="px-3 py-1.5 rounded-xl border border-border/70 bg-secondary text-foreground hover:bg-secondary/80 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Baseline</span>
                </button>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border/60">
              <div className="p-3 rounded-xl bg-secondary/30 border border-border/60">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">Evidence Score</div>
                <div className="text-base font-bold font-mono text-foreground mt-0.5">
                  {selectedRider.evidenceScore.toFixed(2)}{' '}
                  <span className="text-[10px] text-muted-foreground font-normal">/ {selectedRider.threshold} th</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-secondary/30 border border-border/60">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">Context Novelty</div>
                <div className="text-base font-bold font-mono text-foreground mt-0.5">
                  {(selectedRider.contextScore * 100).toFixed(0)}%
                </div>
              </div>

              <div className="p-3 rounded-xl bg-secondary/30 border border-border/60">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">Habit Deviation</div>
                <div className="text-base font-bold font-mono text-foreground mt-0.5">
                  {(selectedRider.habitScore * 100).toFixed(0)}%
                </div>
              </div>

              <div className="p-3 rounded-xl bg-secondary/30 border border-border/60">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">Sessions Scored</div>
                <div className="text-base font-bold font-mono text-foreground mt-0.5">
                  {selectedRider.sessionsScored}{' '}
                  <span className="text-[10px] text-emerald-600 font-normal">({selectedRider.passRate}% pass)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Plain-English Explanation Banner */}
          <div className="p-4 rounded-xl border border-border/80 bg-secondary/30 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Info className="w-4 h-4 text-[#0F3B2C] dark:text-emerald-400" />
              <span>Calibrated Engine Assessment</span>
            </div>
            <p className="text-xs text-foreground/90 leading-relaxed font-sans">{selectedRider.explanation}</p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {selectedRider.reasons.map((r, i) => (
                <span
                  key={i}
                  className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-card border border-border/70 text-foreground"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>

          {/* 30-Day Longitudinal Session Timeline Chart */}
          <div className="p-5 rounded-2xl border border-border/80 bg-card shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-foreground">Multi-Session Longitudinal Trajectory</h3>
                <p className="text-xs text-muted-foreground">
                  Session-by-session evidence accumulator against the calibrated threshold ($h_2 = 3.12$).
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#0F3B2C] dark:bg-emerald-400 inline-block" />
                  Evidence
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-amber-500 inline-block border-t border-dashed" />
                  Threshold (3.12)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-sky-500 inline-block" />
                  Habit Dev
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={selectedRider.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/40" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '0.75rem',
                      fontSize: '11px',
                    }}
                  />
                  <ReferenceLine
                    y={selectedRider.threshold}
                    stroke="#F59E0B"
                    strokeDasharray="4 4"
                    label={{ value: 'Step-up Gate (3.12)', fill: '#F59E0B', fontSize: 10, position: 'right' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="evidence"
                    stroke="#0F3B2C"
                    strokeWidth={2.5}
                    dot={{ fill: '#0F3B2C', r: 3.5 }}
                    activeDot={{ r: 6 }}
                    name="Evidence Accumulator"
                  />
                  <Line
                    type="monotone"
                    dataKey="habitDev"
                    stroke="#0284C7"
                    strokeWidth={1.5}
                    dot={false}
                    name="Habit Deviation"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t border-border/50">
              <span>* Notice: Context changes without habit drift do NOT accumulate evidence (zero false lockout).</span>
              <span className="font-mono text-emerald-600 font-semibold">Engine: <span className="underline">tj-1.0</span></span>
            </div>
          </div>

          {/* Decoupled Habit Baseline Comparison Table */}
          <div className="p-5 rounded-2xl border border-border/80 bg-card shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Decoupled Motor Habit vs Baseline Profile</h3>
                <p className="text-xs text-muted-foreground">
                  Kinetic interaction fingerprint compared against the rider's frozen 30-day kernel distribution.
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-secondary font-mono text-foreground font-semibold">
                6 Telemetry Dimensions
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/70 text-muted-foreground text-left">
                    <th className="py-2.5 font-semibold">Habit Signal</th>
                    <th className="py-2.5 font-semibold">Historical 30d Baseline</th>
                    <th className="py-2.5 font-semibold">Current Session</th>
                    <th className="py-2.5 font-semibold font-mono">Z-Score Deviation</th>
                    <th className="py-2.5 font-semibold text-right">Diagnosis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 font-sans">
                  {selectedRider.habits.map((item, idx) => (
                    <tr key={idx} className="hover:bg-secondary/20 transition-colors">
                      <td className="py-2.5 font-medium text-foreground">{item.name}</td>
                      <td className="py-2.5 font-mono text-muted-foreground">{item.baseline}</td>
                      <td className="py-2.5 font-mono font-semibold text-foreground">{item.current}</td>
                      <td className="py-2.5 font-mono font-bold">
                        <span
                          className={cn(
                            item.status === 'severe'
                              ? 'text-rose-600 dark:text-rose-400'
                              : item.status === 'drift'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          )}
                        >
                          {item.deltaZ}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <span
                          className={cn(
                            'text-[10px] px-2 py-0.5 rounded-full font-medium',
                            item.status === 'severe'
                              ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                              : item.status === 'drift'
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          )}
                        >
                          {item.status === 'severe' ? 'Critical Drift' : item.status === 'drift' ? 'Mild Variance' : 'Calibrated'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Context Change Log */}
          <div className="p-5 rounded-2xl border border-border/80 bg-card shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Hardware & Context Change Log</h3>
                <p className="text-xs text-muted-foreground">
                  Chronological trail of operating systems, hardware serials, and cellular gateways.
                </p>
              </div>
              <span className="text-xs text-muted-foreground">Auto-whitelisted on verified selfie</span>
            </div>

            <div className="space-y-2">
              {selectedRider.contextHistory.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-secondary/20 text-xs font-mono"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">{entry.date}</span>
                    <span className="font-semibold text-foreground">{entry.device}</span>
                    <span className="text-muted-foreground">({entry.os})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-foreground">{entry.city} · {entry.zone}</span>
                    <span className="px-2 py-0.5 rounded-md bg-secondary text-foreground text-[10px] font-semibold">
                      {entry.flag}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
