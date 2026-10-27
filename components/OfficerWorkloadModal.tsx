'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import AdvisoryPopover from '@/components/AdvisoryPopover';
import {
  CheckCircle2,
  X,
  Sparkles,
  Scale,
  Check
} from 'lucide-react';

interface OfficerWorkloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ReassignmentProposal {
  id: string;
  fromOfficer: string;
  toOfficer: string;
  applicationName: string;
  applicationId: string;
  reason: string;
  accepted?: boolean;
}

export default function OfficerWorkloadModal({ isOpen, onClose }: OfficerWorkloadModalProps) {
  const { applications } = useApp();
  const [showProposals, setShowProposals] = useState(false);
  const [proposals, setProposals] = useState<ReassignmentProposal[]>([
    {
      id: 'prop-1',
      fromOfficer: 'Anil Verma (Scrutiny Off)',
      toOfficer: 'Deepak Chouhan (RO Bhopal)',
      applicationName: 'Dr. APJ Abdul Kalam Memorial Engg College',
      applicationId: 'APP-2026-N-2002',
      reason: 'Balances Northern scrutiny queue; cuts Anil Verma backlog from 14 to 13 cases.',
      accepted: false
    },
    {
      id: 'prop-2',
      fromOfficer: 'S. N. Patil (RO Mumbai)',
      toOfficer: 'R. K. Shinde (RO Pune)',
      applicationName: 'Shivaji Institute of Technology & Engineering',
      applicationId: 'APP-2026-W-1001',
      reason: 'Reassigns high-intake case (1420 seats) to Pune district jurisdiction officer.',
      accepted: false
    }
  ]);
  const [toastMsg, setToastMsg] = useState('');

  if (!isOpen) return null;

  // Compute officer distribution
  const officerCounts: Record<string, number> = {};
  applications.forEach(a => {
    officerCounts[a.assignedOfficer] = (officerCounts[a.assignedOfficer] || 0) + 1;
  });

  const officers = Object.entries(officerCounts).map(([name, count]) => ({
    name,
    count,
    isOverloaded: count >= 10
  })).sort((a, b) => b.count - a.count);

  const maxCount = Math.max(...officers.map(o => o.count), 15);

  const handleAcceptProposal = (id: string) => {
    setProposals(prev => prev.map(p => p.id === id ? { ...p, accepted: true } : p));
    setToastMsg('Reassignment advisory logged and queued for officer confirmation.');
    setTimeout(() => setToastMsg(''), 3500);
  };

  const handleDismissProposal = (id: string) => {
    setProposals(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-emerald-950/25 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="glass-dropdown max-w-2xl w-full p-6 sm:p-8 rounded-3xl animate-fade-in space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#CFE3D3]/60 dark:border-[#2B4478]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-yellow-100 dark:bg-[#1A3366] text-amber-900 dark:text-[#FF9933] rounded-2xl border border-yellow-200 dark:border-[#2B4478] shadow-2xs">
              <Scale className="w-5 h-5 text-amber-700 dark:text-[#FF9933]" strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-[#0F241C] dark:text-white tracking-tight">
                  Officer Workload Balancer (FR-C5)
                </h3>
                <AdvisoryPopover
                  title="Workload Balancing Suggestions (Advisory Only)"
                  explanation="Reassignment recommendations are calculated using regional queue distribution algorithms. AI models propose workload leveling to alleviate bottlenecked officers, but require administrative acceptance."
                />
              </div>
              <p className="text-xs text-emerald-950/60 dark:text-[#B8C5E0] mt-0.5">
                Identifies capacity bottlenecks and suggests balanced reassignments across AICTE officers.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-emerald-950/40 dark:text-[#B8C5E0] hover:text-emerald-950 dark:hover:text-white hover:bg-emerald-950/[0.04] dark:hover:bg-[#1A3366] rounded-full transition-colors"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        {toastMsg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-900 dark:text-emerald-100 flex items-center gap-2 animate-fade-in shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Bar Chart Section */}
        <div className="saas-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-950 dark:text-white uppercase tracking-wider">
              Caseload Distribution per Assigned Officer
            </span>
            <span className="text-[10px] text-amber-800 dark:text-[#FF9933] bg-yellow-100 dark:bg-[#1A3366] px-2.5 py-0.5 rounded-full border border-yellow-200 dark:border-[#2B4478] font-semibold">
              ≥10 Cases = Overloaded
            </span>
          </div>

          <div className="space-y-3">
            {officers.map((off) => {
              const widthPct = Math.min(100, (off.count / maxCount) * 100);

              return (
                <div key={off.name} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-emerald-950 dark:text-[#CBD5E1]">{off.name}</span>
                    <span className="font-mono font-bold text-emerald-900 dark:text-white">
                      {off.count} cases {off.isOverloaded && <span className="text-amber-700 dark:text-[#FF9933] font-bold ml-1">(Overloaded)</span>}
                    </span>
                  </div>

                  <div className="w-full bg-emerald-950/[0.06] dark:bg-[#09162F] rounded-full h-2 overflow-hidden flex">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        off.isOverloaded
                          ? 'bg-amber-400 dark:bg-[#FF9933]' // Highlight overloaded in light yellow/amber
                          : 'bg-emerald-500 dark:bg-emerald-400' // Normal green
                      }`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setShowProposals(true)}
              className="btn-pill-primary px-4 py-2 text-xs flex items-center space-x-1.5 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 dark:text-[#0B1B3A]" strokeWidth={1.75} />
              <span>Suggest Reassignments</span>
            </button>
          </div>
        </div>

        {/* Proposed Reassignments Card */}
        {showProposals && (
          <div className="saas-card p-5 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#CFE3D3]/60 dark:border-[#2B4478] pb-2">
              <span className="text-xs font-bold text-emerald-950 dark:text-white">
                Proposed Rebalancing Moves ({proposals.length})
              </span>
              <span className="text-[10px] text-emerald-950/40 dark:text-[#B8C5E0]">AI Rebalance Engine</span>
            </div>

            {proposals.length === 0 ? (
              <p className="text-xs text-emerald-950/50 dark:text-[#B8C5E0]/60 p-2">All proposed reassignments have been processed.</p>
            ) : (
              <div className="space-y-3">
                {proposals.map((prop) => (
                  <div
                    key={prop.id}
                    className="p-3.5 bg-yellow-50/30 dark:bg-[#09162F] rounded-2xl border border-yellow-200/60 dark:border-[#2B4478] space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-bold text-emerald-950 dark:text-white">{prop.applicationName}</span>
                        <div className="text-[11px] text-emerald-950/50 dark:text-[#B8C5E0] mt-0.5">
                          From: <strong>{prop.fromOfficer.split('(')[0]}</strong> → To: <strong>{prop.toOfficer.split('(')[0]}</strong>
                        </div>
                      </div>

                      {prop.accepted ? (
                        <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Accepted</span>
                        </span>
                      ) : (
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => handleDismissProposal(prop.id)}
                            className="btn-pill-secondary px-3 py-1 text-[11px]"
                          >
                            Dismiss
                          </button>
                          <button
                            onClick={() => handleAcceptProposal(prop.id)}
                            className="btn-pill-primary px-3.5 py-1 text-[11px] flex items-center space-x-1"
                          >
                            <Check className="w-3 h-3 text-yellow-300 dark:text-[#0B1B3A]" />
                            <span>Accept</span>
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-emerald-950/70 dark:text-[#CBD5E1] italic">{prop.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="btn-pill-secondary px-4 py-1.5 text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
