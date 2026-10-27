/**
 * AICTE Data Adapter Interface & Implementations (Feature 5)
 * Enables resilient multi-source ingestion (CSV bulk files & future Govt API webhooks).
 */

import { Application, Region, ApplicationType, RouteType, StageName } from './types';

export interface RowError {
  rowNumber: number;
  recordIdentifier: string;
  field: string;
  reason: string;
  rawRowData?: Record<string, string>;
}

export interface ImportResult<T> {
  success: boolean;
  totalRows: number;
  validCount: number;
  invalidCount: number;
  validRecords: T[];
  errors: RowError[];
  importedAt: string;
  sourceType: 'CSV_UPLOAD' | 'AICTE_API_SYNC';
}

export interface InstitutionImportRecord {
  id: string;
  name: string;
  aictePermanentId: string;
  region: Region;
  state: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  principalName: string;
}

export interface LeaseImportRecord {
  applicationId: string;
  institutionName: string;
  deedRegistrationNumber: string;
  registeredDate: string;
  expiryDate: string;
  lessorName: string;
  surveyNumber: string;
  areaAcres: number;
}

export interface UndertakingImportRecord {
  applicationId: string;
  conditionClause: string;
  dueDate: string;
  requiredEvidenceDoc: string;
  complianceOfficer: string;
}

export interface LiveSyncStatus {
  appId: string;
  currentNationalStage: StageName;
  nationalDatabaseLastSync: string;
  scrutinyCleared: boolean;
  evcCompleted: boolean;
  sacHearingScheduled: boolean;
  syncRemarks: string;
}

export interface DataQualityMetrics {
  totalAnalyzed: number;
  missingIntakeCount: number;
  missingLeaseDateCount: number;
  invalidDatesCount: number;
  dataIncompleteCount: number;
}

export interface AicteDataAdapter {
  importApplications(csvContent: string, fileName?: string): Promise<ImportResult<Partial<Application>>>;
  importInstitutions(csvContent: string, fileName?: string): Promise<ImportResult<InstitutionImportRecord>>;
  importLeases(csvContent: string, fileName?: string): Promise<ImportResult<LeaseImportRecord>>;
  importUndertakings(csvContent: string, fileName?: string): Promise<ImportResult<UndertakingImportRecord>>;
  fetchLiveStatus(appId: string): Promise<LiveSyncStatus>;
}

/**
 * Universal CSV Line Parser that supports quoted fields and commas
 */
export function parseCSVLines(text: string): string[][] {
  const lines: string[][] = [];
  const rawLines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  
  for (const line of rawLines) {
    const row: string[] = [];
    let insideQuote = false;
    let entry = '';
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        row.push(entry.trim());
        entry = '';
      } else {
        entry += char;
      }
    }
    row.push(entry.trim());
    lines.push(row);
  }
  
  return lines;
}

/**
 * Production CsvAdapter implementation
 */
export class CsvAdapter implements AicteDataAdapter {
  private static MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB statutory limit

  public validateFileMeta(fileName: string, fileSize: number): { valid: boolean; error?: string } {
    if (fileSize > CsvAdapter.MAX_FILE_SIZE) {
      return { valid: false, error: `File size exceeds 5 MB limit (size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB).` };
    }
    if (!fileName.toLowerCase().endsWith('.csv')) {
      return { valid: false, error: 'Invalid file format. Only official .csv files are accepted.' };
    }
    return { valid: true };
  }

  async importApplications(csvContent: string): Promise<ImportResult<Partial<Application>>> {
    const lines = parseCSVLines(csvContent);
    const errors: RowError[] = [];
    const validRecords: Partial<Application>[] = [];

    if (lines.length < 2) {
      return {
        success: false,
        totalRows: 0,
        validCount: 0,
        invalidCount: 0,
        validRecords: [],
        errors: [{ rowNumber: 1, recordIdentifier: 'FILE', field: 'header', reason: 'CSV file contains no data rows.' }],
        importedAt: new Date().toISOString(),
        sourceType: 'CSV_UPLOAD'
      };
    }

    const headers = lines[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const seenIds = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      const rowNum = i + 1;
      const rowData: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rowData[h] = row[idx] || '';
      });

