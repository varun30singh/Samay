'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { UserRole } from '@/lib/types';
import {
  Bell,
  ChevronDown,
  CheckCircle2,
  Search,
  Sun,
  Moon,
  Menu,
  LogOut
} from 'lucide-react';

interface HeaderProps {
  onOpenCommandPalette: () => void;
  onOpenAlertDigest: () => void;
  onToggleSidebar?: () => void;
  onOpenDemo?: () => void;
  onOpenCopilot?: () => void;
  onOpenWorkload?: () => void;
  isSidebarCollapsed?: boolean;
}

const ROLES: { role: UserRole; label: string; badge: string; color: string }[] = [
  { role: 'bureau_officer', label: 'Regulation Bureau Officer', badge: 'National Oversight', color: 'bg-emerald-100 text-emerald-800' },
  { role: 'regional_officer', label: 'Regional Officer (RO)', badge: 'Western Region (WRO)', color: 'bg-teal-100 text-teal-800' },
  { role: 'scrutiny_officer', label: 'Scrutiny Officer', badge: 'Application Review', color: 'bg-cyan-100 text-cyan-800' },
  { role: 'evc_coordinator', label: 'EVC Coordinator', badge: 'Visit Scheduling', color: 'bg-amber-100 text-amber-800' },
  { role: 'competent_authority', label: 'Competent Authority', badge: 'Statutory Decisions', color: 'bg-purple-100 text-purple-800' },
  { role: 'institution', label: 'Institution Portal View', badge: 'Shivaji Inst Pune', color: 'bg-lime-100 text-lime-800' },
  { role: 'system_admin', label: 'System Administrator', badge: 'Rules & Audit', color: 'bg-slate-100 text-slate-800' },
];

