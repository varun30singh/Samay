'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Application, RiskStatus } from '@/lib/types';
import AnimatedCounter from '@/components/AnimatedCounter';
import AdvisoryPopover from '@/components/AdvisoryPopover';
import {
  Sparkles,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  Calendar,
  Users,
  Zap,
  BookmarkCheck
} from 'lucide-react';

interface SavedScenario {
  id: string;
  name: string;
  cutoffOffsetDays: number;
  officerDelta: number;
  speedMultiplier: number;
  willMissAfter: number;
  timestamp: string;
}

export default function WhatIfSimulator() {
  const { applications, calendarConfig, simulatedDate } = useApp();

  // What-If controls state
  const [cutoffOffsetDays, setCutoffOffsetDays] = useState<number>(14); // e.g. +14 days extension
  const [officerDelta, setOfficerDelta] = useState<number>(2); // +2 officers
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.25); // 1.25x stage acceleration
  const [scenarioName, setScenarioName] = useState('April Extension & +2 Scrutiny Officers');
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([
    {
      id: 'scen-1',
      name: 'Baseline 14-Day APH Cutoff Buffer',
      cutoffOffsetDays: 14,
      officerDelta: 0,
      speedMultiplier: 1.0,
      willMissAfter: 4,
      timestamp: '2026-03-01'
    }
  ]);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Baseline counts (Before)
  const baselineOnTrack = applications.filter(a => a.riskStatus === 'On track').length;
  const baselineTight = applications.filter(a => a.riskStatus === 'Tight').length;
  const baselineWillMiss = applications.filter(a => a.riskStatus === 'Will miss at current pace').length;

  // Compute Simulated Scenario (After)
  const simulatedResults = useMemo(() => {
    const baseCutoff = new Date(calendarConfig.approvalCutoffDate);
    const newCutoff = new Date(baseCutoff.getTime() + cutoffOffsetDays * 24 * 60 * 60 * 1000);
    const curDate = new Date(simulatedDate);
    const simulatedDaysToCutoff = Math.round((newCutoff.getTime() - curDate.getTime()) / (1000 * 60 * 60 * 24));

    // Dynamic processing reduction based on speedMultiplier and extra officers
    const capacityBonus = Math.max(0, officerDelta * 2); // 2 days saved per extra officer

    const changedApps: { app: Application; from: RiskStatus; to: RiskStatus; reason: string }[] = [];

    const simApps = applications.map(app => {
      // Adjusted typical remaining days
      let remainingDays = calendarConfig.decisionTypicalDays;
      if (app.currentStage === 'Submitted') {
        remainingDays += calendarConfig.scrutinyTypicalDays + calendarConfig.evcTypicalDays;
      } else if (app.currentStage === 'Scrutiny' || app.currentStage === 'Re-Scrutiny') {
        remainingDays += (calendarConfig.evcTypicalDays + 6);
      } else if (app.currentStage === 'EVC') {
        remainingDays += (app.evc?.status === 'Not Scheduled' ? calendarConfig.evcTypicalDays + 6 : 8);
      } else if (app.currentStage === 'Decision Pending') {
        remainingDays = 7;
      } else {
        return { ...app, simulatedRisk: app.riskStatus };
      }

      // Accelerate duration by speed multiplier and capacity
      remainingDays = Math.max(4, Math.round((remainingDays - capacityBonus) / speedMultiplier));

      const safeDate = new Date(newCutoff.getTime() - remainingDays * 24 * 60 * 60 * 1000);
      const daysUntilSafe = Math.round((safeDate.getTime() - curDate.getTime()) / (1000 * 60 * 60 * 24));

      let newRisk: RiskStatus = 'On track';
      if (daysUntilSafe < 0 || simulatedDaysToCutoff < remainingDays) {
        newRisk = 'Will miss at current pace';
      } else if (daysUntilSafe <= calendarConfig.advanceAlertDays) {
        newRisk = 'Tight';
      }

      if (newRisk !== app.riskStatus) {
        changedApps.push({
          app,
          from: app.riskStatus,
          to: newRisk,
          reason: newRisk === 'On track' ? `Gained ${cutoffOffsetDays}d buffer & ${Math.round((speedMultiplier - 1) * 100)}% faster stage velocity` : 'Timeline contracted'
        });
      }

      return {
        ...app,
        simulatedRisk: newRisk
      };
    });

    const simOnTrack = simApps.filter(a => a.simulatedRisk === 'On track').length;
    const simTight = simApps.filter(a => a.simulatedRisk === 'Tight').length;
    const simWillMiss = simApps.filter(a => a.simulatedRisk === 'Will miss at current pace').length;

    return {
      simApps,
      simOnTrack,
      simTight,
      simWillMiss,
      changedApps,
      simulatedDaysToCutoff
    };
  }, [applications, cutoffOffsetDays, officerDelta, speedMultiplier, calendarConfig, simulatedDate]);

  const handleReset = () => {
    setCutoffOffsetDays(0);
    setOfficerDelta(0);
    setSpeedMultiplier(1.0);
  };

  const handleSaveScenario = () => {
    const newScen: SavedScenario = {
      id: `scen-${Date.now()}`,
      name: scenarioName || `Scenario (+${cutoffOffsetDays}d, ${speedMultiplier}x)`,
      cutoffOffsetDays,
      officerDelta,
      speedMultiplier,
      willMissAfter: simulatedResults.simWillMiss,
      timestamp: simulatedDate.split('T')[0]
    };
    setSavedScenarios(prev => [newScen, ...prev]);
    setSaveSuccessMsg('Scenario saved to policy review records!');
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const handleApplySaved = (scen: SavedScenario) => {
    setCutoffOffsetDays(scen.cutoffOffsetDays);
    setOfficerDelta(scen.officerDelta);
    setSpeedMultiplier(scen.speedMultiplier);
    setScenarioName(scen.name);
  };

  return (
    <div className="saas-card-glow p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-[#CFE3D3]/60 dark:border-[#2B4478]">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-xl bg-yellow-100 dark:bg-[#1A3366] text-amber-900 dark:text-[#FF9933] border border-yellow-200 dark:border-[#FF9933]/40">
              <Sparkles className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-[#0F241C] dark:text-white">
              What-If Regulatory Scenario Simulator
            </h2>
            <AdvisoryPopover
              title="What-If Simulation Engine (Advisory Only)"
              explanation="Simulates hypothetical regulatory adjustments (such as statutory date extensions, capacity additions, or expedited stage SLAs) to project their impact on institutional compliance before policy decisions are finalized."
              legalReference="AICTE Policy Planning Advisory Framework & Approval Process Handbook"
            />
          </div>
          <p className="text-xs text-emerald-950/60 dark:text-[#B8C5E0] max-w-2xl">
            Model the impact of moving cutoff dates, deploying additional scrutiny officers, and accelerating EVC schedules on student admission safety.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleReset}
            className="btn-pill-secondary px-3.5 py-1.5 text-xs flex items-center space-x-1.5 shadow-2xs"
            title="Reset to current baseline"
          >
            <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Reset Scenario</span>
          </button>
          <button
            onClick={handleSaveScenario}
            className="btn-pill-primary px-4 py-1.5 text-xs flex items-center space-x-1.5 shadow-xs"
          >
            <Save className="w-3.5 h-3.5 text-yellow-300 dark:text-[#0B1B3A]" strokeWidth={1.75} />
            <span>Save Scenario</span>
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-900 dark:text-emerald-100 flex items-center gap-2 animate-fade-in shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Controls Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 bg-white/90 dark:bg-[#09162F]/80 rounded-2xl border border-emerald-950/[0.07] dark:border-[#2B4478] shadow-2xs">
        {/* Cutoff Date Offset Controls */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-950 dark:text-white flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-700 dark:text-[#FF9933]" strokeWidth={1.75} />
              <span>Statutory Cutoff Offset</span>
            </span>
            <span className="font-mono text-xs font-bold text-amber-950 dark:text-[#FF9933] bg-yellow-100 dark:bg-[#1A3366] px-2.5 py-0.5 rounded-full border border-yellow-200 dark:border-[#2B4478]">
              {cutoffOffsetDays >= 0 ? `+${cutoffOffsetDays} days` : `${cutoffOffsetDays} days`}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[-7, 0, 7, 14, 21, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setCutoffOffsetDays(d)}
                className={`px-3 py-1 text-xs rounded-full font-medium transition-all ${
                  cutoffOffsetDays === d
                    ? 'bg-emerald-600 dark:bg-[#FF9933] text-white dark:text-[#0B1B3A] font-bold shadow-xs'
                    : 'bg-yellow-50/50 dark:bg-[#12264D] hover:bg-yellow-100/70 dark:hover:bg-[#1A3366] text-emerald-950 dark:text-[#CBD5E1] border border-yellow-200/60 dark:border-[#2B4478]'
                }`}
              >
                {d === 0 ? 'Normal (30 Apr)' : d > 0 ? `+${d}d` : `${d}d`}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-emerald-950/50 dark:text-[#B8C5E0]/60">Simulates extending approval window</p>
        </div>

        {/* Officer Capacity Delta */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-950 dark:text-white flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-700 dark:text-[#FF9933]" strokeWidth={1.75} />
              <span>Officer Resource Allocation</span>
            </span>
            <span className="font-mono text-xs font-bold text-emerald-950 dark:text-[#FF9933] bg-emerald-100 dark:bg-[#1A3366] px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-[#2B4478]">
              {officerDelta >= 0 ? `+${officerDelta} officers` : `${officerDelta} officers`}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[-2, 0, 2, 4, 6].map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOfficerDelta(o)}
                className={`px-3 py-1 text-xs rounded-full font-medium transition-all ${
                  officerDelta === o
                    ? 'bg-emerald-600 dark:bg-[#FF9933] text-white dark:text-[#0B1B3A] font-bold shadow-xs'
                    : 'bg-yellow-50/50 dark:bg-[#12264D] hover:bg-yellow-100/70 dark:hover:bg-[#1A3366] text-emerald-950 dark:text-[#CBD5E1] border border-yellow-200/60 dark:border-[#2B4478]'
                }`}
              >
                {o === 0 ? 'Current Staff' : o > 0 ? `+${o} Staff` : `${o} Staff`}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-emerald-950/50 dark:text-[#B8C5E0]/60">Reduces stage backlog wait times</p>
        </div>

        {/* Stage Speedup Factor */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-950 dark:text-white flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-[#FF9933]" strokeWidth={1.75} />
              <span>SLA Velocity Multiplier</span>
            </span>
            <span className="font-mono text-xs font-bold text-emerald-950 dark:text-[#FF9933] bg-emerald-100 dark:bg-[#1A3366] px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-[#2B4478]">
              {speedMultiplier}x speed
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              { val: 1.0, label: '1.0x (Normal)' },
              { val: 1.25, label: '1.25x (+25%)' },
              { val: 1.5, label: '1.5x (Express)' },
              { val: 2.0, label: '2.0x (Overdrive)' }
            ].map(({ val, label }) => (
              <button
                key={val}
                type="button"
                onClick={() => setSpeedMultiplier(val)}
                className={`px-3 py-1 text-xs rounded-full font-medium transition-all ${
                  speedMultiplier === val
                    ? 'bg-emerald-600 dark:bg-[#FF9933] text-white dark:text-[#0B1B3A] font-bold shadow-xs'
                    : 'bg-yellow-50/50 dark:bg-[#12264D] hover:bg-yellow-100/70 dark:hover:bg-[#1A3366] text-emerald-950 dark:text-[#CBD5E1] border border-yellow-200/60 dark:border-[#2B4478]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-emerald-950/50 dark:text-[#B8C5E0]/60">Expedited scrutiny & committee turnaround</p>
        </div>
      </div>

      {/* Live Comparative Before vs After Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* On Track Metric Card */}
        <div className="saas-card p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-emerald-800 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.75} />
              <span>On Track Applications</span>
            </span>
            <span className="text-[10px] uppercase font-bold text-emerald-950/40">Comparative</span>
          </div>

          <div className="flex items-baseline space-x-3">
            <span className="text-2xl font-black text-emerald-950 font-mono">
              <AnimatedCounter value={simulatedResults.simOnTrack} />
            </span>
            <span className="text-xs text-emerald-950/50 font-mono">
              Baseline: {baselineOnTrack}
            </span>
            <span className={`text-xs font-bold px-2 py-0.2 rounded-full font-mono ${
              simulatedResults.simOnTrack >= baselineOnTrack
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}>
              {simulatedResults.simOnTrack >= baselineOnTrack ? `+${simulatedResults.simOnTrack - baselineOnTrack}` : `${simulatedResults.simOnTrack - baselineOnTrack}`}
            </span>
          </div>
        </div>

        {/* Tight Timeline Metric Card */}
        <div className="saas-card p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-amber-800 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" strokeWidth={1.75} />
              <span>Tight Timelines</span>
            </span>
            <span className="text-[10px] uppercase font-bold text-emerald-950/40">Comparative</span>
          </div>

          <div className="flex items-baseline space-x-3">
            <span className="text-2xl font-black text-amber-950 font-mono">
              <AnimatedCounter value={simulatedResults.simTight} />
            </span>
            <span className="text-xs text-emerald-950/50 font-mono">
              Baseline: {baselineTight}
            </span>
            <span className="text-xs font-bold px-2 py-0.2 rounded-full font-mono bg-yellow-100 text-amber-900">
              {simulatedResults.simTight - baselineTight >= 0 ? `+${simulatedResults.simTight - baselineTight}` : `${simulatedResults.simTight - baselineTight}`}
            </span>
          </div>
        </div>

        {/* Will Miss Cutoff Metric Card */}
        <div className="saas-card p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-red-800 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-red-600" strokeWidth={1.75} />
              <span>Will Miss Cutoff</span>
            </span>
            <span className="text-[10px] uppercase font-bold text-emerald-950/40">Comparative</span>
          </div>

          <div className="flex items-baseline space-x-3">
            <span className="text-2xl font-black text-red-950 font-mono">
              <AnimatedCounter value={simulatedResults.simWillMiss} />
            </span>
            <span className="text-xs text-emerald-950/50 font-mono">
              Baseline: {baselineWillMiss}
            </span>
            <span className={`text-xs font-bold px-2 py-0.2 rounded-full font-mono ${
              simulatedResults.simWillMiss <= baselineWillMiss
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {simulatedResults.simWillMiss - baselineWillMiss >= 0 ? `+${simulatedResults.simWillMiss - baselineWillMiss}` : `${simulatedResults.simWillMiss - baselineWillMiss}`}
            </span>
          </div>
        </div>
      </div>

      {/* List of Applications that Flipped Status */}
      <div className="saas-card p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#CFE3D3]/60 dark:border-[#2B4478]">
          <span className="text-xs font-bold text-emerald-950 dark:text-white uppercase tracking-wider">
            Status Transition Diff Log ({simulatedResults.changedApps.length} Institutions Affected)
          </span>
          <span className="text-[11px] text-emerald-950/50 dark:text-[#B8C5E0] font-mono">
            Simulated Cutoff: {cutoffOffsetDays}d delta
          </span>
        </div>

        {simulatedResults.changedApps.length === 0 ? (
          <div className="p-4 text-center text-emerald-950/50 dark:text-[#B8C5E0]/60 text-xs">
            No institutional applications flipped status under the currently selected parameters.
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {simulatedResults.changedApps.map(({ app, from, to }) => (
              <div
                key={app.id}
                className="p-3 bg-white dark:bg-[#09162F] rounded-xl border border-emerald-950/[0.06] dark:border-[#2B4478] flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-emerald-950 dark:text-white">{app.institutionName}</span>
                  <div className="text-[11px] text-emerald-950/50 dark:text-[#B8C5E0]">
                    {app.id} · {app.region} Region · {app.approvedIntake} Intake seats
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 line-through">
                    {from}
                  </span>
                  <ArrowRight className="w-3 h-3 text-emerald-600 dark:text-[#FF9933]" />
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-[#1A3366] text-emerald-900 dark:text-[#FF9933] border border-emerald-200 dark:border-[#2B4478]">
                    {to}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Saved Scenarios Rollup */}
      {savedScenarios.length > 0 && (
        <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-emerald-950/50 dark:text-[#B8C5E0] font-semibold text-[11px]">Saved Scenarios:</span>
          {savedScenarios.map((scen) => (
            <button
              key={scen.id}
              onClick={() => handleApplySaved(scen)}
              className="btn-pill-secondary px-3 py-1 text-[11px] flex items-center space-x-1.5"
            >
              <BookmarkCheck className="w-3 h-3 text-emerald-700 dark:text-[#FF9933]" strokeWidth={1.75} />
              <span>{scen.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
