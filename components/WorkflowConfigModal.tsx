'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { X, Sliders, CheckCircle2, ShieldCheck, AlertCircle, Save, Plus, ArrowRight } from 'lucide-react';

interface TransitionRule {
  from: string;
  to: string;
  allowedRoles: string[];
}

interface WorkflowConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WorkflowConfigModal({ isOpen, onClose }: WorkflowConfigModalProps) {
  const { currentUser, currentRole } = useApp();
  const [rules, setRules] = useState<TransitionRule[]>([]);
  const [version, setVersion] = useState<string>('1.0.0');
  const [updatedAt, setUpdatedAt] = useState<string>('');
  const [stages, setStages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New rule state
  const [newFrom, setNewFrom] = useState<string>('under_scrutiny');
  const [newTo, setNewTo] = useState<string>('ready_for_evc');
  const [newRole, setNewRole] = useState<string>('scrutiny_officer');

  const isAdmin = currentRole === 'system_admin' || (currentRole as string) === 'admin';

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    const headers: Record<string, string> = {};
    if (currentUser?.token) {
      headers['Authorization'] = `Bearer ${currentUser.token}`;
    }

    fetch('/api/workflow/config', { headers })
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        if (data.success) {
          setRules(data.rules || []);
          setVersion(data.version || '1.0.0');
          setUpdatedAt(data.updatedAt || '');
          setStages(data.stages || []);
        } else {
          setStatusMsg({ type: 'error', text: data.error || 'Failed to load workflow configuration' });
        }
      })
      .catch(err => {
        if (!isMounted) return;
        setStatusMsg({ type: 'error', text: err instanceof Error ? err.message : 'Network error' });
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentUser?.token]);

  if (!isOpen) return null;

  const handleAddRule = () => {
    if (!newFrom || !newTo || !newRole) return;
    const existingIndex = rules.findIndex(r => r.from === newFrom && r.to === newTo);
    if (existingIndex >= 0) {
      // Add role to existing rule
      const updated = [...rules];
      if (!updated[existingIndex].allowedRoles.includes(newRole)) {
        updated[existingIndex].allowedRoles.push(newRole);
        setRules(updated);
      }
    } else {
      setRules(prev => [...prev, { from: newFrom, to: newTo, allowedRoles: [newRole] }]);
    }
    setStatusMsg({ type: 'success', text: `Added transition: ${newFrom} -> ${newTo} (${newRole})` });
  };

  const handleRemoveRule = (index: number) => {
    setRules(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveConfig = async () => {
    if (!isAdmin) return;
    setIsSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/workflow/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.token}`
        },
        body: JSON.stringify({
          rules,
          reason: 'Administrator updated workflow rules from SAMAY console'
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setVersion(data.version);
        setUpdatedAt(data.updatedAt);
        setStatusMsg({ type: 'success', text: `Workflow rules successfully saved and versioned as v${data.version}!` });
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to save workflow rules' });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: err instanceof Error ? err.message : 'Network error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-surface-container-lowest dark:bg-[#0B1B3A] border border-[#CFE3D3] dark:border-[#2B4478] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
        {/* Tricolour Accent Line */}
        <div className="tricolour-bar rounded-t-2xl" />

        {/* Modal Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-[#CFE3D3]/60 dark:border-[#2B4478]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary dark:bg-[#FF9933]/15 dark:text-[#FF9933]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-on-surface dark:text-white">
                  Regulatory Workflow Engine Matrix
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  v{version}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300">
                  PostgreSQL Backed
                </span>
              </div>
              <p className="text-xs text-on-surface-variant dark:text-[#CBD5E1]">
                Enforces stage path transitions and role authorization under the AICTE Approval Process Handbook.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-container-high dark:hover:bg-[#1A3366] text-on-surface-variant transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div className={`px-6 py-2.5 text-xs font-semibold flex items-center space-x-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              : 'bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-300'
          }`}>
            {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {isLoading ? (
            <div className="text-center py-12 text-xs text-on-surface-variant">
              Loading workflow configuration from database...
            </div>
          ) : (
            <>
              {/* Admin Rule Add Bar */}
              {isAdmin && (
                <div className="p-4 rounded-xl bg-surface-container dark:bg-[#12264D] border border-[#CFE3D3]/60 dark:border-[#2B4478] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-on-surface dark:text-white flex items-center space-x-1.5">
                      <ShieldCheck className="w-4 h-4 text-primary dark:text-[#FF9933]" />
                      <span>Admin Transition Authorizer</span>
                    </span>
                    <span className="text-[10px] text-on-surface-variant">Add regulatory transition rule</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-semibold text-on-surface-variant mb-1">From Stage</label>
                      <select
                        value={newFrom}
                        onChange={e => setNewFrom(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg bg-surface-container-low dark:bg-[#09162F] border border-[#CFE3D3] dark:border-[#2B4478] text-on-surface dark:text-white"
                      >
                        {stages.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-on-surface-variant mb-1">To Stage</label>
                      <select
                        value={newTo}
                        onChange={e => setNewTo(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg bg-surface-container-low dark:bg-[#09162F] border border-[#CFE3D3] dark:border-[#2B4478] text-on-surface dark:text-white"
                      >
                        {stages.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-on-surface-variant mb-1">Authorized Role</label>
                      <select
                        value={newRole}
                        onChange={e => setNewRole(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg bg-surface-container-low dark:bg-[#09162F] border border-[#CFE3D3] dark:border-[#2B4478] text-on-surface dark:text-white"
                      >
                        <option value="scrutiny_officer">Scrutiny Officer</option>
                        <option value="regional_officer">Regional Officer</option>
                        <option value="bureau_officer">Bureau Officer</option>
                        <option value="evc_coordinator">EVC Coordinator</option>
                        <option value="competent_authority">Competent Authority</option>
                        <option value="system_admin">System Admin</option>
                        <option value="applicant">Applicant / Institution</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={handleAddRule}
                        className="w-full py-2 px-3 text-xs font-bold rounded-lg bg-primary dark:bg-[#FF9933] text-on-primary dark:text-[#0B1B3A] hover:opacity-90 flex items-center justify-center space-x-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Transition</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Rules List Table */}
              <div className="rounded-xl border border-[#CFE3D3]/60 dark:border-[#2B4478] overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container dark:bg-[#12264D] text-[10px] uppercase font-bold text-on-surface-variant border-b border-[#CFE3D3]/60 dark:border-[#2B4478]">
                      <th className="p-3">Source Stage</th>
                      <th className="p-3">Target Stage</th>
                      <th className="p-3">Authorized Roles</th>
                      {isAdmin && <th className="p-3 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#CFE3D3]/40 dark:divide-[#2B4478]/40 text-xs">
                    {rules.map((rule, idx) => (
                      <tr key={`${rule.from}-${rule.to}-${idx}`} className="hover:bg-surface-container/50 dark:hover:bg-[#12264D]/50 transition-colors">
                        <td className="p-3 font-semibold text-on-surface dark:text-white">
                          <span className="px-2 py-0.5 rounded bg-surface-container-high dark:bg-[#1A3366] text-[11px] font-mono">
                            {rule.from}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-on-surface dark:text-white">
                          <span className="flex items-center space-x-1.5">
                            <ArrowRight className="w-3.5 h-3.5 text-primary dark:text-[#FF9933]" />
                            <span className="px-2 py-0.5 rounded bg-surface-container-high dark:bg-[#1A3366] text-[11px] font-mono">
                              {rule.to}
                            </span>
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {rule.allowedRoles.map(r => (
                              <span
                                key={r}
                                className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        </td>
                        {isAdmin && (
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleRemoveRule(idx)}
                              className="text-[11px] font-semibold text-red-600 hover:text-red-700 dark:text-red-400 p-1 rounded"
                            >
                              Remove
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-surface-container dark:bg-[#12264D] border-t border-[#CFE3D3]/60 dark:border-[#2B4478] flex items-center justify-between text-xs">
          <span className="text-on-surface-variant text-[11px]">
            {updatedAt ? `Last modified: ${new Date(updatedAt).toLocaleString()}` : 'System default matrix active'}
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#CFE3D3] dark:border-[#2B4478] text-on-surface font-semibold hover:bg-surface-container-high transition-colors"
            >
              Close
            </button>
            {isAdmin && (
              <button
                onClick={handleSaveConfig}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg bg-primary dark:bg-[#FF9933] text-on-primary dark:text-[#0B1B3A] font-bold hover:opacity-90 transition-opacity flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save & Publish Version'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
