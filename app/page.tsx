'use client';

import React, { useState } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import DeadlineGuardView from '@/components/DeadlineGuardView';
import WorkflowDashboard from '@/components/WorkflowDashboard';
import EVCManagementView from '@/components/EVCManagementView';
import UndertakingsView from '@/components/UndertakingsView';
import LeaseRadarView from '@/components/LeaseRadarView';
import AuditLogView from '@/components/AuditLogView';
import InstitutionPortalView from '@/components/InstitutionPortalView';
import ApplicationDetailModal from '@/components/ApplicationDetailModal';
import SmartOCRExtractorModal from '@/components/SmartOCRExtractorModal';
import DemoScriptModal from '@/components/DemoScriptModal';
import OfficerCopilot from '@/components/OfficerCopilot';
import CommandPalette from '@/components/CommandPalette';
import OfficerWorkloadModal from '@/components/OfficerWorkloadModal';
import AlertDigestModal from '@/components/AlertDigestModal';
import LoginPage from '@/components/LoginPage';
import WorkingCalendarView from '@/components/WorkingCalendarView';
import ReadinessCheckView from '@/components/ReadinessCheckView';
import OfficerCoverageView from '@/components/OfficerCoverageView';
import DeficiencyTrackerView from '@/components/DeficiencyTrackerView';
import DataImportView from '@/components/DataImportView';
import RegionalAnalyticsView from '@/components/RegionalAnalyticsView';
import { Application } from '@/lib/types';