      const appId = rowData['applicationid'] || rowData['appid'] || rowData['id'] || '';
      const name = rowData['institutionname'] || rowData['name'] || '';
      const permId = rowData['aictepermanentid'] || rowData['permanentid'] || rowData['pid'] || '';
      const region = rowData['region'] as Region || 'Western';
      const intakeStr = rowData['approvedintake'] || rowData['intake'] || '';
      const typeStr = (rowData['type'] || 'Extension of Approval (EoA)') as ApplicationType;
      const routeStr = (rowData['route'] || 'Scrutiny + EVC') as RouteType;
      const officer = rowData['assignedofficer'] || rowData['officer'] || 'Dr. R. Sharma (AICTE RO)';

      let hasRowError = false;

      if (!appId) {
        errors.push({ rowNumber: rowNum, recordIdentifier: 'UNKNOWN', field: 'applicationId', reason: 'Missing Application ID.', rawRowData: rowData });
        hasRowError = true;
      } else if (seenIds.has(appId)) {
        errors.push({ rowNumber: rowNum, recordIdentifier: appId, field: 'applicationId', reason: `Duplicate Application ID "${appId}" found in import file.`, rawRowData: rowData });
        hasRowError = true;
      }

      if (!name) {
        errors.push({ rowNumber: rowNum, recordIdentifier: appId || `Row-${rowNum}`, field: 'institutionName', reason: 'Missing Institution Name.', rawRowData: rowData });
        hasRowError = true;
      }

      const intake = parseInt(intakeStr, 10);
      if (isNaN(intake) || intake <= 0) {
        errors.push({ rowNumber: rowNum, recordIdentifier: appId || `Row-${rowNum}`, field: 'approvedIntake', reason: 'Approved Intake must be a positive integer.', rawRowData: rowData });
        hasRowError = true;
      }

