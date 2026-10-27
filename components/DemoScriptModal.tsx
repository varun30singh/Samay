'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X
} from 'lucide-react';

interface DemoScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  setActiveTab: (tab: string) => void;
  onOpenAppDetail: (appId: string) => void;
  onOpenOCR: (appId: string) => void;
}

interface DemoStep {
  stepNumber: number;
  title: string;
  prdSection: string;
  description: string;
  targetTab: string;
  actionButtonText: string;
  actionExplanation: string;
  executeAction: (ctx: ReturnType<typeof useApp>) => void;
}

export default function DemoScriptModal({
  isOpen,
  onClose,
  setActiveTab,
  onOpenAppDetail,
  onOpenOCR
}: DemoScriptModalProps) {
  const context = useApp();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const demoSteps: DemoStep[] = [
    {
      stepNumber: 1,
      title: 'Submit Application & Automated Routing',
      prdSection: 'PRD Section 13 (Step 1) & FR-A1/FR-A2',
      description: 'Institution submits an application. SAMAY evaluates the category and automatically assigns the configured stage route (e.g. Scrutiny + EVC).',
      targetTab: 'applications',
      actionButtonText: 'Jump to Application Queue',
      actionExplanation: 'Switches view to the application register showing route versioning and initial submission.',
      executeAction: (ctx) => {
        setActiveTab('applications');
        ctx.setRole('scrutiny_officer');
      }
    },
    {
      stepNumber: 2,
      title: 'Deficiency Return & Mandatory Reason',
      prdSection: 'PRD Section 13 (Step 2) & FR-A3',
      description: 'Scrutiny Officer returns an application for deficiency with mandatory legal explanation. The return is recorded in the cryptographic audit ledger and notifies the institute.',
      targetTab: 'applications',
      actionButtonText: 'Inspect Returned Application',
      actionExplanation: 'Opens Shivaji Institute (or central case) to inspect deficiency observations.',
      executeAction: () => {
        setActiveTab('applications');
        onOpenAppDetail('APP-2026-W-1001');
      }
    },
    {
      stepNumber: 3,
      title: 'EVC Queue & Member Double-Booking Conflict',
      prdSection: 'PRD Section 13 (Step 3) & FR-C1 to FR-C4',
      description: 'An application needing physical inspection enters the EVC queue. When scheduled with an overlapping expert (Prof. Ramesh Kulkarni), SAMAY immediately flags the conflict.',
      targetTab: 'evc',
      actionButtonText: 'Open EVC Conflict Detector',
      actionExplanation: 'Switches to EVC Command Center showing the double-booking conflict and 1-click auto rebalance.',
      executeAction: (ctx) => {
        setActiveTab('evc');
        ctx.setRole('evc_coordinator');
      }
    },
    {
      stepNumber: 4,
      title: 'Simulate Time Advance (+7 Days) & Escalation Ladder',
      prdSection: 'PRD Section 13 (Step 4) & FR-F2/FR-F3',
      description: 'Advance the simulated clock by 7 days. Notice how nearing deadline alerts escalate to Level 2 (Regional Officer) with idempotent key tracking.',
      targetTab: 'deadline-guard',
      actionButtonText: 'Advance Clock +7 Days',
      actionExplanation: 'Simulates passage of 7 days, evaluates stage ageing SLAs and fires escalation alerts.',
      executeAction: (ctx) => {
        ctx.advanceSimulatedDate(7);
        setActiveTab('deadline-guard');
      }
    },
    {
      stepNumber: 5,
      title: 'Deadline Guard & 40-College Seeded Baseline (Signature)',
      prdSection: 'PRD Section 13 (Deadline Guard Demo) & FR-H1 to FR-H4',
      description: 'Jump to 60 days before the statutory cutoff (1 March). SAMAY works backwards from 30 April, flagging 9 cases as "Will miss" and ranking them by Approved Intake (Students Affected).',
      targetTab: 'deadline-guard',
      actionButtonText: 'Load 60d Cutoff Baseline',
      actionExplanation: 'Resets clock to 60 days before 30 April and calculates student triage rankings.',
      executeAction: (ctx) => {
        ctx.jumpToSixtyDaysBeforeCutoff();
        setActiveTab('deadline-guard');
      }
    },
    {
      stepNumber: 6,
      title: 'Lease Radar & AI OCR Expiry Extraction',
      prdSection: 'PRD Section 13 (Step 5) & FR-E5',
      description: 'Open Shivaji Institute whose short lease (15 May 2026) threatens the cutoff. Use the AI OCR extractor to scan the renewal deed, inspect highlighted clause 4.2, and confirm with officer guardrail.',
      targetTab: 'lease-radar',
      actionButtonText: 'Launch OCR Extractor Modal',
      actionExplanation: 'Opens visual document scanner with bounding box highlight over Clause 4.2 and officer confirmation.',
      executeAction: () => {
        setActiveTab('lease-radar');
        onOpenOCR('APP-2026-W-1001');
      }
    },
    {
      stepNumber: 7,
      title: 'Undertakings Register & Evidence Verification',
      prdSection: 'PRD Section 13 (Step 6) & FR-D1 to FR-D3',
      description: 'Inspect the institutional undertakings register, upload compliance evidence for municipal occupancy, and record verification comments.',
      targetTab: 'undertakings',
      actionButtonText: 'Open Undertakings Register',
      actionExplanation: 'Navigates to undertakings tracking and compliance health score indicators.',
      executeAction: () => {
        setActiveTab('undertakings');
      }
    },
    {
      stepNumber: 8,
      title: 'Tamper-Evident Audit & Integrity Verification',
      prdSection: 'PRD Section 13 (Step 8) & FR-G2',
      description: 'Verify all SHA-256 blocks in the audit ledger. Simulate a malicious tampering attack to prove that the hash chain breaks instantly, and restore integrity with 1 click.',
      targetTab: 'audit',
      actionButtonText: 'Open Tamper-Evident Audit Chain',
      actionExplanation: 'Switches to the cryptographic ledger with block hashes and tampering simulator.',
      executeAction: () => {
        setActiveTab('audit');
      }
    }
  ];

  if (!isOpen) return null;

  const currentStep = demoSteps[currentStepIndex];

  const handleNext = () => {
    // Auto-navigate to step's target
    currentStep.executeAction(context);
    if (currentStepIndex < demoSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      const prevStep = demoSteps[currentStepIndex - 1];
      prevStep.executeAction(context);
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    // Jump straight to Signature Deadline Guard Step 5
    demoSteps[4].executeAction(context);
    setCurrentStepIndex(4);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-emerald-950/25 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="glass-dropdown max-w-2xl w-full rounded-3xl animate-fade-in overflow-hidden bg-white/95 dark:bg-[#12264D]/98 shadow-2xl border border-[#CFE3D3] dark:border-[#2B4478]">
        {/* Sovereign Tricolour Accent */}
        <div className="tricolour-bar" />
        <div className="p-6 sm:p-8 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-emerald-950/[0.06]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-200/60 shadow-2xs">
              <Sparkles className="w-5 h-5 text-yellow-500" strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-[#0F241C] tracking-tight">
                  Guided Demo Mode (8-Step SIH 2026 Evaluation Tour)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Auto-Navigating
                </span>
              </div>
              <p className="text-xs text-emerald-950/60 mt-0.5">
                Stepping through the exact jury demonstration script from PRD Section 13.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-emerald-950/40 hover:text-emerald-950 hover:bg-emerald-950/[0.04] rounded-full transition-colors"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Progress Stepper Bar */}
        <div className="py-2 border-b border-emerald-950/[0.06] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-950">
              Step {currentStep.stepNumber} of {demoSteps.length}: {currentStep.title}
            </span>
            <span className="text-[11px] text-emerald-950/50 font-mono">
              {currentStep.prdSection}
            </span>
          </div>

          <div className="w-full bg-emerald-950/[0.06] rounded-full h-2 overflow-hidden flex gap-1 p-0.5">
            {demoSteps.map((s, idx) => (
              <div
                key={s.stepNumber}
                onClick={() => {
                  s.executeAction(context);
                  setCurrentStepIndex(idx);
                }}
                className={`h-full flex-1 rounded-full cursor-pointer transition-all duration-300 ${
                  idx === currentStepIndex
                    ? 'bg-emerald-600'
                    : idx < currentStepIndex
                    ? 'bg-amber-400'
                    : 'bg-emerald-950/[0.1]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Description & Action */}
        <div className="space-y-4 text-xs">
          <div className="saas-card p-4 space-y-2">
            <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
              PRD Acceptance Criteria Description:
            </div>
            <p className="text-emerald-950 leading-relaxed text-sm">
              {currentStep.description}
            </p>
          </div>

          <div className="p-4 bg-yellow-50/50 border border-yellow-200/80 rounded-2xl flex items-center justify-between gap-4">
            <div>
              <div className="font-bold text-emerald-950 text-xs">Action on this Step:</div>
              <p className="text-emerald-950/70 text-[11px] mt-0.5">
                {currentStep.actionExplanation}
              </p>
            </div>

            <button
              onClick={() => {
                currentStep.executeAction(context);
                onClose();
              }}
              className="btn-pill-primary px-4 py-2 text-xs shrink-0 flex items-center space-x-1"
            >
              <span>{currentStep.actionButtonText}</span>
              <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Footer with Next, Back, and Skip Buttons */}
        <div className="pt-3 border-t border-emerald-950/[0.06] flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <button
              disabled={currentStepIndex === 0}
              onClick={handleBack}
              className={`btn-pill-secondary px-3.5 py-1.5 text-xs flex items-center space-x-1 ${
                currentStepIndex === 0 ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Back</span>
            </button>

            <button
              onClick={handleSkip}
              className="btn-pill-secondary px-3 py-1.5 text-[11px] text-amber-900 bg-yellow-50"
              title="Jump directly to Deadline Guard Signature Feature"
            >
              <span>Skip to Deadline Guard</span>
            </button>
          </div>

          <button
            onClick={handleNext}
            className="btn-pill-primary px-5 py-2 text-xs flex items-center space-x-1.5 shadow-xs"
          >
            <span>{currentStepIndex === demoSteps.length - 1 ? 'Finish Tour' : 'Next Step (Auto-Navigate)'}</span>
            <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}
