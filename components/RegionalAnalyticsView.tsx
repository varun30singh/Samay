'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Download,
  RotateCcw,
  AlertTriangle,
  TrendingUp,
  MapPin,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  ArrowRight
} from 'lucide-react';

interface Kpis {
  totalApplications: number;
  pendingApplications: number;
  overdueApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  returnedForDeficiency: number;
  awaitingEvc: number;
  avgProcessingTimeDays: number | null;
  onTimeRatePercent: number | null;
  totalInstitutions: number;
}

interface RegionMetric {
  region: string;
  totalApplications: number;
  pendingApplications: number;
  overdueApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  returnedForDeficiency: number;
  awaitingEvc: number;
  avgProcessingTimeDays: number | null;
  onTimeRatePercent: number | null;
  activeInstitutions: number;
}

interface DrilldownApp {
  id: string;
  applicationNumber: string;
  institutionName: string;
  institutionCode: string;
  region: string;
  state: string;
  stage: string;
  applicationType: string;
  academicYear: string;
  requestedIntake: number;
  submittedAt: string | null;
  statutoryDeadline: string | null;
  finalDecisionAt: string | null;
  isOverdue: boolean;
  metadata?: Record<string, unknown>;
}

const REGIONS = [
  'All Regions',
  'Western',
  'Northern',
  'Southern',
  'Eastern',
  'Central',
  'South-Western',
  'South-Central',
  'North-Western'
];

const STAGE_OPTIONS = [
  { value: 'all', label: 'All Stages' },
  { value: 'pending', label: 'All Pending (Non-Terminal)' },
  { value: 'overdue', label: 'Overdue Pending Only' },
  { value: 'under_scrutiny', label: 'Under Scrutiny' },
  { value: 'deficiency_raised', label: 'Deficiency Raised' },
  { value: 'ready_for_evc', label: 'Ready for EVC' },
  { value: 'evc_scheduled', label: 'EVC Scheduled' },
  { value: 'evc_completed', label: 'EVC Completed' },
  { value: 'under_final_review', label: 'Under Final Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' }
];

const WORKFLOW_OPTIONS = [
  { value: 'all', label: 'All Workflows' },
  { value: 'aph-scrutiny-only', label: 'Template A: Only Scrutiny (EoA)' },
  { value: 'aph-scrutiny-evc', label: 'Template B: Scrutiny + EVC' },
  { value: 'aph-evc-sac-shc', label: 'Template C: EVC + SAC/SHC' },
  { value: 'aph-evc-only', label: 'Template D: Only EVC (Surprise/Fast-Track)' }
];