export default function Header({
  onOpenCommandPalette,
  onOpenAlertDigest,
  onToggleSidebar
}: HeaderProps) {
  const {
    currentRole,
    alerts,
    theme,
    toggleTheme,
    logout,
    setRole
  } = useApp();

  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  const unreadAlerts = alerts.filter(a => !a.read).length || 4;
  const currentRoleObj = ROLES.find(r => r.role === currentRole);

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-[#09162F]/95 backdrop-blur-xl border-b border-[#CFE3D3]/60 dark:border-[#2B4478] shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      {/* Official Continuous 4px Sovereign Indian Tricolour Band */}
      <div className="tricolour-bar" />

      <div className="h-16 sm:h-20 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 max-w-full">
        {/* Left Side: Navigation Toggle, Brand Logo & Search */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onToggleSidebar && (
            <button
              aria-label="Toggle Navigation Drawer"
              className="w-10 h-10 flex items-center justify-center rounded-lg text-on-surface dark:text-white hover:bg-surface-container dark:hover:bg-[#12264D] transition-colors shrink-0"
              onClick={onToggleSidebar}
              type="button"
            >
              <Menu className="w-5 h-5 text-primary dark:text-[#FF9933]" />
            </button>
          )}

          {/* Official Emblem & Branding */}
          <div className="flex items-center gap-2.5 min-w-0">
            <Image
              alt="SAMAY Official Logo"
              width={40}
              height={40}
              unoptimized
              className="h-9 sm:h-10 w-auto object-contain shrink-0 rounded-lg bg-white p-0.5 shadow-xs border border-[#CFE3D3]/60 dark:border-[#2B4478]"
              src="/samay-logo.png"
            />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base sm:text-lg text-primary dark:text-[#FF9933] tracking-tight leading-none">
                  SAMAY
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-container dark:bg-[#1A3366] text-primary dark:text-[#FF9933]">
                  AICTE
                </span>
              </div>
              <span className="text-[11px] text-on-surface-variant dark:text-[#B8C5E0] hidden xl:inline truncate max-w-[200px] leading-tight mt-0.5">
                Smart Approval, Monitoring &amp; Alert
              </span>
            </div>
          </div>

          {/* Quick Search / Command Palette Trigger (Cmd+K) */}
          <button
            onClick={onOpenCommandPalette}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-lowest dark:bg-[#12264D] border border-[#CFE3D3] dark:border-[#2B4478] text-xs text-on-surface-variant dark:text-[#CBD5E1] hover:text-on-surface hover:border-primary/40 dark:hover:border-[#FF9933] transition-all shadow-2xs shrink-0"
            title="Search applications or jump to any page (Cmd+K)"
          >
            <Search className="w-3.5 h-3.5 text-primary dark:text-[#FF9933]" />
            <span className="font-medium">Search...</span>
            <kbd className="inline-flex items-center px-1.5 py-0.5 rounded bg-surface-container dark:bg-[#1A3366] text-[10px] font-mono text-primary dark:text-[#FF9933] font-bold border border-[#CFE3D3]/70 dark:border-[#2B4478]">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right Side: Language, Theme, Alerts, Officer Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Mobile Search Button */}
          <button
            onClick={onOpenCommandPalette}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg bg-surface-container dark:bg-[#12264D] text-on-surface dark:text-white"
            title="Search (Cmd+K)"
          >
            <Search className="w-4 h-4 text-primary dark:text-[#FF9933]" />
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`min-h-[34px] sm:min-h-[36px] px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 shadow-xs border ${
              theme === 'dark'
                ? 'bg-[#12264D] text-[#FFFFFF] border-[#FF9933] hover:bg-[#1A3366]'
                : 'bg-surface-container-lowest text-[#082015] border-[#CFE3D3] hover:bg-surface-container'
            }`}
            title={theme === 'dark' ? 'Switch to Default White Theme' : 'Switch to Dark Theme 🇮🇳'}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-[#FF9933]" />
                <span className="font-extrabold text-[11px] text-white tracking-tight hidden lg:inline">
                  White
                </span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-primary" />
                <span className="font-extrabold text-[11px] text-[#082015] tracking-tight hidden lg:inline">
                  Dark 🇮🇳
                </span>
              </>
            )}
          </button>

          {/* Notifications Trigger */}
          <button
            onClick={onOpenAlertDigest}
            className="w-9 sm:w-10 h-9 sm:h-10 relative flex items-center justify-center rounded-lg text-on-surface-variant dark:text-[#CBD5E1] hover:text-on-surface hover:bg-surface-container dark:hover:bg-[#12264D] transition-colors"
            title="Open Statutory Alert Digest &amp; Multilingual Preview"
            aria-label="Notifications"
          >
            <Bell className="w-4 sm:w-5 h-4 sm:h-5" />
            {unreadAlerts > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-error text-on-error font-bold text-[10px] flex items-center justify-center ring-2 ring-surface dark:ring-[#09162F]">
                {unreadAlerts}
              </span>
            )}
          </button>

          {/* Officer Profile Badge & 1-Click Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-lg hover:bg-surface-container dark:hover:bg-[#12264D] border border-transparent hover:border-[#CFE3D3] dark:hover:border-[#2B4478] transition-all cursor-pointer"
              title="Click to switch simulated officer role"
            >
              <Image
                alt="Profile Avatar"
                width={32}
                height={32}
                unoptimized
                className="w-7 sm:w-8 h-7 sm:h-8 rounded-full object-cover ring-1 ring-[#CFE3D3] dark:ring-[#2B4478]"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAHX8p8ojNwuSNcdHKRIAKB6H_IDf6k7akF2OBmxq0sKPoInvpMievq_H0ZbIfLRZ-nRhopM1PeFl8-7or06M3Poo_cHDvX_VHRPjUdT4Oc8B567QSCXL86xzu_5Lnm4tDYX_GXR8AlIB6U4NIH9uHdKxH6ME-7Cep6P8bbswwmBmKRhVHvjoTlYLrSDdjQgwoFtl3Tr1gST1b5AsJ5tRx7RIR0dqJ8Bvjm_67SVi3rYpTbj28YIqvR"
              />
              <div className="hidden md:flex flex-col text-left">
                <span className="font-semibold text-xs text-on-surface dark:text-white leading-tight">
                  Dr. R. Sharma
                </span>
                <span className="text-[10px] text-primary dark:text-[#FF9933] font-bold leading-tight">
                  {currentRoleObj?.label ? currentRoleObj.label.split(' ')[0] : 'Officer'} ({currentRoleObj?.badge || 'AICTE'})
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-on-surface-variant dark:text-[#B8C5E0]" />
            </button>

            {/* Role Dropdown */}
            {showRoleDropdown && (
              <>
                {/* Fixed invisible backdrop to close dropdown when clicking anywhere outside */}
                <div
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setShowRoleDropdown(false)}
                  aria-hidden="true"
                />

                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white dark:bg-[#12264D] border border-[#CFE3D3] dark:border-[#2B4478] py-2 z-50 animate-fade-in shadow-[0_12px_28px_-4px_rgba(15,42,26,0.22)] dark:shadow-[0_16px_36px_-6px_rgba(0,0,0,0.85)] ring-1 ring-black/5 dark:ring-white/10">
                  <div className="px-3.5 py-1.5 border-b border-[#CFE3D3]/60 dark:border-[#2B4478] flex items-center justify-between bg-surface-container-low dark:bg-[#0E1F40] rounded-t-lg">
                    <span className="text-[10px] font-bold text-on-surface-variant dark:text-[#B8C5E0] uppercase tracking-wider">
                      Role-Based Access
                    </span>
                    <span className="text-[9px] font-bold text-primary dark:text-[#FF9933] bg-surface-container dark:bg-[#1A3366] px-2 py-0.5 rounded">
                      1-Click Switch
                    </span>
                  </div>
                  <div className="max-h-80 overflow-y-auto p-1.5 space-y-1 bg-white dark:bg-[#12264D]">
                    {ROLES.map((r) => (
                      <button
                        key={r.role}
                        onClick={() => {
                          setRole(r.role);
                          setShowRoleDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          currentRole === r.role
                            ? 'bg-primary dark:bg-[#FF9933] text-on-primary dark:text-[#0B1B3A] font-bold shadow-xs'
                            : 'text-on-surface dark:text-[#CBD5E1] hover:bg-surface-container dark:hover:bg-[#1A3366]'
                        }`}
                      >
                        <div>
                          <div className="font-semibold">{r.label}</div>
                          <div className="text-[10px] opacity-80 mt-0.5">{r.badge}</div>
                        </div>
                        {currentRole === r.role && (
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Sign out to Portal Authentication Screen */}
                  <div className="pt-1.5 mt-1.5 border-t border-[#CFE3D3]/60 dark:border-[#2B4478] px-1.5">
                    <button
                      onClick={() => {
                        setShowRoleDropdown(false);
                        logout();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span>Sign out (Portal Sign-in)</span>
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
