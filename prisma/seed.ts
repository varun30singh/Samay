import { PrismaClient } from '@prisma/client';
import { DEFAULT_WORKING_CALENDAR, DEFAULT_HOLIDAYS_2026 } from '../lib/workingCalendar';
import { INITIAL_OFFICER_LEAVES } from '../lib/officerDelegation';
import { INITIAL_DEFICIENCIES } from '../lib/deficiencyTracker';
import { generateSeedApplications, DEFAULT_SIMULATED_DATE } from '../lib/seedData';
import { GENESIS_HASH, createBlockHash } from '../lib/crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding SAMAY SQLite database for all 5 statutory features...');

  // 1. Seed Working Calendar & Holidays (Feature 1)
  console.log('1/5 Seeding Working Calendar...');
  await prisma.holiday.deleteMany({});
  await prisma.workingCalendar.deleteMany({});

  const cal = await prisma.workingCalendar.create({
    data: {
      version: DEFAULT_WORKING_CALENDAR.version,
      academicYear: DEFAULT_WORKING_CALENDAR.academicYear,
      weeklyOffSunday: DEFAULT_WORKING_CALENDAR.weeklyOffSunday,
      weeklyOffSecondFourthSaturday: DEFAULT_WORKING_CALENDAR.weeklyOffSecondFourthSaturday,
      weeklyOffAllSaturdays: DEFAULT_WORKING_CALENDAR.weeklyOffAllSaturdays,
      updatedBy: DEFAULT_WORKING_CALENDAR.updatedBy,
      holidays: {
        create: DEFAULT_HOLIDAYS_2026.map(h => ({
          date: h.date,
          name: h.name
        }))
      }
    }
  });
  console.log(`Working Calendar seeded: ${cal.version} with ${DEFAULT_HOLIDAYS_2026.length} gazetted holidays.`);

  // 2. Seed Institutions and Applications
  console.log('2/5 Seeding Applications & Documents...');
  await prisma.deficiencyTimeline.deleteMany({});
  await prisma.deficiency.deleteMany({});
  await prisma.officerDelegation.deleteMany({});
  await prisma.officerLeave.deleteMany({});
  await prisma.readinessCheck.deleteMany({});
  await prisma.undertaking.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.application.deleteMany({});
  await prisma.institution.deleteMany({});
  await prisma.auditBlock.deleteMany({});

  const seedApps = generateSeedApplications(DEFAULT_SIMULATED_DATE);

  for (const app of seedApps) {
    // Upsert Institution
    await prisma.institution.upsert({
      where: { aictePermanentId: app.aictePermanentId },
      update: {},
      create: {
        id: app.institutionId || app.aictePermanentId,
        aictePermanentId: app.aictePermanentId,
        name: app.institutionName,
        region: app.region,
        state: app.state,
        address: `${app.institutionName} Campus, ${app.state}`,
        contactEmail: `registrar@${app.id.toLowerCase().replace(/[^a-z0-9]/g, '')}.edu.in`,
        contactPhone: '+91-20-25691000'
      }
    });

    // Create Application
    await prisma.application.create({
      data: {
        id: app.id,
        applicationNumber: app.applicationNumber,
        institutionId: app.aictePermanentId,
        institutionName: app.institutionName,
        aictePermanentId: app.aictePermanentId,
        region: app.region,
        state: app.state,
        type: app.type,
        route: app.route,
        routeVersion: app.routeVersion,
        currentStage: app.currentStage,
        submissionDate: new Date(app.submissionDate),
        approvedIntake: app.approvedIntake,
        assignedOfficer: app.assignedOfficer,
        supervisor: app.supervisor,
        riskStatus: app.riskStatus,
        delayRiskScore: app.delayRiskScore,
        latestSafeDate: app.latestSafeDateForCurrentStage ? new Date(app.latestSafeDateForCurrentStage) : null,
        daysRemaining: app.daysRemainingInStage,
        workingDaysLeft: app.workingDaysRemainingInStage,
        complianceScore: app.complianceHealthScore,
        documents: {
          create: app.documents.map(d => ({
            id: d.id,
            type: d.type,
            filename: d.filename,
            fileSize: d.fileSize,
            uploadDate: new Date(d.uploadDate),
            expiryDate: d.expiryDate ? new Date(d.expiryDate) : null,
            validityStatus: d.validityStatus,
            officerConfirmed: d.officerConfirmed
          }))
        },
        undertakings: {
          create: app.undertakings.map(u => ({
            id: u.id,
            conditionClause: u.condition,
            dueDate: new Date(u.dueDate),
            requiredEvidence: u.requiredEvidence,
            status: u.status,
            submittedAt: u.submittedAt ? new Date(u.submittedAt) : null,
            evidenceFileName: u.submittedEvidenceName
          }))
        }
      }
    });
  }
  console.log(`Seeded ${seedApps.length} applications.`);

  // 3. Seed Officer Leaves & Delegations (Feature 3)
  console.log('3/5 Seeding Officer Leaves & Delegations...');
  for (const leave of INITIAL_OFFICER_LEAVES) {
    const createdLeave = await prisma.officerLeave.create({
      data: {
        id: leave.id,
        officerName: leave.officerName,
        officerRole: leave.officerRole,
        region: leave.region,
        startDate: new Date(leave.startDate),
        endDate: new Date(leave.endDate),
        reason: leave.reason,
        delegateName: leave.delegateName,
        status: leave.status,
        createdAt: new Date(leave.createdAt)
      }
    });

    // Delegate applications assigned to this officer
    const matchingApps = seedApps.filter(a => a.assignedOfficer === leave.officerName);
    for (const mApp of matchingApps) {
      await prisma.officerDelegation.create({
        data: {
          leaveId: createdLeave.id,
          applicationId: mApp.id,
          fromOfficer: leave.officerName,
          toDelegate: leave.delegateName,
          assignedStage: mApp.currentStage,
          status: 'ACTIVE'
        }
      });
    }
  }
  console.log(`Seeded ${INITIAL_OFFICER_LEAVES.length} officer leaves with delegation linkages.`);

  // 4. Seed Deficiencies (Feature 4)
  console.log('4/5 Seeding Tracked Deficiencies...');
  for (const def of INITIAL_DEFICIENCIES) {
    await prisma.deficiency.create({
      data: {
        id: def.id,
        applicationId: def.applicationId,
        institutionName: def.institutionName,
        region: def.region,
        description: def.description,
        severity: def.severity,
        dueDate: new Date(def.dueDate),
        evidenceRequired: def.evidenceRequired,
        status: def.status,
        hearingDate: def.hearingDate ? new Date(def.hearingDate) : null,
        hearingOutcome: def.hearingOutcome,
        recordedBy: def.recordedBy,
        timeline: {
          create: def.timeline.map(t => ({
            id: t.id,
            timestamp: new Date(t.timestamp),
            actor: t.actor,
            actorRole: t.actorRole,
            action: t.action,
            remarks: t.remarks,
            evidenceName: t.evidenceName
          }))
        }
      }
    });
  }
  console.log(`Seeded ${INITIAL_DEFICIENCIES.length} physical/scrutiny deficiencies.`);

  // 5. Seed Cryptographic Audit Blocks
  console.log('5/5 Seeding Cryptographic Audit Ledger...');
  let prevHash = GENESIS_HASH;
  const auditEntries = [
    { actor: 'Dr. V. K. Sharma', role: 'bureau_officer', action: 'System Genesis Block Initialized', objectType: 'System', objectId: 'SAMAY-ROOT', details: 'Cryptographic hash-chain initiated for APH 2026-27 Approval Cycle.' },
    { actor: 'Dr. V. K. Sharma', role: 'bureau_officer', action: 'Working Calendar Published', objectType: 'WorkingCalendar', objectId: DEFAULT_WORKING_CALENDAR.version, details: 'Working Calendar APH-WC-2026.v1.0 configured with 13 gazetted holidays and Sunday/2nd-4th Saturday off.' },
    { actor: 'Dr. P. R. Joshi (RO Western)', role: 'regional_officer', action: 'Approved Officer Delegation', objectType: 'Delegation', objectId: 'LEAVE-2026-001', details: 'S. N. Patil leave approved; delegated queue to R. K. Shinde (RO Pune).' },
    { actor: 'Prof. Ramesh Kulkarni', role: 'evc_coordinator', action: 'Recorded EVC Deficiency', objectType: 'Deficiency', objectId: 'DEF-2026-W-1001-A', details: 'Block B Fire Safety sprinkler certification deficiency flagged for Shivaji Institute.' }
  ];

  for (let i = 0; i < auditEntries.length; i++) {
    const e = auditEntries[i];
    const blockIndex = i + 1;
    const nowIso = new Date().toISOString();
    const hash = createBlockHash(prevHash, blockIndex, nowIso, e.actor, e.action, e.objectId, e.details);

    await prisma.auditBlock.create({
      data: {
        id: `BLK-${blockIndex}`,
        blockIndex,
        timestamp: new Date(nowIso),
        actor: e.actor,
        actorRole: e.role,
        action: e.action,
        objectType: e.objectType,
        objectId: e.objectId,
        details: e.details,
        previousHash: prevHash,
        hash
      }
    });
    prevHash = hash;
  }
  console.log(`Seeded ${auditEntries.length} cryptographic audit blocks with intact SHA-256 chain.`);
  console.log('Database seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
