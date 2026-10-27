'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Bell,
  CheckCircle2,
  X,
  Check
} from 'lucide-react';

interface AlertDigestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AlertDigestModal({ isOpen, onClose }: AlertDigestModalProps) {
  const { alerts, simulatedDate } = useApp();

  const [isDigestMode, setIsDigestMode] = useState(false);
  const [acknowledgedIds, setAcknowledgedIds] = useState<string[]>([]);
  const [snoozedIds, setSnoozedIds] = useState<string[]>([]);
  const [toastMsg, setToastMsg] = useState('');

  if (!isOpen) return null;

  const currentAlert = alerts[0]; // Primary active alert for preview

  const currentTrans = {
    title: currentAlert ? currentAlert.title : 'EVC Scheduling Overdue: Shivaji Institute of Technology',
    body: currentAlert ? currentAlert.message : 'Application has spent 22 days in EVC stage without committee visit scheduled. Deadline Guard flags critical risk of missing statutory 30 April cutoff.',
    nextStep: 'Escalation Ladder: Will escalate to Regional Officer in 3 days if unaddressed.'
  };

  const handleAcknowledge = (id: string) => {
    setAcknowledgedIds(prev => [...prev, id]);
    setToastMsg('Alert acknowledged and logged in audit trail.');
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleSnooze = (id: string) => {
    setSnoozedIds(prev => [...prev, id]);
    setToastMsg('Alert snoozed for 24 simulated hours.');
    setTimeout(() => setToastMsg(''), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-emerald-950/25 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="glass-dropdown max-w-2xl w-full p-6 sm:p-8 rounded-3xl animate-fade-in space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-emerald-950/[0.06]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-yellow-100 text-amber-900 rounded-2xl border border-yellow-200 shadow-2xs">
              <Bell className="w-5 h-5 text-amber-700" strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-[#0F241C] tracking-tight">
                  Alert Preview, Digest & Escalation Ladder
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Automated Escalation
                </span>
              </div>
              <p className="text-xs text-emerald-950/60 mt-0.5">
                Idempotent alert delivery across channels with configurable escalation ladders (FR-F1 to FR-F3).
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-emerald-950/40 hover:text-emerald-950 hover:bg-emerald-950/[0.04] rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        {toastMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center gap-2 animate-fade-in shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" strokeWidth={1.75} />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Controls Row: Digest Mode Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-emerald-950/[0.08] shadow-2xs text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-emerald-950/70">Delivery Mode:</span>
          </div>

          {/* Digest Mode Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsDigestMode(!isDigestMode)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                isDigestMode
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
                  : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              }`}
            >
              {isDigestMode ? 'Digest Mode (Daily Rollup ON)' : 'Instant Alert Mode'}
            </button>
          </div>
        </div>

        {/* Multilingual Notification Card */}
        <div className="saas-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
              Level 1 Escalation Notice
            </span>
            <span className="font-mono text-[10px] text-emerald-950/40">
              Clock: {simulatedDate.split('T')[0]}
            </span>
          </div>

          <h4 className="text-sm font-bold text-emerald-950">
            {currentTrans.title}
          </h4>

          <p className="text-xs text-emerald-950/70 leading-relaxed bg-yellow-50/40 p-3 rounded-2xl border border-yellow-200/60">
            {currentTrans.body}
          </p>

          {/* Action buttons: Acknowledge & Snooze */}
          <div className="flex items-center justify-between pt-2 border-t border-emerald-950/[0.06]">
            <span className="text-[11px] text-emerald-950/50 italic">
              {currentTrans.nextStep}
            </span>

            <div className="flex items-center space-x-2">
              {acknowledgedIds.includes(currentAlert?.id || 'alt-1') ? (
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Acknowledged
                </span>
              ) : snoozedIds.includes(currentAlert?.id || 'alt-1') ? (
                <span className="text-xs text-amber-700 font-semibold">
                  Snoozed (24h)
                </span>
              ) : (
                <>
                  <button
                    onClick={() => handleSnooze(currentAlert?.id || 'alt-1')}
                    className="btn-pill-secondary px-3 py-1 text-xs"
                  >
                    Snooze 24h
                  </button>
                  <button
                    onClick={() => handleAcknowledge(currentAlert?.id || 'alt-1')}
                    className="btn-pill-primary px-3.5 py-1 text-xs flex items-center space-x-1"
                  >
                    <Check className="w-3.5 h-3.5 text-yellow-300" strokeWidth={1.75} />
                    <span>Acknowledge</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Visual Animated Escalation Ladder */}
        <div className="saas-card p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-950/[0.06]">
            <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
              Automatic Escalation Ladder Progression
            </span>
            <span className="text-[10px] text-emerald-950/50 font-mono">APH Protocol</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
            {/* Day 0 */}
            <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/60 space-y-1">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                Day 0 (Initial)
              </span>
              <div className="font-bold text-emerald-950 text-[11px]">Institution & Officer</div>
              <p className="text-[10px] text-emerald-950/50">SMS / In-App reminder</p>
            </div>

            {/* Day +3 */}
            <div className="p-3 rounded-2xl bg-yellow-50 border border-yellow-200 space-y-1">
              <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                Day +3 (Level 1)
              </span>
              <div className="font-bold text-emerald-950 text-[11px]">Supervisor Review</div>
              <p className="text-[10px] text-emerald-950/50">Workload recheck alert</p>
            </div>

            {/* Day +7 */}
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
              <span className="text-[10px] font-bold text-amber-950 uppercase tracking-wider">
                Day +7 (Level 2)
              </span>
              <div className="font-bold text-emerald-950 text-[11px]">Regional Officer</div>
              <p className="text-[10px] text-emerald-950/50">Email escalation alert</p>
            </div>

            {/* Day +14 */}
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 space-y-1">
              <span className="text-[10px] font-bold text-red-800 uppercase tracking-wider">
                Day +14 (Level 3)
              </span>
              <div className="font-bold text-red-950 text-[11px]">Regulation Bureau</div>
              <p className="text-[10px] text-red-700">No Admission category threat</p>
            </div>
          </div>
        </div>

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
