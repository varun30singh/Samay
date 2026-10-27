'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Application } from '@/lib/types';
import AdvisoryPopover from '@/components/AdvisoryPopover';
import {
  Search,
  Building2,
  Download,
  Eye,
  CheckSquare,
  Square,
  Send,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Check,
  X,
  FileText,
  Clock,
  Layers,
  LayoutGrid,
  List,
  AlertCircle,
  GraduationCap,
  ArrowRight
} from 'lucide-react';

interface WorkflowDashboardProps {
  onSelectApplication: (app: Application) => void;
  onNavigate?: (tab: string) => void;
}

export default function WorkflowDashboard({ onSelectApplication, onNavigate }: WorkflowDashboardProps) {
  const {
    applications,
    currentRegion,
    simulatedDate,
    deficiencies,
    queueCoverageSummaries,
    dataQualityMetrics
  } = useApp();

  const overdueDeficienciesCount = deficiencies.filter(
    d => d.status !== 'Closed' && d.status !== 'Accepted' && new Date(d.dueDate) < new Date(simulatedDate)
  ).length;

  const uncoveredQueuesCount = queueCoverageSummaries.filter(q => q.hasUncoveredQueue).length;
  const dataIncompleteCount = dataQualityMetrics?.dataIncompleteCount || 0;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>('ALL');
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<string>('ALL');
  const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>('ALL');
  const [selectedDeficiencyFilter, setSelectedDeficiencyFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Bulk actions selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [toastMsg, setToastMsg] = useState('');

  const filteredApps = applications.filter((app) => {
    // Global region context
    if (currentRegion !== 'All' && app.region !== currentRegion) return false;

    // Local region dropdown
    if (selectedRegionFilter !== 'ALL' && app.region !== selectedRegionFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = app.institutionName.toLowerCase().includes(q);
      const matchId = app.id.toLowerCase().includes(q) || app.aictePermanentId.toLowerCase().includes(q);
      const matchState = app.state.toLowerCase().includes(q);
      if (!matchName && !matchId && !matchState) return false;
    }

    // Status Tab filtering
    if (selectedStatusTab === 'PENDING_SCRUTINY') {
      if (app.currentStage !== 'Scrutiny' && app.currentStage !== 'Re-Scrutiny') return false;
    } else if (selectedStatusTab === 'DEFICIENCIES') {
      const hasDeficiency = app.documents.some(d => d.validityStatus === 'Expiring Soon' || d.validityStatus === 'Expired' || d.remainingDays < 180);
      if (!hasDeficiency && app.riskStatus !== 'Will miss at current pace') return false;
    } else if (selectedStatusTab === 'RECOMMENDED_EVC') {
      if (app.currentStage !== 'EVC') return false;
    } else if (selectedStatusTab === 'APPEAL') {
      if (app.currentStage !== 'SAC/SHC' && app.currentStage !== 'Decision Pending') return false;
    }

    // Deficiency Filter dropdown
    if (selectedDeficiencyFilter === 'LAND') {
      const lease = app.documents.find(d => d.type === 'Land Lease Deed');
      if (!lease || lease.remainingDays > 365) return false;
    } else if (selectedDeficiencyFilter === 'FACULTY') {
      if (app.approvedIntake < 800) return false;
    } else if (selectedDeficiencyFilter === 'AFFIDAVIT') {
      const aff = app.documents.find(d => d.type === 'Fire Safety Certificate' || d.type === 'Building Plan NOC');
      if (!aff || aff.validityStatus === 'Valid') return false;
    }

    return true;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredApps.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredApps.map(a => a.id));
    }
  };

  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBulkRemind = () => {
    setToastMsg(`Dispatched automated compliance notice to ${selectedIds.length} technical institutions.`);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const handleBulkAssign = () => {
    setToastMsg(`Assigned ${selectedIds.length} applications to regional review roster.`);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const handleBulkEscalate = () => {
    setToastMsg(`Escalated ${selectedIds.length} overdue applications to Regional Bureau Officers.`);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const handleExportCSV = () => {
    const headers = ['Application ID', 'Institution Name', 'Permanent ID', 'Region', 'State', 'Type', 'Route', 'Current Stage', 'Intake', 'Risk Status', 'Risk Score', 'Officer'];
    const rows = filteredApps.map(a => [
      a.id,
      `"${a.institutionName}"`,
      a.aictePermanentId,
      a.region,
      a.state,
      `"${a.type}"`,
      `"${a.route}"`,
      a.currentStage,
      a.approvedIntake,
      a.riskStatus,
      a.delayRiskScore,
      `"${a.assignedOfficer}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AICTE_SAMAY_Register_${simulatedDate.split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col w-full gap-5 animate-fade-in pb-12">
      {/* Sovereign Tricolour Top Accent Ribbon */}
      <div className="tricolour-bar rounded-full" />

      {/* Breadcrumb & Screen Title Section */}
      <section className="flex flex-col gap-2 bg-surface-container-lowest dark:bg-[#12264D] rounded-xl p-4 sm:p-5 shadow-sm border border-[#CFE3D3]/60 dark:border-[#2B4478]">
        <nav aria-label="Official Breadcrumb" className="flex items-center gap-1.5 text-on-surface-variant dark:text-[#B8C5E0] text-xs font-semibold flex-wrap">
          <span className="flex items-center gap-1 text-primary dark:text-[#FF9933] font-bold">
            <Building2 className="w-3.5 h-3.5" />
            <span>SAMAY</span>
          </span>
          <span>›</span>
          <span>Approvals</span>
          <span>›</span>
          <span className="text-on-surface dark:text-white font-bold">Scrutiny Applications</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-1">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-on-surface dark:text-white tracking-tight">
              Institutional Approval Applications (2025–26)
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant dark:text-[#CBD5E1] mt-1 max-w-3xl">
              Review application dossiers, issue deficiency letters, and verify statutory compliances under APH norms.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-surface-container dark:bg-[#09162F] rounded-lg p-0.5 border border-[#CFE3D3] dark:border-[#2B4478]">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-all ${
                  viewMode === 'cards'
                    ? 'bg-primary dark:bg-[#FF9933] text-on-primary dark:text-[#0B1B3A] shadow-xs'
                    : 'text-on-surface-variant dark:text-[#CBD5E1] hover:text-on-surface'
                }`}
                title="Dossier Bento Cards View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Dossier Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-all ${
                  viewMode === 'table'
                    ? 'bg-primary dark:bg-[#FF9933] text-on-primary dark:text-[#0B1B3A] shadow-xs'
                    : 'text-on-surface-variant dark:text-[#CBD5E1] hover:text-on-surface'
                }`}
                title="Tabular Register View"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Table View</span>
              </button>
            </div>

            <button
              onClick={handleExportCSV}
              className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-surface-container dark:bg-[#09162F] hover:bg-surface-container-high text-on-surface dark:text-white font-bold text-xs flex items-center gap-1.5 border border-[#CFE3D3] dark:border-[#2B4478] transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-primary dark:text-[#FF9933]" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </section>

      {/* Regional Officer Tri-Card Action Monitor (Statutory Requirement) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <button
          type="button"
          onClick={() => onNavigate?.('deficiency-tracker')}
          className="text-left p-4 rounded-xl bg-surface-container-lowest dark:bg-[#12264D] hover:bg-surface-container dark:hover:bg-[#1A3366] border border-[#CFE3D3] dark:border-[#2B4478] shadow-sm transition-all group flex flex-col justify-between min-h-[100px] cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-[#B8C5E0]">
              Statutory Rectification
            </span>
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="my-1">
            <div className="text-2xl font-black text-red-600 dark:text-red-400 tabular-nums">
              {overdueDeficienciesCount}
            </div>
            <div className="text-xs font-bold text-on-surface dark:text-white">
              Deficiencies Overdue
            </div>
          </div>
          <span className="text-[10px] text-primary dark:text-[#FF9933] font-semibold flex items-center gap-1">
            <span>Manage deficiency closures</span>
            <ArrowRight className="w-3 h-3" />
          </span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate?.('coverage')}
          className="text-left p-4 rounded-xl bg-surface-container-lowest dark:bg-[#12264D] hover:bg-surface-container dark:hover:bg-[#1A3366] border border-[#CFE3D3] dark:border-[#2B4478] shadow-sm transition-all group flex flex-col justify-between min-h-[100px] cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-[#B8C5E0]">
              Queue Integrity
            </span>
            <UserCheck className="w-4 h-4 text-amber-600 dark:text-[#FF9933] group-hover:scale-110 transition-transform" />
          </div>
          <div className="my-1">
            <div className={`text-2xl font-black tabular-nums ${uncoveredQueuesCount > 0 ? 'text-amber-600 dark:text-[#FF9933]' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {uncoveredQueuesCount}
            </div>
            <div className="text-xs font-bold text-on-surface dark:text-white">
              Items Without Coverage
            </div>
          </div>
          <span className="text-[10px] text-primary dark:text-[#FF9933] font-semibold flex items-center gap-1">
            <span>Review officer delegations</span>
            <ArrowRight className="w-3 h-3" />
          </span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate?.('data-import')}
          className="text-left p-4 rounded-xl bg-surface-container-lowest dark:bg-[#12264D] hover:bg-surface-container dark:hover:bg-[#1A3366] border border-[#CFE3D3] dark:border-[#2B4478] shadow-sm transition-all group flex flex-col justify-between min-h-[100px] cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-[#B8C5E0]">
              Data Quality Audit
            </span>
            <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="my-1">
            <div className="text-2xl font-black text-on-surface dark:text-white tabular-nums">
              {dataIncompleteCount}
            </div>
            <div className="text-xs font-bold text-on-surface dark:text-white">
              Data Incomplete
            </div>
          </div>
          <span className="text-[10px] text-primary dark:text-[#FF9933] font-semibold flex items-center gap-1">
            <span>Open CSV ingestion & fixes</span>
            <ArrowRight className="w-3 h-3" />
          </span>
        </button>
      </div>

      {/* Live Compliance Quota Progress (Stitch Signature Widget) */}
      <section className="bg-surface-container dark:bg-[#12264D] rounded-xl p-4 shadow-sm border border-[#CFE3D3]/60 dark:border-[#2B4478]">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary dark:text-[#FF9933]" />
            <span className="text-sm font-bold text-on-surface dark:text-white">
              Cycle Progress & Statutory Deadlines
            </span>
            <AdvisoryPopover />
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded bg-primary dark:bg-[#FF9933] text-on-primary dark:text-[#0B1B3A]">
            Batch 1: 58% Cleared
          </span>
        </div>

        {/* Multi-segmented statutory progress bar */}
        <div className="w-full bg-surface-container-high dark:bg-[#09162F] h-3 rounded-full overflow-hidden flex shadow-inner">
          <div className="bg-[#004c22] dark:bg-[#FF9933] h-full w-[58%]" title="Approved for EVC (58%)" />
          <div className="bg-[#feb63c] dark:bg-[#feb63c] h-full w-[24%]" title="Pending Scrutiny (24%)" />
          <div className="bg-[#ba1a1a] dark:bg-[#FF6B6B] h-full w-[9%]" title="Deficiencies Flagged (9%)" />
          <div className="bg-[#1f6c3a] dark:bg-[#4ADE80] h-full w-[9%]" title="Under Appeal / SAC (9%)" />
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-2.5 text-xs font-semibold text-on-surface-variant dark:text-[#CBD5E1]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#004c22] dark:bg-[#FF9933] inline-block" />
            <span>812 EVC Recommended</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#feb63c] inline-block" />
            <span>342 In Scrutiny Review</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a] dark:bg-[#FF6B6B] inline-block" />
            <span>128 Deficiencies Issued</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1f6c3a] dark:bg-[#4ADE80] inline-block" />
            <span>46 Under Appeal</span>
          </span>
        </div>
      </section>

      {/* Status Filter Tabs (Stitch Spec) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { key: 'ALL', label: `All Applications (${applications.length})`, icon: Building2 },
          { key: 'PENDING_SCRUTINY', label: 'Pending Scrutiny (342)', icon: Clock },
          { key: 'DEFICIENCIES', label: 'Deficiencies Issued (128)', icon: AlertTriangle },
          { key: 'RECOMMENDED_EVC', label: 'Recommended for EVC (812)', icon: CheckCircle2 },
          { key: 'APPEAL', label: 'Under Appeal (46)', icon: Layers },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedStatusTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedStatusTab(tab.key)}
              className={`min-h-[44px] px-4 py-2 rounded-lg font-bold text-xs whitespace-nowrap flex items-center gap-2 transition-all border ${
                isActive
                  ? 'bg-primary dark:bg-[#FF9933] text-on-primary dark:text-[#0B1B3A] border-primary dark:border-[#FF9933] shadow-xs'
                  : 'bg-surface-container dark:bg-[#12264D] text-on-surface dark:text-[#CBD5E1] hover:bg-surface-container-high border-[#CFE3D3] dark:border-[#2B4478]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search & Dropdown Filter Panel */}
      <section className="bg-surface-container-lowest dark:bg-[#12264D] rounded-xl p-4 shadow-sm border border-[#CFE3D3]/60 dark:border-[#2B4478] flex flex-col gap-3">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-on-surface-variant dark:text-[#B8C5E0] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="appSearchInput"
            type="text"
            placeholder="Search by App No, Permanent Institute ID (PID), or Institute Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[44px] pl-10 pr-10 py-2.5 bg-surface-container-low dark:bg-[#09162F] text-on-surface dark:text-white rounded-lg text-xs placeholder:text-on-surface-variant/60 dark:placeholder:text-[#B8C5E0]/60 border border-[#CFE3D3] dark:border-[#2B4478] focus:bg-surface-container-lowest dark:focus:bg-[#0B1B3A] focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              aria-label="Clear Search"
              onClick={() => setSearchQuery('')}
              className="w-10 h-10 absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center text-on-surface-variant hover:text-on-surface"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Region Select */}
          <div className="relative">
            <select
              value={selectedRegionFilter}
              onChange={(e) => setSelectedRegionFilter(e.target.value)}
              className="w-full min-h-[44px] px-3 pr-8 py-2.5 bg-surface-container dark:bg-[#09162F] text-on-surface dark:text-white rounded-lg text-xs font-semibold appearance-none border border-[#CFE3D3] dark:border-[#2B4478] focus:outline-none cursor-pointer"
            >
              <option value="ALL">Region: All Jurisdictions</option>
              <option value="Western">Region: Western (WRO)</option>
              <option value="Northern">Region: Northern (NRO)</option>
              <option value="Southern">Region: Southern (SRO)</option>
              <option value="Eastern">Region: Eastern (ERO)</option>
              <option value="Central">Region: Central (CRO)</option>
              <option value="South-Western">Region: South-Western (SWRO)</option>
              <option value="South-Central">Region: South-Central (SCRO)</option>
              <option value="North-Western">Region: North-Western (NWRO)</option>
            </select>
            <Filter className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant dark:text-[#B8C5E0]" />
          </div>

          {/* Program Select */}
          <div className="relative">
            <select
              value={selectedProgramFilter}
              onChange={(e) => setSelectedProgramFilter(e.target.value)}
              className="w-full min-h-[44px] px-3 pr-8 py-2.5 bg-surface-container dark:bg-[#09162F] text-on-surface dark:text-white rounded-lg text-xs font-semibold appearance-none border border-[#CFE3D3] dark:border-[#2B4478] focus:outline-none cursor-pointer"
            >
              <option value="ALL">Program: Engineering & Tech</option>
              <option value="MANAGEMENT">Program: Management (MBA/PGDM)</option>
              <option value="PHARMACY">Program: Pharmacy (B.Pharm/M.Pharm)</option>
              <option value="ARCH">Program: Architecture & Planning</option>
            </select>
            <GraduationCap className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant dark:text-[#B8C5E0]" />
          </div>

          {/* Deficiency Type Select */}
          <div className="relative">
            <select
              value={selectedDeficiencyFilter}
              onChange={(e) => setSelectedDeficiencyFilter(e.target.value)}
              className="w-full min-h-[44px] px-3 pr-8 py-2.5 bg-surface-container dark:bg-[#09162F] text-on-surface dark:text-white rounded-lg text-xs font-semibold appearance-none border border-[#CFE3D3] dark:border-[#2B4478] focus:outline-none cursor-pointer"
            >
              <option value="ALL">Deficiency: All Statuses</option>
              <option value="LAND">Deficiency: Land & Built-up Area</option>
              <option value="FACULTY">Deficiency: Faculty Cadre / SFR</option>
              <option value="AFFIDAVIT">Deficiency: Statutory Affidavit & NOC</option>
            </select>
            <AlertCircle className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant dark:text-[#B8C5E0]" />
          </div>
        </div>
      </section>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="p-3 bg-primary-fixed dark:bg-[#1A3366] border border-primary/20 dark:border-[#FF9933] rounded-lg text-xs text-on-primary-fixed dark:text-white flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-primary dark:text-[#FF9933]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="p-3 bg-[#FFF8D6] dark:bg-[#232B1B] border border-[#FACC15] dark:border-[#CA8A04] rounded-lg flex flex-wrap items-center justify-between gap-3 animate-fade-in text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#713F12] dark:text-[#FEF08A] font-mono bg-[#FEF08A] dark:bg-[#2F3C25] px-2.5 py-0.5 rounded border border-[#CA8A04]">
              {selectedIds.length} Selected
            </span>
            <span className="text-[#713F12] dark:text-[#FEF08A] font-medium">
              Statutory bulk action armed:
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkRemind}
              className="min-h-[38px] px-3 py-1 rounded-lg bg-surface-container-lowest dark:bg-[#12264D] hover:bg-surface-container text-xs font-bold text-on-surface dark:text-white flex items-center gap-1.5 border border-[#CFE3D3] dark:border-[#2B4478]"
            >
              <Send className="w-3.5 h-3.5 text-primary dark:text-[#FF9933]" />
              <span>Send Reminders</span>
            </button>

            <button
              onClick={handleBulkAssign}
              className="min-h-[38px] px-3 py-1 rounded-lg bg-surface-container-lowest dark:bg-[#12264D] hover:bg-surface-container text-xs font-bold text-on-surface dark:text-white flex items-center gap-1.5 border border-[#CFE3D3] dark:border-[#2B4478]"
            >
              <UserCheck className="w-3.5 h-3.5 text-primary dark:text-[#FF9933]" />
              <span>Assign Officers</span>
            </button>

            <button
              onClick={handleBulkEscalate}
              className="min-h-[38px] px-3 py-1 rounded-lg bg-error dark:bg-[#B91C1C] hover:opacity-90 text-on-error font-bold text-xs flex items-center gap-1.5 shadow-xs"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Escalate to Regional Bureau</span>
            </button>
          </div>
        </div>
      )}

      {/* DOSSIER BENTO CARDS VIEW (Stitch Exact UI) */}
      {viewMode === 'cards' && (
        <div className="flex flex-col gap-4">
          {filteredApps.map((app) => {
            const isSelected = selectedIds.includes(app.id);
            const isCritical = app.riskStatus === 'Will miss at current pace';
            const isTight = app.riskStatus === 'Tight';

            return (
              <article
                key={app.id}
                className="bg-surface-container-lowest dark:bg-[#12264D] rounded-xl overflow-hidden shadow-sm border border-[#CFE3D3] dark:border-[#2B4478] flex flex-col transition-all hover:shadow-md"
              >
                {/* 4px Top Accent Ribbon: Tricolour or Error Red */}
                {isCritical ? (
                  <div className="h-1 w-full bg-error" />
                ) : (
                  <div className="tricolour-bar" />
                )}

                <div className="p-4 sm:p-5 flex flex-col gap-3.5">
                  {/* Card Header Meta */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {/* Selection Checkbox */}
                      <button
                        onClick={(e) => toggleSelectOne(app.id, e)}
                        className="mt-1 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                        title={isSelected ? 'Deselect application' : 'Select application for bulk action'}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-primary dark:text-[#FF9933]" />
                        ) : (
                          <Square className="w-5 h-5 text-on-surface-variant/50" />
                        )}
                      </button>

                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-container-high dark:bg-[#1A3366] text-primary dark:text-[#FF9933] font-bold">
                            PID: {app.aictePermanentId}
                          </span>
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-container dark:bg-[#09162F] text-on-surface-variant dark:text-[#CBD5E1]">
                            {app.id}
                          </span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-surface-container-low dark:bg-[#1A3366] text-primary dark:text-[#4ADE80]">
                            Tier-1 NBA Accredited
                          </span>
                        </div>

                        <h2 className="text-base sm:text-lg font-bold text-on-surface dark:text-white mt-1.5 leading-tight">
                          {app.institutionName}
                        </h2>
                        <p className="text-xs text-on-surface-variant dark:text-[#CBD5E1] mt-0.5">
                          {app.state} · {app.region} Region · Approved Intake: {app.approvedIntake.toLocaleString('en-IN')} seats
                        </p>
                      </div>
                    </div>

                    {/* Status Badge (Stitch 28px height, 6px radius) */}
                    <div className="shrink-0">
                      {isCritical ? (
                        <div className="h-7 px-2.5 rounded-md bg-error-container text-on-error-container font-bold text-xs flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-error" />
                          <span>Will miss</span>
                        </div>
                      ) : isTight ? (
                        <div className="h-7 px-2.5 rounded-md bg-secondary-fixed text-on-secondary-fixed font-bold text-xs flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-secondary" />
                          <span>Tight</span>
                        </div>
                      ) : (
                        <div className="h-7 px-2.5 rounded-md bg-surface-container-low dark:bg-[#1A3366] text-primary dark:text-[#4ADE80] font-bold text-xs flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>On track</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Applied Schemes Banner */}
                  <div className="bg-surface-container-low dark:bg-[#09162F] rounded-lg p-3 flex items-start gap-2.5 border border-[#CFE3D3]/50 dark:border-[#2B4478]">
                    <GraduationCap className="w-4 h-4 text-primary dark:text-[#FF9933] mt-0.5 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-[10px] text-on-surface-variant dark:text-[#B8C5E0] font-bold uppercase tracking-wider">
                        APPLIED SCHEMES (APH 2025-26)
                      </span>
                      <span className="text-xs font-semibold text-on-surface dark:text-white mt-0.5">
                        {app.type} ({app.route}) · Expansion of UG & PG Engineering Intake
                      </span>
                    </div>
                  </div>

                  {/* Metric Diagnostics Bento Grid (Stitch 3 Bento Cells) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Bento Cell 1: Faculty Cadre Ratio */}
                    <div className="bg-surface-container dark:bg-[#09162F] rounded-lg p-3 flex flex-col justify-between border border-[#CFE3D3]/40 dark:border-[#2B4478]">
                      <span className="text-[11px] text-on-surface-variant dark:text-[#B8C5E0] font-semibold flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-primary dark:text-[#FF9933]" />
                        Faculty Cadre Ratio
                      </span>
                      <div className="mt-1.5">
                        <span className="text-sm font-bold text-primary dark:text-[#FF9933]">
                          1:15{' '}
                          <span className="text-xs font-normal text-on-surface-variant dark:text-[#CBD5E1]">
                            (Compliant)
                          </span>
                        </span>
                        <p className="text-[10px] text-on-surface-variant dark:text-[#B8C5E0] mt-0.5">
                          Req: 1:20 · Cadre 1:2:6 Met
                        </p>
                      </div>
                    </div>

                    {/* Bento Cell 2: Built-up Area */}
                    <div className="bg-surface-container dark:bg-[#09162F] rounded-lg p-3 flex flex-col justify-between border border-[#CFE3D3]/40 dark:border-[#2B4478]">
                      <span className="text-[11px] text-on-surface-variant dark:text-[#B8C5E0] font-semibold flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-primary dark:text-[#FF9933]" />
                        Built-up Area
                      </span>
                      <div className="mt-1.5">
                        <span className="text-sm font-bold text-primary dark:text-[#FF9933]">
                          14,200 sqm{' '}
                          <span className="text-xs font-normal text-on-surface-variant dark:text-[#CBD5E1]">
                            (Surplus)
                          </span>
                        </span>
                        <p className="text-[10px] text-on-surface-variant dark:text-[#B8C5E0] mt-0.5">
                          Min Norm: 11,850 sqm
                        </p>
                      </div>
                    </div>

                    {/* Bento Cell 3: Land Lease Tenure */}
                    <div className="bg-surface-container dark:bg-[#09162F] rounded-lg p-3 flex flex-col justify-between border border-[#CFE3D3]/40 dark:border-[#2B4478]">
                      <span className="text-[11px] text-on-surface-variant dark:text-[#B8C5E0] font-semibold flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-primary dark:text-[#FF9933]" />
                        Land Lease Tenure
                      </span>
                      <div className="mt-1.5">
                        <span className="text-sm font-bold text-on-surface dark:text-white truncate block">
                          99-year registered
                        </span>
                        <p className="text-[10px] text-primary dark:text-[#4ADE80] font-semibold mt-0.5">
                          Valid till 2084 (Non-encumbered)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Verification Visual Thumbnail Bar */}
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-0.5">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container dark:bg-[#09162F] text-[11px] font-semibold text-on-surface-variant dark:text-[#CBD5E1] whitespace-nowrap border border-[#CFE3D3]/40 dark:border-[#2B4478]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary dark:text-[#FF9933]" />
                      <span>Land Title Deed (Reg. 4910)</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container dark:bg-[#09162F] text-[11px] font-semibold text-on-surface-variant dark:text-[#CBD5E1] whitespace-nowrap border border-[#CFE3D3]/40 dark:border-[#2B4478]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary dark:text-[#FF9933]" />
                      <span>Municipal Occupancy Cert</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container dark:bg-[#09162F] text-[11px] font-semibold text-on-surface-variant dark:text-[#CBD5E1] whitespace-nowrap border border-[#CFE3D3]/40 dark:border-[#2B4478]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary dark:text-[#FF9933]" />
                      <span>Fire Safety NOC (2025)</span>
                    </div>
                  </div>

                  {/* Card Action Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-[#CFE3D3]/60 dark:border-[#2B4478]">
                    <div className="flex items-center gap-1.5 text-xs text-on-surface-variant dark:text-[#CBD5E1]">
                      <Clock className="w-4 h-4 text-primary dark:text-[#FF9933]" />
                      <span>
                        Stage: <strong className="text-on-surface dark:text-white">{app.currentStage}</strong> · Officer: {app.assignedOfficer}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectApplication(app)}
                        className="min-h-[44px] px-4 py-2 rounded-lg bg-surface-container dark:bg-[#09162F] hover:bg-surface-container-high text-primary dark:text-[#FF9933] font-bold text-xs flex-1 sm:flex-none flex items-center justify-center gap-1.5 border border-[#CFE3D3] dark:border-[#2B4478] transition-colors"
                        type="button"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Inspect Dossier</span>
                      </button>

                      <button
                        onClick={() => onSelectApplication(app)}
                        className="min-h-[44px] px-4 py-2 rounded-lg bg-primary dark:bg-[#FF9933] hover:opacity-95 text-on-primary dark:text-[#0B1B3A] font-bold text-xs flex-1 sm:flex-none flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-[0.98]"
                        type="button"
                      >
                        <Check className="w-4 h-4" />
                        <span>Approve for EVC</span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* TABULAR REGISTER VIEW (Preserved Alternative) */}
      {viewMode === 'table' && (
        <div className="bg-surface-container-lowest dark:bg-[#12264D] rounded-xl overflow-hidden shadow-sm border border-[#CFE3D3] dark:border-[#2B4478]">
          <div className="px-5 py-3.5 border-b border-[#CFE3D3]/60 dark:border-[#2B4478] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1.5 text-xs font-semibold"
              >
                {selectedIds.length === filteredApps.length && filteredApps.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-primary dark:text-[#FF9933]" />
                ) : (
                  <Square className="w-4 h-4 text-on-surface-variant/50" />
                )}
                <span>Select All</span>
              </button>
              <span className="text-xs text-on-surface-variant dark:text-[#B8C5E0]">
                Showing {filteredApps.length} of {applications.length} applications
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-low dark:bg-[#09162F] text-on-surface-variant dark:text-[#B8C5E0] font-bold border-b border-[#CFE3D3] dark:border-[#2B4478]">
                  <th className="p-3 w-10 text-center">#</th>
                  <th className="p-3">Application / Institute</th>
                  <th className="p-3">Region & Type</th>
                  <th className="p-3">Current Stage</th>
                  <th className="p-3 text-right">Intake</th>
                  <th className="p-3">Risk Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CFE3D3]/50 dark:divide-[#2B4478]">
                {filteredApps.map((app) => (
                  <tr
                    key={app.id}
                    onClick={() => onSelectApplication(app)}
                    className="hover:bg-surface-container-low dark:hover:bg-[#1A3366] transition-colors cursor-pointer"
                  >
                    <td className="p-3 text-center" onClick={(e) => toggleSelectOne(app.id, e)}>
                      {selectedIds.includes(app.id) ? (
                        <CheckSquare className="w-4 h-4 text-primary dark:text-[#FF9933] mx-auto" />
                      ) : (
                        <Square className="w-4 h-4 text-on-surface-variant/40 mx-auto" />
                      )}
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-on-surface dark:text-white leading-tight">
                        {app.institutionName}
                      </div>
                      <div className="text-[11px] font-mono text-on-surface-variant dark:text-[#CBD5E1] mt-0.5">
                        {app.id} · PID: {app.aictePermanentId}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-on-surface dark:text-white">{app.region} Region</div>
                      <div className="text-[10px] text-on-surface-variant dark:text-[#CBD5E1]">{app.type}</div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-surface-container dark:bg-[#09162F] text-on-surface dark:text-white font-semibold">
                        {app.currentStage}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-on-surface dark:text-white">
                      {app.approvedIntake.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3">
                      {app.riskStatus === 'Will miss at current pace' ? (
                        <span className="px-2 py-0.5 rounded bg-error-container text-on-error-container font-bold text-[11px]">
                          Will miss
                        </span>
                      ) : app.riskStatus === 'Tight' ? (
                        <span className="px-2 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed font-bold text-[11px]">
                          Tight
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-surface-container-low dark:bg-[#1A3366] text-primary dark:text-[#4ADE80] font-bold text-[11px]">
                          On track
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectApplication(app);
                        }}
                        className="px-3 py-1 rounded bg-surface-container dark:bg-[#09162F] hover:bg-surface-container-high text-primary dark:text-[#FF9933] font-bold text-xs"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
