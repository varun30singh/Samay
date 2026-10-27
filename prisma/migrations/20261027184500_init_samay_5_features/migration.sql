-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "aictePermanentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "address" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "principalName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationNumber" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL,
    "aictePermanentId" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "routeVersion" TEXT NOT NULL DEFAULT 'APH-2026.v1.0',
    "currentStage" TEXT NOT NULL,
    "submissionDate" DATETIME NOT NULL,
    "approvedIntake" INTEGER NOT NULL,
    "assignedOfficer" TEXT NOT NULL,
    "supervisor" TEXT NOT NULL,
    "riskStatus" TEXT NOT NULL DEFAULT 'On track',
    "delayRiskScore" INTEGER NOT NULL DEFAULT 15,
    "latestSafeDate" DATETIME,
    "daysRemaining" INTEGER NOT NULL DEFAULT 30,
    "workingDaysLeft" INTEGER,
    "complianceScore" INTEGER NOT NULL DEFAULT 85,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Application_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "fileSize" TEXT NOT NULL,
    "uploadDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" DATETIME,
    "validityStatus" TEXT NOT NULL DEFAULT 'Valid',
    "officerConfirmed" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Document_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Undertaking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "conditionClause" TEXT NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "requiredEvidence" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "submittedAt" DATETIME,
    "evidenceFileName" TEXT,
    CONSTRAINT "Undertaking_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkingCalendar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "weeklyOffSunday" BOOLEAN NOT NULL DEFAULT true,
    "weeklyOffSecondFourthSaturday" BOOLEAN NOT NULL DEFAULT true,
    "weeklyOffAllSaturdays" BOOLEAN NOT NULL DEFAULT false,
    "updatedBy" TEXT NOT NULL,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "calendarId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "Holiday_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "WorkingCalendar" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReadinessCheck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL,
    "overallStatus" TEXT NOT NULL,
    "scorePercent" INTEGER NOT NULL,
    "totalChecks" INTEGER NOT NULL,
    "passedChecks" INTEGER NOT NULL,
    "warningChecks" INTEGER NOT NULL,
    "failedChecks" INTEGER NOT NULL,
    "checklistJson" TEXT NOT NULL,
    "submittedAnyway" BOOLEAN NOT NULL DEFAULT false,
    "checkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReadinessCheck_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OfficerLeave" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "officerName" TEXT NOT NULL,
    "officerRole" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "reason" TEXT NOT NULL,
    "delegateName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OfficerDelegation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leaveId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fromOfficer" TEXT NOT NULL,
    "toDelegate" TEXT NOT NULL,
    "assignedStage" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "delegatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedAt" DATETIME,
    CONSTRAINT "OfficerDelegation_leaveId_fkey" FOREIGN KEY ("leaveId") REFERENCES "OfficerLeave" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OfficerDelegation_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Deficiency" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "evidenceRequired" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "hearingDate" DATETIME,
    "hearingOutcome" TEXT,
    "recordedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Deficiency_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeficiencyTimeline" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deficiencyId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "remarks" TEXT,
    "evidenceName" TEXT,
    CONSTRAINT "DeficiencyTimeline_deficiencyId_fkey" FOREIGN KEY ("deficiencyId") REFERENCES "Deficiency" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditBlock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "blockIndex" INTEGER NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "objectType" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "previousHash" TEXT NOT NULL,
    "hash" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Institution_aictePermanentId_key" ON "Institution"("aictePermanentId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkingCalendar_version_key" ON "WorkingCalendar"("version");

-- CreateIndex
CREATE UNIQUE INDEX "AuditBlock_blockIndex_key" ON "AuditBlock"("blockIndex");

