'use client';

import React, { useState } from 'react';
import { Application } from '@/lib/types';
import { useApp } from '@/context/AppContext';
import AdvisoryPopover from '@/components/AdvisoryPopover';
import {
  Scan,
  Sparkles,
  CheckCircle2,
  X,
  ShieldCheck,
  FileText,
  Upload,
  Edit3,
  XCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SmartOCRExtractorModalProps {
  application: Application;
  onClose: () => void;
}

export default function SmartOCRExtractorModal({ application, onClose }: SmartOCRExtractorModalProps) {
  const { proposeAndConfirmLeaseExpiry } = useApp();

  const [extractedDate, setExtractedDate] = useState('2038-12-31');
  const [isManualEdit, setIsManualEdit] = useState(false);
  const [manualDateInput, setManualDateInput] = useState('2038-12-31');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isRejected, setIsRejected] = useState(false);
  const [fileName, setFileName] = useState('Sub_Registrar_Deed_Renewal_Book1_Vol482.pdf');

  const leaseDoc = application.documents.find(d => d.type === 'Land Lease Deed');

  const handleConfirmAndSave = (finalDate: string) => {
    proposeAndConfirmLeaseExpiry(application.id, finalDate, true);
    setIsSuccess(true);
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.5 }
    });

    setTimeout(() => {
      onClose();
    }, 1800);
  };

  const handleMockUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
      setExtractedDate('2038-12-31');
      setIsManualEdit(false);
    }
  };

  const handleReject = () => {
    setIsRejected(true);
    setTimeout(() => {
      onClose();
    }, 1600);
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
              <Scan className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-[#0F241C] tracking-tight">
                  AI OCR Lease Expiry Extractor (FR-E5)
                </h3>
                <AdvisoryPopover
                  title="AI Document Extraction (Advisory Only)"
                  explanation="OCR text recognition and date extraction propose candidate validity periods from legal lease deeds. Officer confirmation is strictly required prior to updating Deadline Guard records."
                  legalReference="Approval Process Handbook Clause 2.11 & AICTE Act Section 10(k)"
                />
              </div>
              <p className="text-xs text-emerald-950/60 mt-0.5">
                Proposes expiry date with source text highlight. Three officer pathways: Confirm, Edit manually, or Reject.
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

        {/* Success / Rejection Splash */}
        {isSuccess ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-200">
              <CheckCircle2 className="w-8 h-8" strokeWidth={1.75} />
            </div>
            <h4 className="text-lg font-bold text-emerald-950 tracking-tight">Lease Deed Confirmed & Applied!</h4>
            <p className="text-xs text-emerald-950/60 max-w-sm mx-auto">
              Tracked lease validity updated to <strong>{isManualEdit ? manualDateInput : extractedDate}</strong>. Appended to cryptographic audit ledger.
            </p>
          </div>
        ) : isRejected ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner border border-red-200">
              <XCircle className="w-8 h-8" strokeWidth={1.75} />
            </div>
            <h4 className="text-lg font-bold text-red-950 tracking-tight">Extraction Rejected</h4>
            <p className="text-xs text-emerald-950/60 max-w-sm mx-auto">
              Marked extraction as uncertain. Route flagged for manual institutional deed resubmission.
            </p>
          </div>
        ) : (
          <div className="space-y-5 text-xs">
            {/* Institution Context Bar with Upload Action */}
            <div className="bg-white p-3 rounded-2xl border border-emerald-950/[0.08] shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="font-bold text-emerald-950">{application.institutionName}</span>
                <div className="text-[11px] text-emerald-950/50 mt-0.5">
                  Current Tracked Expiry: <strong className="text-red-700">{leaseDoc?.expiryDate}</strong> ({leaseDoc?.remainingDays}d remaining)
                </div>
              </div>

              {/* Mock Upload Button */}
              <label className="btn-pill-secondary px-3 py-1.5 text-[11px] flex items-center space-x-1.5 cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-emerald-700" strokeWidth={1.75} />
                <span>Upload New Lease File</span>
                <input type="file" accept=".pdf,.png,.jpg" onChange={handleMockUpload} className="hidden" />
              </label>
            </div>

            {/* Document Viewer with Visual OCR Amber Highlight */}
            <div className="border border-emerald-950/[0.1] rounded-2xl overflow-hidden bg-white shadow-xs">
              <div className="bg-emerald-950/[0.03] px-4 py-2.5 border-b border-emerald-950/[0.06] flex items-center justify-between text-[11px]">
                <div className="flex items-center space-x-2">
                  <FileText className="w-3.5 h-3.5 text-emerald-700" strokeWidth={1.75} />
                  <span className="font-mono font-medium text-emerald-950">{fileName}</span>
                </div>
                <span className="text-emerald-800 font-bold flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60 text-[10px]">
                  <Sparkles className="w-3 h-3 text-yellow-500" strokeWidth={1.75} />
                  Confidence: 98.4%
                </span>
              </div>

              {/* Document Text Page */}
              <div className="p-6 bg-[#FEFEFD] font-serif leading-relaxed text-slate-700 text-xs space-y-3 relative select-none">
                <p className="text-slate-400 text-[10px] font-mono uppercase tracking-widest text-center border-b border-slate-100 pb-2">
                  GOVERNMENT OF MAHARASHTRA · REGISTRATION & STAMPS DEPARTMENT
                </p>

                <p>
                  THIS INDENTURE OF LEASE executed at Pune on this twenty-fourth day of February, between the Lessor (Trust) and the Lessee (Shivaji Institute of Technology & Engineering).
                </p>

                {/* HIGHLIGHTED CLAUSE */}
                <div className="p-3.5 bg-yellow-100/60 border-2 border-yellow-400/80 rounded-xl text-amber-950 relative my-2 shadow-2xs">
                  <span className="absolute -top-2.5 right-3 bg-yellow-400 text-amber-950 font-sans font-bold text-[9px] px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    AI Detected Clause 4.2
                  </span>
                  <p className="font-semibold text-amber-950">
                    &ldquo;CLAUSE 4.2: The Lessor hereby demises unto the Lessee the entire registered land measuring 10.5 acres for educational institutional purposes, to have and to hold for a renewable period <span className="underline decoration-amber-500 decoration-2 font-bold text-amber-900 bg-yellow-200/60 px-1 py-0.5 rounded">commencing from 1st March 2026 and valid up to 31st December 2038</span> without interruption.&rdquo;
                  </p>
                </div>

                <p className="text-slate-500 text-[11px]">
                  Registered under Document Serial #MH-PUN-2026/8940. Signed and verified by Sub-Registrar.
                </p>
              </div>
            </div>

            {/* Proposed Date Card */}
            <div className="bg-yellow-50/40 border border-yellow-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-emerald-950 font-semibold flex items-center gap-1.5">
                    <span>Proposed Expiry Date:</span>
                    <AdvisoryPopover
                      title="Expiry Date Extraction"
                      explanation="Proposed automatically from registered deed Clause 4.2. Officers must confirm or edit manually before applying."
                    />
                  </div>
                  {isManualEdit ? (
                    <div className="mt-1 flex items-center space-x-2">
                      <input
                        type="date"
                        value={manualDateInput}
                        onChange={(e) => setManualDateInput(e.target.value)}
                        className="p-1.5 bg-white border border-emerald-950/[0.1] rounded-lg text-xs font-mono font-bold"
                      />
                      <span className="text-[10px] text-emerald-950/50">Manual override active</span>
                    </div>
                  ) : (
                    <div className="text-lg font-bold font-mono text-emerald-950 mt-0.5">
                      {extractedDate} (31 Dec 2038)
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-emerald-950/50">Validity</span>
                  <div className="font-bold text-emerald-800 text-xs">12+ Years (Satisfies APH Norms)</div>
                </div>
              </div>
            </div>

            {/* THREE SEPARATE OFFICER BUTTONS: Confirm / Edit manually / Reject */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-950/[0.06]">
              <button
                type="button"
                onClick={handleReject}
                className="btn-pill-secondary px-3.5 py-2 text-xs text-red-700 border-red-200 hover:bg-red-50 flex items-center space-x-1"
              >
                <XCircle className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>Reject Extraction</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsManualEdit(!isManualEdit)}
                  className={`btn-pill-secondary px-3.5 py-2 text-xs flex items-center space-x-1 ${
                    isManualEdit ? 'bg-yellow-100 text-amber-900 border-yellow-300 font-bold' : ''
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5 text-emerald-700" strokeWidth={1.75} />
                  <span>{isManualEdit ? 'Use Extracted Date' : 'Edit Manually'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleConfirmAndSave(isManualEdit ? manualDateInput : extractedDate)}
                  className="btn-pill-primary px-5 py-2 text-xs flex items-center space-x-1.5 shadow-xs"
                >
                  <ShieldCheck className="w-4 h-4 text-yellow-300" strokeWidth={1.75} />
                  <span>Confirm & Apply Expiry</span>
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
