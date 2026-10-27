'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { UserRole } from '@/lib/types';
import {
  CheckCircle2,
  Bell,
  ShieldCheck,
  Eye,
  EyeOff,
  UserCheck,
  IdCard,
  Sun,
  Moon,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

interface DemoUser {
  userId: string;
  role: UserRole;
  roleLabel: string;
  department: string;
  email: string;
}

const DEMO_USERS: DemoUser[] = [
  {
    userId: 'SAM-SCR-0101',
    role: 'scrutiny_officer',
    roleLabel: 'Scrutiny Officer',
    department: 'Scrutiny Department - Officer',
    email: 'r.sharma@aicte-india.org'
  },
  {
    userId: 'SAM-REG-0201',
    role: 'regional_officer',
    roleLabel: 'Regional Officer',
    department: 'Regional Operations - Officer',
    email: 'p.joshi@wro-aicte.gov.in'
  },
  {
    userId: 'SAM-BUR-0301',
    role: 'bureau_officer',
    roleLabel: 'Bureau Officer',
    department: 'Bureau Technical - Head',
    email: 'vk.sharma@aicte-india.org'
  },
  {
    userId: 'SAM-EVC-0401',
    role: 'evc_coordinator',
    roleLabel: 'EVC Coordinator',
    department: 'EVC Inspection - Coordinator',
    email: 'evc.coord@aicte-india.org'
  },
  {
    userId: 'SAM-CAU-0501',
    role: 'competent_authority',
    roleLabel: 'Competent Authority',
    department: 'Competent Authority - Executive',
    email: 'chairman@aicte-india.org'
  },
  {
    userId: 'SAM-ADM-0001',
    role: 'system_admin',
    roleLabel: 'System Administrator',
    department: 'System Administrator - IT',
    email: 'admin.samay@aicte-india.org'
  },
  {
    userId: 'INST-100234',
    role: 'institution',
    roleLabel: 'Institution',
    department: 'Institution Portal - Authorized Signatory',
    email: 'registrar@spit.ac.in'
  }
];

export default function LoginPage() {
  const { login, theme, toggleTheme } = useApp();

  const [userId, setUserId] = useState('SAM-SCR-0101');
  const [email, setEmail] = useState('r.sharma@aicte-india.org');
  const [password, setPassword] = useState('••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [showDemoList, setShowDemoList] = useState(false);
  const [forgotMsg, setForgotMsg] = useState(false);

  // Auto-detect role from User ID prefix
  const detectRoleInfo = (idStr: string) => {
    const upper = idStr.trim().toUpperCase();
    if (upper.startsWith('SAM-SCR')) {
      return { role: 'scrutiny_officer' as UserRole, dept: 'Scrutiny Department - Officer', label: 'Scrutiny Officer' };
    }
    if (upper.startsWith('SAM-REG')) {
      return { role: 'regional_officer' as UserRole, dept: 'Regional Operations - Officer', label: 'Regional Officer' };
    }
    if (upper.startsWith('SAM-BUR')) {
      return { role: 'bureau_officer' as UserRole, dept: 'Bureau Technical - Head', label: 'Bureau Officer' };
    }
    if (upper.startsWith('SAM-EVC')) {
      return { role: 'evc_coordinator' as UserRole, dept: 'EVC Inspection - Coordinator', label: 'EVC Coordinator' };
    }
    if (upper.startsWith('SAM-CAU')) {
      return { role: 'competent_authority' as UserRole, dept: 'Competent Authority - Executive', label: 'Competent Authority' };
    }
    if (upper.startsWith('SAM-ADM')) {
      return { role: 'system_admin' as UserRole, dept: 'System Administrator - IT', label: 'System Administrator' };
    }
    if (upper.startsWith('INST')) {
      return { role: 'institution' as UserRole, dept: 'Institution Portal - Authorized Signatory', label: 'Institution Signatory' };
    }
    return { role: 'bureau_officer' as UserRole, dept: 'Regulatory Department - Officer', label: 'Officer' };
  };

  const detected = detectRoleInfo(userId);

  const handleSelectDemo = (u: DemoUser) => {
    setUserId(u.userId);
    setEmail(u.email);
    setPassword('••••••••');
    setShowDemoList(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(userId, detected.role, detected.label, email);
  };

  return (
    <div className="min-h-screen flex flex-col relative bg-white dark:bg-[#09162F] text-gray-900 dark:text-gray-100 font-sans antialiased">
      {/* 4px Continuous Sovereign Indian Tricolour Band at Apex */}
      <div className="tricolour-bar sticky top-0 z-50" />

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* LEFT PANEL: Brand & Value Prop (45%) */}
        <div className="lg:w-[45%] bg-[#166534] dark:bg-[#0B1B3A] text-white p-8 lg:p-16 flex flex-col justify-between relative overflow-hidden transition-colors duration-300">
          {/* Subtle Ambient Rounded Circles */}
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-64 h-64 rounded-full bg-black/10 pointer-events-none" />

          <div className="relative z-10">
            {/* Brand Logo Pill */}
            <div className="inline-flex items-center gap-3 bg-white text-[#166534] dark:text-[#0B1B3A] p-2 pr-5 rounded-2xl font-bold text-lg shadow-md mb-8 border border-white/20">
              <Image
                src="/samay-logo.png"
                alt="SAMAY Logo"
                width={48}
                height={48}
                unoptimized
                className="h-12 w-auto object-contain rounded-xl"
              />
              <div className="flex flex-col">
                <span className="tracking-tight font-extrabold text-[#166534] dark:text-[#0B1B3A] leading-none">SAMAY</span>
                <span className="text-[10px] text-gray-500 font-bold tracking-wider uppercase mt-0.5">AICTE Regulatory Portal</span>
              </div>
            </div>

            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4 leading-tight">
              Smart Approval, Monitoring &amp; Alert System
            </h1>
            <p className="text-lg text-emerald-100 dark:text-blue-200 mb-8 font-medium">
              Know what is due, before it is late.
            </p>

            {/* 3 Value Propositions */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-emerald-50 dark:text-blue-100">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-200 dark:text-[#FF9933]" />
                </div>
                <span className="text-base font-medium">Track every application stage</span>
              </div>

              <div className="flex items-center gap-3 text-emerald-50 dark:text-blue-100">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-4 h-4 text-emerald-200 dark:text-[#FF9933]" />
                </div>
                <span className="text-base font-medium">Never miss a deadline</span>
              </div>

              <div className="flex items-center gap-3 text-emerald-50 dark:text-blue-100">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-4 h-4 text-emerald-200 dark:text-[#FF9933]" />
                </div>
                <span className="text-base font-medium">Clear audit trail</span>
              </div>
            </div>
          </div>

          {/* Left Footer Disclaimer */}
          <div className="relative z-10 mt-12 pt-6 border-t border-white/15 text-xs text-emerald-200 dark:text-blue-300 flex flex-col gap-1">
            <span>SAMAY is a decision-support system. Final decisions rest with the competent authority.</span>
            <span className="font-semibold text-emerald-100 dark:text-[#FF9933]">Prototype - synthetic data</span>
          </div>
        </div>

        {/* RIGHT PANEL: Sign-in Form (55%) */}
        <div className="lg:w-[55%] flex flex-col justify-between p-6 sm:p-12 bg-white dark:bg-[#09162F] transition-colors duration-300">
          {/* Top Controls: Theme */}
          <div className="flex items-center justify-end gap-3 mb-6 sm:mb-8">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#12264D] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shadow-2xs cursor-pointer"
              type="button"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme 🇮🇳'}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-[#FF9933]" />
                  <span>Default White</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-emerald-800" />
                  <span>Dark Theme 🇮🇳</span>
                </>
              )}
            </button>
          </div>

          {/* Centred Form Container */}
          <div className="w-full max-w-[440px] mx-auto my-auto py-4">
            <div className="mb-6 flex flex-col items-start">
              <Image
                src="/samay-logo.png"
                alt="SAMAY Official Logo"
                width={56}
                height={56}
                unoptimized
                className="h-14 w-auto object-contain rounded-xl bg-white p-1 border border-gray-200 dark:border-gray-700 shadow-sm mb-4"
              />
              <h2 className="text-3xl font-bold tracking-tight mb-2 text-gray-900 dark:text-white">
                Sign in
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-base">
                Enter your SAMAY User ID to continue.
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Field 1: User ID with Auto-detection */}
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-gray-800 dark:text-gray-200" htmlFor="userid">
                  User ID
                </label>
                <div className="relative">
                  <IdCard className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    id="userid"
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="e.g. SAM-SCR-0101"
                    className="w-full h-[48px] pl-11 pr-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#12264D] text-gray-900 dark:text-white text-base focus:outline-none focus:ring-2 focus:ring-emerald-600 dark:focus:ring-[#FF9933] transition-all font-mono"
                    required
                  />
                </div>

                {/* Auto-detected Role Confirmation Chip */}
                <div
                  id="role-confirmation-chip"
                  className="mt-2.5 flex items-center justify-between bg-emerald-50 dark:bg-[#12264D]/90 border border-emerald-200 dark:border-emerald-700/60 px-3 py-2 rounded-xl transition-all"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-[#4ADE80] shrink-0" />
                    <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-100" id="detected-role-text">
                      {detected.dept}
                    </span>
                  </div>
                  <span className="text-[11px] bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-full font-medium shrink-0">
                    Auto-detected
                  </span>
                </div>
              </div>

              {/* Field 2: Email */}
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-gray-800 dark:text-gray-200" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full h-[48px] px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#12264D] text-gray-900 dark:text-white text-base focus:outline-none focus:ring-2 focus:ring-emerald-600 dark:focus:ring-[#FF9933] transition-all"
                  required
                />
              </div>

              {/* Field 3: Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200" htmlFor="password">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotMsg(true);
                      setTimeout(() => setForgotMsg(false), 5000);
                    }}
                    className="text-xs font-semibold text-emerald-700 dark:text-[#FF9933] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-[48px] px-4 pr-12 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#12264D] text-gray-900 dark:text-white text-base focus:outline-none focus:ring-2 focus:ring-emerald-600 dark:focus:ring-[#FF9933] transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {forgotMsg && (
                  <p className="mt-2 text-xs text-amber-700 dark:text-[#FEF08A] bg-amber-50 dark:bg-[#232B1B] p-2 rounded-lg border border-amber-200 dark:border-[#CA8A04] flex items-center gap-1.5 animate-fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>For security, credentials reset is dispatched to the designated AICTE Nodal Officer.</span>
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full h-[52px] rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-[#FF9933] dark:hover:bg-[#FFAD5C] text-white dark:text-[#0B1B3A] font-bold text-base transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <span>Sign in</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Divider */}
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-200 dark:border-gray-700" />
                <span className="flex-shrink mx-4 text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">
                  or
                </span>
                <div className="flex-grow border-t border-gray-200 dark:border-gray-700" />
              </div>

              {/* Use Demo Account Section */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowDemoList(!showDemoList)}
                  className="w-full h-[52px] rounded-xl border-2 border-emerald-700 dark:border-[#2B4478] text-emerald-700 dark:text-[#FF9933] hover:bg-emerald-50 dark:hover:bg-[#12264D] font-bold text-base transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserCheck className="w-5 h-5" />
                  <span>Use a demo account</span>
                </button>

                {/* Demo Roster Dropdown */}
                {showDemoList && (
                  <div className="bg-gray-50 dark:bg-[#070D1E] border border-gray-200 dark:border-gray-800 rounded-xl p-3 space-y-2 animate-fade-in shadow-inner">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center justify-between">
                      <span>Select a pre-configured demo user:</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-[#1A3366] dark:text-[#FF9933] px-2 py-0.5 rounded font-bold">
                        1-Click Select
                      </span>
                    </p>
                    <div className="grid grid-cols-1 gap-1.5 text-xs">
                      {DEMO_USERS.map((u) => (
                        <button
                          key={u.userId}
                          type="button"
                          onClick={() => handleSelectDemo(u)}
                          className={`text-left px-3 py-2.5 rounded-lg border transition-all flex justify-between items-center cursor-pointer ${
                            userId === u.userId
                              ? 'bg-emerald-100/70 dark:bg-[#1A3366] border-emerald-600 dark:border-[#FF9933] text-emerald-950 dark:text-white font-bold'
                              : 'bg-white dark:bg-[#12264D] border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-[#1A3366]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold">{u.userId}</span>
                            <span className="text-gray-500 dark:text-gray-400 text-[11px]">({u.roleLabel})</span>
                          </div>
                          <span className="text-[11px] text-emerald-700 dark:text-[#FF9933] font-semibold">
                            Select
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* Empty bottom space for balance */}
          <div className="mt-8" />
        </div>
      </div>
    </div>
  );
}
