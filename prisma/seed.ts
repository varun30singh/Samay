import { PrismaClient, app_role, application_stage, application_type, deficiency_severity, deficiency_status, document_type, document_status, evc_status, undertaking_status } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

const DEMO_USERS = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'admin.samay@aicte-india.org',
    full_name: 'Dr. Admin (AICTE Head)',
    role: app_role.admin,
    region: null
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    email: 'r.sharma@aicte-india.org',
    full_name: 'Dr. R. Sharma (Scrutiny Officer)',
    role: app_role.scrutiny_officer,
    region: 'Western'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    email: 'p.joshi@wro-aicte.gov.in',
    full_name: 'Dr. P. R. Joshi (Regional Officer Western)',
    role: app_role.regional_officer,
    region: 'Western'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    email: 'vk.sharma@aicte-india.org',
    full_name: 'Dr. V. K. Sharma (Adviser, Bureau)',
    role: app_role.admin,
    region: null
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005',
    email: 'evc.coord@aicte-india.org',
    full_name: 'Prof. EVC Coordinator (Western)',
    role: app_role.expert,
    region: 'Western'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440006',
    email: 'chairman@aicte-india.org',
    full_name: 'Dr. T. G. Sitharam (Chairman / Member Secretary)',
    role: app_role.approving_authority,
    region: null
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440007',
    email: 'registrar@spit.ac.in',
    full_name: 'Registrar (Sardar Patel Institute of Technology)',
    role: app_role.applicant,
    region: 'Western'
  }
];

const DEMO_INSTITUTIONS = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    institution_code: 'INST-100234',
    legal_name: 'Sardar Patel Institute of Technology',
    display_name: 'SPIT Mumbai',
    category: 'Engineering & Technology',
    institution_type: 'Private-Aided',
    region: 'Western',
    state: 'Maharashtra',
    district: 'Mumbai Suburban',
    contact_email: 'registrar@spit.ac.in',
    contact_phone: '+91-22-26707440',
    established_year: 1962
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    institution_code: 'INST-100235',
    legal_name: 'College of Engineering Pune',
    display_name: 'COEP Technological University',
    category: 'Engineering & Technology',
    institution_type: 'Government Autonomous',
    region: 'Western',
    state: 'Maharashtra',
    district: 'Pune',
    contact_email: 'director@coep.ac.in',
    contact_phone: '+91-20-25507000',
    established_year: 1854
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    institution_code: 'INST-100236',
    legal_name: 'Veermata Jijabai Technological Institute',
    display_name: 'VJTI Mumbai',
    category: 'Engineering & Technology',
    institution_type: 'Government Autonomous',
    region: 'Western',
    state: 'Maharashtra',
    district: 'Mumbai City',
    contact_email: 'director@vjti.ac.in',
    contact_phone: '+91-22-24198101',
    established_year: 1887
  },
  {
    id: 'a0000000-0000-0000-0000-000000000004',
    institution_code: 'INST-100237',
    legal_name: 'Delhi Technological University',
    display_name: 'DTU Delhi',
    category: 'Engineering & Technology',
    institution_type: 'State University',
    region: 'Northern',
    state: 'Delhi',
    district: 'North West Delhi',
    contact_email: 'registrar@dtu.ac.in',
    contact_phone: '+91-11-27871018',
    established_year: 1941
  }
];

