'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Application } from '@/lib/types';
import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';

interface EVCManagementViewProps {
  onSelectApplication: (app: Application) => void;
}

const AVAILABLE_EXPERTS = [
  'Prof. Ramesh Kulkarni (IIT Bombay - Mechanical/Civil)',
  'Dr. Sunita Bansal (AICTE Senior Nominee - Comp Sci)',
  'Prof. A. K. Choudhury (IIT Patna - Electrical)',
  'Prof. Sandeep Rawat (MNIT Jaipur - Electronics)',
  'Prof. S. K. Mitra (Jadavpur University - Chemical)',
  'Prof. K. Satyanarayana (Andhra University - Marine)',
  'Prof. Sneha Deshmukh (COEP Technological University)',
  'Dr. N. R. Narayana (IISc Bangalore - AI/Data)'
];

export default function EVCManagementView({ onSelectApplication }: EVCManagementViewProps) {
  const {
    applications,
    currentRegion,
    scheduleEVC,
    resolveEVCConflict,
    completeEVCVisit,
    isSubmitting
  } = useApp();

  const [selectedAppForSchedule, setSelectedAppForSchedule] = useState<Application | null>(null);
  const [scheduleDate, setScheduleDate] = useState('2026-03-10');
  const [member1, setMember1] = useState(AVAILABLE_EXPERTS[0]);
  const [member2, setMember2] = useState(AVAILABLE_EXPERTS[1]);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const [selectedAppForOutcome, setSelectedAppForOutcome] = useState<Application | null>(null);
  const [outcomeReport, setOutcomeReport] = useState('Physical inspection verified lab equipment, fire safety compliance, and faculty muster roll. Recommended for approval with condition of revised occupancy certificate for Block B.');

  const evcApps = applications.filter((app) => {
    if (currentRegion !== 'All' && app.region !== currentRegion) return false;
    return app.route.includes('EVC') && ['EVC', 'Scrutiny', 'Decision Pending'].includes(app.currentStage);
  });

  const conflictsCount = evcApps.filter(a => a.evc?.hasConflict).length;
  const unscheduledCount = evcApps.filter(a => a.currentStage === 'EVC' && a.evc?.status === 'Not Scheduled').length;

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppForSchedule || isSubmitting) return;

    const res = await scheduleEVC(selectedAppForSchedule.id, scheduleDate, [member1, member2]);
    if (res.conflictWarning) {
      setConflictWarning(res.conflictWarning);
    } else if (!res.success && res.error) {
      setConflictWarning(res.error);
    } else {
      setSuccessMsg(`EVC Scheduled for ${selectedAppForSchedule.institutionName} on ${scheduleDate}`);
      setSelectedAppForSchedule(null);
      setConflictWarning(null);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  const handleResolve = (app: Application) => {
    const altExpert = AVAILABLE_EXPERTS[6]; // Prof Sneha Deshmukh
    resolveEVCConflict(app.id, altExpert);
    setSuccessMsg(`Conflict resolved! Assigned independent expert: ${altExpert}`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleCompleteVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppForOutcome || isSubmitting) return;

    const res = await completeEVCVisit(selectedAppForOutcome.id, outcomeReport);
    if (!res.success && res.error) {
      setConflictWarning(res.error);
    } else {
      setSuccessMsg(`EVC Inspection report recorded. Moving to Decision Pending.`);
      setSelectedAppForOutcome(null);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Sovereign Continuous 4px Tricolour Bar */}
      <div className="tricolour-bar rounded-full" />
      {/* Top Banner Card */}
      <div className="saas-card-glow p-6 sm:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 bg-white/90 px-3 py-1 rounded-full border border-emerald-900/[0.08] shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.75} />
              <span className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider">
                Expert Visit Committee (EVC) Command Center
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F241C]">
              EVC Scheduling & Conflict Radar
            </h1>
            <p className="text-xs text-emerald-950/60 max-w-2xl">
              Automated queue, member double-booking detection (FR-C4), and regional workload balancing under APH Chapter III.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-white/90 px-3.5 py-2 rounded-2xl border border-red-200/80 shadow-2xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-600" strokeWidth={1.75} />
              <span className="text-xs font-bold text-red-950">{conflictsCount} Double-Booked</span>
            </div>

            <div className="bg-white/90 px-3.5 py-2 rounded-2xl border border-amber-200/80 shadow-2xs flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-600" strokeWidth={1.75} />
              <span className="text-xs font-bold text-amber-950">{unscheduledCount} Pending Visit</span>
            </div>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center gap-2 animate-fade-in shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" strokeWidth={1.75} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Double-Booking Conflicts Highlight */}
      {conflictsCount > 0 && (
        <div className="saas-card p-6 border-red-200/80 bg-gradient-to-r from-red-50/30 via-yellow-50/20 to-white space-y-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600" strokeWidth={1.75} />
            <h3 className="font-bold text-red-950 text-sm tracking-tight">
              EVC Double-Booking Conflict Flagged by SAMAY AI (FR-C4)
            </h3>
          </div>
          <p className="text-xs text-red-950/70">
            Committee member <strong>Prof. Ramesh Kulkarni (IIT Bombay)</strong> is assigned simultaneously on <strong>2026-03-05</strong> across two technical institutions:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {evcApps.filter(a => a.evc?.hasConflict).map((app) => (
              <div key={app.id} className="bg-white p-4 rounded-2xl border border-red-200 shadow-2xs space-y-2">
                <div className="font-bold text-emerald-950 text-xs">{app.institutionName}</div>
                <div className="text-[11px] text-emerald-950/60">
                  Scheduled: <strong className="text-red-700">{app.evc?.scheduledDate}</strong> · {app.region} Region
                </div>
                <div className="text-[11px] text-emerald-950/70">
                  Assigned Members: {app.evc?.committeeMembers.join(', ')}
                </div>
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                    Conflict Active
                  </span>
                  <button
                    onClick={() => handleResolve(app)}
                    className="btn-pill-primary px-3 py-1 text-xs flex items-center space-x-1"
                  >
                    <span>Auto-Rebalance</span>
                    <Sparkles className="w-3 h-3 text-yellow-300" strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EVC Table Card */}
      <div className="saas-card overflow-hidden">
        <div className="px-6 py-4 border-b border-emerald-950/[0.06] flex items-center justify-between">
          <span className="text-xs font-bold text-[#0F241C] uppercase tracking-wider">
            EVC Pipeline & Scheduling Queue ({evcApps.length})
          </span>
          <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            New Institution Priority Enabled
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-emerald-950/[0.06] text-emerald-950/50 uppercase tracking-wider text-[10px] font-bold bg-white/50">
                <th className="py-3 px-5">Institution & Region</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">EVC Status</th>
                <th className="py-3 px-3">Visit Date</th>
                <th className="py-3 px-3">Assigned Committee</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-950/[0.04]">
              {evcApps.map((app) => (
                <tr key={app.id} className="table-row-hover">
                  <td className="py-3.5 px-5">
                    <div className="font-semibold text-emerald-950">{app.institutionName}</div>
                    <div className="text-[11px] text-emerald-950/50 mt-0.5">
                      {app.id} · {app.region} Region · {app.approvedIntake} Intake
                    </div>
                  </td>

                  <td className="py-3.5 px-3">
                    <span className="font-medium text-emerald-950">{app.type}</span>
                    {app.type === 'New Institution Approval' && (
                      <span className="block mt-0.5 text-[9px] font-bold text-amber-900 bg-yellow-50 px-2 py-0.2 rounded-full w-max border border-yellow-200">
                        Priority Inspection
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      app.evc?.status === 'Completed'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : app.evc?.hasConflict
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : app.evc?.status === 'Scheduled'
                        ? 'bg-emerald-50/70 text-emerald-900 border-emerald-200/60'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {app.evc?.hasConflict ? 'Double-Booked' : (app.evc?.status || 'Not Scheduled')}
                    </span>
                  </td>

                  <td className="py-3.5 px-3 font-mono font-medium text-emerald-950">
                    {app.evc?.scheduledDate || '—'}
                  </td>

                  <td className="py-3.5 px-3 max-w-xs text-emerald-950/70 text-[11px]">
                    {app.evc?.committeeMembers && app.evc.committeeMembers.length > 0 ? (
                      <div className="line-clamp-2">{app.evc.committeeMembers.join(', ')}</div>
                    ) : (
                      <span className="text-emerald-950/40 italic">Awaiting scheduling</span>
                    )}
                  </td>

                  <td className="py-3.5 px-5 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {app.evc?.status === 'Not Scheduled' && (
                        <button
                          onClick={() => {
                            setSelectedAppForSchedule(app);
                            setConflictWarning(null);
                          }}
                          className="btn-pill-primary px-3 py-1 text-xs"
                        >
                          Schedule EVC
                        </button>
                      )}

                      {app.evc?.status === 'Scheduled' && !app.evc.hasConflict && (
                        <button
                          onClick={() => setSelectedAppForOutcome(app)}
                          className="btn-pill-secondary px-3 py-1 text-xs text-emerald-800"
                        >
                          Record Outcome
                        </button>
                      )}

                      <button
                        onClick={() => onSelectApplication(app)}
                        className="btn-pill-secondary px-2.5 py-1 text-xs"
                      >
                        Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule EVC Modal */}
      {selectedAppForSchedule && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-emerald-950/20 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="glass-dropdown max-w-lg w-full p-6 rounded-3xl animate-fade-in space-y-4">
            <h3 className="text-base font-bold text-emerald-950">
              Schedule Expert Visit Committee (EVC)
            </h3>
            <p className="text-xs text-emerald-950/60">
              Institution: <strong className="text-emerald-950">{selectedAppForSchedule.institutionName}</strong>
            </p>

            {conflictWarning && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" strokeWidth={1.75} />
                <div>{conflictWarning}</div>
              </div>
            )}

            <form onSubmit={handleScheduleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-emerald-950 mb-1">Inspection Date:</label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full p-2.5 bg-white border border-emerald-950/[0.1] rounded-full text-xs shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-emerald-950 mb-1">Expert Member 1:</label>
                <select
                  value={member1}
                  onChange={(e) => setMember1(e.target.value)}
                  className="w-full p-2.5 bg-white border border-emerald-950/[0.1] rounded-2xl text-xs shadow-2xs"
                >
                  {AVAILABLE_EXPERTS.map((exp) => (
                    <option key={exp} value={exp}>{exp}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-emerald-950 mb-1">Expert Member 2:</label>
                <select
                  value={member2}
                  onChange={(e) => setMember2(e.target.value)}
                  className="w-full p-2.5 bg-white border border-emerald-950/[0.1] rounded-2xl text-xs shadow-2xs"
                >
                  {AVAILABLE_EXPERTS.map((exp) => (
                    <option key={exp} value={exp}>{exp}</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-emerald-950/[0.06] flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedAppForSchedule(null)}
                  className="btn-pill-secondary px-4 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-pill-primary px-5 py-2 text-xs"
                >
                  Confirm & Check Conflict
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Outcome Modal */}
      {selectedAppForOutcome && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-emerald-950/20 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="glass-dropdown max-w-lg w-full p-6 rounded-3xl animate-fade-in space-y-4">
            <h3 className="text-base font-bold text-emerald-950">
              Record EVC Visit Outcome Report
            </h3>
            <p className="text-xs text-emerald-950/60">
              Institution: <strong className="text-emerald-950">{selectedAppForOutcome.institutionName}</strong>
            </p>

            <form onSubmit={handleCompleteVisit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-emerald-950 mb-1">Findings Summary:</label>
                <textarea
                  rows={4}
                  value={outcomeReport}
                  onChange={(e) => setOutcomeReport(e.target.value)}
                  className="w-full p-3 bg-white border border-emerald-950/[0.1] rounded-2xl text-xs shadow-2xs focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-emerald-950/[0.06] flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedAppForOutcome(null)}
                  className="btn-pill-secondary px-4 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-pill-primary px-5 py-2 text-xs"
                >
                  Save Outcome & Move to Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