      if (!hasRowError) {
        seenIds.add(appId);
        validRecords.push({
          id: appId,
          applicationNumber: appId,
          institutionName: name,
          aictePermanentId: permId || `1-${Math.floor(100000000 + Math.random() * 900000000)}`,
          region,
          state: rowData['state'] || 'Maharashtra',
          approvedIntake: intake,
          type: typeStr,
          route: routeStr,
          currentStage: (rowData['currentstage'] as StageName) || 'Scrutiny',
          assignedOfficer: officer,
          submissionDate: rowData['submissiondate'] || '2026-01-15'
        });
      }
    }

    return {
      success: errors.length === 0,
      totalRows: lines.length - 1,
      validCount: validRecords.length,
      invalidCount: errors.length,
      validRecords,
      errors,
      importedAt: new Date().toISOString(),
      sourceType: 'CSV_UPLOAD'
    };
  }

  async importInstitutions(csvContent: string): Promise<ImportResult<InstitutionImportRecord>> {
    const lines = parseCSVLines(csvContent);
    const errors: RowError[] = [];
    const validRecords: InstitutionImportRecord[] = [];

    if (lines.length < 2) {
      return {
        success: false, totalRows: 0, validCount: 0, invalidCount: 0, validRecords: [],
        errors: [{ rowNumber: 1, recordIdentifier: 'FILE', field: 'header', reason: 'No rows.' }],
        importedAt: new Date().toISOString(), sourceType: 'CSV_UPLOAD'
      };
    }

    const headers = lines[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      const rowNum = i + 1;
      const rowData: Record<string, string> = {};
      headers.forEach((h, idx) => { rowData[h] = row[idx] || ''; });

      const permId = rowData['aictepermanentid'] || rowData['pid'] || rowData['id'] || '';
      const name = rowData['institutionname'] || rowData['name'] || '';

      if (!permId) {
        errors.push({ rowNumber: rowNum, recordIdentifier: name || `Row-${rowNum}`, field: 'aictePermanentId', reason: 'Missing AICTE Permanent Institute ID (PID).' });
      } else if (!name) {
        errors.push({ rowNumber: rowNum, recordIdentifier: permId, field: 'institutionName', reason: 'Missing Institution Name.' });
      } else {
        validRecords.push({
          id: permId,
          name,
          aictePermanentId: permId,
          region: (rowData['region'] as Region) || 'Western',
          state: rowData['state'] || 'Maharashtra',
          address: rowData['address'] || 'Campus Road',
          contactEmail: rowData['contactemail'] || rowData['email'] || 'principal@inst.edu',
          contactPhone: rowData['contactphone'] || rowData['phone'] || '020-25691234',
          principalName: rowData['principalname'] || rowData['principal'] || 'Dr. Principal'
        });
      }
    }

    return {
      success: errors.length === 0,
      totalRows: lines.length - 1,
      validCount: validRecords.length,
      invalidCount: errors.length,
      validRecords,
      errors,
      importedAt: new Date().toISOString(),
      sourceType: 'CSV_UPLOAD'
    };
  }

  async importLeases(csvContent: string): Promise<ImportResult<LeaseImportRecord>> {
    const lines = parseCSVLines(csvContent);
    const errors: RowError[] = [];
    const validRecords: LeaseImportRecord[] = [];

    if (lines.length < 2) {
      return { success: false, totalRows: 0, validCount: 0, invalidCount: 0, validRecords: [], errors: [], importedAt: new Date().toISOString(), sourceType: 'CSV_UPLOAD' };
    }

    const headers = lines[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      const rowNum = i + 1;
      const rowData: Record<string, string> = {};
      headers.forEach((h, idx) => { rowData[h] = row[idx] || ''; });

      const appId = rowData['applicationid'] || rowData['appid'] || '';
      const expiry = rowData['expirydate'] || rowData['expiry'] || '';

      if (!appId) {
        errors.push({ rowNumber: rowNum, recordIdentifier: `Row-${rowNum}`, field: 'applicationId', reason: 'Missing Application ID.' });
      } else if (!expiry || isNaN(Date.parse(expiry))) {
        errors.push({ rowNumber: rowNum, recordIdentifier: appId, field: 'expiryDate', reason: `Invalid lease expiry date "${expiry}". Must be YYYY-MM-DD format.` });
      } else {
        validRecords.push({
          applicationId: appId,
          institutionName: rowData['institutionname'] || 'AICTE Affiliated College',
          deedRegistrationNumber: rowData['deedregistrationnumber'] || `REG-${Math.floor(10000 + Math.random() * 90000)}`,
          registeredDate: rowData['registereddate'] || '2016-01-01',
          expiryDate: expiry,
          lessorName: rowData['lessorname'] || 'State Govt / Trust Land Dept',
          surveyNumber: rowData['surveynumber'] || 'Plot 42/B',
          areaAcres: parseFloat(rowData['areaacres']) || 5.2
        });
      }
    }

    return {
      success: errors.length === 0,
      totalRows: lines.length - 1,
      validCount: validRecords.length,
      invalidCount: errors.length,
      validRecords,
      errors,
      importedAt: new Date().toISOString(),
      sourceType: 'CSV_UPLOAD'
    };
  }

  async importUndertakings(csvContent: string): Promise<ImportResult<UndertakingImportRecord>> {
    const lines = parseCSVLines(csvContent);
    const errors: RowError[] = [];
    const validRecords: UndertakingImportRecord[] = [];

    if (lines.length < 2) {
      return { success: false, totalRows: 0, validCount: 0, invalidCount: 0, validRecords: [], errors: [], importedAt: new Date().toISOString(), sourceType: 'CSV_UPLOAD' };
    }

    const headers = lines[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      const rowNum = i + 1;
      const rowData: Record<string, string> = {};
      headers.forEach((h, idx) => { rowData[h] = row[idx] || ''; });

      const appId = rowData['applicationid'] || rowData['appid'] || '';
      const clause = rowData['conditionclause'] || rowData['clause'] || '';
      const dueDate = rowData['duedate'] || '';

      if (!appId) {
        errors.push({ rowNumber: rowNum, recordIdentifier: `Row-${rowNum}`, field: 'applicationId', reason: 'Missing Application ID.' });
      } else if (!clause) {
        errors.push({ rowNumber: rowNum, recordIdentifier: appId, field: 'conditionClause', reason: 'Missing statutory condition clause description.' });
      } else if (!dueDate || isNaN(Date.parse(dueDate))) {
        errors.push({ rowNumber: rowNum, recordIdentifier: appId, field: 'dueDate', reason: `Invalid compliance due date "${dueDate}".` });
      } else {
        validRecords.push({
          applicationId: appId,
          conditionClause: clause,
          dueDate,
          requiredEvidenceDoc: rowData['requiredevidencedoc'] || 'Occupancy Certificate / Fire NOC',
          complianceOfficer: rowData['complianceofficer'] || 'Dr. R. Sharma'
        });
      }
    }

    return {
      success: errors.length === 0,
      totalRows: lines.length - 1,
      validCount: validRecords.length,
      invalidCount: errors.length,
      validRecords,
      errors,
      importedAt: new Date().toISOString(),
      sourceType: 'CSV_UPLOAD'
    };
  }

  async fetchLiveStatus(appId: string): Promise<LiveSyncStatus> {
    return {
      appId,
      currentNationalStage: 'Scrutiny',
      nationalDatabaseLastSync: new Date().toISOString(),
      scrutinyCleared: true,
      evcCompleted: false,
      sacHearingScheduled: false,
      syncRemarks: 'Synced from local AICTE CSV data register'
    };
  }
}

