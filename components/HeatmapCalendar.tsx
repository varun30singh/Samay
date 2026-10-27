'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import AdvisoryPopover from '@/components/AdvisoryPopover';
import { Calendar, Flame } from 'lucide-react';

export default function HeatmapCalendar() {
  const { applications } = useApp();
  const [hoveredDay, setHoveredDay] = useState<{ day: number; date: string; loadCount: number; events: string[] } | null>(null);

  // Generate 60 days before cutoff (March 1 to April 30, 2026)
  const heatmapDays = Array.from({ length: 61 }, (_, i) => {
    const d = new Date(2026, 2, 1); // March 1, 2026
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];

    const evcScheduled = applications.filter(a => a.evc?.scheduledDate === dateStr).length;
    const leasesExpiring = applications.filter(a => a.documents.some(doc => doc.type === 'Land Lease Deed' && doc.expiryDate === dateStr)).length;
    const safeDatesDue = applications.filter(a => a.latestSafeDateForCurrentStage === dateStr).length;

    const loadCount = evcScheduled * 2 + leasesExpiring * 3 + safeDatesDue;

    const events: string[] = [];
    if (evcScheduled > 0) events.push(`${evcScheduled} EVC Visit(s) Scheduled`);
    if (leasesExpiring > 0) events.push(`${leasesExpiring} Land Lease Expiry Deadline(s)`);
    if (safeDatesDue > 0) events.push(`${safeDatesDue} Latest Safe Date Stage SLA(s)`);

    return {
      day: i + 1,
      date: dateStr,
      loadCount,
      events
    };
  });

  return (
    <div className="saas-card p-6 space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-[#CFE3D3]/60 dark:border-[#2B4478]">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <Flame className="w-4 h-4 text-amber-600 dark:text-[#FF9933]" strokeWidth={1.75} />
            <h3 className="text-sm font-bold text-[#0F241C] dark:text-white tracking-tight">
              Pre-Cutoff Workload & Deadline Heatmap (March – April 2026)
            </h3>
            <AdvisoryPopover
              title="Pre-Cutoff Congestion Heatmap"
              explanation="Visualizes concurrent stage deadlines, committee visits, and document expirations across the 60-day window leading up to 30 April. Green to yellow scale indicates operational intensity."
            />
          </div>
          <p className="text-xs text-emerald-950/60 dark:text-[#B8C5E0]">
            Green to light-yellow intensity scale indicates scheduled EVC inspections, lease expirations, and stage cutoff dates.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-2 text-[10px] text-emerald-950/60 dark:text-[#B8C5E0] font-medium">
          <span>Low</span>
          <div className="flex space-x-1">
            <span className="w-3.5 h-3.5 rounded bg-emerald-100 dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700" />
            <span className="w-3.5 h-3.5 rounded bg-emerald-200 dark:bg-emerald-800 border border-emerald-300 dark:border-emerald-600" />
            <span className="w-3.5 h-3.5 rounded bg-yellow-200 dark:bg-amber-800 border border-yellow-300 dark:border-amber-600" />
            <span className="w-3.5 h-3.5 rounded bg-amber-300 dark:bg-[#FF9933]/80 border border-amber-400 dark:border-[#FF9933]" />
            <span className="w-3.5 h-3.5 rounded bg-amber-400 dark:bg-[#FF9933] border border-amber-500 dark:border-[#FF9933]" />
          </div>
          <span>Peak Congestion</span>
        </div>
      </div>

      {/* Grid of days */}
      <div className="space-y-3">
        <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-15 xl:grid-cols-20 gap-1.5 overflow-x-auto">
          {heatmapDays.map((d) => {
            const intensity = d.loadCount;
            const colorClass =
              intensity === 0
                ? 'bg-emerald-50 dark:bg-[#09162F] hover:bg-emerald-100 dark:hover:bg-[#1A3366] border-emerald-100 dark:border-[#2B4478] text-emerald-800 dark:text-[#B8C5E0]'
                : intensity < 3
                ? 'bg-emerald-200/80 dark:bg-emerald-950 hover:bg-emerald-300 dark:hover:bg-emerald-900 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 font-semibold'
                : intensity < 6
                ? 'bg-yellow-200 dark:bg-amber-950/80 hover:bg-yellow-300 border-yellow-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 font-bold'
                : intensity < 9
                ? 'bg-amber-300 dark:bg-amber-900 hover:bg-amber-400 border-amber-400 dark:border-amber-700 text-amber-950 dark:text-white font-black'
                : 'bg-amber-400 dark:bg-[#FF9933] hover:bg-amber-500 border-amber-500 dark:border-[#FF9933] text-amber-950 dark:text-[#0B1B3A] font-black';

            return (
              <div
                key={d.date}
                onMouseEnter={() => setHoveredDay(d)}
                onMouseLeave={() => setHoveredDay(null)}
                className={`h-9 rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-all duration-150 relative group ${colorClass}`}
              >
                <span className="text-[10px]">{d.day}</span>
                {intensity > 0 && (
                  <span className="w-1 h-1 rounded-full bg-amber-900/40 dark:bg-white/60 mt-0.5" />
                )}
              </div>
            );
          })}
        </div>

        {/* Hover inspection pill */}
        <div className="min-h-[44px] p-2.5 rounded-2xl bg-yellow-50/40 dark:bg-[#09162F] border border-yellow-200/60 dark:border-[#2B4478] flex items-center justify-between text-xs">
          {hoveredDay ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-2">
              <div className="flex items-center space-x-2">
                <Calendar className="w-3.5 h-3.5 text-amber-700 dark:text-[#FF9933]" strokeWidth={1.75} />
                <span className="font-bold text-emerald-950 dark:text-white">{hoveredDay.date} (Day {hoveredDay.day} of 60)</span>
                <span className="font-mono text-[10px] px-2 py-0.2 rounded-full bg-yellow-200/80 dark:bg-[#1A3366] text-amber-950 dark:text-[#FF9933] font-bold">
                  {hoveredDay.loadCount > 0 ? `${hoveredDay.loadCount} Congestion Index` : 'Clear Schedule'}
                </span>
              </div>
              <div className="text-[11px] text-emerald-950/70 dark:text-[#CBD5E1]">
                {hoveredDay.events.length > 0 ? hoveredDay.events.join(' · ') : 'No regulatory deadlines scheduled on this date'}
              </div>
            </div>
          ) : (
            <span className="text-emerald-950/40 dark:text-[#B8C5E0]/60 text-[11px] italic">
              Hover over any calendar day to inspect concurrent stage deadlines, inspections, and lease expirations.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
