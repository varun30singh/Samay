'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { REGIONAL_OFFICER_REGISTRY } from '@/lib/officerDelegation';
import {
  Users,
  UserCheck,
  UserX,
  ShieldAlert,
  CheckCircle2,
  Clock,
  ArrowRight,
  X
} from 'lucide-react';

export default function OfficerCoverageView() {
  const {
    officerLeaves,
    queueCoverageSummaries,
    markOfficerUnavailable,
    cancelOfficerLeave,
    simulatedDate,
    currentRegion
  } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [selectedOfficerName, setSelectedOfficerName] = useState(REGIONAL_OFFICER_REGISTRY[0].name);
  const [startDate, setStartDate] = useState(simulatedDate.split('T')[0]);
  const [endDate, setEndDate] = useState('2026-03-15');
  const [delegateName, setDelegateName] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Selected officer profile
  const currentOfficer = REGIONAL_OFFICER_REGISTRY.find(o => o.name === selectedOfficerName) || REGIONAL_OFFICER_REGISTRY[0];

  // Candidates for delegate: MUST be same role and region!
  const eligibleDelegates = REGIONAL_OFFICER_REGISTRY.filter(
    o => o.role === currentOfficer.role && o.region === currentOfficer.region && o.name !== currentOfficer.name
  );

  const handleOpenModal = () => {
    setSelectedOfficerName(REGIONAL_OFFICER_REGISTRY[0].name);
    setStartDate(simulatedDate.split('T')[0]);
    setEndDate('2026-03-15');
    setLeaveReason('Statutory deputation / medical leave');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSaveLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!delegateName) {
      setErrorMsg('Please select an eligible delegate from the same role and jurisdiction.');
      return;
    }
    const result = markOfficerUnavailable(
      currentOfficer.name,
      currentOfficer.role,
      currentOfficer.region,
      startDate,
      endDate,
      delegateName,
      leaveReason
    );

    if (result.success) {
      setShowModal(false);
      setStatusMsg(`Officer ${currentOfficer.name} marked unavailable. Queue delegated to ${delegateName}.`);
      setTimeout(() => setStatusMsg(''), 5000);
    } else {
      setErrorMsg(result.error || 'Failed to record leave.');
    }
  };

  // Filter queue coverage summaries by global jurisdiction if applicable
  const filteredSummaries = queueCoverageSummaries.filter(s => {
    if (currentRegion !== 'All' && s.region !== currentRegion) return false;
    return true;
  });

  const uncoveredQueues = filteredSummaries.filter(s => s.hasUncoveredQueue);

  return (
    <div className="flex flex-col w-full gap-5 animate-fade-in pb-12">
      {/* Sovereign Indian Tricolour Top Accent Ribbon */}
      <div className="tricolour-bar rounded-full" />

      {/* Screen Header & Breadcrumbs */}
      <section className="flex flex-col gap-2 bg-surface-container-lowest dark:bg-[#12264D] rounded-xl p-4 sm:p-5 shadow-sm border border-[#CFE3D3]/60 dark:border-[#2B4478]">
        <nav aria-label="Official Breadcrumb" className="flex items-center gap-1.5 text-on-surface-variant dark:text-[#B8C5E0] text-xs font-semibold flex-wrap">
          <span className="flex items-center gap-1 text-primary dark:text-[#FF9933] font-bold">
            <Users className="w-3.5 h-3.5" />
            <span>SAMAY</span>
          </span>
          <span>›</span>
          <span>Regional Administration</span>
          <span>›</span>
          <span className="text-on-surface dark:text-white font-bold">Officer Delegation & Coverage</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-1">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-on-surface dark:text-white tracking-tight">
              Officer Workload Delegation & Leave Coverage Panel
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant dark:text-[#CBD5E1] mt-1 max-w-3xl">
              Ensures zero processing disruption under AICTE statutory deadlines. When an officer is on leave, queue items route seamlessly to authorized regional delegates.
            </p>
          </div>

          <button
            onClick={handleOpenModal}
            className="min-h-[44px] px-5 py-2.5 rounded-lg bg-primary dark:bg-[#FF9933] text-on-primary dark:text-[#0B1B3A] font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-xs shrink-0"
          >
            <UserX className="w-4 h-4" />
            <span>Mark Me Unavailable</span>
          </button>
        </div>
      </section>

      {/* Success Notification */}
      {statusMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Uncovered Queue Flag Warning Card (Statutory Requirement) */}
      {uncoveredQueues.length > 0 && (
        <section
          aria-labelledby="uncovered-queue-title"
          className="rounded-xl bg-red-50 dark:bg-red-950/60 text-red-900 dark:text-red-200 p-4 sm:p-5 shadow-sm border border-red-300 dark:border-red-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider">
                  STATUTORY WARNING
                </span>
                <span className="text-xs font-bold">Uncovered Officer Queues Detected</span>
              </div>
              <h2 id="uncovered-queue-title" className="text-sm font-bold mt-1">
                {uncoveredQueues.length} officer queue(s) currently have NO active coverage delegate!
              </h2>
              <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                Pending dossiers in these queues risk exceeding the statutory APH scrutiny deadline. Assign a qualified regional delegate immediately.
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenModal}
            className="min-h-[44px] px-4 py-2 rounded-lg bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-all shrink-0"
          >
            Assign Delegate Now
          </button>
        </section>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest dark:bg-[#12264D] rounded-xl p-4 border border-[#CFE3D3] dark:border-[#2B4478] shadow-sm">
          <span className="text-[10px] font-bold text-on-surface-variant dark:text-[#B8C5E0] uppercase tracking-wider">
            Total Officers in Registry
          </span>
          <div className="text-2xl font-black text-on-surface dark:text-white mt-1">
            {REGIONAL_OFFICER_REGISTRY.length}
          </div>
          <span className="text-xs text-on-surface-variant dark:text-[#CBD5E1]">Across 8 RO Jurisdictions</span>
        </div>

        <div className="bg-surface-container-lowest dark:bg-[#12264D] rounded-xl p-4 border border-[#CFE3D3] dark:border-[#2B4478] shadow-sm">
          <span className="text-[10px] font-bold text-on-surface-variant dark:text-[#B8C5E0] uppercase tracking-wider">
            Officers on Active Leave
          </span>
          <div className="text-2xl font-black text-amber-600 dark:text-[#FF9933] mt-1">
            {officerLeaves.filter(l => l.status === 'ACTIVE').length}
          </div>
          <span className="text-xs text-on-surface-variant dark:text-[#CBD5E1]">Workloads routed to delegates</span>
        </div>

        <div className="bg-surface-container-lowest dark:bg-[#12264D] rounded-xl p-4 border border-[#CFE3D3] dark:border-[#2B4478] shadow-sm">
          <span className="text-[10px] font-bold text-on-surface-variant dark:text-[#B8C5E0] uppercase tracking-wider">
            Active Delegations
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {filteredSummaries.reduce((acc, s) => acc + s.delegatedQueueCount, 0)}
          </div>
          <span className="text-xs text-on-surface-variant dark:text-[#CBD5E1]">Applications currently delegated</span>
        </div>

        <div className="bg-surface-container-lowest dark:bg-[#12264D] rounded-xl p-4 border border-[#CFE3D3] dark:border-[#2B4478] shadow-sm">
          <span className="text-[10px] font-bold text-on-surface-variant dark:text-[#B8C5E0] uppercase tracking-wider">
            Queues Without Coverage
          </span>
          <div className={`text-2xl font-black mt-1 ${uncoveredQueues.length > 0 ? 'text-red-600' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {uncoveredQueues.length}
          </div>
          <span className="text-xs text-on-surface-variant dark:text-[#CBD5E1]">
            {uncoveredQueues.length > 0 ? 'Action required immediately' : '100% regional queue coverage'}
          </span>
        </div>
      </div>

      {/* Coverage Grid: Who is on leave, who covers whom */}
      <section className="bg-surface-container-lowest dark:bg-[#12264D] rounded-xl p-5 shadow-sm border border-[#CFE3D3] dark:border-[#2B4478]">
        <div className="flex items-center justify-between pb-3 border-b border-[#CFE3D3]/60 dark:border-[#2B4478] mb-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-primary dark:text-[#FF9933]" />
            <h2 className="text-sm font-bold text-on-surface dark:text-white">
              Regional Queue Coverage Register ({filteredSummaries.length} Officers)
            </h2>
          </div>
          <span className="text-xs text-on-surface-variant dark:text-[#B8C5E0]">
            Simulated Clock: {new Date(simulatedDate).toLocaleDateString('en-IN')}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#CFE3D3] dark:border-[#2B4478] text-on-surface-variant dark:text-[#B8C5E0] uppercase tracking-wider text-[10px] font-bold">
                <th className="py-2.5 px-3">Officer Name & Role</th>
                <th className="py-2.5 px-3">Region</th>
                <th className="py-2.5 px-3">Availability Status</th>
                <th className="py-2.5 px-3">Covering Delegate</th>
                <th className="py-2.5 px-3">Dossier Queues</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CFE3D3]/50 dark:divide-[#2B4478]">
              {filteredSummaries.map((summary) => (
                <tr key={summary.officerName} className="hover:bg-surface-container-low dark:hover:bg-[#1A3366] transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-bold text-on-surface dark:text-white">
                      {summary.officerName}
                    </div>
                    <div className="text-[11px] text-on-surface-variant dark:text-[#CBD5E1]">
                      {summary.role.replace('_', ' ').toUpperCase()}
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <span className="font-semibold text-on-surface dark:text-white">
                      {summary.region}
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    {summary.isOnLeave ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        <Clock className="w-3 h-3" />
                        <span>ON LEAVE ({summary.leaveDetails?.startDate} to {summary.leaveDetails?.endDate})</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>AVAILABLE (ACTIVE)</span>
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-3">
                    {summary.delegateName ? (
                      <div className="flex items-center gap-1.5">
                        <ArrowRight className="w-3.5 h-3.5 text-primary dark:text-[#FF9933]" />
                        <span className="font-bold text-primary dark:text-[#FF9933]">
                          {summary.delegateName}
                        </span>
                      </div>
                    ) : summary.hasUncoveredQueue ? (
                      <span className="font-bold text-red-600 dark:text-red-400">
                        NO COVERAGE!
                      </span>
                    ) : (
                      <span className="text-on-surface-variant dark:text-[#B8C5E0]">
                        Self-managed
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-3 font-mono">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-surface-container dark:bg-[#09162F] text-xs font-bold text-on-surface dark:text-white">
                        {summary.activeQueueCount} Primary
                      </span>
                      {summary.delegatedQueueCount > 0 && (
                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary dark:text-[#FF9933] text-xs font-bold">
                          +{summary.delegatedQueueCount} Delegated
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-3 text-right">
                    {summary.isOnLeave && summary.leaveDetails ? (
                      <button
                        onClick={() => cancelOfficerLeave(summary.leaveDetails!.id)}
                        className="min-h-[36px] px-3 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg text-xs font-bold transition-colors"
                      >
                        Resume Early
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedOfficerName(summary.officerName);
                          setShowModal(true);
                        }}
                        className="min-h-[36px] px-3 py-1 rounded-lg bg-surface-container dark:bg-[#09162F] hover:bg-surface-container-high text-primary dark:text-[#FF9933] text-xs font-bold border border-[#CFE3D3] dark:border-[#2B4478] transition-all"
                      >
                        Set Leave
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* "Mark Me Unavailable" Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#12264D] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#CFE3D3] dark:border-[#2B4478] space-y-4">
            <div className="flex items-center justify-between border-b border-[#CFE3D3]/60 dark:border-[#2B4478] pb-3">
              <div className="flex items-center gap-2.5">
                <UserX className="w-5 h-5 text-primary dark:text-[#FF9933]" />
                <h3 className="text-base font-bold text-on-surface dark:text-white">
                  Officer Leave & Delegation Request
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 dark:bg-red-950/60 rounded-lg border border-red-300 dark:border-red-800 text-xs font-bold text-red-900 dark:text-red-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveLeave} className="space-y-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-[#B8C5E0]">
                  Officer Requesting Leave
                </label>
                <select
                  value={selectedOfficerName}
                  onChange={(e) => {
                    setSelectedOfficerName(e.target.value);
                    setDelegateName('');
                  }}
                  className="min-h-[44px] px-3 rounded-lg bg-surface-container dark:bg-[#09162F] text-xs font-semibold text-on-surface dark:text-white border border-[#CFE3D3] dark:border-[#2B4478] focus:outline-none"
                >
                  {REGIONAL_OFFICER_REGISTRY.map((o) => (
                    <option key={o.name} value={o.name}>
                      {o.name} — {o.role.replace('_', ' ')} ({o.region})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-[#B8C5E0]">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="min-h-[44px] px-3 rounded-lg bg-surface-container dark:bg-[#09162F] text-xs font-semibold text-on-surface dark:text-white border border-[#CFE3D3] dark:border-[#2B4478] focus:outline-none"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-[#B8C5E0]">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="min-h-[44px] px-3 rounded-lg bg-surface-container dark:bg-[#09162F] text-xs font-semibold text-on-surface dark:text-white border border-[#CFE3D3] dark:border-[#2B4478] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-[#B8C5E0]">
                  Assigned Delegate (Must be same role & region)
                </label>
                <select
                  value={delegateName}
                  onChange={(e) => setDelegateName(e.target.value)}
                  className="min-h-[44px] px-3 rounded-lg bg-surface-container dark:bg-[#09162F] text-xs font-semibold text-on-surface dark:text-white border border-[#CFE3D3] dark:border-[#2B4478] focus:outline-none"
                  required
                >
                  <option value="">-- Select Eligible Regional Delegate --</option>
                  {eligibleDelegates.map((d) => (
                    <option key={d.name} value={d.name}>
                      {d.name} ({d.role.replace('_', ' ')} · {d.region})
                    </option>
                  ))}
                </select>
                {eligibleDelegates.length === 0 && (
                  <span className="text-[11px] text-red-600 dark:text-red-400 font-semibold mt-1">
                    No other officers found with matching role in {currentOfficer.region} region.
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-[#B8C5E0]">
                  Reason for Absence (Statutory Audit Entry)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Official court deposition or medical absence"
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="min-h-[44px] px-3 rounded-lg bg-surface-container dark:bg-[#09162F] text-xs font-semibold text-on-surface dark:text-white border border-[#CFE3D3] dark:border-[#2B4478] focus:outline-none"
                  required
                />
              </div>

              <div className="p-3 bg-surface-container-low dark:bg-[#09162F] rounded-lg text-[11px] text-on-surface-variant dark:text-[#B8C5E0] leading-relaxed">
                <strong>Statutory Guardrail:</strong> Once saved, this officer&apos;s queue items show for the delegate with a &quot;Delegated from&quot; tag. Alerts are dispatched to both the delegate and Regional Supervisor. Workloads automatically return when leave ends.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="min-h-[44px] px-4 py-2 rounded-lg bg-surface-container dark:bg-[#09162F] hover:bg-surface-container-high text-on-surface dark:text-white font-bold text-xs border border-[#CFE3D3] dark:border-[#2B4478]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 rounded-lg bg-primary dark:bg-[#FF9933] text-on-primary dark:text-[#0B1B3A] font-bold text-xs hover:opacity-90 shadow-xs"
                >
                  Confirm Delegation & Mark Unavailable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
