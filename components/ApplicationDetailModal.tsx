'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Application, StageName } from '@/lib/types';
import AdvisoryPopover from '@/components/AdvisoryPopover';
import {
  X,
  Building2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  Award,
  Printer,
  CheckSquare,
  Square,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ApplicationDetailModalProps {
  application: Application;
  onClose: () => void;
  onOpenOCR: (app: Application) => void;
}

export default function ApplicationDetailModal({
  application,
  onClose,
  onOpenOCR
}: ApplicationDetailModalProps) {
  const {
    currentRole,
    calendarConfig,
    moveToNextStage,
    returnApplication,
    recordStatutoryDecision,
    isSubmitting
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'checklist' | 'summary' | 'history' | 'actions'>('overview');
  const [returnReason, setReturnReason] = useState('');
  const [showReturnBox, setShowReturnBox] = useState(false);
  const [decisionOrder, setDecisionOrder] = useState('Extension of Approval granted for Academic Year 2026-27 subject to fulfillment of ongoing undertakings.');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fix-It Checklist completed IDs
  const [completedFixItems, setCompletedFixItems] = useState<string[]>([]);

  // Build checklist items based on application's active risk reasons
  const fixItItems = [
    {
      id: 'fix-evc',
      title: 'EVC Visit Inspection Unscheduled',
      desc: 'Expert committee has not been assigned for physical campus verification.',
      actionLabel: 'Schedule EVC Now',
      isRelevant: application.evc?.status === 'Not Scheduled' || application.currentStage === 'EVC',
      action: () => {}
    },
    {
      id: 'fix-lease',
      title: 'Land Lease Deed Expiring Before Cutoff',
      desc: 'Lease deed validity lapses near approval window. Renewed registered deed required.',
      actionLabel: 'Launch OCR Lease Renewal',
      isRelevant: application.documents.some(d => d.type === 'Land Lease Deed' && d.remainingDays < 180),
      action: () => onOpenOCR(application)
    },
    {
      id: 'fix-undertaking',
      title: 'Pending Municipal Occupancy Undertaking',
      desc: 'Municipal occupancy certificate condition due for submission and verification.',
      actionLabel: 'Send Reminder to College',
      isRelevant: application.undertakings.some(u => u.status !== 'Verified'),
      action: () => {}
    },
    {
      id: 'fix-query',
      title: 'Open Scrutiny Observation Query',
      desc: 'Clarification pending from college registrar regarding faculty attendance logs.',
      actionLabel: 'Resolve Query',
      isRelevant: application.observations.some(o => o.status === 'Open'),
      action: () => {}
    }
  ].filter(i => i.isRelevant);

  const toggleFixItem = (id: string) => {
    setCompletedFixItems(prev => {
      const isAlready = prev.includes(id);
      const updated = isAlready ? prev.filter(x => x !== id) : [...prev, id];
      if (!isAlready) {
        setSuccessMessage('Checklist item cleared! Moving application towards On track.');
        setTimeout(() => setSuccessMessage(''), 2500);
      }
      return updated;
    });
  };

  // Dynamically compute adjusted risk for this application
  const effectiveRisk: Application['riskStatus'] =
    completedFixItems.length >= fixItItems.length && fixItItems.length > 0
      ? 'On track'
      : completedFixItems.length > 0
      ? 'Tight'
      : application.riskStatus;

  const getNextStageOption = (): StageName | null => {
    switch (application.currentStage) {
      case 'Submitted':
        return 'Scrutiny';
      case 'Scrutiny':
      case 'Re-Scrutiny':
        return application.route.includes('EVC') ? 'EVC' : 'Decision Pending';
      case 'EVC':
        return application.route.includes('SAC/SHC') ? 'SAC/SHC' : 'Decision Pending';
      case 'SAC/SHC':
        return 'Decision Pending';
      case 'Returned to Institution':
        return 'Scrutiny';
      default:
        return null;
    }
  };

  const nextStage = getNextStageOption();

  const handleNextStage = async () => {
    if (!nextStage || isSubmitting) return;
    setErrorMessage('');
    const res = await moveToNextStage(application.id, nextStage);
    if (!res.success) {
      setErrorMessage(res.error || 'Failed to move stage');
    } else {
      setSuccessMessage(`Application successfully transitioned to ${nextStage}`);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleReturn = async () => {
    if (isSubmitting) return;
    setErrorMessage('');
    if (!returnReason.trim()) {
      setErrorMessage('A mandatory deficiency reason must be provided before returning the application.');
      return;
    }
    const res = await returnApplication(application.id, returnReason);
    if (!res.success) {
      setErrorMessage(res.error || 'Failed to return application');
    } else {
      setSuccessMessage('Application returned to institution with recorded deficiencies.');
      setShowReturnBox(false);
      setReturnReason('');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleStatutoryDecision = async (decision: 'Approved' | 'Rejected') => {
    if (isSubmitting) return;
    setErrorMessage('');
    const res = await recordStatutoryDecision(application.id, decision, decisionOrder);
    if (!res.success) {
      setErrorMessage(res.error || 'Statutory authority error');
    } else {
      if (decision === 'Approved') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
      setSuccessMessage(`Statutory Order Issued: ${decision} recorded.`);
      setTimeout(() => setSuccessMessage(''), 4000);
    }
  };

  const handlePrintSummary = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-emerald-950/25 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="glass-dropdown rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-fade-in shadow-2xl bg-white/95 dark:bg-[#12264D]/98 border border-[#CFE3D3] dark:border-[#2B4478]">
        {/* Sovereign Tricolour Accent */}
        <div className="tricolour-bar" />
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-900 via-emerald-950 to-teal-950 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl text-yellow-300 border border-white/10">
              <Building2 className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">{application.institutionName}</h2>
                <span className="font-mono text-xs text-emerald-200 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10">
                  {application.id}
                </span>
              </div>
              <p className="text-xs text-emerald-200/70 mt-0.5">
                AICTE ID: {application.aictePermanentId} · {application.region} Region ({application.state})
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrintSummary}
              className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors flex items-center space-x-1 text-xs"
              title="Print One-Page Risk Summary (PDF)"
            >
              <Printer className="w-4 h-4" strokeWidth={1.75} />
              <span className="hidden sm:inline">Print Summary</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Status Strip */}
        <div className="bg-yellow-50/40 px-6 py-3 border-b border-emerald-950/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-4">
            <div>
              <span className="text-emerald-950/50">Route: </span>
              <strong className="text-emerald-950 font-semibold">{application.route}</strong>
            </div>
            <div>
              <span className="text-emerald-950/50">Intake: </span>
              <strong className="text-amber-950 font-bold bg-yellow-100 px-2 py-0.5 rounded-full border border-yellow-200 font-mono">
                {application.approvedIntake} seats
              </strong>
            </div>
            <div>
              <span className="text-emerald-950/50">Stage: </span>
              <span className="font-bold text-emerald-900 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                {application.currentStage}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-300 ${
              effectiveRisk === 'Will miss at current pace'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : effectiveRisk === 'Tight'
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}>
              {effectiveRisk} {completedFixItems.length > 0 && '(Updated)'}
            </span>
            <AdvisoryPopover />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-emerald-950/[0.06] px-6 bg-white text-xs font-semibold space-x-2 pt-2">
          {[
            { id: 'overview', label: 'Overview & Guard' },
            { id: 'checklist', label: `Fix-It Checklist (${completedFixItems.length}/${fixItItems.length})` },
            { id: 'summary', label: 'Case Summary (FR-A5)' },
            { id: 'history', label: `Stage History (${application.stageHistory.length})` },
            { id: 'actions', label: 'Actions & Decisions' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'overview' | 'checklist' | 'summary' | 'history' | 'actions')}
              className={`pb-2.5 px-3 border-b-2 font-medium transition-all ${
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-950 font-bold'
                  : 'border-transparent text-emerald-950/50 hover:text-emerald-950'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" strokeWidth={1.75} />
            <div>{errorMessage}</div>
          </div>
        )}
        {successMessage && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-start gap-2 animate-fade-in shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" strokeWidth={1.75} />
            <div>{successMessage}</div>
          </div>
        )}

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Deadline Guard Intelligence Card */}
              <div className="saas-card-glow p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 text-emerald-700" strokeWidth={1.75} />
                    <span className="font-bold text-emerald-950 text-sm">
                      Deadline Guard Backward Calculation
                    </span>
                  </div>
                  <span className="text-emerald-950/50 text-[11px]">
                    Cutoff: <strong className="text-emerald-950">{calendarConfig.approvalCutoffDate}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3">
                  <div className="bg-white p-3.5 rounded-2xl border border-emerald-950/[0.08] shadow-2xs">
                    <div className="text-[11px] text-emerald-950/50">Latest Safe Date</div>
                    <div className="text-base font-bold text-emerald-950 font-mono mt-0.5">
                      {application.latestSafeDateForCurrentStage}
                    </div>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-emerald-950/[0.08] shadow-2xs">
                    <div className="text-[11px] text-emerald-950/50">Days Remaining in SLA</div>
                    <div className={`text-base font-bold font-mono mt-0.5 ${application.daysRemainingInStage < 0 ? 'text-red-700' : 'text-emerald-800'}`}>
                      {application.daysRemainingInStage < 0 ? `${Math.abs(application.daysRemainingInStage)}d OVERDUE` : `${application.daysRemainingInStage} days`}
                    </div>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-emerald-950/[0.08] shadow-2xs">
                    <div className="text-[11px] text-emerald-950/50">Compliance Health</div>
                    <div className="text-base font-bold text-amber-900 font-mono mt-0.5">
                      {application.complianceHealthScore} / 100
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold text-emerald-950 mb-1">
                    Risk Contributing Factors (FR-B7 / FR-H9):
                  </div>
                  <ul className="space-y-1">
                    {application.riskReasons.map((reason, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 text-emerald-950/70">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Documents & Undertakings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="saas-card p-4 space-y-2">
                  <h3 className="font-bold text-emerald-950 text-xs uppercase tracking-wider pb-1 border-b border-emerald-950/[0.06]">
                    Prescribed Documents ({application.documents.length})
                  </h3>
                  {application.documents.map((doc) => (
                    <div key={doc.id} className="p-2.5 bg-yellow-50/30 rounded-xl border border-emerald-950/[0.06] flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-emerald-950">{doc.type}</div>
                        <div className="text-[11px] text-emerald-950/50">
                          Expires: {doc.expiryDate} ({doc.remainingDays}d)
                        </div>
                      </div>
                      {doc.type === 'Land Lease Deed' && (
                        <button
                          onClick={() => onOpenOCR(application)}
                          className="btn-pill-secondary px-2.5 py-1 text-[11px]"
                        >
                          OCR Scan
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="saas-card p-4 space-y-2">
                  <h3 className="font-bold text-emerald-950 text-xs uppercase tracking-wider pb-1 border-b border-emerald-950/[0.06]">
                    Undertaking Commitments ({application.undertakings.length})
                  </h3>
                  {application.undertakings.map((u) => (
                    <div key={u.id} className="p-2.5 bg-emerald-50/40 rounded-xl border border-emerald-950/[0.06] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-emerald-950 line-clamp-1">{u.condition}</span>
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                          {u.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-950/50">Due: {u.dueDate}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ACTIONABLE FIX-IT CHECKLIST (Feature 5) */}
          {activeTab === 'checklist' && (
            <div className="saas-card p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-950/[0.06]">
                <div>
                  <h3 className="text-sm font-bold text-emerald-950">
                    Actionable Fix-It Checklist for At-Risk Applications
                  </h3>
                  <p className="text-xs text-emerald-950/60 mt-0.5">
                    Clear each operational bottleneck to return this institution to safe On Track status.
                  </p>
                </div>
                <span className="font-mono text-xs bg-emerald-100 text-emerald-900 font-bold px-3 py-1 rounded-full border border-emerald-200">
                  {completedFixItems.length} of {fixItItems.length} Solved
                </span>
              </div>

              {fixItItems.length === 0 ? (
                <div className="p-8 text-center text-emerald-800 bg-emerald-50/50 rounded-2xl border border-emerald-200">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
                  <p className="font-bold">No Bottlenecks Detected!</p>
                  <p className="text-xs text-emerald-950/60 mt-1">This application is processing completely on track within SLA.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fixItItems.map((item) => {
                    const isDone = completedFixItems.includes(item.id);

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                          isDone
                            ? 'bg-emerald-50/60 border-emerald-300'
                            : 'bg-yellow-50/30 border-yellow-200/80 hover:bg-yellow-50/60'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <button
                            type="button"
                            onClick={() => toggleFixItem(item.id)}
                            className="mt-0.5 text-emerald-700 hover:text-emerald-900"
                          >
                            {isDone ? (
                              <CheckSquare className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <Square className="w-5 h-5 text-emerald-950/30" />
                            )}
                          </button>
                          <div>
                            <span className={`font-bold text-xs ${isDone ? 'line-through text-emerald-950/50' : 'text-emerald-950'}`}>
                              {item.title}
                            </span>
                            <p className="text-[11px] text-emerald-950/60 mt-0.5">
                              {item.desc}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0 ml-8 sm:ml-0">
                          {isDone ? (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>Completed</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                item.action();
                                toggleFixItem(item.id);
                              }}
                              className="btn-pill-primary px-3.5 py-1.5 text-xs flex items-center space-x-1"
                            >
                              <span>{item.actionLabel}</span>
                              <ChevronRight className="w-3 h-3" strokeWidth={1.75} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'summary' && (
            <div className="saas-card p-6 space-y-4">
              <div className="border-b border-emerald-950/[0.06] pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-emerald-950">
                    ONE-PAGE CASE RISK SUMMARY (APH Clause 5.2)
                  </h3>
                  <p className="text-[11px] text-emerald-950/50">
                    Official synthesized briefing sheet ready for print or statutory filing.
                  </p>
                </div>
                <button
                  onClick={handlePrintSummary}
                  className="btn-pill-secondary px-3 py-1 text-xs flex items-center space-x-1"
                >
                  <Printer className="w-3 h-3 text-emerald-700" />
                  <span>Print Dossier</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-emerald-950/50">Institution:</span>
                  <p className="font-bold text-emerald-950">{application.institutionName}</p>
                </div>
                <div>
                  <span className="text-emerald-950/50">Permanent AICTE ID:</span>
                  <p className="font-bold font-mono text-emerald-950">{application.aictePermanentId}</p>
                </div>
                <div>
                  <span className="text-emerald-950/50">Approval Category:</span>
                  <p className="font-semibold text-emerald-950">{application.type}</p>
                </div>
                <div>
                  <span className="text-emerald-950/50">Approved Student Intake:</span>
                  <p className="font-bold font-mono text-amber-900">{application.approvedIntake} seats</p>
                </div>
              </div>

              <div className="pt-3 border-t border-emerald-950/[0.06]">
                <span className="text-emerald-950/50 block mb-1">EVC Findings:</span>
                <p className="bg-yellow-50/30 p-3 rounded-2xl border border-yellow-200/60 text-emerald-950 italic">
                  {application.evc?.outcomeRecord || 'Physical visit awaiting committee submission.'}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="relative pl-6 border-l-2 border-emerald-200 space-y-4">
                {application.stageHistory.map((item, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-emerald-600 border-2 border-white shadow-xs" />
                    <div className="saas-card p-3.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-950 text-xs">{item.stage}</span>
                        <span className="text-[10px] text-emerald-950/40 font-mono">
                          {new Date(item.startedAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-950/60 font-medium">
                        Actor: {item.actor} ({item.actorRole})
                      </div>
                      <div className="text-[11px] text-emerald-950/80 bg-yellow-50/40 p-2 rounded-xl border border-yellow-200/40">
                        {item.comments || item.outcome}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="space-y-6">
              {/* Forward stage */}
              <div className="saas-card p-5 space-y-3">
                <h3 className="font-bold text-emerald-950 text-xs uppercase tracking-wider">
                  Stage Forward Progression (FR-A2)
                </h3>
                {nextStage ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-emerald-50/30 p-3.5 rounded-2xl border border-emerald-100">
                    <div>
                      <div className="text-emerald-950 text-xs">
                        Current: <strong>{application.currentStage}</strong> → Next: <strong className="text-emerald-800">{nextStage}</strong>
                      </div>
                      <p className="text-[11px] text-emerald-950/50 mt-0.5">
                        Guard checks validated: Role permissions and requisite observations cleared.
                      </p>
                    </div>

                    <button
                      onClick={handleNextStage}
                      className="btn-pill-primary px-4 py-2 text-xs flex items-center space-x-1.5 shrink-0"
                    >
                      <span>Move to {nextStage}</span>
                      <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-emerald-950/50 italic">
                    Final stage reached: {application.currentStage}
                  </div>
                )}
              </div>

              {/* Return with reason */}
              <div className="saas-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-emerald-950 text-xs uppercase tracking-wider">
                    Return / Revert for Deficiencies (FR-A3)
                  </h3>
                  <button
                    onClick={() => setShowReturnBox(!showReturnBox)}
                    className="btn-pill-secondary px-3 py-1 text-xs"
                  >
                    {showReturnBox ? 'Cancel' : 'Initiate Return'}
                  </button>
                </div>

                {showReturnBox && (
                  <div className="space-y-3 pt-2">
                    <label className="block text-xs font-semibold text-emerald-950">
                      Mandatory Deficiency Reason:
                    </label>
                    <textarea
                      rows={3}
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      placeholder="e.g. Discrepancy observed in land lease survey number. Provide registered rectification deed."
                      className="w-full p-3 bg-white border border-emerald-950/[0.1] rounded-2xl text-xs shadow-2xs focus:outline-none"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={handleReturn}
                        className="btn-pill-secondary px-4 py-1.5 text-xs text-amber-900 border-amber-300 bg-amber-50"
                      >
                        Confirm Return to Institution
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* COMPETENT AUTHORITY STATUTORY DECISION */}
              <div className="saas-card-glow p-5 space-y-3">
                <div className="flex items-center space-x-2">
                  <Award className="w-4 h-4 text-emerald-800" strokeWidth={1.75} />
                  <h3 className="font-bold text-emerald-950 text-xs uppercase tracking-wider">
                    Competent Authority Statutory Final Decision (FR-A7 Safeguard)
                  </h3>
                </div>
                <p className="text-[11px] text-emerald-950/60">
                  Regulatory Guard: AI and automated routing never grant or reject approvals. Only the Competent Authority role can record statutory decisions.
                </p>

                {currentRole === 'competent_authority' ? (
                  <div className="space-y-3 pt-2">
                    <label className="block text-xs font-semibold text-emerald-950">
                      Speaking Order Text:
                    </label>
                    <textarea
                      rows={2}
                      value={decisionOrder}
                      onChange={(e) => setDecisionOrder(e.target.value)}
                      className="w-full p-3 bg-white border border-emerald-950/[0.1] rounded-2xl text-xs shadow-2xs focus:outline-none"
                    />
                    <div className="flex items-center justify-end space-x-3">
                      <button
                        onClick={() => handleStatutoryDecision('Rejected')}
                        className="btn-pill-secondary px-4 py-2 text-xs text-red-700 border-red-200 hover:bg-red-50"
                      >
                        Reject with Speaking Order
                      </button>
                      <button
                        onClick={() => handleStatutoryDecision('Approved')}
                        className="btn-pill-primary px-5 py-2 text-xs flex items-center space-x-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" strokeWidth={1.75} />
                        <span>Grant Statutory Approval (EoA)</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-white rounded-2xl border border-emerald-950/[0.08] text-emerald-950/60 text-xs">
                    Statutory decision actions locked. Current role: <strong>{currentRole}</strong>. Switch to <strong>Competent Authority</strong> in top bar to record final orders.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-emerald-950/[0.06] flex items-center justify-between text-xs bg-white">
          <span className="text-emerald-950/40 text-[11px]">Role: {currentRole}</span>
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
