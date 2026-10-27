'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Application, RiskStatus } from '@/lib/types';
import { getWorkingDaysDiff } from '@/lib/workingCalendar';
import AnimatedCounter from '@/components/AnimatedCounter';
import AdvisoryPopover from '@/components/AdvisoryPopover';
import WhatIfSimulator from '@/components/WhatIfSimulator';
import HeatmapCalendar from '@/components/HeatmapCalendar';
import {
  ShieldAlert,
  Clock,
  Users,
  AlertTriangle,
  AlertCircle,
  FileText,
  ChevronRight,
  SlidersHorizontal,
  Scan,
  Download,
  Filter,
  Gavel,
  Send,
  Eye
} from 'lucide-react';

interface DeadlineGuardViewProps {
  onSelectApplication: (app: Application) => void;
  onOpenOCR: (app: Application) => void;
}

export default function DeadlineGuardView({ onSelectApplication, onOpenOCR }: DeadlineGuardViewProps) {
  const { applications, calendarConfig, workingCalendar, simulatedDate, currentRegion } = useApp();
  const [filterRisk, setFilterRisk] = useState<RiskStatus | 'ALL'>('ALL');
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [selectedRO, setSelectedRO] = useState('all');
  const [noticeDispatched, setNoticeDispatched] = useState(false);

  const cutoffDate = new Date(calendarConfig.approvalCutoffDate);
  const curDate = new Date(simulatedDate);
  const daysToCutoff = Math.max(0, Math.round((cutoffDate.getTime() - curDate.getTime()) / (1000 * 60 * 60 * 24)));
  const workingDaysToCutoff = getWorkingDaysDiff(curDate, cutoffDate, workingCalendar);

  const countTight = applications.filter(a => a.riskStatus === 'Tight').length;
  const countWillMiss = applications.filter(a => a.riskStatus === 'Will miss at current pace').length;

  const totalStudentsAtRisk = applications
    .filter(a => a.riskStatus === 'Will miss at current pace' || a.riskStatus === 'Tight')
    .reduce((sum, a) => sum + a.approvedIntake, 0);

  // Student-Impact Triage Ranking
  const studentImpactTriageList = [...applications]
    .filter(a => {
      if (currentRegion !== 'All' && a.region !== currentRegion) return false;
      if (filterRisk !== 'ALL') return a.riskStatus === filterRisk;
      return a.riskStatus === 'Will miss at current pace' || a.riskStatus === 'Tight';
    })
    .sort((a, b) => b.approvedIntake - a.approvedIntake);

  // Lease Radar
  const leaseRadarList = applications.filter(app => {
    const lease = app.documents.find(d => d.type === 'Land Lease Deed');
    if (!lease) return false;
    const leaseExpiry = new Date(lease.expiryDate);
    return leaseExpiry <= cutoffDate || lease.remainingDays < 180;
  });

  const handleExportComplianceLog = () => {
    alert('Exporting signed statutory compliance dossier for AICTE RO Records (PDF/CSV signed pack)...');
  };

  const handleDispatchEmergencyNotice = () => {
    setNoticeDispatched(true);
    setTimeout(() => setNoticeDispatched(false), 4000);
  };

  return (
    <div className="flex flex-col w-full gap-5 animate-fade-in pb-12">
      {/* Sovereign Continuous 4px Tricolour Bar */}
      <div className="tricolour-bar rounded-full" />

      {/* Breadcrumbs & Screen Title Section (Stitch Spec) */}
      <section className="flex flex-col gap-2 bg-surface-container-lowest dark:bg-[#12264D] p-4 sm:p-5 rounded-xl shadow-sm border border-[#CFE3D3]/60 dark:border-[#2B4478]">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-on-surface-variant dark:text-[#B8C5E0] text-xs font-semibold">
          <span className="flex items-center gap-1 text-primary dark:text-[#FF9933] font-bold">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>SAMAY</span>
          </span>
          <span>›</span>
          <span>Monitoring</span>
          <span>›</span>
          <span className="text-on-surface dark:text-white font-bold">Deadline Guard</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-1">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-error animate-pulse" />
              <h1 className="text-xl sm:text-2xl font-bold text-on-surface dark:text-white tracking-tight">
                Statutory Deadline Guard
              </h1>
              <AdvisoryPopover />
            </div>
            <p className="text-xs sm:text-sm text-on-surface-variant dark:text-[#CBD5E1] mt-1 leading-relaxed">
              Monitoring AICTE Approval Process Handbook (APH 2025-26) Statutory Thresholds & Deemed Approval Risks.
            </p>
          </div>

          {/* Large Cutoff Countdown Pill Card */}
          <div className="bg-surface-container dark:bg-[#09162F] px-4 py-2.5 rounded-xl border border-[#CFE3D3] dark:border-[#2B4478] shadow-2xs text-center shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-[#B8C5E0]">
              Statutory Cutoff
            </span>
            <div className="text-2xl font-black text-primary dark:text-[#FF9933] tracking-tight tabular-nums my-0.5">
              <AnimatedCounter value={daysToCutoff} />{' '}
              <span className="text-xs font-semibold text-on-surface-variant dark:text-[#CBD5E1]">Calendar Days</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-on-surface dark:text-white" title="Weekends and holidays are excluded.">
              <span>{workingDaysToCutoff} working days left</span>
              <span className="cursor-help text-primary dark:text-[#FF9933]" title="Weekends and holidays are excluded.">ⓘ</span>
            </div>
            <div className="text-[10px] font-bold text-primary dark:text-[#FF9933] bg-surface-container-high dark:bg-[#1A3366] px-2 py-0.5 rounded mt-1">
              Cutoff: 30 April 2026 ({workingCalendar.version})
            </div>
          </div>
        </div>

        {/* Quick Action Controls (Adheres to 44px min touch target) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 pt-2 border-t border-[#CFE3D3]/60 dark:border-[#2B4478]">
          <div className="relative flex-1">
            <select
              aria-label="Filter by Regional Office"
              value={selectedRO}
              onChange={(e) => setSelectedRO(e.target.value)}
              className="w-full min-h-[44px] px-3 pr-8 rounded-lg bg-surface-container dark:bg-[#09162F] text-xs font-semibold text-on-surface dark:text-white appearance-none border border-[#CFE3D3] dark:border-[#2B4478] focus:outline-none cursor-pointer"
            >
              <option value="all">Regional Office: All 8 RO Jurisdictions</option>
              <option value="wro">Western RO (Mumbai & Goa)</option>
              <option value="cro">Central RO (Bhopal)</option>
              <option value="nro">Northern RO (Kanpur)</option>
              <option value="swro">South-Western RO (Bengaluru)</option>
              <option value="sro">Southern RO (Chennai)</option>
              <option value="ero">Eastern RO (Kolkata)</option>
              <option value="nwro">North-Western RO (Chandigarh)</option>
              <option value="scro">South-Central RO (Hyderabad)</option>
            </select>
            <Filter className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant dark:text-[#B8C5E0]" />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportComplianceLog}
              className="min-h-[44px] px-3.5 flex items-center justify-center gap-1.5 rounded-lg bg-surface-container dark:bg-[#09162F] hover:bg-surface-container-high text-on-surface dark:text-white font-bold text-xs border border-[#CFE3D3] dark:border-[#2B4478] transition-all"
              type="button"
            >
              <Download className="w-4 h-4 text-primary dark:text-[#FF9933]" />
              <span>Compliance Log</span>
            </button>

            <button
              onClick={() => setShowWhatIf(!showWhatIf)}
              className={`min-h-[44px] px-4 flex items-center justify-center gap-1.5 rounded-lg font-bold text-xs shadow-xs transition-all ${
                showWhatIf
                  ? 'bg-primary dark:bg-[#FF9933] text-on-primary dark:text-[#0B1B3A]'
                  : 'bg-secondary-container dark:bg-[#feb63c] text-on-secondary-container dark:text-[#6e4900] hover:bg-secondary-fixed'
              }`}
              type="button"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>{showWhatIf ? 'Close Simulator' : 'What-If Simulator'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Statutory Highlight Emergency Banner (Stitch Spec: #FFF8D6 light, #232B1B dark) */}
      <section
        aria-labelledby="urgent-notice-title"
        className="rounded-xl bg-[#FFF8D6] dark:bg-[#232B1B] text-[#713F12] dark:text-[#FEF08A] p-4 sm:p-5 shadow-sm border border-[#FACC15] dark:border-[#CA8A04] relative overflow-hidden"
      >
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-[#FEF08A] dark:bg-[#2F3C25] flex items-center justify-center shrink-0 border border-[#CA8A04]/40">
            <Gavel className="w-5 h-5 text-[#713F12] dark:text-[#FEF08A]" />
          </div>

          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-error text-on-error text-[10px] font-bold tracking-wider uppercase">
                STATUTORY EMERGENCY
              </span>
              <span className="text-xs font-bold text-[#713F12] dark:text-[#FEF08A]">
                Sub-rule 14(A) · Deemed Approval Threat
              </span>
            </div>

            <h2 id="urgent-notice-title" className="text-sm sm:text-base font-bold text-[#713F12] dark:text-[#FEF08A] mt-0.5">
              High Priority Statutory Notice: Zone-II Deemed Approvals in under 48 hours
            </h2>

            <p className="text-xs text-[#713F12]/90 dark:text-[#FEF08A]/90 leading-relaxed">
              14 Technical Institutions face mandatory deemed approval deadline in under <strong>48 hours</strong>. Immediate scrutinising committee action required to prevent irreversible statutory rollover.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2">
              <button
                onClick={() => setFilterRisk('Will miss at current pace')}
                className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-error text-on-error font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95"
                type="button"
              >
                <AlertCircle className="w-4 h-4" />
                <span>Inspect Urgent Cases ({countWillMiss})</span>
              </button>

              <button
                onClick={handleDispatchEmergencyNotice}
                className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-surface-container-lowest dark:bg-[#12264D] text-on-surface dark:text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs hover:bg-surface-container border border-[#CFE3D3] dark:border-[#2B4478]"
                type="button"
              >
                <Send className="w-3.5 h-3.5 text-primary dark:text-[#FF9933]" />
                <span>{noticeDispatched ? 'Notice Dispatched to RO!' : 'Dispatch SMS/Email Notice'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Statutory Visual Hazard Bento Cards Grid (Stitch Spec: 4 Bento Cards) */}
      <section aria-label="Key Regulatory Metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Critical Deemed Approval Risk */}
        <div className="bg-surface-container-lowest dark:bg-[#12264D] rounded-xl p-4 flex flex-col justify-between shadow-sm border border-[#CFE3D3] dark:border-[#2B4478]">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-on-surface-variant dark:text-[#B8C5E0] uppercase tracking-wider">
                Statutory Breach Hazard
              </span>
              <h2 className="text-xs font-bold text-on-surface dark:text-white mt-0.5">
                Deemed Approval Risk (&lt;72 Hours)
              </h2>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-error-container text-on-error-container text-[11px] font-bold">
              <AlertTriangle className="w-3 h-3 text-error" />
              <span>WILL MISS</span>
            </span>
          </div>

          <div className="flex items-baseline justify-between py-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-error tabular-nums">
                <AnimatedCounter value={countWillMiss} />
              </span>
              <span className="text-xs text-on-surface-variant dark:text-[#CBD5E1]">In Danger Zone</span>
            </div>
            <span className="text-[10px] text-error bg-error-container/50 px-1.5 py-0.5 rounded font-bold">
              APH Clause 2.4.1
            </span>
          </div>

          <p className="text-[11px] text-on-surface-variant dark:text-[#CBD5E1] line-clamp-2">
            Pending recommendation past 45-day statutory cap risk automatic deemed NOC issuance.
          </p>

          <button
            onClick={() => setFilterRisk(filterRisk === 'Will miss at current pace' ? 'ALL' : 'Will miss at current pace')}
            className="mt-3 w-full min-h-[40px] py-1.5 px-3 rounded-lg bg-error hover:opacity-95 text-on-error font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
            type="button"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Prioritize Immediately ({countWillMiss})</span>
          </button>
        </div>

        {/* Card 2: Scrutiny Escalation Window */}
        <div className="bg-surface-container-lowest dark:bg-[#12264D] rounded-xl p-4 flex flex-col justify-between shadow-sm border border-[#CFE3D3] dark:border-[#2B4478]">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-on-surface-variant dark:text-[#B8C5E0] uppercase tracking-wider">
                Stage-2 Compliance
              </span>
              <h2 className="text-xs font-bold text-on-surface dark:text-white mt-0.5">
                Scrutiny Escalation Window
              </h2>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed text-[11px] font-bold">
              <Clock className="w-3 h-3 text-secondary" />
              <span>TIGHT</span>
            </span>
          </div>

          <div className="flex items-baseline justify-between py-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-on-secondary-container dark:text-[#feb63c] tabular-nums">
                <AnimatedCounter value={countTight} />
              </span>
              <span className="text-xs text-on-surface-variant dark:text-[#CBD5E1]">Active Dockets</span>
            </div>
            <span className="text-[10px] text-secondary bg-secondary-fixed/50 px-1.5 py-0.5 rounded font-bold">
              14 Days Left
            </span>
          </div>

          <p className="text-[11px] text-on-surface-variant dark:text-[#CBD5E1] line-clamp-2">
            Expert Visit Committee (EVC) reports awaiting ratification by Regional Committee.
          </p>

          <button
            onClick={() => setFilterRisk(filterRisk === 'Tight' ? 'ALL' : 'Tight')}
            className="mt-3 w-full min-h-[40px] py-1.5 px-3 rounded-lg bg-surface-container dark:bg-[#09162F] hover:bg-surface-container-high text-on-surface dark:text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-[#CFE3D3] dark:border-[#2B4478] transition-all"
            type="button"
          >
            <Clock className="w-3.5 h-3.5 text-secondary" />
            <span>View Escalation ({countTight})</span>
          </button>
        </div>

        {/* Card 3: Deficiency Rectification Period */}
        <div className="bg-surface-container-lowest dark:bg-[#12264D] rounded-xl p-4 flex flex-col justify-between shadow-sm border border-[#CFE3D3] dark:border-[#2B4478]">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-on-surface-variant dark:text-[#B8C5E0] uppercase tracking-wider">
                Statutory Rectification
              </span>
              <h2 className="text-xs font-bold text-on-surface dark:text-white mt-0.5">
                Deficiency Notice Period
              </h2>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container dark:bg-[#09162F] text-primary dark:text-[#FF9933] text-[11px] font-semibold">
              <FileText className="w-3 h-3" />
              <span>Pending Institute</span>
            </span>
          </div>

          <div className="flex items-baseline justify-between py-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-on-surface dark:text-white tabular-nums">
                37
              </span>
              <span className="text-xs text-on-surface-variant dark:text-[#CBD5E1]">Deficient Affidavits</span>
            </div>
            <span className="text-[10px] text-primary dark:text-[#4ADE80] bg-surface-container dark:bg-[#1A3366] px-1.5 py-0.5 rounded font-bold">
              7-Day Cap
            </span>
          </div>

          <p className="text-[11px] text-on-surface-variant dark:text-[#CBD5E1] line-clamp-2">
            Stamp paper franking shortfall and land lease notary anomalies under notice.
          </p>

          <button
            onClick={() => setFilterRisk('ALL')}
            className="mt-3 w-full min-h-[40px] py-1.5 px-3 rounded-lg bg-surface-container dark:bg-[#09162F] hover:bg-surface-container-high text-on-surface dark:text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-[#CFE3D3] dark:border-[#2B4478] transition-all"
            type="button"
          >
            <Eye className="w-3.5 h-3.5 text-primary dark:text-[#FF9933]" />
            <span>Track Rectification (37)</span>
          </button>
        </div>

        {/* Card 4: Students at Risk Triage */}
        <div className="bg-surface-container-lowest dark:bg-[#12264D] rounded-xl p-4 flex flex-col justify-between shadow-sm border border-[#CFE3D3] dark:border-[#2B4478]">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-on-surface-variant dark:text-[#B8C5E0] uppercase tracking-wider">
                Student Cohort Impact
              </span>
              <h2 className="text-xs font-bold text-on-surface dark:text-white mt-0.5">
                Students at Risk (FR-H4)
              </h2>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container-low dark:bg-[#1A3366] text-primary dark:text-[#4ADE80] text-[11px] font-bold">
              <Users className="w-3 h-3" />
              <span>Prioritized</span>
            </span>
          </div>

          <div className="flex items-baseline justify-between py-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-on-surface dark:text-white tabular-nums">
                <AnimatedCounter value={totalStudentsAtRisk} />
              </span>
              <span className="text-xs text-on-surface-variant dark:text-[#CBD5E1]">Approved Seats</span>
            </div>
            <span className="text-[10px] text-amber-700 bg-amber-100 dark:bg-[#232B1B] dark:text-[#FEF08A] px-1.5 py-0.5 rounded font-bold">
              Triage Queue
            </span>
          </div>

          <p className="text-[11px] text-on-surface-variant dark:text-[#CBD5E1] line-clamp-2">
            Intake seats scheduled for zero disruption under academic calendar guidelines.
          </p>

          <button
            onClick={() => setFilterRisk('ALL')}
            className="mt-3 w-full min-h-[40px] py-1.5 px-3 rounded-lg bg-surface-container dark:bg-[#09162F] hover:bg-surface-container-high text-primary dark:text-[#FF9933] font-bold text-xs flex items-center justify-center gap-1.5 border border-[#CFE3D3] dark:border-[#2B4478] transition-all"
            type="button"
          >
            <Users className="w-3.5 h-3.5" />
            <span>View Triage List</span>
          </button>
        </div>
      </section>

      {/* FEATURE 1: WHAT-IF SIMULATOR EXPANDED PANEL */}
      {showWhatIf && <WhatIfSimulator />}

      {/* FEATURE 10: PRE-CUTOFF WORKLOAD & DEADLINE HEATMAP */}
      <HeatmapCalendar />

      {/* Main Grid: Student-Impact Triage & Lease Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Student-Impact Triage View */}
        <section className="lg:col-span-2 bg-surface-container-lowest dark:bg-[#12264D] rounded-xl p-5 shadow-sm border border-[#CFE3D3] dark:border-[#2B4478] flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#CFE3D3]/60 dark:border-[#2B4478]">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary dark:text-[#FF9933]" />
                <h2 className="text-base font-bold text-on-surface dark:text-white tracking-tight">
                  Student-Impact Triage Ranking (FR-H4)
                </h2>
              </div>
              <p className="text-xs text-on-surface-variant dark:text-[#CBD5E1] mt-0.5">
                Ranks at-risk colleges by approved intake capacity. Officers triage the largest student cohorts first.
              </p>
            </div>

            {filterRisk !== 'ALL' && (
              <button
                onClick={() => setFilterRisk('ALL')}
                className="px-3 py-1 rounded-lg text-xs font-bold bg-surface-container dark:bg-[#09162F] text-primary dark:text-[#FF9933] border border-[#CFE3D3] dark:border-[#2B4478]"
              >
                Reset Filter
              </button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#CFE3D3] dark:border-[#2B4478] text-on-surface-variant dark:text-[#B8C5E0] uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-2.5 px-3">Institution</th>
                  <th className="py-2.5 px-3">Intake</th>
                  <th className="py-2.5 px-3">Stage</th>
                  <th className="py-2.5 px-3">Safe Date</th>
                  <th className="py-2.5 px-3">Root Cause</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CFE3D3]/50 dark:divide-[#2B4478]">
                {studentImpactTriageList.slice(0, 7).map((app, index) => (
                  <tr
                    key={app.id}
                    onClick={() => onSelectApplication(app)}
                    className="hover:bg-surface-container-low dark:hover:bg-[#1A3366] transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                          index === 0
                            ? 'bg-secondary-container text-on-secondary-container font-black'
                            : 'bg-surface-container dark:bg-[#09162F] text-on-surface dark:text-white'
                        }`}>
                          #{index + 1}
                        </span>
                        <div>
                          <div className="font-bold text-on-surface dark:text-white group-hover:text-primary dark:group-hover:text-[#FF9933] transition-colors">
                            {app.institutionName}
                          </div>
                          <div className="text-[11px] text-on-surface-variant dark:text-[#CBD5E1]">
                            {app.aictePermanentId} · {app.region} ({app.state})
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-primary dark:text-[#FF9933] bg-surface-container dark:bg-[#09162F] px-2 py-0.5 rounded border border-[#CFE3D3]/60 dark:border-[#2B4478] text-xs">
                        {app.approvedIntake}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-surface-container dark:bg-[#09162F] text-on-surface dark:text-white">
                        {app.currentStage}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-mono">
                      <div className="text-on-surface dark:text-white font-medium">
                        {app.latestSafeDateForCurrentStage}
                      </div>
                      <div className={`text-[10px] font-bold flex items-center gap-1 ${app.daysRemainingInStage < 0 ? 'text-error' : 'text-secondary'}`}>
                        <span>
                          {app.daysRemainingInStage < 0
                            ? `${Math.abs(app.daysRemainingInStage)}d past safe`
                            : `${app.daysRemainingInStage} cal d / ${app.workingDaysRemainingInStage ?? app.daysRemainingInStage} working d left`}
                        </span>
                        <span className="cursor-help text-on-surface-variant dark:text-[#B8C5E0]" title="Weekends and holidays are excluded.">ⓘ</span>
                      </div>
                      <div className="text-[9px] text-on-surface-variant/70 dark:text-[#B8C5E0]/70 font-sans mt-0.5">
                        cal ver: {app.workingCalendarVersion || workingCalendar.version}
                      </div>
                    </td>

                    <td className="py-3 px-3 max-w-xs">
                      <div className="text-on-surface-variant dark:text-[#CBD5E1] text-[11px] line-clamp-1">
                        {app.riskReasons[0]}
                      </div>
                      <span className={`inline-block mt-0.5 px-2 py-0.2 rounded text-[9px] font-bold ${
                        app.riskStatus === 'Will miss at current pace'
                          ? 'bg-error-container text-on-error-container'
                          : 'bg-secondary-fixed text-on-secondary-fixed'
                      }`}>
                        {app.riskStatus}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectApplication(app);
                        }}
                        className="min-h-[32px] px-3 py-1 rounded-lg bg-surface-container dark:bg-[#09162F] hover:bg-surface-container-high text-primary dark:text-[#FF9933] font-bold text-xs inline-flex items-center gap-1 border border-[#CFE3D3] dark:border-[#2B4478]"
                      >
                        <span>Manage</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right Column: Lease Radar & Versioned Rules */}
        <div className="space-y-5">
          {/* Lease Radar Widget */}
          <div className="bg-surface-container-lowest dark:bg-[#12264D] rounded-xl p-5 shadow-sm border border-[#CFE3D3] dark:border-[#2B4478] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#CFE3D3]/60 dark:border-[#2B4478]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-secondary" />
                <h3 className="text-sm font-bold text-on-surface dark:text-white tracking-tight">
                  Lease Radar (FR-H5)
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-error-container text-on-error-container">
                {leaseRadarList.length} At Risk
              </span>
            </div>

            <p className="text-xs text-on-surface-variant dark:text-[#CBD5E1] leading-relaxed">
              Detects technical institutions whose registered land leases lapse before academic cutoff.
            </p>

            <div className="space-y-2.5">
              {leaseRadarList.slice(0, 3).map((app) => {
                const lease = app.documents.find(d => d.type === 'Land Lease Deed');
                return (
                  <div
                    key={app.id}
                    className="p-3 rounded-lg border border-[#CFE3D3] dark:border-[#2B4478] bg-surface-container-low dark:bg-[#09162F] space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-xs text-on-surface dark:text-white">
                          {app.institutionName}
                        </div>
                        <div className="text-[11px] text-on-surface-variant dark:text-[#CBD5E1] mt-0.5">
                          {app.region} · {app.approvedIntake} Intake
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-error-container text-on-error-container">
                        Expires: {lease?.expiryDate}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-[11px] text-on-surface-variant dark:text-[#CBD5E1]">
                        Remaining: <strong className="text-error">{lease?.remainingDays}d</strong>
                      </span>
                      <button
                        onClick={() => onOpenOCR(app)}
                        className="px-2.5 py-1 rounded-lg bg-primary dark:bg-[#FF9933] text-on-primary dark:text-[#0B1B3A] font-bold text-[11px] flex items-center gap-1 shadow-2xs hover:opacity-90"
                      >
                        <Scan className="w-3 h-3" />
                        <span>OCR Extractor</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Versioned Rules SLA Panel */}
          <div className="bg-surface-container-lowest dark:bg-[#12264D] rounded-xl p-5 shadow-sm border border-[#CFE3D3] dark:border-[#2B4478] space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#CFE3D3]/60 dark:border-[#2B4478]">
              <span className="font-bold text-on-surface dark:text-white text-xs">
                SLA Configuration
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface-container dark:bg-[#09162F] text-primary dark:text-[#FF9933] font-bold border border-[#CFE3D3] dark:border-[#2B4478]">
                {calendarConfig.version}
              </span>
            </div>

            <div className="space-y-2 text-on-surface-variant dark:text-[#CBD5E1]">
              <div className="flex justify-between py-1 border-b border-[#CFE3D3]/40 dark:border-[#2B4478]/60">
                <span>Statutory Cutoff:</span>
                <span className="font-bold text-on-surface dark:text-white">{calendarConfig.approvalCutoffDate}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#CFE3D3]/40 dark:border-[#2B4478]/60">
                <span>Scrutiny SLA:</span>
                <span className="font-semibold text-on-surface dark:text-white">{calendarConfig.scrutinyTypicalDays} days</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#CFE3D3]/40 dark:border-[#2B4478]/60">
                <span>EVC Visit SLA:</span>
                <span className="font-semibold text-on-surface dark:text-white">{calendarConfig.evcTypicalDays} days</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Advance Alert Window:</span>
                <span className="font-semibold text-on-surface dark:text-white">{calendarConfig.advanceAlertDays} days</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
