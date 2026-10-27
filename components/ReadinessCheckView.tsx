'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Application, ReadinessCheckReport } from '@/lib/types';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCheck,
  Send,
  AlertCircle,
  Upload,
  ShieldAlert,
  Info,
  Sparkles
} from 'lucide-react';

interface ReadinessCheckViewProps {
  onSelectApplication?: (app: Application) => void;
  onOpenUploadModal?: (appId: string) => void;
}

export default function ReadinessCheckView({ onSelectApplication, onOpenUploadModal }: ReadinessCheckViewProps) {
  const {
    applications,
    runReadinessCheckForApp,
    submitApplicationWithReadiness
  } = useApp();

  // Find candidate application for institution
  // Default to first application or specific institution
  const [selectedAppId, setSelectedAppId] = useState<string>(() => {
    const defaultApp = applications.find(a => a.currentStage === 'Returned to Institution' || a.currentStage === 'Submitted' || a.currentStage === 'Scrutiny');
    return defaultApp ? defaultApp.id : applications[0]?.id || '';
  });

  const [activeReport, setActiveReport] = useState<ReadinessCheckReport | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [submissionSuccessMsg, setSubmissionSuccessMsg] = useState('');
  const [actionNotice, setActionNotice] = useState('');

  const handleRunCheck = () => {
    if (!selectedAppId) return;
    const report = runReadinessCheckForApp(selectedAppId);
    if (report) {
      setActiveReport(report);
      setActionNotice('');
    }
  };

  const handleSubmitClick = () => {
    if (!selectedAppId) return;
    const result = submitApplicationWithReadiness(selectedAppId, false);
    if (result.requiresConfirmation) {
      setShowWarningModal(true);
    } else if (result.success) {
      setSubmissionSuccessMsg('Application successfully submitted with 100% readiness pass rate.');
      setTimeout(() => setSubmissionSuccessMsg(''), 5000);
    }
  };

  const handleConfirmBypassSubmit = () => {
    if (!selectedAppId) return;
    const result = submitApplicationWithReadiness(selectedAppId, true);
    setShowWarningModal(false);
    if (result.success) {
      setSubmissionSuccessMsg(
        `Application submitted to AICTE for official scrutiny despite ${activeReport?.failedCount || 0} advisory warning(s). Scrutiny officers will make the statutory determination.`
      );
      setTimeout(() => setSubmissionSuccessMsg(''), 6000);
    }
  };

  const handleRemediateAction = (actionType: string) => {
    if (onOpenUploadModal && selectedAppId) {
      onOpenUploadModal(selectedAppId);
    }
    setActionNotice(`Initiated guided remediation: "${actionType}". Form opened for rectification.`);
    setTimeout(() => setActionNotice(''), 4000);
  };

  return (
    <div className="flex flex-col w-full gap-5 animate-fade-in pb-12">
      {/* Sovereign Tricolour Top Accent Ribbon */}
      <div className="tricolour-bar rounded-full" />

      {/* Screen Title & Statutory Advisory Header */}
      <section className="flex flex-col gap-2 bg-surface-container-lowest dark:bg-[#12264D] rounded-xl p-4 sm:p-5 shadow-sm border border-[#CFE3D3]/60 dark:border-[#2B4478]">
        <nav aria-label="Official Breadcrumb" className="flex items-center gap-1.5 text-on-surface-variant dark:text-[#B8C5E0] text-xs font-semibold flex-wrap">
          <span className="flex items-center gap-1 text-primary dark:text-[#FF9933] font-bold">
            <FileCheck className="w-3.5 h-3.5" />
            <span>SAMAY</span>
          </span>
          <span>›</span>
          <span>Institution Self-Service</span>
          <span>›</span>
          <span className="text-on-surface dark:text-white font-bold">Check Before You Submit</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-1">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-on-surface dark:text-white tracking-tight">
              Pre-Submission Readiness Checker
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant dark:text-[#CBD5E1] mt-1 max-w-3xl">
              Evaluate your application dossier against AICTE statutory APH rules before formal submission to prevent avoidable returns.
            </p>
          </div>

          {/* Statutory Mandatory Warning Pill */}
          <div className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center gap-2 shrink-0">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Advisory only: this check does not replace official scrutiny.</span>
          </div>
        </div>

        {/* Target Application Selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3 border-t border-[#CFE3D3]/60 dark:border-[#2B4478] mt-2">
          <label className="text-xs font-bold text-on-surface dark:text-white shrink-0">
            Select Dossier to Audit:
          </label>
          <select
            value={selectedAppId}
            onChange={(e) => {
              setSelectedAppId(e.target.value);
              setActiveReport(null);
              const found = applications.find(a => a.id === e.target.value);
              if (found && onSelectApplication) onSelectApplication(found);
            }}
            className="flex-1 min-h-[44px] px-3 rounded-lg bg-surface-container dark:bg-[#09162F] text-xs font-semibold text-on-surface dark:text-white border border-[#CFE3D3] dark:border-[#2B4478] focus:outline-none cursor-pointer"
          >
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.id} — {app.institutionName} ({app.region}, Stage: {app.currentStage})
              </option>
            ))}
          </select>

          <button
            onClick={handleRunCheck}
            className="min-h-[44px] px-5 py-2.5 rounded-lg bg-primary dark:bg-[#FF9933] text-on-primary dark:text-[#0B1B3A] font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-xs shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>Run Readiness Check</span>
          </button>
        </div>
      </section>

      {/* Success Notification */}
      {submissionSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{submissionSuccessMsg}</span>
        </div>
      )}

      {/* Action Trigger Notice */}
      {actionNotice && (
        <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Report Results */}
      {activeReport ? (
        <div className="flex flex-col gap-5">
          {/* Summary Ring & Score Banner */}
          <section className="bg-surface-container-lowest dark:bg-[#12264D] rounded-xl p-5 shadow-sm border border-[#CFE3D3] dark:border-[#2B4478] flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              {/* Circular Percentage Ring */}
              <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-surface-container dark:text-[#09162F]"
                    strokeWidth="3.8"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={
                      activeReport.scorePercent === 100
                        ? 'text-emerald-500'
                        : activeReport.scorePercent >= 70
                        ? 'text-amber-500'
                        : 'text-red-500'
                    }
                    strokeDasharray={`${activeReport.scorePercent}, 100`}
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-lg font-black text-on-surface dark:text-white tabular-nums">
                    {activeReport.scorePercent}%
                  </span>
                  <span className="text-[8px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-[#B8C5E0]">
                    Readiness
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-on-surface dark:text-white">
                    {activeReport.institutionName}
                  </h2>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      activeReport.overallStatus === 'PASS'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : activeReport.overallStatus === 'WARNING'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                    }`}
                  >
                    STATUS: {activeReport.overallStatus}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant dark:text-[#CBD5E1] mt-1">
                  Checked {activeReport.totalChecks} statutory criteria: {activeReport.passedCount} Passed,{' '}
                  {activeReport.warningCount} Warnings, {activeReport.failedCount} Failures.
                </p>
              </div>
            </div>

            {/* Submit Action Button */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleSubmitClick}
                className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-lg bg-emerald-700 dark:bg-[#FF9933] text-white dark:text-[#0B1B3A] font-bold text-xs flex items-center justify-center gap-2 hover:opacity-95 transition-all shadow-xs"
              >
                <Send className="w-4 h-4" />
                <span>Submit Application to AICTE</span>
              </button>
            </div>
          </section>

          {/* Checklist Items */}
          <section className="bg-surface-container-lowest dark:bg-[#12264D] rounded-xl p-5 shadow-sm border border-[#CFE3D3] dark:border-[#2B4478]">
            <div className="flex items-center justify-between pb-3 border-b border-[#CFE3D3]/60 dark:border-[#2B4478] mb-3">
              <h2 className="text-sm font-bold text-on-surface dark:text-white">
                Detailed Regulatory Readiness Checklist
              </h2>
              <span className="text-[11px] text-on-surface-variant dark:text-[#B8C5E0]">
                All items must pass for seamless approval
              </span>
            </div>

            <div className="space-y-3">
              {activeReport.items.map((item) => {
                const isPass = item.status === 'PASS';
                const isWarn = item.status === 'WARNING';
                const isFail = item.status === 'FAIL';

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                      isPass
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                        : isWarn
                        ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                        : 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                    }`}
                  >
                    {/* Left: Icon, Title & Fix */}
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {isPass && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
                        {isWarn && <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
                        {isFail && <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
                      </div>

                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-on-surface dark:text-white">
                            {item.title}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isPass
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                : isWarn
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300'
                            }`}
                          >
                            {item.status}: {item.statusText}
                          </span>
                        </div>

                        <p className="text-xs text-on-surface-variant dark:text-[#CBD5E1]">
                          {item.description}
                        </p>

                        <div className="text-xs font-medium text-primary dark:text-[#FF9933] flex items-center gap-1.5 mt-0.5">
                          <Info className="w-3.5 h-3.5 shrink-0" />
                          <span>Action Required: {item.plainLanguageFix}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Remediation Action Button */}
                    <div className="shrink-0 flex items-center justify-end">
                      <button
                        onClick={() => handleRemediateAction(item.actionLabel)}
                        className={`min-h-[44px] px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 border transition-all ${
                          isPass
                            ? 'bg-surface-container dark:bg-[#09162F] text-on-surface dark:text-white border-[#CFE3D3] dark:border-[#2B4478] hover:bg-surface-container-high'
                            : 'bg-primary dark:bg-[#FF9933] text-on-primary dark:text-[#0B1B3A] border-transparent hover:opacity-90 shadow-2xs'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{item.actionLabel}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      ) : (
        /* Empty State / Prompt */
        <section className="bg-surface-container-lowest dark:bg-[#12264D] rounded-xl p-10 text-center shadow-sm border border-[#CFE3D3] dark:border-[#2B4478] flex flex-col items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-full bg-surface-container dark:bg-[#09162F] flex items-center justify-center border border-[#CFE3D3] dark:border-[#2B4478]">
            <FileCheck className="w-7 h-7 text-primary dark:text-[#FF9933]" />
          </div>
          <h2 className="text-base font-bold text-on-surface dark:text-white">
            Ready to Audit Your Application Dossier
          </h2>
          <p className="text-xs text-on-surface-variant dark:text-[#CBD5E1] max-w-md">
            Click &quot;Run Readiness Check&quot; above to evaluate lease validity, document presence, intake counts, and query resolution before statutory scrutiny.
          </p>
          <button
            onClick={handleRunCheck}
            className="min-h-[44px] px-6 py-2.5 rounded-lg bg-primary dark:bg-[#FF9933] text-on-primary dark:text-[#0B1B3A] font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-xs mt-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Audit Selected Dossier Now</span>
          </button>
        </section>
      )}

      {/* Advisory Warning Modal When Submitting With Failures */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#12264D] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-red-300 dark:border-red-700 space-y-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-on-surface dark:text-white">
                  Potential Scrutiny Rejection Warning
                </h3>
                <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                  {activeReport?.failedCount || 0} issue(s) may cause this application to be returned.
                </span>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant dark:text-[#CBD5E1] leading-relaxed">
              Our automated advisory checker identified critical gaps in your dossier (e.g. missing lease, lapsed validity, or unallocated intake). Submitting now may result in formal return by the Scrutiny Officer, delaying your 2026 approval.
            </p>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200">
              <strong>Statutory Note:</strong> AICTE officers retain sole statutory authority to scrutinize dossiers. You may choose to proceed, or return to address the flagged issues.
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowWarningModal(false)}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-lg bg-surface-container dark:bg-[#09162F] hover:bg-surface-container-high text-on-surface dark:text-white font-bold text-xs border border-[#CFE3D3] dark:border-[#2B4478] transition-all"
              >
                Cancel & Fix Issues
              </button>
              <button
                onClick={handleConfirmBypassSubmit}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2 rounded-lg bg-red-600 dark:bg-red-500 text-white font-bold text-xs hover:bg-red-700 transition-all shadow-xs"
              >
                Submit Anyway (Advisory Bypass)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
