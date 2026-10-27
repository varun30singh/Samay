'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  APPLICATION_CSV_TEMPLATE,
  INSTITUTION_CSV_TEMPLATE,
  LEASE_CSV_TEMPLATE,
  UNDERTAKING_CSV_TEMPLATE,
  CsvAdapter,
  RowError
} from '@/lib/dataAdapters';
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  Database
} from 'lucide-react';

export default function DataImportView() {
  const { importApplicationsFromCsv, dataQualityMetrics } = useApp();

  const [csvContent, setCsvContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);

  // Validation state
  const [validationErrors, setValidationErrors] = useState<RowError[]>([]);
  const [validRowCount, setValidRowCount] = useState<number | null>(null);
  const [totalRowCount, setTotalRowCount] = useState<number | null>(null);
  const [errorReportCsv, setErrorReportCsv] = useState<string | null>(null);

  // Status message
  const [statusMsg, setStatusMsg] = useState('');
  const [errorBanner, setErrorBanner] = useState('');

  // Handle template download
  const handleDownloadTemplate = (type: 'applications' | 'institutions' | 'leases' | 'undertakings') => {
    let content = APPLICATION_CSV_TEMPLATE;
    let name = 'AICTE_Applications_Template.csv';
    if (type === 'institutions') {
      content = INSTITUTION_CSV_TEMPLATE;
      name = 'AICTE_Institutions_Template.csv';
    } else if (type === 'leases') {
      content = LEASE_CSV_TEMPLATE;
      name = 'AICTE_LeaseDeeds_Template.csv';
    } else if (type === 'undertakings') {
      content = UNDERTAKING_CSV_TEMPLATE;
      name = 'AICTE_Undertakings_Template.csv';
    }

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', name);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorBanner('');
    setStatusMsg('');
    setFileName(file.name);
    setFileSize(file.size);

    const adapter = new CsvAdapter();
    const metaCheck = adapter.validateFileMeta(file.name, file.size);
    if (!metaCheck.valid) {
      setErrorBanner(metaCheck.error || 'Invalid file.');
      setCsvContent('');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = (evt.target?.result as string) || '';
      setCsvContent(text);
      runPreValidation(text);
    };
    reader.readAsText(file);
  };

  // Run initial validation check
  const runPreValidation = async (content: string, name?: string) => {
    if (name) setFileName(name);
    setValidationErrors([]);
    setValidRowCount(null);
    setTotalRowCount(null);
    setErrorReportCsv(null);

    try {
      const adapter = new CsvAdapter();
      const res = await adapter.importApplications(content);
      setTotalRowCount(res.totalRows);
      setValidRowCount(res.validCount);
      setValidationErrors(res.errors);

      if (res.errors.length > 0) {
        const errorCsv = 'Row Number,Record Identifier,Failed Field,Rejection Reason\n' +
          res.errors.map(err => `${err.rowNumber},"${err.recordIdentifier}","${err.field}","${err.reason.replace(/"/g, '""')}"`).join('\n');
        setErrorReportCsv(errorCsv);
      }
    } catch (err: unknown) {
      setErrorBanner('Validation failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Confirm and insert valid records into live register
  const handleConfirmImport = async () => {
    if (!csvContent || !fileName) return;

    const res = await importApplicationsFromCsv(csvContent, fileName);
    if (res.success || res.validCount > 0) {
      setStatusMsg(
        `Import confirmed: ${res.validCount} valid dossiers successfully ingested into live AICTE register. ${res.invalidCount} invalid rows flagged in error audit.`
      );
      // Reset form
      setCsvContent('');
      setFileName('');
      setFileSize(0);
      setValidationErrors([]);
      setValidRowCount(null);
      setTotalRowCount(null);
    } else {
      setErrorBanner(`Failed to import batch: all ${res.totalRows} rows were invalid.`);
    }
  };

  const handleDownloadErrorReport = () => {
    if (!errorReportCsv) return;
    const blob = new Blob([errorReportCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Import_Errors_${fileName || 'Report'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Load sample data button for instant live testing
  const handleLoadSampleData = () => {
    const sample = APPLICATION_CSV_TEMPLATE;
    setFileName('AICTE_Bulk_Applications_Sample.csv');
    setFileSize(new Blob([sample]).size);
    setCsvContent(sample);
    runPreValidation(sample, 'AICTE_Bulk_Applications_Sample.csv');
  };

  return (
    <div className="flex flex-col w-full gap-5 animate-fade-in pb-12">
      {/* Sovereign Indian Tricolour Top Accent Ribbon */}
      <div className="tricolour-bar rounded-full" />

      {/* Screen Title & Breadcrumbs */}
      <section className="flex flex-col gap-2 bg-surface-container-lowest dark:bg-[#12264D] rounded-xl p-4 sm:p-5 shadow-sm border border-[#CFE3D3]/60 dark:border-[#2B4478]">
        <nav aria-label="Official Breadcrumb" className="flex items-center gap-1.5 text-on-surface-variant dark:text-[#B8C5E0] text-xs font-semibold flex-wrap">
          <span className="flex items-center gap-1 text-primary dark:text-[#FF9933] font-bold">
            <Upload className="w-3.5 h-3.5" />
            <span>SAMAY</span>
          </span>
          <span>›</span>
          <span>System Administration</span>
          <span>›</span>
          <span className="text-on-surface dark:text-white font-bold">CSV Bulk Import & Data Ingestion</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-1">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-on-surface dark:text-white tracking-tight">
              Statutory CSV Data Import & Integration Adapter
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant dark:text-[#CBD5E1] mt-1 max-w-3xl">
              Bulk import institutions, applications, lease deeds, and undertakings. Valid rows import directly; invalid rows generate downloadable error reports with full audit accountability.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-surface-container dark:bg-[#09162F] px-3.5 py-2 rounded-xl border border-[#CFE3D3] dark:border-[#2B4478] shrink-0">
            <Database className="w-4 h-4 text-primary dark:text-[#FF9933]" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-[#B8C5E0]">
                Ingestion Adapter
              </span>
              <span className="text-xs font-mono font-bold text-primary dark:text-[#FF9933]">
                CsvAdapter (Active)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Status Notifications */}
      {statusMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}
      {errorBanner && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-700 text-red-900 dark:text-red-200 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* Data Quality Panel (Statutory Requirement) */}
      <section className="bg-surface-container-lowest dark:bg-[#12264D] rounded-xl p-5 shadow-sm border border-[#CFE3D3] dark:border-[#2B4478]">
        <div className="flex items-center justify-between pb-3 border-b border-[#CFE3D3]/60 dark:border-[#2B4478] mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-[#FF9933]" />
            <h2 className="text-sm font-bold text-on-surface dark:text-white">
              Data-Quality Audit Panel (Current Incomplete Records)
            </h2>
          </div>
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            Status: Data incomplete (No guessed risk)
          </span>
        </div>

        <p className="text-xs text-on-surface-variant dark:text-[#CBD5E1] mb-4">
          Statutory rule: If required fields (e.g. approved intake, registered lease expiry) are missing, Deadline Guard flags records as &quot;Data incomplete&quot; rather than guessing speculative risk statuses.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-surface-container dark:bg-[#09162F] border border-[#CFE3D3] dark:border-[#2B4478]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-[#B8C5E0]">
              Missing Intake Counts
            </span>
            <div className="text-xl font-black text-on-surface dark:text-white mt-1">
              {dataQualityMetrics.missingIntakeCount}
            </div>
            <span className="text-[10px] text-on-surface-variant dark:text-[#B8C5E0]">Seat capacity = 0</span>
          </div>

          <div className="p-3 rounded-lg bg-surface-container dark:bg-[#09162F] border border-[#CFE3D3] dark:border-[#2B4478]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-[#B8C5E0]">
              Missing Lease Dates
            </span>
            <div className="text-xl font-black text-amber-600 dark:text-[#FF9933] mt-1">
              {dataQualityMetrics.missingLeaseDateCount}
            </div>
            <span className="text-[10px] text-on-surface-variant dark:text-[#B8C5E0]">Deed date unrecorded</span>
          </div>

          <div className="p-3 rounded-lg bg-surface-container dark:bg-[#09162F] border border-[#CFE3D3] dark:border-[#2B4478]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-[#B8C5E0]">
              Invalid Date Formats
            </span>
            <div className="text-xl font-black text-red-600 dark:text-red-400 mt-1">
              {dataQualityMetrics.invalidDatesCount}
            </div>
            <span className="text-[10px] text-on-surface-variant dark:text-[#B8C5E0]">Non-ISO syntax</span>
          </div>

          <div className="p-3 rounded-lg bg-surface-container dark:bg-[#09162F] border border-[#CFE3D3] dark:border-[#2B4478]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-[#B8C5E0]">
              Total Incomplete Dossiers
            </span>
            <div className="text-xl font-black text-primary dark:text-[#FF9933] mt-1">
              {dataQualityMetrics.dataIncompleteCount}
            </div>
            <span className="text-[10px] text-on-surface-variant dark:text-[#B8C5E0]">Needs remediation</span>
          </div>
        </div>
      </section>

      {/* Downloadable CSV Templates Section */}
      <section className="bg-surface-container-lowest dark:bg-[#12264D] rounded-xl p-5 shadow-sm border border-[#CFE3D3] dark:border-[#2B4478]">
        <div className="flex items-center gap-2 pb-3 border-b border-[#CFE3D3]/60 dark:border-[#2B4478] mb-3">
          <Download className="w-4 h-4 text-primary dark:text-[#FF9933]" />
          <h2 className="text-sm font-bold text-on-surface dark:text-white">
            Download Official Statutory CSV Templates
          </h2>
        </div>

        <p className="text-xs text-on-surface-variant dark:text-[#CBD5E1] mb-3">
          Download standardized government schemas with verified headers and example test rows.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => handleDownloadTemplate('applications')}
            className="min-h-[44px] px-3.5 py-2 rounded-lg bg-surface-container dark:bg-[#09162F] hover:bg-surface-container-high text-on-surface dark:text-white font-bold text-xs flex items-center justify-between border border-[#CFE3D3] dark:border-[#2B4478] transition-all"
          >
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-primary dark:text-[#FF9933]" />
              <span>Applications CSV</span>
            </div>
            <Download className="w-3.5 h-3.5 text-on-surface-variant" />
          </button>

          <button
            onClick={() => handleDownloadTemplate('institutions')}
            className="min-h-[44px] px-3.5 py-2 rounded-lg bg-surface-container dark:bg-[#09162F] hover:bg-surface-container-high text-on-surface dark:text-white font-bold text-xs flex items-center justify-between border border-[#CFE3D3] dark:border-[#2B4478] transition-all"
          >
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-primary dark:text-[#FF9933]" />
              <span>Institutions CSV</span>
            </div>
            <Download className="w-3.5 h-3.5 text-on-surface-variant" />
          </button>

          <button
            onClick={() => handleDownloadTemplate('leases')}
            className="min-h-[44px] px-3.5 py-2 rounded-lg bg-surface-container dark:bg-[#09162F] hover:bg-surface-container-high text-on-surface dark:text-white font-bold text-xs flex items-center justify-between border border-[#CFE3D3] dark:border-[#2B4478] transition-all"
          >
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-primary dark:text-[#FF9933]" />
              <span>Lease Deeds CSV</span>
            </div>
            <Download className="w-3.5 h-3.5 text-on-surface-variant" />
          </button>

          <button
            onClick={() => handleDownloadTemplate('undertakings')}
            className="min-h-[44px] px-3.5 py-2 rounded-lg bg-surface-container dark:bg-[#09162F] hover:bg-surface-container-high text-on-surface dark:text-white font-bold text-xs flex items-center justify-between border border-[#CFE3D3] dark:border-[#2B4478] transition-all"
          >
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-primary dark:text-[#FF9933]" />
              <span>Undertakings CSV</span>
            </div>
            <Download className="w-3.5 h-3.5 text-on-surface-variant" />
          </button>
        </div>
      </section>

      {/* Ingestion Flow: Upload -> Validate -> Confirm */}
      <section className="bg-surface-container-lowest dark:bg-[#12264D] rounded-xl p-5 shadow-sm border border-[#CFE3D3] dark:border-[#2B4478] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#CFE3D3]/60 dark:border-[#2B4478]">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary dark:text-[#FF9933]" />
            <h2 className="text-sm font-bold text-on-surface dark:text-white">
              Data Ingestion Flow (Upload → Validate → Confirm)
            </h2>
          </div>
          <button
            onClick={handleLoadSampleData}
            className="text-xs font-bold text-primary dark:text-[#FF9933] hover:underline"
          >
            Load Sample CSV Batch
          </button>
        </div>

        {/* Step 1: Upload Dropzone */}
        <div className="p-6 border-2 border-dashed border-[#CFE3D3] dark:border-[#2B4478] rounded-xl flex flex-col items-center justify-center gap-3 bg-surface-container-low dark:bg-[#09162F]/50">
          <Upload className="w-8 h-8 text-primary dark:text-[#FF9933]" />
          <div className="text-center">
            <span className="text-xs font-bold text-on-surface dark:text-white">
              Select or Drop AICTE CSV File
            </span>
            <p className="text-[11px] text-on-surface-variant dark:text-[#B8C5E0] mt-0.5">
              Maximum file size: 5 MB · Format: .csv only
            </p>
          </div>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-primary file:text-on-primary dark:file:bg-[#FF9933] dark:file:text-[#0B1B3A] cursor-pointer"
          />
        </div>

        {/* Step 2: Validation Results */}
        {totalRowCount !== null && (
          <div className="p-4 rounded-xl bg-surface-container dark:bg-[#09162F] border border-[#CFE3D3] dark:border-[#2B4478] space-y-3 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-on-surface dark:text-white">
                  Batch Validation Report: {fileName} ({(fileSize / 1024).toFixed(1)} KB)
                </h3>
                <p className="text-xs text-on-surface-variant dark:text-[#CBD5E1] mt-0.5">
                  Analyzed {totalRowCount} rows: {validRowCount} Valid rows, {validationErrors.length} Invalid rows.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {errorReportCsv && (
                  <button
                    onClick={handleDownloadErrorReport}
                    className="min-h-[44px] px-3.5 py-1.5 rounded-lg bg-surface-container-high dark:bg-[#12264D] hover:bg-surface-container text-red-600 dark:text-red-400 font-bold text-xs flex items-center gap-1.5 border border-red-300 dark:border-red-700"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Error Report CSV</span>
                  </button>
                )}

                <button
                  onClick={handleConfirmImport}
                  disabled={validRowCount === 0}
                  className={`min-h-[44px] px-5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs ${
                    validRowCount && validRowCount > 0
                      ? 'bg-primary dark:bg-[#FF9933] text-on-primary dark:text-[#0B1B3A] hover:opacity-90'
                      : 'bg-surface-container-high text-on-surface-variant/40 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Ingest {validRowCount || 0} Valid Rows</span>
                </button>
              </div>
            </div>

            {/* Row Errors Table */}
            {validationErrors.length > 0 && (
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 uppercase tracking-wider text-[10px] font-bold">
                      <th className="py-2 px-3">Row #</th>
                      <th className="py-2 px-3">Identifier</th>
                      <th className="py-2 px-3">Failed Field</th>
                      <th className="py-2 px-3">Statutory Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100 dark:divide-red-900/40">
                    {validationErrors.map((err, idx) => (
                      <tr key={idx} className="bg-red-50/50 dark:bg-red-950/20">
                        <td className="py-2 px-3 font-mono font-bold text-red-600 dark:text-red-400">
                          {err.rowNumber}
                        </td>
                        <td className="py-2 px-3 font-semibold text-on-surface dark:text-white">
                          {err.recordIdentifier}
                        </td>
                        <td className="py-2 px-3 font-mono text-red-600 dark:text-red-300">
                          {err.field}
                        </td>
                        <td className="py-2 px-3 text-red-700 dark:text-red-300">
                          {err.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Integration Adapter Architecture Note */}
      <section className="p-4 rounded-xl bg-surface-container-low dark:bg-[#09162F] border border-[#CFE3D3]/60 dark:border-[#2B4478] flex items-start gap-3 text-xs text-on-surface-variant dark:text-[#B8C5E0]">
        <Info className="w-4 h-4 text-primary dark:text-[#FF9933] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-on-surface dark:text-white">
            Architecture: AICTE Data Adapter Abstraction
          </span>
          <p className="leading-relaxed">
            The platform uses a unified <code className="px-1 py-0.5 rounded bg-surface-container dark:bg-[#12264D] text-primary dark:text-[#FF9933]">AicteDataAdapter</code> interface with two interchangeable implementations: <code className="px-1 py-0.5 rounded bg-surface-container dark:bg-[#12264D]">CsvAdapter</code> (active for batch bulk loads) and <code className="px-1 py-0.5 rounded bg-surface-container dark:bg-[#12264D]">MockAicteApiAdapter</code> (extensible stub for future national API webhook synchronization). In accordance with statutory security rules, file content is never stored in plaintext audit entries.
          </p>
        </div>
      </section>
    </div>
  );
}
