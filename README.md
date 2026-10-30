# SAMAY: Smart Approval, Monitoring & Alert System
### AICTE Regulatory Approval Process & Monitoring Platform

SAMAY is an apex regulatory monitoring platform engineered for the All India Council for Technical Education (AICTE), Ministry of Education, Government of India. It enforces statutory approval timelines, transparent scrutiny workflows, backwards deadline planning, and tamper-evident SHA-256 audit logging across all 8 Regional Offices (ROs) nationwide.

---

## 🏛️ Statutory Principles & Guardrails

1. **Advisory AI & Statutory Scrutiny**: AI risk scores and automated checks are strictly advisory. The system **never approves or rejects** an application or deficiency hearing. Official statutory determinations are solely executed by authorized Council officers and SAC/SHC committees.
2. **Cryptographic Accountability**: Every state mutation, calendar revision, leave assignment, and deficiency transition writes an immutable, SHA-256 hash-chained audit block.
3. **Data Completeness Integrity**: If statutory inputs (e.g. approved intake, registered lease deed dates) are missing, Deadline Guard flags records as **"Data incomplete"** rather than guessing speculative risk statuses.
4. **WCAG AAA Accessibility & Touch Targets**: All interactive elements maintain a minimum 44px touch height, visible focus rings, and high-contrast color palettes.
5. **Sovereign Indian Aesthetics**:
   - **Light Theme**: White background (`#ffffff`), statutory light yellow accents (`#FEF08A` / `#FFF8D6`), institutional green (`#004c22` / `#166534`).
   - **Dark Theme**: Navy blue canvas (`#0B1B3A` / `#09162F` / `#12264D`), sovereign saffron accents (`#FF9933`), crisp white text (`#FFFFFF`).

---

## 🚀 5 Core Statutory Features

### FEATURE 1: Working-Days Calendar Engine
- **Admin Screen**: `Working Calendar` (`components/WorkingCalendarView.tsx`).
- **Configuration**:
  - Set weekly off days: default Sunday (mandatory national rest day), optional 2nd/4th Saturday (AICTE/Central Govt rule), optional 5-day week (all Saturdays).
  - Add / remove gazetted national holidays (date + name).
  - Every update advances the calendar configuration version (e.g. `APH-WC-2026.v1.1`) and writes a hash-chained audit entry.
- **Backend Math (`lib/workingCalendar.ts`)**:
  - `isWorkingDay(date, config)`: Evaluates weekend rules (including statutory 2nd/4th Saturday modulus calculation) and gazetted holiday lists.
  - `addWorkingDays(startDate, days, config)` / `subtractWorkingDays(date, days, config)`: Accurately adds/subtracts statutory working days.
  - `getWorkingDaysDiff(start, end, config)`: Calculates exact working days between two dates.
- **Deadline Guard Integration**:
  - Backwards planning from the statutory cutoff (30 April) subtracts working days instead of calendar days.
  - Displays `"X working days left"` next to calendar days with an advisory tooltip: *"Weekends and holidays are excluded."*
  - Versioned configuration is displayed in Deadline Guard explanations.

### FEATURE 2: Pre-Submission Readiness Checker (Institution Role)
- **Institution Screen**: `Readiness Check` (`components/ReadinessCheckView.tsx`).
- **Primary Action**: "Run readiness check" button.
- **Statutory Rules Evaluated (`lib/readinessChecker.ts`)**:
  1. *Required Documents*: Certified uploads of Land Lease Deed, Building Plan NOC, Fire Safety Certificate, Affiliation Letter, Pollution Clearance.
  2. *Lease Validity*: Registered lease remaining validity must exceed the statutory threshold (5 years minimum).
  3. *Approved Intake*: Seat capacity filled (> 0).
  4. *Contact Registry*: Institution email, phone, and AICTE Permanent Institute ID present.
  5. *Unresolved Scrutiny Queries*: Verifies no open queries from an earlier return.
  6. *Document Expiry Dates*: Validates all certificate expiry dates.
- **Output & Feedback**:
  - Readiness percentage ring and PASS / WARNING / FAIL status badges with icons and text.
  - Plain-language remediation instructions and direct action buttons ("Upload lease", "Fill intake", etc.).
- **Submission Advisory Guardrail**:
  - Labeled: *"Advisory only: this check does not replace official scrutiny."*
  - Submit button remains enabled. If checks fail, opens a warning modal: *"3 issues may cause this application to be returned. Submit anyway?"*

### FEATURE 3: Officer Workload Delegation and Leave Management
- **Regional / Admin Screen**: `Coverage` (`components/OfficerCoverageView.tsx`).
- **Officer Availability**:
  - "Mark me unavailable" button: pick start and end dates, select a qualified delegate (enforcing same role and same RO jurisdiction), and provide a reason.
- **Queue Routing (`lib/officerDelegation.ts`)**:
  - During active leave, dossier queue items display for the delegate with a `"Delegated from <Officer>"` tag.
  - Workload Balancer and Deadline Guard treat delegated dossiers as the active delegate's workload.
  - Idempotent alerts route to both the delegate and Regional Supervisor.
  - Automatic return: When leave ends, items return automatically to the primary officer.
