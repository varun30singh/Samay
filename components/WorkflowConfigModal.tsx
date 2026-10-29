'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  X,
  Sliders,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Save,
  Plus,
  ArrowRight,
  GitBranch,
  Layers,
  FileCheck,
  Check,
  Lock,
  Sparkles
} from 'lucide-react';
import { DEFAULT_APH_TEMPLATES, WorkflowTemplate } from '@/lib/workflowService';

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
  const [activeTab, setActiveTab] = useState<'templates' | 'matrix'>('templates');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('aph-scrutiny-only');
  const [templates, setTemplates] = useState<WorkflowTemplate[]>(DEFAULT_APH_TEMPLATES);
  const [rules, setRules] = useState<TransitionRule[]>([]);
  const [version, setVersion] = useState<string>('1.0.0');
  const [updatedAt, setUpdatedAt] = useState<string>('');
  const [stages, setStages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New rule state for custom matrix
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

    Promise.all([
      fetch('/api/workflow/config', { headers }).then(r => r.json()),
      fetch('/api/workflow/templates', { headers }).then(r => r.json())
    ])
      .then(([configData, templatesData]) => {
        if (!isMounted) return;
        if (configData.success) {
          setRules(configData.rules || []);
          setVersion(configData.version || '1.0.0');
          setUpdatedAt(configData.updatedAt || '');
          setStages(configData.stages || []);
        }
        if (templatesData.success && templatesData.data?.templates) {
          setTemplates(templatesData.data.templates);
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

  const currentTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];

  const handleAddRule = () => {
    if (!newFrom || !newTo || !newRole) return;
    const existingIndex = rules.findIndex(r => r.from === newFrom && r.to === newTo);
    if (existingIndex >= 0) {
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
          reason: 'Administrator updated workflow transition matrix from SAMAY console'
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white dark:bg-[#0B1B3A] border border-[#CFE3D3] dark:border-[#2B4478] rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-scale-up">
        {/* Sovereign Tricolour Line */}
        <div className="tricolour-bar rounded-t-2xl" />

        {/* Modal Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-[#2B4478]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Regulatory Workflow Engine & APH Combinations
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  v{version}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                  PostgreSQL Backed
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Data-driven workflow engine supporting all APH-prescribed approval pathways and policy safeguards.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-6 pt-3 border-b border-gray-100 dark:border-gray-800 flex gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('templates')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'templates'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            APH Prescribed Workflow Templates (4 Seeded)
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'matrix'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            Global Stage Transition Matrix & Rules
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
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {isLoading ? (
            <div className="text-center py-12 text-xs text-gray-500">
              Loading workflow templates and safeguards from database...
            </div>
          ) : activeTab === 'templates' ? (
            <div className="space-y-6">
              {/* Template Selector Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {templates.map(t => {
                  const isSelected = t.id === selectedTemplateId;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTemplateId(t.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-xs ring-1 ring-emerald-500'
                          : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                          {t.code}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1">{t.name}</h4>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{t.description}</p>
                      <div className="mt-3 flex items-center justify-between text-[10px] text-gray-400">
                        <span>{t.stages?.length || 0} Stages</span>
                        <span>{t.transitions?.length || 0} Transitions</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Template Visual Pipeline */}
              {currentTemplate && (
                <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-850 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-emerald-600" />
                        {currentTemplate.name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">{currentTemplate.description}</p>
                    </div>
                    <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                      Applicable to: {currentTemplate.applicableTypes.join(', ')}
                    </span>
                  </div>

                  {/* Stage Sequence Flow */}
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
                      Statutory Stage Progression Sequence:
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {currentTemplate.stages.map((stage, idx) => (
                        <React.Fragment key={stage}>
                          <div className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-800 dark:text-gray-200 shadow-2xs">
                            {stage.replace(/_/g, ' ').toUpperCase()}
                          </div>
                          {idx < currentTemplate.stages.length - 1 && (
                            <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  {/* Policy Safeguards Checklist */}
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-2.5 rounded-lg bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="text-[11px]">
                        <strong className="block text-gray-900 dark:text-white">Competent Authority Exclusive</strong>
                        <span className="text-gray-500">Only Chairman/MS can approve or reject</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="text-[11px]">
                        <strong className="block text-gray-900 dark:text-white">No Auto-Approval Bypass</strong>
                        <span className="text-gray-500">Scrutiny / EVC pass cannot skip final review</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="text-[11px]">
                        <strong className="block text-gray-900 dark:text-white">Cryptographic Audit Chain</strong>
                        <span className="text-gray-500">Every transition hashed to SHA-256 block</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Admin Rule Add Bar */}
              {isAdmin && (
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center space-x-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Admin Transition Authorizer</span>
                    </span>
                    <span className="text-[10px] text-gray-500">Add regulatory transition rule</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1">From Stage</label>
                      <select
                        value={newFrom}
                        onChange={e => setNewFrom(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                      >
                        {stages.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1">To Stage</label>
                      <select
                        value={newTo}
                        onChange={e => setNewTo(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                      >
                        {stages.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1">Authorized Role</label>
                      <select
                        value={newRole}
                        onChange={e => setNewRole(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
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
                        className="w-full py-2 px-3 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:opacity-90 flex items-center justify-center space-x-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Transition</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Rules List Table */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800 text-[10px] uppercase font-bold text-gray-500 border-b border-gray-200 dark:border-gray-700">
                      <th className="p-3">Source Stage</th>
                      <th className="p-3">Target Stage</th>
                      <th className="p-3">Authorized Roles</th>
                      {isAdmin && <th className="p-3 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                    {rules.map((rule, idx) => (
                      <tr key={`${rule.from}-${rule.to}-${idx}`} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="p-3 font-semibold text-gray-900 dark:text-white">
                          <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[11px] font-mono">
                            {rule.from}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-gray-900 dark:text-white">
                          <span className="flex items-center space-x-1.5">
                            <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[11px] font-mono">
                              {rule.to}
                            </span>
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {rule.allowedRoles.map(r => (
                              <span
                                key={r}
                                className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
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
        <div className="px-6 py-3.5 bg-gray-50 dark:bg-gray-850 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
          <span className="text-gray-500 text-[11px]">
            {updatedAt ? `Last modified: ${new Date(updatedAt).toLocaleString()}` : 'APH standard workflow combinations active'}
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Close
            </button>
            {isAdmin && activeTab === 'matrix' && (
              <button
                onClick={handleSaveConfig}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:opacity-90 transition-opacity flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
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
