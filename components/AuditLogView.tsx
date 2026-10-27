'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import AdvisoryPopover from '@/components/AdvisoryPopover';
import {
  ShieldCheck,
  ShieldAlert,
  Unlock,
  RotateCcw,
  Download,
  Search,
  CheckCircle2,
  Link as LinkIcon,
  Unlink,
  Check,
  XCircle
} from 'lucide-react';

export default function AuditLogView() {
  const {
    auditLog,
    chainIntegrity,
    isTampered,
    simulateAuditTampering,
    restoreAuditIntegrity,
    simulatedDate
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');
  const [verifyState, setVerifyState] = useState<'idle' | 'success' | 'failed'>('idle');

  const filteredEntries = auditLog.filter((entry) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchObj = entry.objectId.toLowerCase().includes(q);
      const matchActor = entry.actor.toLowerCase().includes(q);
      const matchDetails = entry.details.toLowerCase().includes(q);
      const matchAction = entry.action.toLowerCase().includes(q);
      if (!matchObj && !matchActor && !matchDetails && !matchAction) return false;
    }
    if (filterAction !== 'ALL' && entry.objectType !== filterAction) return false;
    return true;
  });

  const handleManualVerify = () => {
    if (chainIntegrity.isValid) {
      setVerifyState('success');
    } else {
      setVerifyState('failed');
    }
    setTimeout(() => {
      setVerifyState('idle');
    }, 4000);
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditLog, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `AICTE_SAMAY_Audit_${simulatedDate.split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Sovereign Continuous 4px Tricolour Bar */}
      <div className="tricolour-bar rounded-full" />
      {/* Integrity Status Hero Card */}
      <div className={`p-6 sm:p-8 rounded-3xl border transition-all duration-300 ${
        chainIntegrity.isValid
          ? 'saas-card-glow'
          : 'bg-red-50/70 border-red-300 ring-2 ring-red-400/20'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className={`p-3 rounded-2xl ${
              chainIntegrity.isValid
                ? 'bg-emerald-100/70 text-emerald-800 border border-emerald-300/60'
                : 'bg-red-100 text-red-700 border border-red-200 animate-pulse'
            }`}>
              {chainIntegrity.isValid ? (
                <ShieldCheck className="w-7 h-7" strokeWidth={1.75} />
              ) : (
                <ShieldAlert className="w-7 h-7" strokeWidth={1.75} />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-extrabold tracking-tight text-[#0F241C]">
                  {chainIntegrity.isValid
                    ? 'Cryptographic Hash-Chain Intact (100% Tamper-Free)'
                    : 'SECURITY ALERT: Hash-Chain Tampering Detected!'}
                </h2>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-white/80 border border-emerald-950/[0.08] text-emerald-900 font-bold">
                  SHA-256
                </span>
                <AdvisoryPopover
                  title="Cryptographic Hash Chain (FR-G2)"
                  explanation="Each audit block includes a SHA-256 hash calculated over the previous block's hash, timestamp, actor, action, and payload. Any retroactive alteration invalidates the entire subsequent chain."
                />
              </div>
              <p className={`text-xs max-w-2xl leading-relaxed ${
                chainIntegrity.isValid ? 'text-emerald-950/70' : 'text-red-900 font-bold'
              }`}>
                {chainIntegrity.message}
              </p>
            </div>
          </div>

          {/* Action buttons: Verify integrity, Simulate tampering, Restore */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleManualVerify}
              className={`btn-pill-primary px-4 py-2 text-xs flex items-center space-x-1.5 shadow-xs ${
                verifyState === 'failed' ? 'bg-red-600' : ''
              }`}
            >
              {verifyState === 'success' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-yellow-300" strokeWidth={2} />
                  <span>Chain Verified Valid ({auditLog.length} Blocks)</span>
                </>
              ) : verifyState === 'failed' ? (
                <>
                  <XCircle className="w-3.5 h-3.5 text-white" strokeWidth={2} />
                  <span>Verification Failed at Block #4!</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-yellow-300" strokeWidth={1.75} />
                  <span>Verify Integrity</span>
                </>
              )}
            </button>

            {chainIntegrity.isValid ? (
              <button
                onClick={simulateAuditTampering}
                className="btn-pill-secondary px-3.5 py-2 text-xs text-red-700 border-red-200 hover:bg-red-50 flex items-center space-x-1.5"
                title="Maliciously alters Block #4 to test detection"
              >
                <Unlock className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>Simulate Tampering</span>
              </button>
            ) : (
              <button
                onClick={restoreAuditIntegrity}
                className="btn-pill-secondary px-3.5 py-2 text-xs text-emerald-800 bg-emerald-50 border-emerald-300 hover:bg-emerald-100 flex items-center space-x-1.5 font-bold"
              >
                <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>Restore Chain</span>
              </button>
            )}

            <button
              onClick={handleExportJSON}
              className="btn-pill-secondary px-3.5 py-2 text-xs flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" strokeWidth={1.75} />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        {/* Verification Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-emerald-950/[0.06] text-xs">
          <div>
            <span className="text-emerald-950/50">Total Ledger Blocks:</span>
            <div className="text-lg font-bold font-mono text-emerald-950 mt-0.5">{auditLog.length}</div>
          </div>
          <div>
            <span className="text-emerald-950/50">Verified Blocks:</span>
            <div className="text-lg font-bold font-mono text-emerald-800 mt-0.5">{chainIntegrity.blocksVerified}</div>
          </div>
          <div>
            <span className="text-emerald-950/50">Chain Continuity:</span>
            <div className={`text-lg font-bold font-mono mt-0.5 ${isTampered ? 'text-red-700 font-extrabold' : 'text-emerald-800'}`}>
              {isTampered ? 'BROKEN AT BLOCK #4' : 'INTACT & SECURE'}
            </div>
          </div>
          <div>
            <span className="text-emerald-950/50">Hashing Standard:</span>
            <div className="text-lg font-bold font-mono text-emerald-950 mt-0.5">SHA-256 (32-byte)</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="saas-card p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-emerald-950/40 absolute left-3.5 top-2.5" strokeWidth={1.75} />
            <input
              type="text"
              placeholder="Search by action, actor, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white rounded-full border border-emerald-950/[0.08] text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
            />
          </div>

          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="bg-white border border-emerald-950/[0.08] text-emerald-950 text-xs rounded-full px-4 py-2 font-medium shadow-2xs focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Ledger Objects ({auditLog.length})</option>
            <option value="Application">Application</option>
            <option value="EVC">EVC Committee</option>
            <option value="Undertaking">Undertaking</option>
            <option value="Document">Document</option>
            <option value="System">System</option>
          </select>
        </div>
      </div>

      {/* Visual Block Chain Stream with Visible Hash Linkages */}
      <div className="space-y-4">
        {filteredEntries.map((block, idx) => {
          const isThisBlockTampered = block.isTampered;
          const isSubsequentBroken = isTampered && block.blockIndex >= 4;

          return (
            <div key={block.id} className="space-y-2">
              {/* Connector Link between blocks */}
              {idx > 0 && (
                <div className="flex items-center justify-center my-0.5">
                  <div className={`flex items-center space-x-1.5 px-3 py-0.5 rounded-full text-[10px] font-mono border ${
                    isSubsequentBroken
                      ? 'bg-red-50 text-red-700 border-red-300 animate-pulse'
                      : 'bg-emerald-50/70 text-emerald-800 border-emerald-200/60'
                  }`}>
                    {isSubsequentBroken ? (
                      <>
                        <Unlink className="w-3 h-3 text-red-600" />
                        <span className="font-bold">CHAIN LINK BROKEN (Hash Mismatch)</span>
                      </>
                    ) : (
                      <>
                        <LinkIcon className="w-3 h-3 text-emerald-600" />
                        <span>SHA-256 Link Verified</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div
                className={`p-4 rounded-2xl border transition-all duration-300 ${
                  isThisBlockTampered
                    ? 'bg-red-50/90 border-red-400 ring-2 ring-red-400/30 shadow-md'
                    : isSubsequentBroken
                    ? 'bg-yellow-50/30 border-red-200'
                    : 'saas-card'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2.5 border-b border-emerald-950/[0.05] text-xs">
                  <div className="flex items-center space-x-2.5">
                    <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono font-bold text-xs ${
                      isThisBlockTampered
                        ? 'bg-red-600 text-white'
                        : isSubsequentBroken
                        ? 'bg-amber-500 text-white'
                        : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    }`}>
                      #{block.blockIndex}
                    </span>
                    <div>
                      <span className="font-bold text-emerald-950">{block.action}</span>
                      <span className="text-emerald-950/40 text-[11px] ml-2 font-mono">
                        {new Date(block.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-[11px]">
                    <span className="px-2.5 py-0.5 rounded-full bg-yellow-50 text-amber-900 font-semibold border border-yellow-200">
                      {block.objectType}: {block.objectId}
                    </span>
                    <span className="text-emerald-950/60 font-medium">Actor: {block.actor}</span>
                  </div>
                </div>

                <div className="my-2.5 text-xs text-emerald-950/80 leading-relaxed">
                  {block.details}
                </div>

                <div className="pt-2 border-t border-emerald-950/[0.04] grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] font-mono text-emerald-950/50">
                  <div className="truncate">
                    <span className="font-sans text-emerald-950/40">Prev Hash: </span>
                    <span className="font-semibold text-emerald-950">{block.previousHash}</span>
                  </div>
                  <div className="truncate text-left md:text-right">
                    <span className="font-sans text-emerald-950/40">Block SHA-256: </span>
                    <span className={isThisBlockTampered ? 'text-red-700 font-bold bg-red-100 px-1 py-0.2 rounded' : 'text-emerald-800 font-semibold'}>
                      {block.hash}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