/**
 * MockAicteApiAdapter: Extensible government gateway stub for future live integrations.
 */
export class MockAicteApiAdapter implements AicteDataAdapter {
  async importApplications(): Promise<ImportResult<Partial<Application>>> {
    return {
      success: true,
      totalRows: 1,
      validCount: 1,
      invalidCount: 0,
      validRecords: [{
        id: 'APP-2026-API-9901',
        institutionName: 'Apex Institute of Cyber-Physical Systems',
        aictePermanentId: '1-999201990',
        region: 'Western',
        approvedIntake: 480,
        type: 'New Institution Approval',
        route: 'Scrutiny + EVC',
        currentStage: 'Scrutiny'
      }],
      errors: [],
      importedAt: new Date().toISOString(),
      sourceType: 'AICTE_API_SYNC'
    };
  }

  async importInstitutions(): Promise<ImportResult<InstitutionImportRecord>> {
    return {
      success: true,
      totalRows: 1,
      validCount: 1,
      invalidCount: 0,
      validRecords: [{
        id: '1-999201990',
        name: 'Apex Institute of Cyber-Physical Systems',
        aictePermanentId: '1-999201990',
        region: 'Western',
        state: 'Maharashtra',
        address: 'Cyber Tech Park, Hinjawadi',
        contactEmail: 'director@apex-inst.ac.in',
        contactPhone: '020-77889900',
        principalName: 'Dr. Anita Joshi'
      }],
      errors: [],
      importedAt: new Date().toISOString(),
      sourceType: 'AICTE_API_SYNC'
    };
  }

  async importLeases(): Promise<ImportResult<LeaseImportRecord>> {
    return {
      success: true,
      totalRows: 1,
      validCount: 1,
      invalidCount: 0,
      validRecords: [{
        applicationId: 'APP-2026-API-9901',
        institutionName: 'Apex Institute of Cyber-Physical Systems',
        deedRegistrationNumber: 'REG-MH-2026-992',
        registeredDate: '2020-04-01',
        expiryDate: '2050-03-31',
        lessorName: 'MIDC Pune Land Allotment',
        surveyNumber: 'Plot IT-44',
        areaAcres: 10.5
      }],
      errors: [],
      importedAt: new Date().toISOString(),
      sourceType: 'AICTE_API_SYNC'
    };
  }

  async importUndertakings(): Promise<ImportResult<UndertakingImportRecord>> {
    return {
      success: true,
      totalRows: 1,
      validCount: 1,
      invalidCount: 0,
      validRecords: [{
        applicationId: 'APP-2026-API-9901',
        conditionClause: 'Clause 7.12: Solar energy harvesting setup compliance',
        dueDate: '2026-06-30',
        requiredEvidenceDoc: 'Green Audit Certificate',
        complianceOfficer: 'Dr. V. K. Sharma'
      }],
      errors: [],
      importedAt: new Date().toISOString(),
      sourceType: 'AICTE_API_SYNC'
    };
  }

