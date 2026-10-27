'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { Region } from '@/lib/types';
import {
  FileSpreadsheet,
  Download,
  Printer
} from 'lucide-react';

const ALL_REGIONS: Region[] = [
  'Northern',
  'Western',
  'Southern',
  'Eastern',
  'Central',
  'South-Western',
  'South-Central',
  'North-Western'
];

export default function ReportsView() {
  const { applications, simulatedDate, calendarConfig } = useApp();

  const regionStats = ALL_REGIONS.map(reg => {
    const regApps = applications.filter(a => a.region === reg);
    const totalIntake = regApps.reduce((s, a) => s + a.approvedIntake, 0);
    const onTrack = regApps.filter(a => a.riskStatus === 'On track').length;
    const tight = regApps.filter(a => a.riskStatus === 'Tight').length;
    const willMiss = regApps.filter(a => a.riskStatus === 'Will miss at current pace').length;
    const avgHealth = Math.round(
      regApps.length > 0 ? regApps.reduce((s, a) => s + a.complianceHealthScore, 0) / regApps.length : 100
    );

    return {
      region: reg,
      totalCount: regApps.length,
      totalIntake,
      onTrack,
      tight,
      willMiss,
      avgHealth
    };
  });

  const stageCounts: Record<string, number> = {};
  applications.forEach(a => {
    stageCounts[a.currentStage] = (stageCounts[a.currentStage] || 0) + 1;
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ['Region', 'Total Applications', 'Total Intake Seats', 'On Track', 'Tight', 'Will Miss Cutoff', 'Compliance Health'];
    const rows = regionStats.map(r => [
      r.region,
      r.totalCount,
      r.totalIntake,
      r.onTrack,
      r.tight,
      r.willMiss,
      `${r.avgHealth}%`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AICTE_SAMAY_Region_Report_${simulatedDate.split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Sovereign Continuous 4px Tricolour Bar */}
      <div className="tricolour-bar rounded-full" />
      {/* Top Banner */}
      <div className="saas-card-glow p-6 sm:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 bg-white/90 px-3 py-1 rounded-full border border-emerald-900/[0.08] shadow-2xs">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.75} />
              <span className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider">
                Official Consolidated Reporting (FR-F4)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F241C]">
              Cross-Region Analytics & Audit Reports
            </h1>
            <p className="text-xs text-emerald-950/60 max-w-2xl">
              Consolidated pendency, EVC outcomes, undertaking compliance health, and approval velocity across 8 AICTE regional jurisdictions.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCSV}
              className="btn-pill-primary px-4 py-2 text-xs flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="btn-pill-secondary px-4 py-2 text-xs flex items-center space-x-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-700" strokeWidth={1.75} />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Region Table Card */}
      <div className="saas-card overflow-hidden">
        <div className="px-6 py-4 border-b border-emerald-950/[0.06] flex items-center justify-between">
          <span className="text-xs font-bold text-[#0F241C] uppercase tracking-wider">
            Region-Wise Performance & Cutoff Alignment
          </span>
          <span className="text-[11px] text-emerald-800 bg-emerald-50 px-3 py-0.5 rounded-full border border-emerald-200">
            Cutoff Deadline: {calendarConfig.approvalCutoffDate}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-emerald-950/[0.06] text-emerald-950/50 uppercase tracking-wider text-[10px] font-bold bg-white/50">
                <th className="py-3 px-5">Regional Jurisdiction</th>
                <th className="py-3 px-3">Applications</th>
                <th className="py-3 px-3">Intake (Seats)</th>
                <th className="py-3 px-3">On Track</th>
                <th className="py-3 px-3">Tight</th>
                <th className="py-3 px-3">Will Miss</th>
                <th className="py-3 px-5 text-right">Compliance Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-950/[0.04]">
              {regionStats.map((row) => (
                <tr key={row.region} className="table-row-hover">
                  <td className="py-3.5 px-5 font-bold text-emerald-950">
                    {row.region} Regional Office
                  </td>
                  <td className="py-3.5 px-3 font-mono text-emerald-950 font-semibold">
                    {row.totalCount}
                  </td>
                  <td className="py-3.5 px-3 font-mono font-bold text-amber-900">
                    {row.totalIntake.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-emerald-700 font-semibold">
                    {row.onTrack}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-amber-700 font-semibold">
                    {row.tight}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-red-700 font-bold">
                    {row.willMiss}
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <span className="font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {row.avgHealth}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stage Breakdown Grid */}
      <div className="saas-card p-6 space-y-4">
        <h3 className="text-xs font-bold text-[#0F241C] uppercase tracking-wider">
          Stage-Wise Pendency Distribution
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(stageCounts).map(([stage, count]) => (
            <div key={stage} className="p-3.5 bg-yellow-50/20 rounded-2xl border border-emerald-950/[0.06] space-y-1">
              <div className="text-[11px] text-emerald-950/60 font-medium">{stage}</div>
              <div className="text-2xl font-black font-mono text-emerald-950">{count}</div>
              <div className="text-[10px] text-emerald-950/40">
                {Math.round((count / applications.length) * 100)}% of total
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