function MainApp() {
  const { applications, isAuthenticated, isHydrated } = useApp();
  const [activeTab, setActiveTab] = useState('deadline-guard');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [ocrApp, setOcrApp] = useState<Application | null>(null);

  // Modals state - must all be declared before any conditional return (Rules of Hooks)
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isWorkloadOpen, setIsWorkloadOpen] = useState(false);
  const [isAlertDigestOpen, setIsAlertDigestOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // While SSR-ing or during initial client hydration, render LoginPage to guarantee zero hydration mismatch
  if (!isHydrated || !isAuthenticated) {
    return <LoginPage />;
  }

  const handleOpenAppDetailById = (appId: string) => {
    const app = applications.find(a => a.id === appId);
    if (app) setSelectedApp(app);
  };

  const handleOpenOCRById = (appId: string) => {
    const app = applications.find(a => a.id === appId);
    if (app) setOcrApp(app);
  };

  const handleToggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsMobileDrawerOpen(prev => !prev);
    } else {
      setIsSidebarCollapsed(prev => !prev);
    }
  };

  // Dynamic view resolution
  const currentView = activeTab;

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0B1B3A] text-on-surface dark:text-[#FFFFFF] transition-colors duration-200">
      {/* Mobile Backdrop Overlay */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setIsMobileDrawerOpen(false)}
          aria-label="Close navigation"
        />
      )}

      {/* Collapsible Sidebar & Mobile Off-canvas Drawer */}
      <Sidebar
        activeTab={currentView}
        setActiveTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileDrawerOpen}
        onCloseMobile={() => setIsMobileDrawerOpen(false)}
        onOpenDemo={() => setIsDemoOpen(true)}
        onOpenCopilot={() => setIsCopilotOpen(true)}
        onOpenWorkload={() => setIsWorkloadOpen(true)}
        onOpenWhatIf={() => {
          setActiveTab('deadline-guard');
        }}
      />

      {/* Main Content Area Offset by Sidebar Width on Desktop, Zero Offset on Mobile */}
      <div
        className={`flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden transition-all duration-300 ease-out pl-0 ${
          isSidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-72'
        }`}
      >
        {/* Top Header Bar with Sovereign Tricolour Accent */}
        <Header
          onOpenDemo={() => setIsDemoOpen(true)}
          onOpenCopilot={() => setIsCopilotOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenWorkload={() => setIsWorkloadOpen(true)}
          onOpenAlertDigest={() => setIsAlertDigestOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
        />

        {/* Content Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 min-w-0">
          {currentView === 'deadline-guard' && (
            <DeadlineGuardView
              onSelectApplication={(app) => setSelectedApp(app)}
              onOpenOCR={(app) => setOcrApp(app)}
            />
          )}

          {currentView === 'applications' && (
            <WorkflowDashboard
              onSelectApplication={(app) => setSelectedApp(app)}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {currentView === 'working-calendar' && <WorkingCalendarView />}

          {currentView === 'readiness-check' && (
            <ReadinessCheckView
              onSelectApplication={(app) => setSelectedApp(app)}
            />
          )}

          {currentView === 'coverage' && <OfficerCoverageView />}

          {currentView === 'deficiency-tracker' && <DeficiencyTrackerView />}

          {currentView === 'data-import' && <DataImportView />}

          {currentView === 'institution-portal' && (
            <InstitutionPortalView
              onOpenOCR={(app) => setOcrApp(app)}
            />
          )}

          {currentView === 'evc' && (
            <EVCManagementView
              onSelectApplication={(app) => setSelectedApp(app)}
            />
          )}

          {currentView === 'undertakings' && (
            <UndertakingsView
              onSelectApplication={(app) => setSelectedApp(app)}
            />
          )}

          {currentView === 'lease-radar' && (
            <LeaseRadarView
              onOpenOCR={(app) => setOcrApp(app)}
              onSelectApplication={(app) => setSelectedApp(app)}
            />
          )}

          {currentView === 'audit' && <AuditLogView />}

          {currentView === 'regional-analytics' && <RegionalAnalyticsView />}

          {currentView === 'reports' && <RegionalAnalyticsView />}
        </main>

        {/* Modals & Overlays */}
        {selectedApp && (
          <ApplicationDetailModal
            application={selectedApp}
            onClose={() => setSelectedApp(null)}
            onOpenOCR={(app) => {
              setSelectedApp(null);
              setOcrApp(app);
            }}
          />
        )}

        {ocrApp && (
          <SmartOCRExtractorModal
            application={ocrApp}
            onClose={() => setOcrApp(null)}
          />
        )}

        <DemoScriptModal
          isOpen={isDemoOpen}
          onClose={() => setIsDemoOpen(false)}
          setActiveTab={setActiveTab}
          onOpenAppDetail={handleOpenAppDetailById}
          onOpenOCR={handleOpenOCRById}
        />

        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onNavigate={(tab) => setActiveTab(tab)}
          onSelectApplication={handleOpenAppDetailById}
          onOpenWhatIf={() => setActiveTab('deadline-guard')}
          onOpenDemo={() => setIsDemoOpen(true)}
          onOpenCopilot={() => setIsCopilotOpen(true)}
        />

        <OfficerWorkloadModal
          isOpen={isWorkloadOpen}
          onClose={() => setIsWorkloadOpen(false)}
        />

        <AlertDigestModal
          isOpen={isAlertDigestOpen}
          onClose={() => setIsAlertDigestOpen(false)}
        />

        {/* Floating SAMAY Chatbot (Always fixed at bottom-right corner when scrolling across all views) */}
        <OfficerCopilot
          isOpen={isCopilotOpen}
          onOpen={() => setIsCopilotOpen(true)}
          onClose={() => setIsCopilotOpen(false)}
          activeTab={currentView}
          onNavigateTab={(tab) => setActiveTab(tab)}
          onSelectApplication={handleOpenAppDetailById}
        />

        {/* Minimal Footer */}
        <footer className="mt-16 py-8 border-t border-emerald-950/[0.06] text-xs text-emerald-950/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-[#0F241C] tracking-tight">SAMAY</span>
              <span>·</span>
              <span>AICTE Regulation Bureau</span>
              <span>·</span>
              <span className="font-mono text-[11px]">SIH 2026 (SIH26262)</span>
            </div>

            <div className="text-center md:text-right text-[11px] max-w-md text-emerald-950/40">
              Decision-support and workflow system. Statutory decisions stay strictly with the competent AICTE authority.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
