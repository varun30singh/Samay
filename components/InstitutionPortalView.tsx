'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { Application } from '@/lib/types';
import {
  CheckCircle2,
  Building2,
  Sparkles
} from 'lucide-react';

interface InstitutionPortalViewProps {
  onOpenOCR: (app: Application) => void;
}

export default function InstitutionPortalView({ onOpenOCR }: InstitutionPortalViewProps) {
  const { applications, calendarConfig } = useApp();

  // Pick Shivaji Institute as primary institution demo case
  const app = applications.find(a => a.id === 'APP-2026-W-1001') || applications[0];

  if (!app) {
    return (
      <div className="p-8 text-center text-on-surface-variant">
        No institution application selected.
      </div>
    );
  }

  const score = app.complianceHealthScore || 88;
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const parcelStages = [
    { title: 'Submitted', date: '10 Jan 2026', done: true, current: false },
    { title: 'Scrutiny Clearance', date: '07 Feb 2026', done: true, current: false },
    { title: 'EVC Expert Inspection', date: 'Scheduled: 05 Mar 2026', done: false, current: true },
    { title: 'SAC / SHC Review', date: 'Estimated: 18 Mar', done: false, current: false },
    { title: 'Statutory EoA Order', date: 'Target: 15 Apr', done: false, current: false }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Sovereign Continuous 4px Tricolour Bar */}
      <div className="tricolour-bar rounded-full" />
      {/* Top Banner */}
      <div className="saas-card-glow p-6 sm:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 bg-white/90 px-3 py-1 rounded-full border border-emerald-900/[0.08] shadow-2xs">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.75} />
              <span className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider">
                Authorized Institution Portal
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F241C]">
              {app.institutionName}
            </h1>
            <p className="text-xs text-emerald-950/60 max-w-2xl">
              AICTE Permanent ID: <strong className="font-mono text-emerald-900">{app.aictePermanentId}</strong> · {app.region} Region ({app.state}) · Approved Intake: <strong className="text-amber-900">{app.approvedIntake} seats</strong>
            </p>
          </div>

          <div className="bg-white/90 px-4 py-2 rounded-2xl border border-emerald-950/[0.08] shadow-2xs text-right">
            <span className="text-[10px] text-emerald-950/50 uppercase font-bold tracking-wider block">Approval Cutoff</span>
            <span className="text-sm font-bold font-mono text-emerald-900">{calendarConfig.approvalCutoffDate}</span>
          </div>
        </div>
      </div>

      {/* Grid: Compliance Score Ring + Parcel Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance Health Score with Circular SVG Progress Ring */}
        <div className="saas-card p-6 flex flex-col items-center justify-center text-center space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
            Institutional Compliance Health Score
          </h3>

          {/* Circular Progress Ring */}
          <div className="relative w-36 h-36 flex items-center justify-center my-2">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 110 110">
              {/* Background ring */}
              <circle
                cx="55"
                cy="55"
                r={radius}
                className="text-emerald-950/[0.08]"
                strokeWidth="10"
                stroke="currentColor"
                fill="transparent"
              />
              {/* Progress ring in green/yellow */}
              <circle
                cx="55"
                cy="55"
                r={radius}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="text-emerald-500 transition-all duration-1000 ease-out"
                stroke="currentColor"
                fill="transparent"
              />
            </svg>

            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-black text-emerald-950 font-mono tracking-tight">
                {score}%
              </span>
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                Health Index
              </span>
            </div>
          </div>

          {/* Breakdown Chips */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 border-t border-emerald-950/[0.06] w-full text-xs">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Land Lease: 92%
            </span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-yellow-50 text-amber-900 border border-yellow-200">
              Undertakings: 80%
            </span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Fire Safety: 95%
            </span>
          </div>
        </div>

        {/* Parcel-Tracker Style Application Stepper (2 cols wide) */}
        <div className="lg:col-span-2 saas-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-950/[0.06]">
            <div>
              <h3 className="text-sm font-bold text-emerald-950">
                Application Movement Tracker (Parcel-Style)
              </h3>
              <p className="text-xs text-emerald-950/60 mt-0.5">
                Real-time tracking of statutory stages, inspections, and pending deliverables.
              </p>
            </div>

            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
              Route: {app.route}
            </span>
          </div>

          {/* Visual Parcel Steps */}
          <div className="py-4 space-y-5">
            <div className="relative pl-6 sm:pl-8 border-l-2 border-emerald-300 space-y-6">
              {parcelStages.map((stage, idx) => (
                <div key={idx} className="relative group">
                  {/* Step indicator dot */}
                  <div className={`absolute -left-[31px] sm:-left-[39px] top-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-xs ${
                    stage.done
                      ? 'bg-emerald-600 text-white'
                      : stage.current
                      ? 'bg-amber-400 text-amber-950 ring-4 ring-yellow-200/60 animate-pulse'
                      : 'bg-emerald-950/[0.15] text-white'
                  }`}>
                    {stage.done ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <span className="text-[9px] font-bold">{idx + 1}</span>
                    )}
                  </div>

                  <div className={`p-3.5 rounded-2xl border transition-all ${
                    stage.current
                      ? 'bg-yellow-50/60 border-yellow-300 ring-2 ring-yellow-300/20'
                      : 'bg-white border-emerald-950/[0.06]'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-emerald-950 text-xs">{stage.title}</div>
                      <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                        stage.done
                          ? 'bg-emerald-100 text-emerald-800'
                          : stage.current
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : 'text-emerald-950/40'
                      }`}>
                        {stage.done ? 'Cleared' : stage.current ? 'In Progress' : 'Upcoming'}
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-950/50 mt-1 font-mono">{stage.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Document Wallet Cards */}
      <div className="saas-card p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-emerald-950/[0.06]">
          <div>
            <h3 className="text-sm font-bold text-emerald-950">
              Institutional Document Wallet
            </h3>
            <p className="text-xs text-emerald-950/60 mt-0.5">
              Validity-tracked statutory certificates with color-coded expiry badges.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {app.documents.map((doc) => {
            const isLapsing = doc.validityStatus === 'Expiring Soon' || doc.validityStatus === 'Expired';

            return (
              <div
                key={doc.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isLapsing
                    ? 'bg-yellow-50/40 border-yellow-300'
                    : 'bg-white border-emerald-950/[0.06]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-xs text-emerald-950">{doc.type}</span>
                    <div className="text-[11px] text-emerald-950/50 mt-0.5">
                      Expiry: <strong className="font-mono text-emerald-950">{doc.expiryDate}</strong>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                    doc.validityStatus === 'Expired'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : doc.validityStatus === 'Expiring Soon'
                      ? 'bg-yellow-100 text-amber-900 border border-yellow-200'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}>
                    {doc.validityStatus}
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-emerald-950/[0.06] flex items-center justify-between text-xs">
                  <span className="text-[11px] text-emerald-950/60 font-mono">
                    {doc.remainingDays} days left
                  </span>
                  {doc.type === 'Land Lease Deed' && (
                    <button
                      onClick={() => onOpenOCR(app)}
                      className="btn-pill-primary px-3 py-1 text-[11px] flex items-center space-x-1"
                    >
                      <Sparkles className="w-3 h-3 text-yellow-300" />
                      <span>OCR Renew</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
