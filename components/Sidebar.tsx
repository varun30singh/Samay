'use client';

import React from 'react';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { Region } from '@/lib/types';
import CuteRobotIcon from '@/components/CuteRobotIcon';
import {
  ShieldAlert,
  Building2,
  Calendar,
  FileCheck,
  AlertTriangle,
  Lock,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  GraduationCap,
  Sparkles,
  SlidersHorizontal,
  Scale,
  Clock,
  X,
  CalendarDays,
  ClipboardCheck,
  UserCheck,
  ListTodo,
  Upload,
  BarChart3
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  onOpenDemo: () => void;
  onOpenCopilot: () => void;
  onOpenWorkload: () => void;
  onOpenWhatIf: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  onOpenDemo,
  onOpenCopilot,
  onOpenWorkload,
  onOpenWhatIf,
  isMobileOpen = false,
  onCloseMobile
}: SidebarProps) {
  const {
    chainIntegrity,
    applications,
    simulatedDate,
    currentRegion,
    setRegion,
    advanceSimulatedDate,
    jumpToSixtyDaysBeforeCutoff,
    resetSimulation,
    currentRole,
    deficiencies,
    queueCoverageSummaries
  } = useApp();

  const isRoleAdmin = currentRole === 'system_admin';
  const isRoleRegional = currentRole === 'regional_officer' || currentRole === 'bureau_officer' || currentRole === 'competent_authority';
  const isRoleInstitution = currentRole === 'institution';

  const navItems = [
    {
      id: 'deadline-guard',
      label: 'Deadline Guard',
      shortLabel: 'Guard',
      icon: ShieldAlert,
      badge: 'Statutory',
      badgeColor: 'bg-error-container text-on-error-container dark:bg-red-950/60 dark:text-red-300'
    },
    {
      id: 'applications',
      label: 'Applications',
      shortLabel: 'Apps',
      icon: Building2,
      count: applications.length
    },
    // Feature 2: Readiness Check (Institution & Admin)
    ...(isRoleInstitution || isRoleAdmin ? [{
      id: 'readiness-check',
      label: 'Readiness Check',
      shortLabel: 'Check',
      icon: ClipboardCheck,
      badge: 'Self-Check',
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
    }] : []),
    // Feature 4: Deficiency Tracker (Officers + Institution)
    {
      id: 'deficiency-tracker',
      label: 'Deficiency Tracker',
      shortLabel: 'Deficiencies',
      icon: ListTodo,
      count: deficiencies.filter(d => d.status !== 'Closed').length,
      countColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold'
    },
    // Feature 3: Coverage (Regional / Admin)
    ...(isRoleRegional || isRoleAdmin ? [{
      id: 'coverage',
      label: 'Coverage',
      shortLabel: 'Coverage',
      icon: UserCheck,
      badge: queueCoverageSummaries.some(q => q.hasUncoveredQueue) ? 'Alert' : undefined,
      badgeColor: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
    }] : []),
    // Feature 1: Working Calendar (Admin)
    ...(isRoleAdmin ? [{
      id: 'working-calendar',
      label: 'Working Calendar',
      shortLabel: 'Calendar',
      icon: CalendarDays,
      badge: 'APH-2026',
      badgeColor: 'bg-surface-container dark:bg-[#1A3366] text-primary dark:text-[#FF9933]'
    }] : []),
    // Feature 5: Data Import (Admin)
    ...(isRoleAdmin ? [{
      id: 'data-import',
      label: 'Data Import',
      shortLabel: 'Import',
      icon: Upload,
      badge: 'CSV',
      badgeColor: 'bg-surface-container dark:bg-[#1A3366] text-primary dark:text-[#FF9933]'
    }] : []),
    {
      id: 'institution-portal',
      label: 'Institution View',
      shortLabel: 'College',
      icon: GraduationCap,
      badge: 'Portal',
      badgeColor: 'bg-surface-container dark:bg-[#1A3366] text-primary dark:text-[#FF9933]'
    },
    {
      id: 'evc',
      label: 'EVC Scheduler',
      shortLabel: 'EVC',
      icon: Calendar,
      count: applications.filter(a => a.evc?.hasConflict).length,
      countColor: 'bg-error-container text-error font-bold'
    },
    {
      id: 'undertakings',
      label: 'Undertakings',
      shortLabel: 'Compliance',
      icon: FileCheck
    },
    {
      id: 'lease-radar',
      label: 'Lease Radar',
      shortLabel: 'Leases',
      icon: AlertTriangle
    },
    {
      id: 'audit',
      label: 'Audit Trail',
      shortLabel: 'Audit',
      icon: Lock,
      statusDot: chainIntegrity?.isValid ? 'bg-primary dark:bg-emerald-400' : 'bg-error animate-ping'
    },
    {
      id: 'regional-analytics',
      label: 'Regional Analytics',
      shortLabel: 'Analytics',
      icon: BarChart3,
      badge: 'FR-F4',
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
    },
    {
      id: 'reports',
      label: 'Reports',
      shortLabel: 'Reports',
      icon: FileSpreadsheet
    }
  ];

  return (
    <aside
      className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-white dark:bg-[#09162F] border-r border-[#CFE3D3] dark:border-[#2B4478] shadow-[0_1px_8px_rgba(0,0,0,0.08)] transition-all duration-300 ease-out ${
        isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
      } ${
        isCollapsed ? 'lg:w-[72px] w-72' : 'w-72'
      }`}
    >
      {/* 4px Continuous Sovereign Indian Tricolour Bar */}
      <div className="tricolour-bar" />

      {/* Brand Header */}
      <div className="h-16 sm:h-20 px-3 sm:px-4 flex items-center justify-between border-b border-[#CFE3D3]/60 dark:border-[#2B4478]">
        {(!isCollapsed || isMobileOpen) ? (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <Image
              alt="SAMAY Logo"
              width={36}
              height={36}
              unoptimized
              className="h-9 w-auto object-contain shrink-0 rounded-lg bg-white p-0.5 shadow-xs border border-[#CFE3D3]/60 dark:border-[#2B4478]"
              src="/samay-logo.png"
            />
            <div className="flex flex-col truncate">
              <span className="font-bold text-base text-primary dark:text-[#FF9933] leading-none">
                SAMAY
              </span>
              <span className="text-[11px] text-on-surface-variant dark:text-[#B8C5E0] font-semibold truncate mt-0.5">
                Apex Regulatory Portal
              </span>
            </div>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <Image
              alt="SAMAY"
              width={32}
              height={32}
              unoptimized
              className="h-8 w-auto object-contain rounded-lg bg-white p-0.5 shadow-xs border border-[#CFE3D3]/60 dark:border-[#2B4478]"
              src="/samay-logo.png"
            />
          </div>
        )}

        <div className="flex items-center gap-1">
          {/* Mobile Close Button */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-on-surface-variant dark:text-[#B8C5E0] hover:text-on-surface dark:hover:text-white hover:bg-surface-container dark:hover:bg-[#12264D] transition-colors"
            title="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Desktop Collapse / Expand Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:block p-1.5 rounded-lg text-on-surface-variant dark:text-[#B8C5E0] hover:text-on-surface dark:hover:text-white hover:bg-surface-container dark:hover:bg-[#12264D] transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 
        ====================================================================
        SINGLE SCROLLABLE SIDEBAR BODY
        Includes Officer Info, Jurisdiction, Regulatory Clock, 
        all Navigation items, and Action Tools at the end of the list.
        Prevents ANY bottom button overlaying or cutting off menu items!
        ====================================================================
      */}
      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col">
        {/* Officer Avatar Badge Card (Stitch Spec) */}
        {(!isCollapsed || isMobileOpen) && (
          <div className="px-3.5 py-2.5 bg-surface-container-low dark:bg-[#0B1B3A] flex items-center gap-2.5 border-b border-[#CFE3D3]/60 dark:border-[#2B4478] shrink-0">
            <Image
              alt="Officer Avatar"
              width={36}
              height={36}
              unoptimized
              className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-primary/20 dark:ring-[#FF9933]/30"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAHX8p8ojNwuSNcdHKRIAKB6H_IDf6k7akF2OBmxq0sKPoInvpMievq_H0ZbIfLRZ-nRhopM1PeFl8-7or06M3Poo_cHDvX_VHRPjUdT4Oc8B567QSCXL86xzu_5Lnm4tDYX_GXR8AlIB6U4NIH9uHdKxH6ME-7Cep6P8bbswwmBmKRhVHvjoTlYLrSDdjQgwoFtl3Tr1gST1b5AsJ5tRx7RIR0dqJ8Bvjm_67SVi3rYpTbj28YIqvR"
            />
            <div className="flex flex-col truncate">
              <span className="font-semibold text-xs text-on-surface dark:text-white truncate">
                Dr. R. Sharma
              </span>
              <span className="text-[10px] text-primary dark:text-[#FF9933] font-bold truncate">
                AICTE RO - Senior Scrutiny Officer
              </span>
            </div>
          </div>
        )}

        {/* Jurisdiction Selector (Relocated from Top Bar for Clean Spacing) */}
        {(!isCollapsed || isMobileOpen) && (
          <div className="px-3.5 py-2 bg-surface-container-lowest/60 dark:bg-[#09162F]/60 border-b border-[#CFE3D3]/60 dark:border-[#2B4478] shrink-0">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-[#B8C5E0]">
                Jurisdiction
              </label>
              <span className="text-[10px] font-bold text-primary dark:text-[#FF9933]">
                {currentRegion === 'All' ? 'National (All ROs)' : currentRegion}
              </span>
            </div>
            <div className="relative">
              <select
                aria-label="Jurisdiction Selector"
                value={currentRegion}
                onChange={(e) => setRegion(e.target.value as Region | 'All')}
                className="w-full text-xs font-semibold py-1.5 pl-2.5 pr-7 rounded-lg bg-surface-container dark:bg-[#12264D] text-on-surface dark:text-white border border-[#CFE3D3] dark:border-[#2B4478] focus:outline-none cursor-pointer appearance-none"
              >
                <option value="All">All 8 RO Jurisdictions</option>
                <option value="Western">Western (WRO - Mumbai & Goa)</option>
                <option value="Northern">Northern (NRO - Kanpur)</option>
                <option value="North-Western">North-Western (NWRO - Chandigarh)</option>
                <option value="Central">Central (CRO - Bhopal)</option>
                <option value="Eastern">Eastern (ERO - Kolkata)</option>
                <option value="Southern">Southern (SRO - Chennai)</option>
                <option value="South-Western">South-Western (SWRO - Bengaluru)</option>
                <option value="South-Central">South-Central (SCRO - Hyderabad)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant dark:text-[#B8C5E0]" />
            </div>
          </div>
        )}

        {/* Simulated Regulatory Clock (Relocated from Top Bar) */}
        {(!isCollapsed || isMobileOpen) && (
          <div className="px-3.5 py-2.5 bg-surface-container-low/40 dark:bg-[#0B1B3A]/40 border-b border-[#CFE3D3]/60 dark:border-[#2B4478] space-y-1.5 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary dark:text-[#FF9933]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-[#B8C5E0]">
                  Regulatory Clock
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold text-primary dark:text-[#FF9933] bg-surface-container dark:bg-[#1A3366] px-1.5 py-0.5 rounded border border-[#CFE3D3]/60 dark:border-[#2B4478]">
                {new Date(simulatedDate).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1">
              <button
                onClick={() => advanceSimulatedDate(1)}
                className="py-1 px-1 text-[10px] font-bold rounded bg-surface-container dark:bg-[#12264D] hover:bg-surface-container-high dark:hover:bg-[#1A3366] text-on-surface dark:text-white border border-[#CFE3D3]/70 dark:border-[#2B4478] transition-colors text-center"
                title="Advance 1 day"
              >
                +1d
              </button>
              <button
                onClick={() => advanceSimulatedDate(7)}
                className="py-1 px-1 text-[10px] font-bold rounded bg-surface-container dark:bg-[#12264D] hover:bg-surface-container-high dark:hover:bg-[#1A3366] text-on-surface dark:text-white border border-[#CFE3D3]/70 dark:border-[#2B4478] transition-colors text-center"
                title="Advance 7 days"
              >
                +7d
              </button>
              <button
                onClick={() => advanceSimulatedDate(30)}
                className="py-1 px-1 text-[10px] font-bold rounded bg-surface-container dark:bg-[#12264D] hover:bg-surface-container-high dark:hover:bg-[#1A3366] text-on-surface dark:text-white border border-[#CFE3D3]/70 dark:border-[#2B4478] transition-colors text-center"
                title="Advance 30 days"
              >
                +30d
              </button>
              <button
                onClick={jumpToSixtyDaysBeforeCutoff}
                className="py-1 px-1 text-[10px] font-bold rounded bg-secondary-container dark:bg-[#feb63c] text-on-secondary-container dark:text-[#6e4900] hover:opacity-90 transition-colors text-center"
                title="Jump to 60 days before cutoff"
              >
                60d
              </button>
              <button
                onClick={resetSimulation}
                className="py-1 px-1 text-[10px] font-bold rounded bg-surface-container dark:bg-[#12264D] hover:bg-surface-container-high dark:hover:bg-[#1A3366] text-on-surface dark:text-[#B8C5E0] border border-[#CFE3D3]/70 dark:border-[#2B4478] transition-colors text-center"
                title="Reset to default date"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Primary Navigation Links */}
        <nav className="flex flex-col py-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  onCloseMobile?.();
                }}
                className={`w-full flex items-center h-12 transition-all group relative ${
                  isCollapsed && !isMobileOpen
                    ? 'justify-center px-0'
                    : 'px-4 justify-between'
                } ${
                  isActive
                    ? 'bg-surface-container-high dark:bg-[#1A3366] text-primary dark:text-[#FF9933] font-bold border-l-4 border-primary dark:border-[#FF9933]'
                    : 'text-on-surface-variant dark:text-[#CBD5E1] hover:text-on-surface dark:hover:text-white hover:bg-surface-container dark:hover:bg-[#12264D] border-l-4 border-transparent'
                }`}
                title={(isCollapsed && !isMobileOpen) ? item.label : undefined}
              >
                <div className="flex items-center gap-3 truncate">
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-colors ${
                      isActive
                        ? 'text-primary dark:text-[#FF9933]'
                        : 'text-on-surface-variant dark:text-[#CBD5E1] group-hover:text-on-surface'
                    }`}
                  />
                  {(!isCollapsed || isMobileOpen) && (
                    <span className="text-sm tracking-tight truncate">
                      {item.label}
                    </span>
                  )}
                </div>

                {(!isCollapsed || isMobileOpen) && (
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {item.badge && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                    {item.count !== undefined && item.count > 0 && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                          item.countColor || 'bg-surface-container dark:bg-[#1A3366] text-primary dark:text-[#FF9933]'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                    {item.statusDot && (
                      <span className={`w-2 h-2 rounded-full ${item.statusDot}`} />
                    )}
                  </div>
                )}

                {/* Collapsed Tooltip */}
                {isCollapsed && !isMobileOpen && (
                  <div className="absolute left-full ml-3 px-2.5 py-1 bg-inverse-surface text-inverse-on-surface text-xs font-medium rounded-lg shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* 
          ====================================================================
          EXECUTIVE ACTIONS & SIMULATORS (PLACED AT THE END OF THE LEFT LIST)
          Never overlaps or obscures navigation items or "Reports".
          Smoothly flows as part of the sidebar list with ample bottom space.
          ====================================================================
        */}
        {(!isCollapsed || isMobileOpen) ? (
          <div className="pt-3 pb-8 px-3 space-y-2 border-t border-[#CFE3D3]/60 dark:border-[#2B4478] mt-2">
            <div className="px-1.5 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70 dark:text-[#B8C5E0]/70">
                Actions & Simulators
              </span>
            </div>

            <button
              onClick={() => {
                onOpenWorkload();
                onCloseMobile?.();
              }}
              className="w-full min-h-[40px] px-3.5 py-2 rounded-xl bg-surface-container dark:bg-[#12264D] hover:bg-surface-container-high dark:hover:bg-[#1A3366] text-xs font-bold text-on-surface dark:text-white flex items-center gap-2.5 border border-[#CFE3D3] dark:border-[#2B4478] transition-all group shadow-2xs"
            >
              <Scale className="w-4 h-4 text-primary dark:text-[#FF9933] group-hover:scale-110 transition-transform" />
              <span>Officer Workload Balancer</span>
            </button>

            <button
              onClick={() => {
                onOpenDemo();
                onCloseMobile?.();
              }}
              className="w-full min-h-[40px] px-3.5 py-2 rounded-xl bg-primary dark:bg-[#FF9933] text-on-primary dark:text-[#0B1B3A] font-bold text-xs flex items-center gap-2.5 shadow-xs hover:opacity-95 active:scale-[0.98] transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Guided Demo Mode</span>
            </button>

            <button
              onClick={() => {
                onOpenCopilot();
                onCloseMobile?.();
              }}
              className="w-full min-h-[40px] px-3.5 py-2 rounded-xl bg-surface-container dark:bg-[#12264D] hover:bg-surface-container-high dark:hover:bg-[#1A3366] text-xs font-bold text-on-surface dark:text-white flex items-center gap-2.5 border border-[#CFE3D3] dark:border-[#2B4478] transition-all group shadow-2xs"
            >
              <CuteRobotIcon size={16} />
              <span>SAMAY AI Copilot</span>
            </button>

            <button
              onClick={() => {
                onOpenWhatIf();
                onCloseMobile?.();
              }}
              className="w-full min-h-[40px] px-3.5 py-2 rounded-xl bg-surface-container dark:bg-[#12264D] hover:bg-surface-container-high dark:hover:bg-[#1A3366] text-xs font-bold text-primary dark:text-[#FF9933] flex items-center gap-2.5 border border-[#CFE3D3] dark:border-[#2B4478] transition-all group shadow-2xs"
            >
              <SlidersHorizontal className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>What-If Simulator</span>
            </button>

            <div className="pt-2 text-center">
              <span className="inline-block px-3 py-1 rounded-full bg-secondary-container dark:bg-[#FF9933] text-on-secondary-container dark:text-[#0B1B3A] font-bold text-[11px] shadow-2xs">
                Prototype - Synthetic data
              </span>
            </div>
          </div>
        ) : (
          <div className="py-3 px-2 flex flex-col items-center gap-2 border-t border-[#CFE3D3]/60 dark:border-[#2B4478] mt-2 pb-6">
            <button
              onClick={onOpenWorkload}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container dark:bg-[#12264D] text-on-surface-variant hover:text-primary dark:hover:text-[#FF9933] group relative transition-colors"
              title="Officer Workload Balancer"
            >
              <Scale className="w-4 h-4" />
              <div className="absolute left-full ml-3 px-2.5 py-1 bg-inverse-surface text-inverse-on-surface text-xs font-medium rounded-lg shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                Officer Workload Balancer
              </div>
            </button>

            <button
              onClick={onOpenDemo}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary dark:bg-[#FF9933] text-on-primary dark:text-[#0B1B3A] group relative shadow-xs transition-opacity hover:opacity-90"
              title="Guided Demo Mode"
            >
              <Sparkles className="w-4 h-4" />
              <div className="absolute left-full ml-3 px-2.5 py-1 bg-inverse-surface text-inverse-on-surface text-xs font-medium rounded-lg shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                Guided Demo Mode
              </div>
            </button>

            <button
              onClick={onOpenCopilot}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container dark:bg-[#12264D] text-on-surface-variant hover:text-primary dark:hover:text-[#FF9933] group relative transition-colors"
              title="SAMAY AI Copilot"
            >
              <CuteRobotIcon size={16} />
              <div className="absolute left-full ml-3 px-2.5 py-1 bg-inverse-surface text-inverse-on-surface text-xs font-medium rounded-lg shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                SAMAY AI Copilot
              </div>
            </button>

            <button
              onClick={onOpenWhatIf}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container dark:bg-[#12264D] text-primary dark:text-[#FF9933] group relative transition-colors"
              title="What-If Simulator"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <div className="absolute left-full ml-3 px-2.5 py-1 bg-inverse-surface text-inverse-on-surface text-xs font-medium rounded-lg shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                What-If Simulator
              </div>
            </button>

            <button
              onClick={() => setIsCollapsed(false)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container dark:bg-[#12264D] text-on-surface-variant hover:text-on-surface mt-2 transition-colors"
              title="Expand Sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="w-2.5 h-2.5 rounded-full bg-secondary-container dark:bg-[#FF9933] mt-1" title="Prototype - Synthetic data" />
          </div>
        )}
      </div>
    </aside>
  );
}
