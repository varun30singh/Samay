'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Application, UndertakingItem } from '@/lib/types';
import {
  FileCheck,
  Upload,
  CheckCircle2
} from 'lucide-react';

interface UndertakingsViewProps {
  onSelectApplication: (app: Application) => void;
}

export default function UndertakingsView({ onSelectApplication }: UndertakingsViewProps) {
  const {
    applications,
    currentRegion,
    submitUndertakingEvidence,
    verifyUndertaking
  } = useApp();

  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedForVerify, setSelectedForVerify] = useState<{ app: Application; item: UndertakingItem } | null>(null);
  const [selectedForUpload, setSelectedForUpload] = useState<{ app: Application; item: UndertakingItem } | null>(null);
  const [verifyDecision, setVerifyDecision] = useState<'Verified' | 'Query Raised' | 'Rejected'>('Verified');
  const [verifyComments, setVerifyComments] = useState('Satisfactory municipal documentation verified against public serial number.');
  const [uploadFileName, setUploadFileName] = useState('Certified_Structural_Stability_Certificate_2026.pdf');
  const [msg, setMsg] = useState('');

  const allUndertakings: { app: Application; item: UndertakingItem }[] = [];
  applications.forEach(app => {
    if (currentRegion !== 'All' && app.region !== currentRegion) return;
    app.undertakings.forEach(u => {
      if (filterStatus === 'ALL' || u.status === filterStatus) {
        allUndertakings.push({ app, item: u });
      }
    });
  });

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForUpload) return;
    submitUndertakingEvidence(selectedForUpload.app.id, selectedForUpload.item.id, uploadFileName);
    setMsg(`Evidence "${uploadFileName}" uploaded for ${selectedForUpload.app.institutionName}`);
    setSelectedForUpload(null);
    setTimeout(() => setMsg(''), 4000);
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForVerify) return;
    verifyUndertaking(selectedForVerify.app.id, selectedForVerify.item.id, verifyDecision, verifyComments);
    setMsg(`Verification verdict recorded: ${verifyDecision} for ${selectedForVerify.app.institutionName}`);
    setSelectedForVerify(null);
    setTimeout(() => setMsg(''), 4000);
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
              <FileCheck className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.75} />
              <span className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider">
                Institutional Undertakings Register
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F241C]">
              Compliance & Evidence Verification
            </h1>
            <p className="text-xs text-emerald-950/60 max-w-2xl">
              Monitors statutory conditions attached to approvals. Automated reminders, online evidence submission, and officer audit verification under APH Clause 4.8.
            </p>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white border border-emerald-950/[0.08] text-emerald-950 text-xs rounded-full px-4 py-2 font-medium shadow-2xs focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Commitments ({allUndertakings.length})</option>
            <option value="Pending">Pending Evidence</option>
            <option value="Evidence Submitted">Evidence Submitted</option>
            <option value="Verified">Verified & Approved</option>
            <option value="Overdue">Overdue / Escalated</option>
          </select>
        </div>
      </div>

      {msg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center gap-2 animate-fade-in shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" strokeWidth={1.75} />
          <span>{msg}</span>
        </div>
      )}

      {/* Undertakings Table Card */}
      <div className="saas-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-emerald-950/[0.06] text-emerald-950/50 uppercase tracking-wider text-[10px] font-bold bg-white/50">
                <th className="py-3 px-5">Institution & Condition</th>
                <th className="py-3 px-3">Required Evidence</th>
                <th className="py-3 px-3">Due Date</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Verification Outcome</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-950/[0.04]">
              {allUndertakings.map(({ app, item }) => (
                <tr key={`${app.id}-${item.id}`} className="table-row-hover">
                  <td className="py-3.5 px-5 max-w-sm">
                    <button
                      onClick={() => onSelectApplication(app)}
                      className="font-semibold text-emerald-950 hover:underline text-left cursor-pointer"
                    >
                      {app.institutionName}
                    </button>
                    <div className="text-[11px] text-emerald-950/50 mt-0.5">
                      {app.id} · {app.region} Region
                    </div>
                    <div className="mt-1 text-emerald-950/80 font-medium text-[11px] bg-yellow-50/50 p-2.5 rounded-xl border border-yellow-200/50">
                      Condition: {item.condition}
                    </div>
                  </td>

                  <td className="py-3.5 px-3 max-w-xs">
                    <div className="text-emerald-950/70">{item.requiredEvidence}</div>
                    {item.submittedEvidenceName && (
                      <div className="mt-1 text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                        <FileCheck className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.75} />
                        <span>{item.submittedEvidenceName}</span>
                      </div>
                    )}
                  </td>

                  <td className="py-3.5 px-3">
                    <span className="font-mono font-semibold text-emerald-950">{item.dueDate}</span>
                    <div className="text-[10px] text-emerald-950/40 mt-0.5">SLA Target</div>
                  </td>

                  <td className="py-3.5 px-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      item.status === 'Verified'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : item.status === 'Overdue'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : item.status === 'Evidence Submitted'
                        ? 'bg-yellow-50 text-amber-900 border-yellow-200'
                        : 'bg-emerald-50/70 text-emerald-800 border-emerald-200/60'
                    }`}>
                      {item.status}
                    </span>
                    {item.status === 'Overdue' && (
                      <span className="block mt-1 text-[9px] font-bold text-red-700">
                        Level +{item.escalationLevel || 1} Escalate
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-3 text-[11px]">
                    {item.verifiedBy ? (
                      <div>
                        <span className="text-emerald-950 font-semibold">{item.verifiedBy.split('(')[0]}</span>
                        <p className="text-emerald-950/50 text-[10px] italic mt-0.5">{item.verificationComments}</p>
                      </div>
                    ) : (
                      <span className="text-emerald-950/40 italic">Awaiting officer review</span>
                    )}
                  </td>

                  <td className="py-3.5 px-5 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => setSelectedForUpload({ app, item })}
                        className="btn-pill-secondary px-3 py-1 text-xs flex items-center space-x-1"
                      >
                        <Upload className="w-3 h-3 text-emerald-700" strokeWidth={1.75} />
                        <span>Upload</span>
                      </button>

                      <button
                        onClick={() => setSelectedForVerify({ app, item })}
                        className="btn-pill-primary px-3 py-1 text-xs"
                      >
                        Verify
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Evidence Modal */}
      {selectedForUpload && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-emerald-950/20 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="glass-dropdown max-w-md w-full p-6 rounded-3xl animate-fade-in space-y-4">
            <h3 className="text-base font-bold text-emerald-950">
              Upload Compliance Evidence (Institution Portal)
            </h3>
            <p className="text-xs text-emerald-950/60">
              Condition: <strong className="text-emerald-950">{selectedForUpload.item.condition}</strong>
            </p>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-emerald-950 mb-1">Document File Name:</label>
                <input
                  type="text"
                  value={uploadFileName}
                  onChange={(e) => setUploadFileName(e.target.value)}
                  className="w-full p-2.5 bg-white border border-emerald-950/[0.1] rounded-2xl text-xs shadow-2xs"
                />
              </div>

              <div className="border-2 border-dashed border-emerald-950/15 rounded-2xl p-6 text-center bg-yellow-50/20 space-y-2">
                <Upload className="w-8 h-8 text-emerald-700 mx-auto" strokeWidth={1.75} />
                <p className="font-semibold text-emerald-950">Upload Certified Municipal Document</p>
                <p className="text-[11px] text-emerald-950/50">PDF up to 10MB</p>
              </div>

              <div className="pt-3 border-t border-emerald-950/[0.06] flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedForUpload(null)}
                  className="btn-pill-secondary px-4 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-pill-primary px-5 py-2 text-xs"
                >
                  Submit Evidence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Verify Modal */}
      {selectedForVerify && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-emerald-950/20 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="glass-dropdown max-w-md w-full p-6 rounded-3xl animate-fade-in space-y-4">
            <h3 className="text-base font-bold text-emerald-950">
              Officer Verification Verdict (FR-D3)
            </h3>
            <p className="text-xs text-emerald-950/60">
              Institution: <strong className="text-emerald-950">{selectedForVerify.app.institutionName}</strong>
            </p>

            <form onSubmit={handleVerifySubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-emerald-950 mb-1">Decision:</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Verified', 'Query Raised', 'Rejected'] as const).map((dec) => (
                    <button
                      key={dec}
                      type="button"
                      onClick={() => setVerifyDecision(dec)}
                      className={`p-2 rounded-full font-bold text-xs border transition-all ${
                        verifyDecision === dec
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-emerald-950 border-emerald-950/[0.1] hover:bg-yellow-50/40'
                      }`}
                    >
                      {dec}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-emerald-950 mb-1">Verification Remarks:</label>
                <textarea
                  rows={3}
                  value={verifyComments}
                  onChange={(e) => setVerifyComments(e.target.value)}
                  className="w-full p-3 bg-white border border-emerald-950/[0.1] rounded-2xl text-xs shadow-2xs focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-emerald-950/[0.06] flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedForVerify(null)}
                  className="btn-pill-secondary px-4 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-pill-primary px-5 py-2 text-xs"
                >
                  Confirm Verdict
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
