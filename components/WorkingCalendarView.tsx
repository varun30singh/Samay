'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Calendar, Plus, Trash2, Save, CheckCircle2, AlertCircle, Info, Clock, ShieldCheck } from 'lucide-react';

export default function WorkingCalendarView() {
  const { workingCalendar, updateWorkingCalendar, addHoliday, removeHoliday, dbStatus } = useApp();

  const [weeklySunday, setWeeklySunday] = useState(workingCalendar.weeklyOffSunday);
  const [weeklySecondFourthSat, setWeeklySecondFourthSat] = useState(workingCalendar.weeklyOffSecondFourthSaturday);
  const [weeklyAllSat, setWeeklyAllSat] = useState(workingCalendar.weeklyOffAllSaturdays);

  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayDate || !newHolidayName.trim()) {
      setErrorMsg('Please specify both the holiday date and official holiday name.');
      return;
    }
    setErrorMsg('');
    addHoliday({ date: newHolidayDate, name: newHolidayName.trim() });
    setNewHolidayDate('');
    setNewHolidayName('');
    setSaveSuccessMsg(`Added holiday "${newHolidayName.trim()}" on ${newHolidayDate}.`);
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  const handleSaveWeekSettings = () => {
    updateWorkingCalendar(
      {
        weeklyOffSunday: weeklySunday,
        weeklyOffSecondFourthSaturday: weeklySecondFourthSat,
        weeklyOffAllSaturdays: weeklyAllSat
      },
      `Admin adjusted statutory weekly off-days: Sunday=${weeklySunday}, 2nd/4th Sat=${weeklySecondFourthSat}, All Sat=${weeklyAllSat}`
    );
    setSaveSuccessMsg(`Weekly off-day rules saved successfully. Version advanced.`);
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  return (
    <div className="flex flex-col w-full gap-5 animate-fade-in pb-12">
      {/* Sovereign Indian Tricolour Top Accent Ribbon */}
      <div className="tricolour-bar rounded-full" />

      {/* Breadcrumb & Screen Title Section */}
      <section className="flex flex-col gap-2 bg-surface-container-lowest dark:bg-[#12264D] rounded-xl p-4 sm:p-5 shadow-sm border border-[#CFE3D3]/60 dark:border-[#2B4478]">
        <nav aria-label="Official Breadcrumb" className="flex items-center gap-1.5 text-on-surface-variant dark:text-[#B8C5E0] text-xs font-semibold flex-wrap">
          <span className="flex items-center gap-1 text-primary dark:text-[#FF9933] font-bold">
            <Calendar className="w-3.5 h-3.5" />
            <span>SAMAY</span>
          </span>
          <span>›</span>
          <span>Statutory Configuration</span>
          <span>›</span>
          <span className="text-on-surface dark:text-white font-bold">Working-Days Calendar</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-1">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-on-surface dark:text-white tracking-tight">
              Working-Days Calendar Configuration
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant dark:text-[#CBD5E1] mt-1 max-w-3xl">
              Configures statutory AICTE working days, weekend rules, and gazetted national holidays used by Deadline Guard backwards calculation.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 bg-surface-container dark:bg-[#09162F] px-3.5 py-2 rounded-xl border border-[#CFE3D3] dark:border-[#2B4478] shrink-0">
              <span className={`w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : dbStatus === 'connecting' ? 'bg-amber-500' : 'bg-red-500'}`} />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-[#B8C5E0]">
                  Database
                </span>
                <span className="text-xs font-mono font-bold text-primary dark:text-[#FF9933]">
                  {dbStatus === 'connected' ? 'Supabase PG' : dbStatus === 'connecting' ? 'Connecting...' : 'Local Cache'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-surface-container dark:bg-[#09162F] px-3.5 py-2 rounded-xl border border-[#CFE3D3] dark:border-[#2B4478] shrink-0">
              <ShieldCheck className="w-4 h-4 text-primary dark:text-[#FF9933]" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-[#B8C5E0]">
                  Active Config Version
                </span>
                <span className="text-xs font-mono font-bold text-primary dark:text-[#FF9933]">
                  {workingCalendar.version}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Success / Error Banners */}
      {saveSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-700 text-red-900 dark:text-red-200 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid: Off-Days Setting & Add Holiday */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Weekly Off Configuration */}
        <section className="bg-surface-container-lowest dark:bg-[#12264D] rounded-xl p-5 shadow-sm border border-[#CFE3D3] dark:border-[#2B4478] flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-[#CFE3D3]/60 dark:border-[#2B4478] pb-2.5">
              <Clock className="w-4 h-4 text-primary dark:text-[#FF9933]" />
              <h2 className="text-sm font-bold text-on-surface dark:text-white">
                Statutory Weekly Off Rules
              </h2>
            </div>
            <p className="text-xs text-on-surface-variant dark:text-[#CBD5E1]">
              Select which days are non-working for AICTE scrutinies. Deadline Guard automatically excludes these from SLA calculations.
            </p>

            <div className="space-y-3 pt-2">
              <label className="flex items-center justify-between p-3 rounded-lg bg-surface-container dark:bg-[#09162F] border border-[#CFE3D3] dark:border-[#2B4478] cursor-pointer min-h-[44px]">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-on-surface dark:text-white">Every Sunday (Default)</span>
                  <span className="text-[11px] text-on-surface-variant dark:text-[#B8C5E0]">Statutory national rest day</span>
                </div>
                <input
                  type="checkbox"
                  checked={weeklySunday}
                  onChange={(e) => setWeeklySunday(e.target.checked)}
                  className="w-5 h-5 accent-emerald-600 dark:accent-[#FF9933] rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg bg-surface-container dark:bg-[#09162F] border border-[#CFE3D3] dark:border-[#2B4478] cursor-pointer min-h-[44px]">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-on-surface dark:text-white">2nd & 4th Saturdays (Optional)</span>
                  <span className="text-[11px] text-on-surface-variant dark:text-[#B8C5E0]">Central Govt / AICTE office rule</span>
                </div>
                <input
                  type="checkbox"
                  checked={weeklySecondFourthSat}
                  onChange={(e) => setWeeklySecondFourthSat(e.target.checked)}
                  className="w-5 h-5 accent-emerald-600 dark:accent-[#FF9933] rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg bg-surface-container dark:bg-[#09162F] border border-[#CFE3D3] dark:border-[#2B4478] cursor-pointer min-h-[44px]">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-on-surface dark:text-white">All Saturdays Off (5-Day Week)</span>
                  <span className="text-[11px] text-on-surface-variant dark:text-[#B8C5E0]">Applies to specific bureau desks</span>
                </div>
                <input
                  type="checkbox"
                  checked={weeklyAllSat}
                  onChange={(e) => setWeeklyAllSat(e.target.checked)}
                  className="w-5 h-5 accent-emerald-600 dark:accent-[#FF9933] rounded cursor-pointer"
                />
              </label>
            </div>
          </div>

          <button
            onClick={handleSaveWeekSettings}
            className="w-full min-h-[44px] px-4 py-2.5 rounded-lg bg-primary dark:bg-[#FF9933] text-on-primary dark:text-[#0B1B3A] font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>Save Weekly Off Rules</span>
          </button>
        </section>

        {/* Add Holiday Form */}
        <section className="lg:col-span-2 bg-surface-container-lowest dark:bg-[#12264D] rounded-xl p-5 shadow-sm border border-[#CFE3D3] dark:border-[#2B4478] flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-[#CFE3D3]/60 dark:border-[#2B4478] pb-2.5">
              <Plus className="w-4 h-4 text-primary dark:text-[#FF9933]" />
              <h2 className="text-sm font-bold text-on-surface dark:text-white">
                Add Gazetted Holiday
              </h2>
            </div>
            <p className="text-xs text-on-surface-variant dark:text-[#CBD5E1]">
              Add national or gazetted public holidays for the 2026-2027 academic approval cycle. All updates append a cryptographically hashed audit entry.
            </p>

            <form onSubmit={handleAddHoliday} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-[#B8C5E0]">
                  Holiday Date (YYYY-MM-DD)
                </label>
                <input
                  type="date"
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                  className="min-h-[44px] px-3 rounded-lg bg-surface-container dark:bg-[#09162F] text-xs font-semibold text-on-surface dark:text-white border border-[#CFE3D3] dark:border-[#2B4478] focus:outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-[#B8C5E0]">
                  Official Holiday Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mahavir Jayanti"
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                  className="min-h-[44px] px-3 rounded-lg bg-surface-container dark:bg-[#09162F] text-xs font-semibold text-on-surface dark:text-white border border-[#CFE3D3] dark:border-[#2B4478] focus:outline-none"
                  required
                />
              </div>

              <div className="sm:col-span-2 pt-1">
                <button
                  type="submit"
                  className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-lg bg-primary dark:bg-[#FF9933] text-on-primary dark:text-[#0B1B3A] font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Gazetted Holiday & Update Version</span>
                </button>
              </div>
            </form>
          </div>

          <div className="p-3 bg-surface-container-low dark:bg-[#09162F] rounded-lg border border-[#CFE3D3]/60 dark:border-[#2B4478] flex items-center gap-2 text-xs text-on-surface-variant dark:text-[#B8C5E0]">
            <Info className="w-4 h-4 text-primary dark:text-[#FF9933] shrink-0" />
            <span>
              Last modified on {new Date(workingCalendar.lastUpdated).toLocaleDateString('en-IN')} by {workingCalendar.updatedBy}.
            </span>
          </div>
        </section>
      </div>

      {/* Holidays List Table */}
      <section className="bg-surface-container-lowest dark:bg-[#12264D] rounded-xl p-5 shadow-sm border border-[#CFE3D3] dark:border-[#2B4478]">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#CFE3D3]/60 dark:border-[#2B4478]">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary dark:text-[#FF9933]" />
            <h2 className="text-sm font-bold text-on-surface dark:text-white">
              Configured Gazetted Holidays ({workingCalendar.holidays.length})
            </h2>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded bg-surface-container dark:bg-[#09162F] text-primary dark:text-[#FF9933] border border-[#CFE3D3] dark:border-[#2B4478]">
            Academic Year {workingCalendar.academicYear}
          </span>
        </div>

        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#CFE3D3] dark:border-[#2B4478] text-on-surface-variant dark:text-[#B8C5E0] uppercase tracking-wider text-[10px] font-bold">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Day of Week</th>
                <th className="py-2.5 px-3">Holiday Name</th>
                <th className="py-2.5 px-3">Impact on Deadline Guard</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CFE3D3]/50 dark:divide-[#2B4478]">
              {workingCalendar.holidays.map((h) => {
                const dayName = new Date(h.date).toLocaleDateString('en-IN', { weekday: 'long' });
                return (
                  <tr key={h.date} className="hover:bg-surface-container-low dark:hover:bg-[#1A3366] transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-primary dark:text-[#FF9933]">
                      {h.date}
                    </td>
                    <td className="py-3 px-3 text-on-surface dark:text-white font-medium">
                      {dayName}
                    </td>
                    <td className="py-3 px-3 text-on-surface dark:text-white font-semibold">
                      {h.name}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-surface-container dark:bg-[#09162F] text-on-surface-variant dark:text-[#CBD5E1]">
                        Non-working statutory day
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => removeHoliday(h.date)}
                        className="min-h-[36px] px-2.5 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors"
                        title="Remove Holiday"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