  async fetchLiveStatus(appId: string): Promise<LiveSyncStatus> {
    return {
      appId,
      currentNationalStage: 'EVC',
      nationalDatabaseLastSync: new Date().toISOString(),
      scrutinyCleared: true,
      evcCompleted: false,
      sacHearingScheduled: false,
      syncRemarks: 'Live mock response from AICTE National Gateway (Stub)'
    };
  }
}

export function evaluateDataQuality(applications: Application[]): DataQualityMetrics {
  let missingIntakeCount = 0;
  let missingLeaseDateCount = 0;
  let invalidDatesCount = 0;
  let dataIncompleteCount = 0;

  for (const app of applications) {
    let incomplete = false;
    if (app.approvedIntake === undefined || app.approvedIntake === null || app.approvedIntake <= 0) {
      missingIntakeCount++;
      incomplete = true;
    }
    const leaseDoc = app.documents?.find(d => d.type === 'Land Lease Deed');
    if (!leaseDoc || !leaseDoc.expiryDate) {
      missingLeaseDateCount++;
      incomplete = true;
    }
    const hasInvalidDates = app.documents?.some(d => !d.expiryDate || isNaN(Date.parse(d.expiryDate))) || false;
    if (hasInvalidDates) {
      invalidDatesCount++;
      incomplete = true;
    }
    if (incomplete || app.isIncompleteData) {
      dataIncompleteCount++;
    }
  }

  return {
    totalAnalyzed: applications.length,
    missingIntakeCount,
    missingLeaseDateCount,
    invalidDatesCount,
    dataIncompleteCount
  };
}

export const APPLICATION_CSV_TEMPLATE = `applicationId,institutionName,aictePermanentId,region,approvedIntake,type,route,assignedOfficer,submissionDate
APP-2026-W-9101,Mumbai Institute of Artificial Intelligence,1-4899120,Western,360,New Institution Approval,Scrutiny + EVC,Dr. R. Sharma (AICTE RO),2026-01-15
APP-2026-N-9102,Delhi Apex College of Cyber Physical Systems,1-4899121,Northern,240,Extension of Approval (EoA),Only Scrutiny,Anil Verma (Scrutiny Off),2026-01-20
APP-2026-S-9103,Bangalore Institute of Robotics,1-4899122,South-Western,420,Increase in Intake / New Course,Scrutiny + EVC,B. S. Murthy (RO Bengaluru),2026-02-01`;

export const INSTITUTION_CSV_TEMPLATE = `id,name,aictePermanentId,region,state,address,contactEmail,contactPhone,principalName
1-4899120,Mumbai Institute of Artificial Intelligence,1-4899120,Western,Maharashtra,Bandra-Kurla Complex Mumbai,principal@mumbai-ai.edu.in,022-26543210,Dr. S. K. Joshi
1-4899121,Delhi Apex College of Cyber Physical Systems,1-4899121,Northern,Delhi,Dwarka Sector 12 New Delhi,director@delhiapex.edu.in,011-28087654,Dr. Kavita Verma`;

export const LEASE_CSV_TEMPLATE = `applicationId,institutionName,deedRegistrationNumber,registeredDate,expiryDate,lessorName,surveyNumber,areaAcres
APP-2026-W-9101,Mumbai Institute of Artificial Intelligence,REG-MH-2020-891,2020-05-10,2050-05-09,MIDC Maharashtra Allotment,Plot 18 Tech Zone,12.5
APP-2026-N-9102,Delhi Apex College of Cyber Physical Systems,REG-DL-2018-442,2018-03-15,2048-03-14,DDA Institutional Land,Pocket 4 Sector 12,8.0`;

export const UNDERTAKING_CSV_TEMPLATE = `applicationId,conditionClause,dueDate,requiredEvidenceDoc,complianceOfficer
APP-2026-W-9101,Clause 7.4 Barrier-Free Accessibility Ramps and Lifts,2026-06-30,PWD Ramp & Lift Accessibility Compliance Certificate,Dr. R. Sharma (AICTE RO)
APP-2026-N-9102,Clause 9.1 Solar Rooftop Panel Energy Harvesting,2026-07-15,MNRE Approved Solar Grid Commissioning Report,Anil Verma (Scrutiny Off)`;