async function main() {
  console.log('--- SAMAY: Supabase PostgreSQL Database Seed ---');

  try {
    // 1. Provision auth.users records (required for profiles_id_fkey)
    console.log('1. Provisioning auth.users baseline accounts...');
    for (const u of DEMO_USERS) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES ('${u.id}', 'authenticated', 'authenticated', '${u.email}', '{"role":"${u.role}"}'::jsonb, '{}'::jsonb, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
      `);
    }
    console.log(`   ✓ ${DEMO_USERS.length} auth.users accounts verified.`);

    // 2. Upsert Institutions
    console.log('2. Upserting baseline institutions...');
    for (const inst of DEMO_INSTITUTIONS) {
      await prisma.institutions.upsert({
        where: { id: inst.id },
        update: {
          institution_code: inst.institution_code,
          legal_name: inst.legal_name,
          display_name: inst.display_name,
          category: inst.category,
          institution_type: inst.institution_type,
          region: inst.region,
          state: inst.state,
          district: inst.district,
          contact_email: inst.contact_email,
          contact_phone: inst.contact_phone,
          established_year: inst.established_year,
          is_active: true
        },
        create: {
          id: inst.id,
          institution_code: inst.institution_code,
          legal_name: inst.legal_name,
          display_name: inst.display_name,
          category: inst.category,
          institution_type: inst.institution_type,
          region: inst.region,
          state: inst.state,
          district: inst.district,
          contact_email: inst.contact_email,
          contact_phone: inst.contact_phone,
          established_year: inst.established_year,
          is_active: true
        }
      });
    }
    console.log(`   ✓ ${DEMO_INSTITUTIONS.length} institutions verified.`);

    // 3. Upsert Profiles
    console.log('3. Upserting profiles...');
    for (const u of DEMO_USERS) {
      const institutionId = u.role === app_role.applicant ? DEMO_INSTITUTIONS[0].id : null;
      await prisma.profiles.upsert({
        where: { id: u.id },
        update: {
          full_name: u.full_name,
          email: u.email,
          role: u.role,
          region: u.region,
          institution_id: institutionId,
          is_active: true
        },
        create: {
          id: u.id,
          full_name: u.full_name,
          email: u.email,
          role: u.role,
          region: u.region,
          institution_id: institutionId,
          is_active: true
        }
      });
    }
    console.log(`   ✓ ${DEMO_USERS.length} profiles verified.`);

    // 4. Working Calendars and Gazetted Holidays
    console.log('4. Seeding working calendar and holidays...');
    const calendarId = 'c0000000-0000-0000-0000-000000000001';
    await prisma.working_calendars.upsert({
      where: { id: calendarId },
      update: {
        calendar_name: 'AICTE National Working Calendar 2026-2027',
        academic_year: '2026-2027',
        exclude_sundays: true,
        exclude_second_saturday: true,
        exclude_fourth_saturday: true,
        deadline_date: new Date('2026-04-30T00:00:00.000Z'),
        is_active: true
      },
      create: {
        id: calendarId,
        calendar_name: 'AICTE National Working Calendar 2026-2027',
        academic_year: '2026-2027',
        exclude_sundays: true,
        exclude_second_saturday: true,
        exclude_fourth_saturday: true,
        deadline_date: new Date('2026-04-30T00:00:00.000Z'),
        is_active: true
      }
    });

    const gazettedHolidays = [
      { date: new Date('2026-01-26'), name: 'Republic Day' },
      { date: new Date('2026-02-16'), name: 'Maha Shivratri' },
      { date: new Date('2026-03-04'), name: 'Holi' },
      { date: new Date('2026-03-21'), name: 'Id-ul-Fitr' },
      { date: new Date('2026-03-31'), name: 'Mahavir Jayanti' },
      { date: new Date('2026-04-03'), name: 'Good Friday' },
      { date: new Date('2026-04-14'), name: 'Dr. B.R. Ambedkar Jayanti' },
      { date: new Date('2026-05-01'), name: 'Buddha Purnima' },
      { date: new Date('2026-08-15'), name: 'Independence Day' },
      { date: new Date('2026-10-02'), name: 'Mahatma Gandhi Jayanti' }
    ];

    for (const h of gazettedHolidays) {
      const existing = await prisma.holidays.findFirst({
        where: {
          holiday_date: h.date,
          name: h.name
        }
      });
      if (!existing) {
        await prisma.holidays.create({
          data: {
            holiday_date: h.date,
            name: h.name,
            is_gazetted: true
          }
        });
      }
    }
    console.log(`   ✓ Working calendar and ${gazettedHolidays.length} holidays verified.`);

    // 5. Seed Applications
    console.log('5. Seeding demo regulatory applications...');
    const demoApplications = [
      {
        id: 'd0000000-0000-0000-0000-000000000001',
        application_number: 'AICTE-2026-WRO-001',
        institution_id: DEMO_INSTITUTIONS[0].id,
        submitted_by: DEMO_USERS[6].id,
        assigned_officer_id: DEMO_USERS[1].id,
        application_type: application_type.extension_of_approval,
        stage: application_stage.under_scrutiny,
        academic_year: '2026-2027',
        requested_intake: 420,
        statutory_deadline: new Date('2026-04-30T00:00:00.000Z'),
        submitted_at: new Date('2026-01-15T10:00:00.000Z'),
        risk_score: 22.5,
        risk_flags: ['Approaching scrutiny window threshold']
      },
      {
        id: 'd0000000-0000-0000-0000-000000000002',
        application_number: 'AICTE-2026-WRO-002',
        institution_id: DEMO_INSTITUTIONS[1].id,
        submitted_by: null,
        assigned_officer_id: DEMO_USERS[1].id,
        application_type: application_type.new_institution,
        stage: application_stage.evc_scheduled,
        academic_year: '2026-2027',
        requested_intake: 300,
        statutory_deadline: new Date('2026-04-30T00:00:00.000Z'),
        submitted_at: new Date('2026-01-20T11:30:00.000Z'),
        risk_score: 45.0,
        risk_flags: ['EVC inspection pending confirmation']
      },
      {
        id: 'd0000000-0000-0000-0000-000000000003',
        application_number: 'AICTE-2026-WRO-003',
        institution_id: DEMO_INSTITUTIONS[2].id,
        submitted_by: null,
        assigned_officer_id: DEMO_USERS[1].id,
        application_type: application_type.intake_increase,
        stage: application_stage.deficiency_raised,
        academic_year: '2026-2027',
        requested_intake: 180,
        statutory_deadline: new Date('2026-04-30T00:00:00.000Z'),
        submitted_at: new Date('2026-01-25T09:00:00.000Z'),
        risk_score: 65.0,
        risk_flags: ['Deficiency open > 10 working days']
      },
      {
        id: 'd0000000-0000-0000-0000-000000000004',
        application_number: 'AICTE-2026-NRO-001',
        institution_id: DEMO_INSTITUTIONS[3].id,
        submitted_by: null,
        assigned_officer_id: null,
        application_type: application_type.course_addition,
        stage: application_stage.ready_for_evc,
        academic_year: '2026-2027',
        requested_intake: 120,
        statutory_deadline: new Date('2026-04-30T00:00:00.000Z'),
        submitted_at: new Date('2026-02-01T14:15:00.000Z'),
        risk_score: 15.0,
        risk_flags: []
      }
    ];

    for (const app of demoApplications) {
      await prisma.applications.upsert({
        where: { id: app.id },
        update: {
          application_number: app.application_number,
          institution_id: app.institution_id,
          submitted_by: app.submitted_by,
          assigned_officer_id: app.assigned_officer_id,
          application_type: app.application_type,
          stage: app.stage,
          academic_year: app.academic_year,
          requested_intake: app.requested_intake,
          statutory_deadline: app.statutory_deadline,
          submitted_at: app.submitted_at,
          risk_score: app.risk_score,
          risk_flags: app.risk_flags
        },
        create: {
          id: app.id,
          application_number: app.application_number,
          institution_id: app.institution_id,
          submitted_by: app.submitted_by,
          assigned_officer_id: app.assigned_officer_id,
          application_type: app.application_type,
          stage: app.stage,
          academic_year: app.academic_year,
          requested_intake: app.requested_intake,
          statutory_deadline: app.statutory_deadline,
          submitted_at: app.submitted_at,
          risk_score: app.risk_score,
          risk_flags: app.risk_flags
        }
      });

      // Stage history entry
      const existingHistory = await prisma.application_stage_history.findFirst({
        where: { application_id: app.id }
      });
      if (!existingHistory) {
        await prisma.application_stage_history.create({
          data: {
            application_id: app.id,
            previous_stage: null,
            new_stage: app.stage,
            changed_by: DEMO_USERS[1].id,
            reason: 'Initial regulatory intake and stage assignment'
          }
        });
      }

      // Add baseline documents for SPIT
      if (app.id === demoApplications[0].id) {
        const existingDoc = await prisma.documents.findFirst({
          where: { application_id: app.id }
        });
        if (!existingDoc) {
          await prisma.documents.create({
            data: {
              application_id: app.id,
              institution_id: app.institution_id,
              document_type: document_type.land_lease,
              file_name: 'Land_Lease_Deed_2045.pdf',
              storage_bucket: 'samay-private',
              storage_path: '/documents/spit/lease_2045.pdf',
              mime_type: 'application/pdf',
              file_size_bytes: BigInt(4200000),
              document_status: document_status.verified,
              expires_on: new Date('2045-03-31T00:00:00.000Z'),
              ocr_confidence: 0.98,
              extracted_fields: { lease_valid_till: '2045-03-31' }
            }
          });
        }

        // Add baseline undertaking
        const existingUndertaking = await prisma.undertakings.findFirst({
          where: { application_id: app.id }
        });
        if (!existingUndertaking) {
          await prisma.undertakings.create({
            data: {
              application_id: app.id,
              institution_id: app.institution_id,
              undertaking_type: 'anti_ragging_compliance',
              undertaking_text: 'Statutory Anti-Ragging Affidavit per APH Appendix 12',
              status: undertaking_status.verified,
              verified_by: DEMO_USERS[1].id,
              verified_at: new Date(),
              metadata: { remarks: 'Affidavit matches APH Appendix 12 requirements.' }
            }
          });
        }
      }

      // Add deficiency for VJTI
      if (app.id === demoApplications[2].id) {
        const existingDef = await prisma.deficiencies.findFirst({
          where: { application_id: app.id }
        });
        if (!existingDef) {
          await prisma.deficiencies.create({
            data: {
              application_id: app.id,
              institution_id: app.institution_id,
              raised_by: DEMO_USERS[1].id,
              title: 'Faculty Cadre Ratio Shortfall',
              description: 'Cadre ratio in Computer Engineering falls short of 1:2:6 norm per APH 2026 Clause 7.3.',
              severity: deficiency_severity.medium,
              status: deficiency_status.open,
              due_at: new Date('2026-03-15T00:00:00.000Z')
            }
          });
        }
      }

      // Add EVC visit for COEP
      if (app.id === demoApplications[1].id) {
        const existingEvc = await prisma.evc_visits.findFirst({
          where: { application_id: app.id }
        });
        if (!existingEvc) {
          await prisma.evc_visits.create({
            data: {
              application_id: app.id,
              institution_id: app.institution_id,
              scheduled_start: new Date('2026-03-20T10:00:00.000Z'),
              scheduled_end: new Date('2026-03-20T17:00:00.000Z'),
              status: evc_status.scheduled,
              coordinator_id: DEMO_USERS[4].id,
              venue: 'COEP Main Campus, Shivajinagar, Pune',
              conflict_notes: [],
              report: { notes: 'Physical infrastructure and laboratory verification visit scheduled.' }
            }
          });
        }
      }
    }
    console.log(`   ✓ ${demoApplications.length} demo applications verified.`);

    // 6. Cryptographic Audit Genesis Ledger Block
    console.log('6. Seeding cryptographic audit ledger genesis block...');
    const genesisBlock = await prisma.audit_ledger.findFirst({
      orderBy: { block_index: 'asc' }
    });
    if (!genesisBlock) {
      const genesisData = JSON.stringify({ event: 'GENESIS', platform: 'SAMAY', version: '2026.1' });
      const genesisHash = crypto.createHash('sha256').update(genesisData).digest('hex');
      await prisma.audit_ledger.create({
        data: {
          action: 'SYSTEM_GENESIS',
          entity_type: 'platform',
          entity_id: 'SAMAY-2026-CORE',
          actor_id: DEMO_USERS[0].id,
          payload: { description: 'SAMAY AICTE Platform Audit Ledger Genesis Block Initialized' },
          previous_hash: '0'.repeat(64),
          entry_hash: genesisHash
        }
      });
      console.log('   ✓ Audit ledger genesis block created.');
    } else {
      console.log('   ✓ Audit ledger genesis block already present.');
    }

    console.log('--- Database seeding completed successfully without any destructive operations. ---');
  } catch (error) {
    console.error('Database seed error:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
