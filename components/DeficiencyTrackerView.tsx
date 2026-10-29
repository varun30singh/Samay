'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { DeficiencyRecord } from '@/lib/types';
import {
  ListTodo,
  AlertTriangle,
  CheckCircle2,
  Upload,
  Gavel,
  ShieldCheck,
  FileText,
  X
} from 'lucide-react';

export default function DeficiencyTrackerView() {
  const {
    deficiencies,
    recordDeficiencyResponse,
    verifyDeficiency,
    sendDeficiencyToHearing,
    recordHearingOutcome,
    sendDeficiencyReminder,
    escalateDeficiency,
    simulatedDate,
    currentRole,
    currentRegion,
    isSubmitting
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'OPEN' | 'OVERDUE' | 'HEARING' | 'CLOSED'>('ALL');
  const [selectedDeficiency, setSelectedDeficiency] = useState<DeficiencyRecord | null>(null);

  // Institution Response Modal
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [evidenceFileName, setEvidenceFileName] = useState('');

  // Officer Hearing / Verification Panel states
  const [verificationRemarks, setVerificationRemarks] = useState('');
  const [hearingDate, setHearingDate] = useState('2026-03-30');
  const hearingCommittee = 'Standing Hearing Committee (WRO Mumbai)';
  const [hearingRemarks, setHearingRemarks] = useState('');
  const [statusNotice, setStatusNotice] = useState('');

  const isInstitutionRole = currentRole === 'institution';

  // Filtered Deficiencies
  const filteredDeficiencies = deficiencies.filter((d) => {
    if (currentRegion !== 'All' && d.region !== currentRegion) return false;

    const isOverdue = d.status !== 'Closed' && d.status !== 'Accepted' && new Date(d.dueDate) < new Date(simulatedDate);

    if (activeFilter === 'OPEN') {
      return d.status === 'Open' || d.status === 'Institution responded' || d.status === 'Under verification';
    } else if (activeFilter === 'OVERDUE') {
      return isOverdue;
    } else if (activeFilter === 'HEARING') {
      return d.status === 'Sent to hearing' || d.status === 'Hearing outcome recorded';
    } else if (activeFilter === 'CLOSED') {
      return d.status === 'Closed' || d.status === 'Accepted';
    }
    return true;
  });

  const handleOpenDetail = (def: DeficiencyRecord) => {
    setSelectedDeficiency(def);
    setVerificationRemarks('');
    setHearingRemarks('');
  };

  const handleSendReminder = (e: React.MouseEvent, defId: string) => {
    e.stopPropagation();
    sendDeficiencyReminder(defId);
    setStatusNotice(`Formal statutory reminder dispatched to institution for ${defId}.`);
    setTimeout(() => setStatusNotice(''), 4000);
  };

  const handleEscalate = (e: React.MouseEvent, defId: string) => {
    e.stopPropagation();
    escalateDeficiency(defId);
    setStatusNotice(`Deficiency ${defId} escalated to higher regulatory authority.`);
    setTimeout(() => setStatusNotice(''), 4000);
  };

  const handleSubmitInstitutionResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeficiency || isSubmitting) return;
    if (!responseText.trim() || !evidenceFileName.trim()) return;

    const res = await recordDeficiencyResponse(selectedDeficiency.id, responseText.trim(), evidenceFileName.trim());
    if (!res.success && res.error) {
      setStatusNotice(`Failed to submit: ${res.error}`);
    } else {
      setShowResponseModal(false);
      setResponseText('');
      setEvidenceFileName('');
      setStatusNotice(`Rectification response submitted for ${selectedDeficiency.id}. Under officer verification.`);
      // Refresh selected deficiency from updated state
      const updated = deficiencies.find(d => d.id === selectedDeficiency.id);
      if (updated) setSelectedDeficiency(updated);
    }
    setTimeout(() => setStatusNotice(''), 5000);
  };

  const handleOfficerVerify = (decision: 'Accepted' | 'Query' | 'Rejected') => {
    if (!selectedDeficiency) return;
    verifyDeficiency(selectedDeficiency.id, decision, verificationRemarks || `Officer verified with decision: ${decision}`);
    setStatusNotice(`Verification recorded: ${decision}.`);
    setTimeout(() => setStatusNotice(''), 4000);

    const updated = deficiencies.find(d => d.id === selectedDeficiency.id);
    if (updated) setSelectedDeficiency(updated);
  };

  const handleOfficerSendToHearing = () => {
    if (!selectedDeficiency) return;
    sendDeficiencyToHearing(selectedDeficiency.id, hearingDate, hearingCommittee);
    setStatusNotice(`Deficiency ${selectedDeficiency.id} referred to Standing Hearing Committee on ${hearingDate}.`);
    setTimeout(() => setStatusNotice(''), 4000);

    const updated = deficiencies.find(d => d.id === selectedDeficiency.id);
    if (updated) setSelectedDeficiency(updated);
  };

  const handleOfficerRecordHearingOutcome = (outcome: 'Closed' | 'Deficiency Maintained') => {
    if (!selectedDeficiency) return;
    recordHearingOutcome(selectedDeficiency.id, outcome, hearingRemarks || `Hearing committee outcome recorded: ${outcome}`);
    setStatusNotice(`Official hearing outcome recorded: ${outcome}.`);
    setTimeout(() => setStatusNotice(''), 4000);

    const updated = deficiencies.find(d => d.id === selectedDeficiency.id);
    if (updated) setSelectedDeficiency(updated);
  };

  return (
    <div className="flex flex-col w-full gap-5 animate-fade-in pb-12">
      {/* Sovereign Indian Tricolour Top Accent Ribbon */}
      <div className="tricolour-bar rounded-full" />

      {/* Screen Title & Breadcrumbs */}
      <section className="flex flex-col gap-2 bg-surface-container-lowest dark:bg-[#12264D] rounded-xl p-4 sm:p-5 shadow-sm border border-[#CFE3D3]/60 dark:border-[#2B4478]">
        <nav aria-label="Official Breadcrumb" className="flex items-center gap-1.5 text-on-surface-variant dark:text-[#B8C5E0] text-xs font-semibold flex-wrap">
          <span className="flex items-center gap-1 text-primary dark:text-[#FF9933] font-bold">
            <ListTodo className="w-3.5 h-3.5" />
            <span>SAMAY</span>
          </span>
          <span>›</span>
          <span>Inspection & Compliance</span>
          <span>›</span>
          <span className="text-on-surface dark:text-white font-bold">Deficiency Closure Tracker</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-1">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-on-surface dark:text-white tracking-tight">
              Deficiency Closure Tracker (Statutory P0 Core)
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant dark:text-[#CBD5E1] mt-1 max-w-3xl">
              Track physical inspection and scrutiny deficiencies from discovery through response, verification, and formal hearing closure. The system never decides hearing outcomes; authorized officers record formal determinations.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-surface-container dark:bg-[#09162F] px-3.5 py-2 rounded-xl border border-[#CFE3D3] dark:border-[#2B4478] shrink-0">
            <ShieldCheck className="w-4 h-4 text-primary dark:text-[#FF9933]" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-[#B8C5E0]">
                Active Deficiencies
              </span>
              <span className="text-xs font-mono font-bold text-primary dark:text-[#FF9933]">
                {deficiencies.filter(d => d.status !== 'Closed').length} Pending
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Status Notice */}
      {statusNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{statusNotice}</span>
        </div>
      )}

      {/* Institution Banner View: "Your Pending Deficiencies" */}
      {isInstitutionRole && (
        <section className="bg-amber-50 dark:bg-amber-950/40 rounded-xl p-4 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold">Your Institution Has Pending Deficiencies</h2>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                Upload verified evidence documents before the statutory due dates to prevent hearing referrals and deemed rejection.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (deficiencies.length > 0) {
                setSelectedDeficiency(deficiencies[0]);
                setShowResponseModal(true);
              }
            }}
            className="min-h-[44px] px-5 py-2.5 rounded-lg bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition-all shrink-0"
          >
            Upload Rectification Response
          </button>
        </section>
      )}

      {/* Filter Chips Bar (Stitch Spec: 44px min touch targets) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { key: 'ALL' as const, label: `All Deficiencies (${deficiencies.length})` },
          { key: 'OPEN' as const, label: `Open / In Progress (${deficiencies.filter(d => d.status === 'Open' || d.status === 'Institution responded' || d.status === 'Under verification').length})` },
          { key: 'OVERDUE' as const, label: `Overdue Escalations (${deficiencies.filter(d => d.status !== 'Closed' && d.status !== 'Accepted' && new Date(d.dueDate) < new Date(simulatedDate)).length})` },
          { key: 'HEARING' as const, label: `In Hearing (${deficiencies.filter(d => d.status === 'Sent to hearing' || d.status === 'Hearing outcome recorded').length})` },
          { key: 'CLOSED' as const, label: `Closed (${deficiencies.filter(d => d.status === 'Closed' || d.status === 'Accepted').length})` }
        ].map((chip) => {
          const isActive = activeFilter === chip.key;
          return (
            <button
              key={chip.key}
              onClick={() => setActiveFilter(chip.key)}
              className={`min-h-[44px] px-4 py-2 rounded-lg font-bold text-xs whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-primary dark:bg-[#FF9933] text-on-primary dark:text-[#0B1B3A] border-primary dark:border-[#FF9933] shadow-xs'
                  : 'bg-surface-container dark:bg-[#12264D] text-on-surface dark:text-[#CBD5E1] hover:bg-surface-container-high border-[#CFE3D3] dark:border-[#2B4478]'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Table & Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Table of Deficiencies */}
        <section className={`bg-surface-container-lowest dark:bg-[#12264D] rounded-xl p-5 shadow-sm border border-[#CFE3D3] dark:border-[#2B4478] ${selectedDeficiency ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="flex items-center justify-between pb-3 border-b border-[#CFE3D3]/60 dark:border-[#2B4478] mb-3">
            <h2 className="text-sm font-bold text-on-surface dark:text-white">
              Deficiency Items ({filteredDeficiencies.length})
            </h2>
            <span className="text-[11px] text-on-surface-variant dark:text-[#B8C5E0]">
              Click any row to open the full timeline drawer
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#CFE3D3] dark:border-[#2B4478] text-on-surface-variant dark:text-[#B8C5E0] uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-2.5 px-3">Region & Institution</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Due Date & Ageing</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CFE3D3]/50 dark:divide-[#2B4478]">
                {filteredDeficiencies.map((def) => {
                  const isOverdue = def.status !== 'Closed' && def.status !== 'Accepted' && new Date(def.dueDate) < new Date(simulatedDate);
                  const isSelected = selectedDeficiency?.id === def.id;

                  return (
                    <tr
                      key={def.id}
                      onClick={() => handleOpenDetail(def)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-surface-container-high dark:bg-[#1A3366]'
                          : 'hover:bg-surface-container-low dark:hover:bg-[#1A3366]/50'
                      }`}
                    >
                      <td className="py-3 px-3">
                        <div className="font-bold text-on-surface dark:text-white">
                          {def.institutionName}
                        </div>
                        <div className="text-[11px] text-on-surface-variant dark:text-[#CBD5E1] line-clamp-1">
                          {def.id} · {def.description}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            def.severity === 'major'
                              ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {def.severity}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono">
                        <div className={`font-bold ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-on-surface dark:text-white'}`}>
                          {def.dueDate}
                        </div>
                        <div className="text-[10px] text-on-surface-variant dark:text-[#B8C5E0]">
                          {def.daysOpen} days open {isOverdue && '(OVERDUE)'}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            def.status === 'Closed' || def.status === 'Accepted'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : def.status === 'Sent to hearing'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                              : isOverdue
                              ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {def.status}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenDetail(def)}
                            className="min-h-[32px] px-2.5 py-1 rounded bg-surface-container dark:bg-[#09162F] hover:bg-surface-container-high text-on-surface dark:text-white font-bold text-xs border border-[#CFE3D3] dark:border-[#2B4478]"
                            title="Open Details"
                          >
                            Open
                          </button>
                          <button
                            onClick={(e) => handleSendReminder(e, def.id)}
                            className="min-h-[32px] px-2.5 py-1 rounded bg-surface-container dark:bg-[#09162F] hover:bg-surface-container-high text-primary dark:text-[#FF9933] font-bold text-xs border border-[#CFE3D3] dark:border-[#2B4478]"
                            title="Send Idempotent Reminder"
                          >
                            Remind
                          </button>
                          <button
                            onClick={(e) => handleEscalate(e, def.id)}
                            className="min-h-[32px] px-2.5 py-1 rounded bg-surface-container dark:bg-[#09162F] hover:bg-surface-container-high text-red-600 dark:text-red-400 font-bold text-xs border border-[#CFE3D3] dark:border-[#2B4478]"
                            title="Escalate Overdue"
                          >
                            Escalate
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Detail Timeline Drawer */}
        {selectedDeficiency && (
          <section className="bg-surface-container-lowest dark:bg-[#12264D] rounded-xl p-5 shadow-sm border border-[#CFE3D3] dark:border-[#2B4478] flex flex-col justify-between gap-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#CFE3D3]/60 dark:border-[#2B4478] pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary dark:text-[#FF9933]" />
                  <h3 className="text-sm font-bold text-on-surface dark:text-white">
                    Deficiency Dossier: {selectedDeficiency.id}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedDeficiency(null)}
                  className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h4 className="text-xs font-bold text-on-surface dark:text-white">
                  {selectedDeficiency.institutionName} ({selectedDeficiency.region})
                </h4>
                <p className="text-xs text-on-surface-variant dark:text-[#CBD5E1] mt-1">
                  {selectedDeficiency.description}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-surface-container dark:bg-[#09162F] text-on-surface dark:text-white">
                    Required Evidence: {selectedDeficiency.evidenceRequired}
                  </span>
                </div>
              </div>

              {/* Status Flow Progression */}
              <div className="p-3 bg-surface-container-low dark:bg-[#09162F] rounded-lg border border-[#CFE3D3]/60 dark:border-[#2B4478]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-[#B8C5E0]">
                  Statutory Lifecycle Stage
                </span>
                <div className="text-xs font-bold text-primary dark:text-[#FF9933] mt-0.5">
                  {selectedDeficiency.status}
                </div>
              </div>

              {/* Chronological Timeline */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-[#B8C5E0]">
                  Chronological Audit Timeline
                </span>
                <div className="relative pl-4 border-l-2 border-primary/30 dark:border-[#FF9933]/30 space-y-3">
                  {selectedDeficiency.timeline.map((evt) => (
                    <div key={evt.id} className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary dark:bg-[#FF9933]" />
                      <div className="text-[11px] font-bold text-on-surface dark:text-white">
                        {evt.action}
                      </div>
                      <div className="text-[10px] text-on-surface-variant dark:text-[#B8C5E0]">
                        {evt.actor} ({evt.actorRole.replace('_', ' ')}) · {new Date(evt.timestamp).toLocaleDateString('en-IN')}
                      </div>
                      {evt.remarks && (
                        <p className="text-[11px] text-on-surface-variant dark:text-[#CBD5E1] mt-0.5">
                          &ldquo;{evt.remarks}&rdquo;
                        </p>
                      )}
                      {evt.evidenceName && (
                        <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                          Evidence: {evt.evidenceName}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Controls for Institution */}
              {isInstitutionRole && selectedDeficiency.status !== 'Closed' && (
                <div className="pt-2 border-t border-[#CFE3D3]/60 dark:border-[#2B4478]">
                  <button
                    onClick={() => setShowResponseModal(true)}
                    className="w-full min-h-[44px] px-4 py-2 rounded-lg bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Rectification Evidence</span>
                  </button>
                </div>
              )}

              {/* Authorized Officer Action Panel */}
              {!isInstitutionRole && (
                <div className="pt-3 border-t border-[#CFE3D3]/60 dark:border-[#2B4478] space-y-3">
                  <div className="flex items-center gap-1.5">
                    <Gavel className="w-4 h-4 text-primary dark:text-[#FF9933]" />
                    <span className="text-xs font-bold text-on-surface dark:text-white">
                      Authorized Officer Statutory Action
                    </span>
                  </div>

                  {/* Verification Actions */}
                  {selectedDeficiency.status === 'Institution responded' && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Officer verification remarks..."
                        value={verificationRemarks}
                        onChange={(e) => setVerificationRemarks(e.target.value)}
                        className="w-full min-h-[40px] px-3 rounded-lg bg-surface-container dark:bg-[#09162F] text-xs text-on-surface dark:text-white border border-[#CFE3D3] dark:border-[#2B4478]"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => handleOfficerVerify('Accepted')}
                          className="min-h-[40px] px-2 rounded bg-emerald-600 text-white font-bold text-xs"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleOfficerVerify('Query')}
                          className="min-h-[40px] px-2 rounded bg-amber-600 text-white font-bold text-xs"
                        >
                          Query
                        </button>
                        <button
                          onClick={() => handleOfficerVerify('Rejected')}
                          className="min-h-[40px] px-2 rounded bg-red-600 text-white font-bold text-xs"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Escalate to SHC Hearing */}
                  {(selectedDeficiency.status === 'Open' || selectedDeficiency.status === 'Rejected' || selectedDeficiency.status === 'Query Raised') && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-on-surface dark:text-white">
                        Refer to Standing Hearing Committee (SHC):
                      </span>
                      <input
                        type="date"
                        value={hearingDate}
                        onChange={(e) => setHearingDate(e.target.value)}
                        className="w-full min-h-[40px] px-3 rounded-lg bg-surface-container dark:bg-[#09162F] text-xs text-on-surface dark:text-white border border-[#CFE3D3] dark:border-[#2B4478]"
                      />
                      <button
                        onClick={handleOfficerSendToHearing}
                        className="w-full min-h-[40px] px-3 rounded-lg bg-purple-600 text-white font-bold text-xs hover:bg-purple-700"
                      >
                        Schedule SHC Hearing
                      </button>
                    </div>
                  )}

                  {/* Record Hearing Outcome */}
                  {selectedDeficiency.status === 'Sent to hearing' && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-on-surface dark:text-white">
                        Record Statutory Committee Outcome:
                      </span>
                      <input
                        type="text"
                        placeholder="Committee determination order details..."
                        value={hearingRemarks}
                        onChange={(e) => setHearingRemarks(e.target.value)}
                        className="w-full min-h-[40px] px-3 rounded-lg bg-surface-container dark:bg-[#09162F] text-xs text-on-surface dark:text-white border border-[#CFE3D3] dark:border-[#2B4478]"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleOfficerRecordHearingOutcome('Closed')}
                          className="min-h-[40px] px-2 rounded bg-emerald-600 text-white font-bold text-xs"
                        >
                          Close Deficiency
                        </button>
                        <button
                          onClick={() => handleOfficerRecordHearingOutcome('Deficiency Maintained')}
                          className="min-h-[40px] px-2 rounded bg-red-600 text-white font-bold text-xs"
                        >
                          Maintain Defect
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Institution Upload Response Modal */}
      {showResponseModal && selectedDeficiency && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#12264D] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#CFE3D3] dark:border-[#2B4478] space-y-4">
            <div className="flex items-center justify-between border-b border-[#CFE3D3]/60 dark:border-[#2B4478] pb-3">
              <h3 className="text-base font-bold text-on-surface dark:text-white">
                Upload Rectification Response
              </h3>
              <button
                onClick={() => setShowResponseModal(false)}
                className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitInstitutionResponse} className="space-y-3.5">
              <div className="p-3 bg-surface-container-low dark:bg-[#09162F] rounded-lg">
                <span className="text-[11px] font-bold text-on-surface dark:text-white">
                  {selectedDeficiency.description}
                </span>
                <div className="text-[11px] text-primary dark:text-[#FF9933] mt-1 font-semibold">
                  Required Evidence: {selectedDeficiency.evidenceRequired}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-[#B8C5E0]">
                  Certified Evidence Document Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fire_NOC_Renewal_Certified_2026.pdf"
                  value={evidenceFileName}
                  onChange={(e) => setEvidenceFileName(e.target.value)}
                  className="min-h-[44px] px-3 rounded-lg bg-surface-container dark:bg-[#09162F] text-xs font-semibold text-on-surface dark:text-white border border-[#CFE3D3] dark:border-[#2B4478] focus:outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-[#B8C5E0]">
                  Institution Written Rectification Remarks
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain how the deficiency has been completely resolved..."
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  className="p-3 rounded-lg bg-surface-container dark:bg-[#09162F] text-xs font-semibold text-on-surface dark:text-white border border-[#CFE3D3] dark:border-[#2B4478] focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResponseModal(false)}
                  className="min-h-[44px] px-4 py-2 rounded-lg bg-surface-container dark:bg-[#09162F] text-on-surface dark:text-white font-bold text-xs border border-[#CFE3D3] dark:border-[#2B4478]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 rounded-lg bg-primary dark:bg-[#FF9933] text-on-primary dark:text-[#0B1B3A] font-bold text-xs hover:opacity-90"
                >
                  Submit Official Response
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
