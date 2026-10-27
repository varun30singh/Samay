'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Application } from '@/lib/types';
import {
  AlertTriangle,
  Scan
} from 'lucide-react';

interface LeaseRadarViewProps {
  onOpenOCR: (app: Application) => void;
  onSelectApplication: (app: Application) => void;
}

export default function LeaseRadarView({ onOpenOCR, onSelectApplication }: LeaseRadarViewProps) {
  const { applications, currentRegion, calendarConfig } = useApp();

  const [filterType, setFilterType] = useState<'ALL' | 'CRITICAL' | 'VALID'>('ALL');

  const cutoffDate = new Date(calendarConfig.approvalCutoffDate);

  // Filter institutions with lease deeds
  const leaseApps = applications.filter((app) => {
    if (currentRegion !== 'All' && app.region !== currentRegion) return false;
    const lease = app.documents.find(d => d.type === 'Land Lease Deed');
    if (!lease) return false;

    if (filterType === 'CRITICAL') {
      return new Date(lease.expiryDate) <= cutoffDate || lease.remainingDays < 180;
    }
    if (filterType === 'VALID') {
      return new Date(lease.expiryDate) > cutoffDate && lease.remainingDays >= 180;
    }
    return true;
  });

  const criticalCount = applications.filter(a => {
    const l = a.documents.find(d => d.type === 'Land Lease Deed');
    return l && (new Date(l.expiryDate) <= cutoffDate || l.remainingDays < 180);
  }).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Sovereign Continuous 4px Tricolour Bar */}
      <div className="tricolour-bar rounded-full" />
      {/* Top Banner */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="text-xl font-bold text-slate-900">
                Land Lease Radar & Document Validity (FR-E1 to FR-E5)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Monitors registered land lease deeds. Flags institutions whose leases expire before the academic year approval cutoff.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterType === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Leases ({applications.length})
            </button>
            <button
              onClick={() => setFilterType('CRITICAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                filterType === 'CRITICAL'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-red-50 text-red-800 border border-red-200 hover:bg-red-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Critical / Expiring ({criticalCount})</span>
            </button>
            <button
              onClick={() => setFilterType('VALID')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterType === 'VALID'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              Healthy Leases
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Lease Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {leaseApps.map((app) => {
          const lease = app.documents.find(d => d.type === 'Land Lease Deed');
          const isCritical = lease && (new Date(lease.expiryDate) <= cutoffDate || lease.remainingDays < 180);

          return (
            <div
              key={app.id}
              className={`bg-white rounded-xl p-4 border transition-all hover:shadow-md ${
                isCritical
                  ? 'border-red-300 ring-1 ring-red-200 bg-red-50/20'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-xs line-clamp-1">{app.institutionName}</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {app.region} Region · {app.approvedIntake} Intake
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                  isCritical
                    ? 'bg-red-100 text-red-800 border border-red-300'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}>
                  {isCritical ? 'Cutoff Threat' : 'Valid'}
                </span>
              </div>

              {/* Document details box */}
              <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Tracked Expiry:</span>
                  <span className={`font-mono font-bold ${isCritical ? 'text-red-700' : 'text-slate-900'}`}>
                    {lease?.expiryDate}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Days Remaining:</span>
                  <span className={`font-mono font-bold ${lease && lease.remainingDays < 90 ? 'text-red-600' : 'text-slate-700'}`}>
                    {lease?.remainingDays} days
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>Source:</span>
                  <span className="font-medium text-slate-700">{lease?.expirySource}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => onSelectApplication(app)}
                  className="text-slate-600 hover:text-slate-900 font-semibold text-[11px]"
                >
                  View Case
                </button>

                <button
                  onClick={() => onOpenOCR(app)}
                  className={`px-2.5 py-1 rounded font-bold text-xs flex items-center gap-1 shadow-2xs ${
                    isCritical
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <Scan className="w-3.5 h-3.5" />
                  <span>OCR Extractor</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