export default function RegionalAnalyticsView() {
  const { currentUser, currentRole } = useApp();

  // Filters
  const [selectedRegion, setSelectedRegion] = useState<string>('All Regions');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [isOverdueOnly, setIsOverdueOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data states
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [regionComparison, setRegionComparison] = useState<RegionMetric[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [charts, setCharts] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sorting
  const [sortField, setSortField] = useState<keyof RegionMetric>('totalApplications');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Drilldown modal state
  const [drilldownRegion, setDrilldownRegion] = useState<string | null>(null);
  const [drilldownApps, setDrilldownApps] = useState<DrilldownApp[]>([]);
  const [isDrilldownLoading, setIsDrilldownLoading] = useState<boolean>(false);

  const isRegionalOfficer = currentRole === 'regional_officer';
  const officerRegion = currentUser?.region || null;

  const [triggerRefresh, setTriggerRefresh] = useState<number>(0);

  useEffect(() => {
    let isCancelled = false;

    const params = new URLSearchParams();
    if (selectedRegion !== 'All Regions') params.append('region', selectedRegion);
    if (selectedStage !== 'all') params.append('stage', selectedStage);
    if (selectedWorkflow !== 'all') params.append('workflowType', selectedWorkflow);
    if (selectedYear !== 'all') params.append('academicYear', selectedYear);
    if (isOverdueOnly) params.append('isOverdueOnly', 'true');
    if (searchQuery.trim()) params.append('search', searchQuery.trim());

    const headers: Record<string, string> = {};
    if (currentUser?.token) {
      headers['Authorization'] = `Bearer ${currentUser.token}`;
    }

    fetch(`/api/reports/regional?${params.toString()}`, { headers })
      .then(res => res.json())
      .then(json => {
        if (isCancelled) return;
        if (json.success && json.data) {
          setKpis(json.data.kpis);
          setRegionComparison(json.data.regionComparison || []);
          setCharts(json.data.charts);
        } else {
          setError(json.error || 'Failed to load regional analytics');
        }
      })
      .catch(err => {
        if (isCancelled) return;
        setError(err instanceof Error ? err.message : 'Network communication error');
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedRegion, selectedStage, selectedWorkflow, selectedYear, isOverdueOnly, searchQuery, currentUser, triggerRefresh]);

  const handleApply = () => {
    setIsLoading(true);
    setTriggerRefresh(prev => prev + 1);
  };

  const handleResetFilters = () => {
    setSelectedRegion('All Regions');
    setSelectedStage('all');
    setSelectedWorkflow('all');
    setSelectedYear('all');
    setIsOverdueOnly(false);
    setSearchQuery('');
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (selectedRegion !== 'All Regions') params.append('region', selectedRegion);
      if (selectedStage !== 'all') params.append('stage', selectedStage);
      if (selectedWorkflow !== 'all') params.append('workflowType', selectedWorkflow);
      if (selectedYear !== 'all') params.append('academicYear', selectedYear);
      if (isOverdueOnly) params.append('isOverdueOnly', 'true');
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const headers: Record<string, string> = {};
      if (currentUser?.token) {
        headers['Authorization'] = `Bearer ${currentUser.token}`;
      }

      const res = await fetch(`/api/reports/regional/export?${params.toString()}`, { headers });
      if (!res.ok) throw new Error('Export request failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AICTE_Regional_Performance_Report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenDrilldown = async (region: string) => {
    setDrilldownRegion(region);
    setIsDrilldownLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (currentUser?.token) {
        headers['Authorization'] = `Bearer ${currentUser.token}`;
      }
      const res = await fetch(`/api/reports/regional?region=${encodeURIComponent(region)}&includeList=true&pageSize=50`, { headers });
      const json = await res.json();
      if (json.success && json.data?.applications) {
        setDrilldownApps(json.data.applications);
      } else {
        setDrilldownApps([]);
      }
    } catch {
      setDrilldownApps([]);
    } finally {
      setIsDrilldownLoading(false);
    }
  };

  // Sort region comparison
  const sortedRegions = [...regionComparison].sort((a, b) => {
    const valA = a[sortField] ?? 0;
    const valB = b[sortField] ?? 0;
    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortDirection === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
  });

  const toggleSort = (field: keyof RegionMetric) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* 4px Continuous Sovereign Indian Tricolour Bar */}
      <div className="tricolour-bar rounded-full" />

      {/* Demo Mode Notice Banner */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-700 dark:text-amber-300 text-xs font-medium">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            <strong>DEMO MODE</strong> — Analytics contain simulated institutional records alongside live statutory database records.
          </span>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-500/20 rounded">
          Simulation Isolated
        </span>
      </div>

      {/* Top Header Card */}
      <div className="saas-card-glow p-6 sm:p-8 rounded-xl border border-[#CFE3D3] dark:border-[#2B4478] bg-white dark:bg-[#0B1B3A]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/20 shadow-2xs">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">
                Regulatory Performance Analytics (AICTE APH)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              Regional Performance & Analytics
            </h1>
            <p className="text-xs text-gray-600 dark:text-gray-300 max-w-3xl">
              Monitor application pendency, processing performance, officer workload and compliance across regions.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportCsv}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {isExporting ? 'Exporting...' : 'Export Filtered CSV'}
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Region */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
              AICTE Region
            </label>
            <select
              value={isRegionalOfficer && officerRegion ? officerRegion : selectedRegion}
              disabled={Boolean(isRegionalOfficer && officerRegion)}
              onChange={e => setSelectedRegion(e.target.value)}
              className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
            >
              {REGIONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
              Statutory Stage
            </label>
            <select
              value={selectedStage}
              onChange={e => setSelectedStage(e.target.value)}
              className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
            >
              {STAGE_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Workflow */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
              APH Workflow
            </label>
            <select
              value={selectedWorkflow}
              onChange={e => setSelectedWorkflow(e.target.value)}
              className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
            >
              {WORKFLOW_OPTIONS.map(w => (
                <option key={w.value} value={w.value}>{w.label}</option>
              ))}
            </select>
          </div>

          {/* Academic Year */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
              Academic Year
            </label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All Academic Years</option>
              <option value="2026-2027">2026-2027 (Active)</option>
              <option value="2025-2026">2025-2026 (Archived)</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
              Search Text
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-400" />
              <input
                type="text"
                placeholder="App # or College..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs py-1.5 pl-8 pr-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-end gap-2">
            <button
              onClick={handleApply}
              className="flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg bg-primary dark:bg-emerald-600 text-white hover:opacity-90 transition-opacity"
            >
              Apply
            </button>
            <button
              onClick={handleResetFilters}
              title="Reset Filters"
              className="p-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 8 Statutory KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* 1. Total */}
        <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#09162F] shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400">Total Apps</span>
          <p className="text-xl font-extrabold text-gray-900 dark:text-white mt-1">
            {isLoading ? '...' : (kpis?.totalApplications ?? 0)}
          </p>
          <span className="text-[10px] text-gray-400">{kpis?.totalInstitutions ?? 0} Institutions</span>
        </div>

        {/* 2. Pending */}
        <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 dark:text-amber-300">Pending</span>
          <p className="text-xl font-extrabold text-amber-800 dark:text-amber-200 mt-1">
            {isLoading ? '...' : (kpis?.pendingApplications ?? 0)}
          </p>
          <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80">Active in pipeline</span>
        </div>

        {/* 3. Overdue */}
        <div className="p-3.5 rounded-xl border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-red-700 dark:text-red-300">Overdue</span>
          <p className="text-xl font-extrabold text-red-600 dark:text-red-400 mt-1">
            {isLoading ? '...' : (kpis?.overdueApplications ?? 0)}
          </p>
          <span className="text-[10px] text-red-600/80 dark:text-red-400/80">Past SLA deadline</span>
        </div>

        {/* 4. Approved */}
        <div className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 dark:text-emerald-300">Approved</span>
          <p className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-1">
            {isLoading ? '...' : (kpis?.approvedApplications ?? 0)}
          </p>
          <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">EoA Granted</span>
        </div>

        {/* 5. Rejected */}
        <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#09162F] shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400">Rejected</span>
          <p className="text-xl font-extrabold text-gray-900 dark:text-white mt-1">
            {isLoading ? '...' : (kpis?.rejectedApplications ?? 0)}
          </p>
          <span className="text-[10px] text-gray-400">Formal Grounds</span>
        </div>

        {/* 6. Deficiency Raised */}
        <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/20 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-purple-700 dark:text-purple-300">Deficiency</span>
          <p className="text-xl font-extrabold text-purple-800 dark:text-purple-200 mt-1">
            {isLoading ? '...' : (kpis?.returnedForDeficiency ?? 0)}
          </p>
          <span className="text-[10px] text-purple-600/80 dark:text-purple-400/80">With College</span>
        </div>

        {/* 7. Awaiting EVC */}
        <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 dark:text-blue-300">Awaiting EVC</span>
          <p className="text-xl font-extrabold text-blue-800 dark:text-blue-200 mt-1">
            {isLoading ? '...' : (kpis?.awaitingEvc ?? 0)}
          </p>
          <span className="text-[10px] text-blue-600/80 dark:text-blue-400/80">Inspection queue</span>
        </div>

        {/* 8. On-Time Rate & Avg Days */}
        <div className="p-3.5 rounded-xl border border-cyan-200 dark:border-cyan-900 bg-cyan-50/50 dark:bg-cyan-950/20 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-800 dark:text-cyan-300">On-Time Rate</span>
          <p className="text-xl font-extrabold text-cyan-800 dark:text-cyan-200 mt-1">
            {isLoading ? '...' : (kpis?.onTimeRatePercent !== null && kpis?.onTimeRatePercent !== undefined ? `${kpis.onTimeRatePercent}%` : 'N/A')}
          </p>
          <span className="text-[10px] text-cyan-700/80 dark:text-cyan-400/80">
            {kpis?.avgProcessingTimeDays !== null && kpis?.avgProcessingTimeDays !== undefined ? `~${kpis.avgProcessingTimeDays}d avg` : 'No data'}
          </span>
        </div>
      </div>

      {/* 5 Analytical Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Status Distribution */}
        <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#09162F] shadow-xs">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            1. Stage & Status Distribution
          </h3>
          <p className="text-[11px] text-gray-500 mb-4">Volume breakdown across statutory stages</p>

          <div className="space-y-2 mt-2">
            {charts?.statusDistribution?.map((item: { stage: string; label: string; count: number; color: string }) => {
              const total = kpis?.totalApplications || 1;
              const pct = Math.round((item.count / total) * 100);
              return (
                <div key={item.stage} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
                    <span className="text-gray-500 font-semibold">{item.count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: Regional Pendency Comparison */}
        <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#09162F] shadow-xs">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            2. Regional Pendency Comparison
          </h3>
          <p className="text-[11px] text-gray-500 mb-4">Active pending vs. overdue applications per region</p>

          <div className="space-y-2.5 mt-2">
            {charts?.regionalPendency?.map((item: { region: string; pending: number; overdue: number; approved: number }) => (
              <div key={item.region} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 w-28 truncate">{item.region}</span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Pending: <strong>{item.pending}</strong></span>
                  <span className="text-red-600 dark:text-red-400 font-medium">Overdue: <strong>{item.overdue}</strong></span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Approved: <strong>{item.approved}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 3: Regional Velocity & On-Time Rate */}
        <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#09162F] shadow-xs">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            3. Regional Processing Velocity & SLA Rate
          </h3>
          <p className="text-[11px] text-gray-500 mb-4">Average turnaround days & statutory on-time compliance</p>

          <div className="space-y-2 mt-2">
            {charts?.regionalVelocity?.map((item: { region: string; avgDays: number | null; onTimeRate: number | null }) => (
              <div key={item.region} className="flex items-center justify-between p-2 rounded-lg border border-gray-100 dark:border-gray-800/80">
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{item.region}</span>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-gray-500">
                    Avg Days: <strong className="text-gray-900 dark:text-white">{item.avgDays !== null ? `${item.avgDays}d` : 'N/A'}</strong>
                  </span>
                  <span className="text-gray-500">
                    On-Time: <strong className="text-emerald-600 dark:text-emerald-400">{item.onTimeRate !== null ? `${item.onTimeRate}%` : 'N/A'}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 4: Submissions vs Completions Timeline */}
        <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#09162F] shadow-xs">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            4. Submissions vs. Completions Timeline
          </h3>
          <p className="text-[11px] text-gray-500 mb-4">Monthly intake velocity vs determination throughput</p>

          <div className="space-y-3 mt-4">
            {charts?.timelineTrends?.map((item: { period: string; submitted: number; completed: number }) => (
              <div key={item.period} className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-gray-700 dark:text-gray-300 font-semibold">{item.period}</span>
                  <span className="text-xs text-gray-500">
                    Inflow: <strong>{item.submitted}</strong> | Outflow: <strong>{item.completed}</strong>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 h-2">
                  <div className="bg-blue-500 rounded-full h-full" style={{ width: `${Math.min(100, item.submitted * 20)}%` }} />
                  <div className="bg-emerald-500 rounded-full h-full" style={{ width: `${Math.min(100, item.completed * 20)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 5: Workflow Combination Distribution */}
        <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#09162F] shadow-xs lg:col-span-2">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
            5. APH Prescribed Workflow Distribution
          </h3>
          <p className="text-[11px] text-gray-500 mb-4">Volume breakdown across the 4 APH template combinations</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {charts?.workflowDistribution?.map((item: { workflow: string; count: number }) => (
              <div key={item.workflow} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40">
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 line-clamp-1">{item.workflow}</span>
                <p className="text-lg font-extrabold text-gray-900 dark:text-white mt-1">{item.count}</p>
                <span className="text-[10px] text-gray-400">Applications routed</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Regional Comparison Table */}
      <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#09162F] shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Regional Performance Comparison Table</h2>
            <p className="text-xs text-gray-500">Cross-jurisdictional compliance, pendency metrics and turnaround times</p>
          </div>
          <span className="text-xs text-gray-400">Click column header to sort • Click row to drill down</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 border-y border-gray-200 dark:border-gray-700 uppercase tracking-wider text-[10px]">
              <tr>
                <th onClick={() => toggleSort('region')} className="py-2.5 px-3 cursor-pointer hover:text-emerald-600">
                  <div className="flex items-center gap-1">Region {sortField === 'region' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                </th>
                <th onClick={() => toggleSort('totalApplications')} className="py-2.5 px-3 cursor-pointer hover:text-emerald-600">
                  <div className="flex items-center gap-1">Total {sortField === 'totalApplications' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                </th>
                <th onClick={() => toggleSort('activeInstitutions')} className="py-2.5 px-3 cursor-pointer hover:text-emerald-600">
                  <div className="flex items-center gap-1">Institutions {sortField === 'activeInstitutions' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                </th>
                <th onClick={() => toggleSort('pendingApplications')} className="py-2.5 px-3 cursor-pointer hover:text-emerald-600 text-amber-600 dark:text-amber-400">
                  <div className="flex items-center gap-1">Pending {sortField === 'pendingApplications' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                </th>
                <th onClick={() => toggleSort('overdueApplications')} className="py-2.5 px-3 cursor-pointer hover:text-emerald-600 text-red-600 dark:text-red-400">
                  <div className="flex items-center gap-1">Overdue {sortField === 'overdueApplications' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                </th>
                <th onClick={() => toggleSort('approvedApplications')} className="py-2.5 px-3 cursor-pointer hover:text-emerald-600 text-emerald-600 dark:text-emerald-400">
                  <div className="flex items-center gap-1">Approved {sortField === 'approvedApplications' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                </th>
                <th onClick={() => toggleSort('rejectedApplications')} className="py-2.5 px-3 cursor-pointer hover:text-emerald-600">
                  <div className="flex items-center gap-1">Rejected {sortField === 'rejectedApplications' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                </th>
                <th onClick={() => toggleSort('returnedForDeficiency')} className="py-2.5 px-3 cursor-pointer hover:text-emerald-600">
                  <div className="flex items-center gap-1">Deficiency {sortField === 'returnedForDeficiency' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                </th>
                <th onClick={() => toggleSort('awaitingEvc')} className="py-2.5 px-3 cursor-pointer hover:text-emerald-600">
                  <div className="flex items-center gap-1">Awaiting EVC {sortField === 'awaitingEvc' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                </th>
                <th onClick={() => toggleSort('avgProcessingTimeDays')} className="py-2.5 px-3 cursor-pointer hover:text-emerald-600">
                  <div className="flex items-center gap-1">Avg Days {sortField === 'avgProcessingTimeDays' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                </th>
                <th onClick={() => toggleSort('onTimeRatePercent')} className="py-2.5 px-3 cursor-pointer hover:text-emerald-600">
                  <div className="flex items-center gap-1">On-Time % {sortField === 'onTimeRatePercent' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                </th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {sortedRegions.map(r => (
                <tr
                  key={r.region}
                  onClick={() => handleOpenDrilldown(r.region)}
                  className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-3 font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {r.region}
                  </td>
                  <td className="py-3 px-3 font-semibold text-gray-800 dark:text-gray-200">{r.totalApplications}</td>
                  <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{r.activeInstitutions}</td>
                  <td className="py-3 px-3 font-semibold text-amber-700 dark:text-amber-400">{r.pendingApplications}</td>
                  <td className="py-3 px-3 font-bold text-red-600 dark:text-red-400">
                    {r.overdueApplications > 0 ? (
                      <span className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/60">{r.overdueApplications}</span>
                    ) : (
                      '0'
                    )}
                  </td>
                  <td className="py-3 px-3 font-semibold text-emerald-700 dark:text-emerald-400">{r.approvedApplications}</td>
                  <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{r.rejectedApplications}</td>
                  <td className="py-3 px-3 text-purple-700 dark:text-purple-400">{r.returnedForDeficiency}</td>
                  <td className="py-3 px-3 text-blue-700 dark:text-blue-400">{r.awaitingEvc}</td>
                  <td className="py-3 px-3 text-gray-700 dark:text-gray-300 font-medium">
                    {r.avgProcessingTimeDays !== null ? `${r.avgProcessingTimeDays}d` : '--'}
                  </td>
                  <td className="py-3 px-3 text-emerald-700 dark:text-emerald-400 font-bold">
                    {r.onTimeRatePercent !== null ? `${r.onTimeRatePercent}%` : '--'}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700">
                      View Apps <ArrowRight className="w-3 h-3" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drilldown Modal */}
      {drilldownRegion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0B1B3A] border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  {drilldownRegion} Region Applications Drilldown
                </h3>
                <p className="text-xs text-gray-500">Live applications, stage statuses and statutory deadlines</p>
              </div>
              <button
                onClick={() => setDrilldownRegion(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {isDrilldownLoading ? (
                <div className="py-12 text-center text-xs text-gray-400">Loading applications...</div>
              ) : drilldownApps.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-400">No applications matching criteria in this region.</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                  {drilldownApps.map(app => (
                    <div key={app.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 dark:text-white">{app.applicationNumber}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                            {app.applicationType.replace(/_/g, ' ')}
                          </span>
                          {app.isOverdue && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                              OVERDUE
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-xs mt-0.5">
                          {app.institutionName} ({app.institutionCode}) • {app.state}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        <div className="text-right">
                          <span className="block font-semibold text-gray-800 dark:text-gray-200 uppercase text-[10px]">
                            {app.stage.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            Deadline: {app.statutoryDeadline || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-800 flex justify-end">
              <button
                onClick={() => setDrilldownRegion(null)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
