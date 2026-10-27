'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import CuteRobotIcon from '@/components/CuteRobotIcon';
import {
  Search,
  Building2,
  Calendar,
  Lock,
  FileCheck,
  AlertTriangle,
  FileSpreadsheet,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Command,
  X,
  CalendarDays,
  ClipboardCheck,
  UserCheck,
  ListTodo,
  Upload
} from 'lucide-react';

const CuteRobotPaletteIcon = () => <CuteRobotIcon size={16} />;

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  onSelectApplication: (appId: string) => void;
  onOpenWhatIf: () => void;
  onOpenDemo: () => void;
  onOpenCopilot?: () => void;
}

interface PaletteItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;
  category: 'Pages' | 'Actions' | 'Institutions';
  run?: () => void;
  appId?: string;
}

export default function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onSelectApplication,
  onOpenWhatIf,
  onOpenDemo,
  onOpenCopilot
}: CommandPaletteProps) {
  const { applications } = useApp();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => {
    setQuery('');
    setSelectedIndex(0);
    onClose();
  }, [onClose]);

  // Global keyboard listener for Cmd+K / Ctrl+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          handleClose();
        }
      }
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleClose]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Pages
  const pages: PaletteItem[] = [
    { id: 'deadline-guard', title: 'Deadline Guard (Signature)', subtitle: 'Cutoff countdown & student triage', icon: ShieldAlert, category: 'Pages' },
    { id: 'applications', title: 'Applications Pipeline Register', subtitle: 'Searchable institution queue', icon: Building2, category: 'Pages' },
    { id: 'evc', title: 'EVC Committee Scheduling & Conflict Radar', subtitle: 'Double-booking detector & roster', icon: Calendar, category: 'Pages' },
    { id: 'undertakings', title: 'Institutional Undertakings & Verification', subtitle: 'Compliance evidence & SLA register', icon: FileCheck, category: 'Pages' },
    { id: 'lease-radar', title: 'Land Lease Radar & OCR Extractor', subtitle: 'Track expiring deeds with AI OCR', icon: AlertTriangle, category: 'Pages' },
    { id: 'audit', title: 'Tamper-Evident SHA-256 Audit Ledger', subtitle: 'Cryptographic hash-chain integrity', icon: Lock, category: 'Pages' },
    { id: 'reports', title: 'Official Reports & CSV Export', subtitle: 'Region-wise performance analytics', icon: FileSpreadsheet, category: 'Pages' },
    { id: 'working-calendar', title: 'Working-Days Calendar Configuration', subtitle: 'Weekend off-days & gazetted holidays', icon: CalendarDays, category: 'Pages' },
    { id: 'readiness-check', title: 'Pre-Submission Readiness Checker', subtitle: 'Institution self-service checklist & audit', icon: ClipboardCheck, category: 'Pages' },
    { id: 'coverage', title: 'Officer Coverage & Delegation Panel', subtitle: 'Queue routing, leaves & uncovered queue flags', icon: UserCheck, category: 'Pages' },
    { id: 'deficiency-tracker', title: 'Deficiency Closure Tracker (P0)', subtitle: 'Inspection deficiencies, timelines & hearings', icon: ListTodo, category: 'Pages' },
    { id: 'data-import', title: 'CSV Bulk Data Import & Ingestion', subtitle: 'Upload institutions, applications & leases', icon: Upload, category: 'Pages' },
  ];

  // Actions
  const actions: PaletteItem[] = [
    { id: 'act-samay', title: 'Open SAMAY AI Chatbot', subtitle: 'Ask regulatory APH rules, deadlines & audit questions', icon: CuteRobotPaletteIcon, category: 'Actions', run: () => { handleClose(); onOpenCopilot?.(); } },
    { id: 'act-whatif', title: 'Launch What-If Scenario Simulator', subtitle: 'Model cutoff extensions & officer staff', icon: Sparkles, category: 'Actions', run: onOpenWhatIf },
    { id: 'act-demo', title: 'Start Official 3-Minute Guided Demo Tour', subtitle: '8-step jury script walk-through', icon: Command, category: 'Actions', run: onOpenDemo },
  ];

  // Filtered Apps
  const filteredApps: PaletteItem[] = applications.filter(a => {
    if (!query.trim()) return false;
    const q = query.toLowerCase();
    return a.institutionName.toLowerCase().includes(q) || a.id.toLowerCase().includes(q) || a.region.toLowerCase().includes(q);
  }).slice(0, 5).map(a => ({
    id: a.id,
    title: a.institutionName,
    subtitle: `${a.id} · ${a.region} · ${a.approvedIntake} seats · ${a.riskStatus}`,
    icon: Building2,
    category: 'Institutions' as const,
    appId: a.id
  }));

  const filteredPages = pages.filter(p => !query.trim() || p.title.toLowerCase().includes(query.toLowerCase()));
  const filteredActions = actions.filter(act => !query.trim() || act.title.toLowerCase().includes(query.toLowerCase()));

  const allItems: PaletteItem[] = [...filteredActions, ...filteredPages, ...filteredApps];

  const handleSelect = (item: PaletteItem) => {
    if (item.category === 'Pages') {
      onNavigate(item.id);
    } else if (item.category === 'Actions') {
      item.run?.();
    } else if (item.category === 'Institutions' && item.appId) {
      onSelectApplication(item.appId);
    }
    handleClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, allItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + allItems.length) % Math.max(1, allItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        handleSelect(allItems[selectedIndex]);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-emerald-950/25 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
      <div
        className="glass-dropdown max-w-xl w-full rounded-3xl overflow-hidden animate-fade-in shadow-2xl border border-emerald-950/[0.1] bg-white/95"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-emerald-950/[0.06] gap-3">
          <Search className="w-4 h-4 text-emerald-950/40 shrink-0" strokeWidth={1.75} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, page name, or institution..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent text-sm text-emerald-950 placeholder:text-emerald-950/40 focus:outline-none"
          />
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] font-mono text-emerald-950/40 bg-yellow-50 px-2 py-0.5 rounded-md border border-yellow-200">ESC</span>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-emerald-950/40 hover:text-emerald-950"
            >
              <X className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Results Stream */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1 text-xs">
          {allItems.length === 0 ? (
            <div className="p-8 text-center text-emerald-950/50">
              No matching pages or institutions found for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            allItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;

              return (
                <button
                  key={`${item.category}-${item.id}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-2xl flex items-center justify-between transition-all duration-150 ${
                    isSelected
                      ? 'bg-yellow-50/80 text-emerald-950 border border-yellow-200/80 shadow-2xs font-semibold'
                      : 'text-emerald-950/70 hover:bg-emerald-50/40'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <div className={`p-1.5 rounded-xl ${isSelected ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-800'}`}>
                      <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </div>
                    <div className="truncate">
                      <div className="truncate">{item.title}</div>
                      {item.subtitle && (
                        <div className="text-[10px] text-emerald-950/40 font-normal truncate">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 ml-3">
                    <span className="text-[9px] uppercase tracking-wider text-emerald-950/40 font-semibold px-2 py-0.5 rounded-full bg-emerald-950/[0.04]">
                      {item.category}
                    </span>
                    <ArrowRight className={`w-3 h-3 ${isSelected ? 'text-emerald-700' : 'text-emerald-950/20'}`} strokeWidth={1.75} />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-emerald-950/[0.06] bg-yellow-50/30 flex items-center justify-between text-[10px] text-emerald-950/50">
          <span>Navigate with <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-950/10">↑</kbd> <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-950/10">↓</kbd></span>
          <span>Select with <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-950/10">↵</kbd></span>
        </div>
      </div>
    </div>
  );
}