- **Coverage Panel & Flagged Uncovered Queues**:
  - Summary table of who is on leave and who covers whom.
  - Prominent statutory warning card for any regional queue with NO designated coverage.

### FEATURE 4: Deficiency Closure Tracker (Statutory P0 Core)
- **Screen**: `Deficiency Tracker` (`components/DeficiencyTrackerView.tsx`).
- **Lifecycle Status Flow**:
  `Open` ➔ `Institution responded` ➔ `Under verification` ➔ `Accepted / Query Raised / Rejected` ➔ `Sent to hearing` ➔ `Hearing outcome recorded` ➔ `Closed`.
- **Interface & Filter Chips**:
  - Filter chips: `All`, `Open`, `Overdue`, `In hearing`, `Closed`.
  - Table: Region, Institution, Description, Severity (Minor/Major), Days open, Due date, Status badge.
  - Buttons: "Open Detail", "Send reminder", "Escalate".
  - Detail Drawer: Chronological audit timeline of every action, response, and verification.
- **Institution View**: "Your pending deficiencies" with upload forms for response remarks and certified evidence documents.
- **Automated Milestone Alerts (`lib/deficiencyTracker.ts`)**:
  - Reminders at 30, 15, 7, and 0 days before the due date.
  - Overdue escalations at +3, +7, and +14 days after the due date.
- **Hearing Outcomes**: Recorded solely by authorized Council officers and SHC committees; system never decides outcomes.
- **Deadline Guard Integration**: Unresolved deficiencies automatically flag dossiers as `"Tight"` or `"Will miss at current pace"`.

### FEATURE 5: CSV Bulk Import and Integration Adapter
- **Admin Screen**: `Data Import` (`components/DataImportView.tsx`).
- **Adapter Interface (`AicteDataAdapter` in `lib/dataAdapters.ts`)**:
  - `CsvAdapter`: Full-featured batch CSV ingestion with ≤ 5 MB file size constraints, `.csv` validation, duplicate detection, and row-by-row error parsing.
  - `MockAicteApiAdapter`: Extensible stub interface for future government API webhook synchronization.
- **Downloadable Templates**:
  - Applications CSV Template
  - Institutions CSV Template
  - Land Lease Deeds CSV Template
  - Institutional Undertakings CSV Template
- **Ingestion Workflow**:
  `Upload File` ➔ `Validate (Row Errors Preview Table)` ➔ `Confirm & Ingest Valid Rows` ➔ `Downloadable Rejection Error Report CSV`.
- **Data-Quality Panel**:
  - Live metric counts of Missing Intake, Missing Lease Dates, and Invalid Dates.
  - Labeled `"Data incomplete"` to avoid speculative risk guesses.
- **Security & Privacy**: Audit logs record batch metadata (filename, valid counts, error counts) but never log raw file content.

---

## 🗄️ Database & Prisma Schema

Prisma models SQLite database (`prisma/dev.db`):
- `Institution`: Registered technical institutions with AICTE Permanent ID, region, contact details.
- `Application`: Approvals pipeline dossiers with stage, intake, route, and Deadline Guard metrics.
- `Document`: Uploaded certified regulatory documents with expiry tracking and AI confirmation.
- `Undertaking`: Time-bound compliance conditions with escalation levels.
- `WorkingCalendar` & `Holiday`: Versioned statutory working calendar and gazetted holiday registry.
- `ReadinessCheck`: Audit trail of pre-submission institutional checks.
- `OfficerLeave` & `OfficerDelegation`: Leave records and regional delegation routing.
- `Deficiency` & `DeficiencyTimeline`: Physical inspection deficiencies, evidence, hearings, and timeline events.
- `AuditBlock`: SHA-256 hash-chained cryptographic ledger blocks.

### Run Migrations & Seed
```bash
# Push schema to SQLite database
npx prisma db push

# Populate comprehensive synthetic dataset
npx tsx prisma/seed.ts
```

---

## 🧪 Automated Unit Test Suite

The project features a native TypeScript unit test suite verifying all 5 features:
```bash
npm test
```

### Tests Covered:
- **Feature 1**: Weekend and gazetted holiday detection, stage spanning weekend and holiday working-day due date calculation.
- **Feature 2**: Pre-submission readiness rule evaluations, missing documents, score calculation, and plain-language fixes.
- **Feature 3**: Officer delegation queue routing, alerts dispatch, automatic return after leave, and uncovered queue detection.
- **Feature 4**: Deficiency status transitions, milestone reminders (30/15/7/0 days), overdue escalations (+3/+7/+14 days), and Deadline Guard integration.
- **Feature 5**: CSV Adapter validation, file size limits (5 MB), non-CSV rejection, row errors, duplicate IDs, and "Data incomplete" handling.

---

For login into the website here are id password and roles -:
ID - institute.demo@aicte-samay.gov.in
Password - Institute#2026
role - APPLICANT_USER

Id - ro.scrutiny@aicte-samay.gov.in
Password - Officer#Review26
role - SCRUTINY_OFFICER

id  - admin.regbureau@aicte-samay.gov.in
Password. - SamayAdmin@2026
Role - SUPER_ADMIN
