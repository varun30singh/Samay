import { Application, SystemCalendarConfig, AuditEntry, AlertNotification, Region, RouteType, ApplicationType, StageName, DeficiencyRecord } from './types';
import { GENESIS_HASH, createBlockHash } from './crypto';
import { WorkingCalendarConfig, DEFAULT_WORKING_CALENDAR, subtractWorkingDays, getWorkingDaysDiff } from './workingCalendar';
import { INITIAL_DEFICIENCIES } from './deficiencyTracker';

export const INITIAL_CALENDAR_CONFIG: SystemCalendarConfig = {
  academicYear: '2026-2027',
  approvalCutoffDate: '2026-04-30', // Statutory cutoff date
  scrutinyTypicalDays: 12,
  evcTypicalDays: 14,
  sacShcTypicalDays: 10,
  decisionTypicalDays: 7,
  advanceAlertDays: 14,
  leaseWarningThresholdYears: 5,
  version: 'APH-2026.v1.4',
  lastModifiedBy: 'Dr. V. K. Sharma (Adviser, Regulation Bureau)',
  lastModifiedAt: '2026-01-10T10:00:00Z'
};

// Default Simulated Clock date (Demo starts around 60 days before 30 April: approx 1 March 2026)
export const DEFAULT_SIMULATED_DATE = '2026-03-01T09:30:00';

interface RawSeedConfig {
  id: string;
  name: string;
  permId: string;
  region: Region;
  state: string;
  type: ApplicationType;
  route: RouteType;
  currentStage: StageName;
  intake: number;
  officer: string;
  supervisor: string;
  subDaysAgo: number;
  stageDaysAgo: number;
  leaseExpiry: string;
  undertakingStatus?: 'Pending' | 'Evidence Submitted' | 'Verified' | 'Overdue';
  evcStatus?: 'Not Scheduled' | 'Scheduled' | 'Completed';
  evcMember?: string;
  hasConflict?: boolean;
  queriesCount?: number;
}

const rawColleges: RawSeedConfig[] = [
  // 1. PRIME DEMO TARGET: Shivaji Institute of Technology Pune (Will miss -> fixable!)
  {
    id: 'APP-2026-W-1001',
    name: 'Shivaji Institute of Technology & Engineering',
    permId: '1-938210921',
    region: 'Western',
    state: 'Maharashtra',
    type: 'Extension of Approval (EoA)',
    route: 'Scrutiny + EVC',
    currentStage: 'EVC',
    intake: 1420,
    officer: 'S. N. Patil (RO Mumbai)',
    supervisor: 'Dr. P. R. Joshi (RO Western)',
    subDaysAgo: 50,
    stageDaysAgo: 22,
    leaseExpiry: '2026-05-15', // SHORT LEASE! Expires right after cutoff
    undertakingStatus: 'Evidence Submitted',
    evcStatus: 'Not Scheduled', // UNSCHEDULED! Causes "Will miss"
    queriesCount: 1
  },
  // 2. PRIME DEMO CONFLICT TARGET: Vishwakarma College of Tech Pune
  {
    id: 'APP-2026-W-1002',
    name: 'Vishwakarma Institute of Advanced Technology',
    permId: '1-938210922',
    region: 'Western',
    state: 'Maharashtra',
    type: 'Increase in Intake / New Course',
    route: 'Scrutiny + EVC',
    currentStage: 'EVC',
    intake: 840,
    officer: 'S. N. Patil (RO Mumbai)',
    supervisor: 'Dr. P. R. Joshi (RO Western)',
    subDaysAgo: 45,
    stageDaysAgo: 16,
    leaseExpiry: '2034-08-31',
    evcStatus: 'Scheduled',
    evcMember: 'Prof. Ramesh Kulkarni (IIT Bombay)',
    hasConflict: true, // Double booked with APP-2026-W-1003 on 2026-03-05!
    undertakingStatus: 'Verified'
  },
  // 3. CONFLICT PARTNER
  {
    id: 'APP-2026-W-1003',
    name: 'Pune Metropolitan Engineering College',
    permId: '1-938210923',
    region: 'Western',
    state: 'Maharashtra',
    type: 'New Institution Approval',
    route: 'Scrutiny + EVC',
    currentStage: 'EVC',
    intake: 600,
    officer: 'R. K. Shinde (RO Pune)',
    supervisor: 'Dr. P. R. Joshi (RO Western)',
    subDaysAgo: 40,
    stageDaysAgo: 14,
    leaseExpiry: '2042-12-31',
    evcStatus: 'Scheduled',
    evcMember: 'Prof. Ramesh Kulkarni (IIT Bombay)', // Double booked!
    hasConflict: true,
    undertakingStatus: 'Verified'
  },
  // 4. Northern: Delhi Technological Horizon
  {
    id: 'APP-2026-N-2001',
    name: 'Delhi Institute of Science & Polytechnic',
    permId: '1-482910111',
    region: 'Northern',
    state: 'Delhi',
    type: 'Extension of Approval (EoA)',
    route: 'Only Scrutiny',
    currentStage: 'Scrutiny',
    intake: 1200,
    officer: 'Anil Verma (Scrutiny Off)',
    supervisor: 'Dr. Sunita Bansal (RO North)',
    subDaysAgo: 28,
    stageDaysAgo: 18, // Overdue scrutiny (typical is 12)
    leaseExpiry: '2026-04-10', // CRITICAL LEASE EXPIRY
    queriesCount: 2,
    undertakingStatus: 'Overdue'
  },
  // 5. Northern: Abdul Kalam Technical Academy
  {
    id: 'APP-2026-N-2002',
    name: 'Dr. APJ Abdul Kalam Memorial Engg College',
    permId: '1-482910112',
    region: 'Northern',
    state: 'Uttar Pradesh',
    type: 'Extension of Approval (EoA)',
    route: 'Scrutiny + EVC',
    currentStage: 'EVC',
    intake: 1680, // High impact!
    officer: 'Anil Verma (Scrutiny Off)',
    supervisor: 'Dr. Sunita Bansal (RO North)',
    subDaysAgo: 58,
    stageDaysAgo: 25,
    leaseExpiry: '2030-05-20',
    evcStatus: 'Not Scheduled',
    queriesCount: 0
  },
  // 6. Northern: Kanpur Polytech
  {
    id: 'APP-2026-N-2003',
    name: 'Kanpur Institute of Chemical & Material Sciences',
    permId: '1-482910113',
    region: 'Northern',
    state: 'Uttar Pradesh',
    type: 'Increase in Intake / New Course',
    route: 'Scrutiny + EVC',
    currentStage: 'Decision Pending',
    intake: 720,
    officer: 'V. S. Saxena (RO Kanpur)',
    supervisor: 'Dr. Sunita Bansal (RO North)',
    subDaysAgo: 65,
    stageDaysAgo: 5,
    leaseExpiry: '2038-09-15',
    evcStatus: 'Completed',
    undertakingStatus: 'Verified'
  },
  // 7. Southern: Bangalore Tech Park Institute
  {
    id: 'APP-2026-S-3001',
    name: 'Bangalore Institute of Artificial Intelligence',
    permId: '1-291048821',
    region: 'Southern',
    state: 'Karnataka',
    type: 'New Institution Approval',
    route: 'Scrutiny + EVC',
    currentStage: 'EVC',
    intake: 1800, // Very high impact
    officer: 'M. S. Murthy (RO Bangalore)',
    supervisor: 'Dr. K. Swaminathan (RO South)',
    subDaysAgo: 55,
    stageDaysAgo: 24,
    leaseExpiry: '2045-01-01',
    evcStatus: 'Not Scheduled',
    queriesCount: 1
  },
  // 8. Southern: Mysore College
  {
    id: 'APP-2026-S-3002',
    name: 'Mysore Royal Academy of Architecture',
    permId: '1-291048822',
    region: 'Southern',
    state: 'Karnataka',
    type: 'Extension of Approval (EoA)',
    route: 'Only Scrutiny',
    currentStage: 'Approved',
    intake: 480,
    officer: 'M. S. Murthy (RO Bangalore)',
    supervisor: 'Dr. K. Swaminathan (RO South)',
    subDaysAgo: 70,
    stageDaysAgo: 40,
    leaseExpiry: '2039-06-30',
    undertakingStatus: 'Verified'
  },
  // 9. Southern: Madras Institute of Applied Sciences
  {
    id: 'APP-2026-S-3003',
    name: 'Madras Technical & Maritime University campus',
    permId: '1-291048823',
    region: 'Southern',
    state: 'Tamil Nadu',
    type: 'Extension of Approval (EoA)',
    route: 'EVC + SAC/SHC',
    currentStage: 'SAC/SHC',
    intake: 960,
    officer: 'T. V. Raman (RO Chennai)',
    supervisor: 'Dr. K. Swaminathan (RO South)',
    subDaysAgo: 60,
    stageDaysAgo: 8,
    leaseExpiry: '2032-11-20',
    evcStatus: 'Completed',
    undertakingStatus: 'Evidence Submitted'
  },
  // 10. Eastern: Kolkata Tech
  {
    id: 'APP-2026-E-4001',
    name: 'Kolkata Institute of Cybernetics & Robotics',
    permId: '1-591029301',
    region: 'Eastern',
    state: 'West Bengal',
    type: 'Extension of Approval (EoA)',
    route: 'Only Scrutiny',
    currentStage: 'Scrutiny',
    intake: 600,
    officer: 'B. C. Roy (RO Kolkata)',
    supervisor: 'Dr. P. Sen (RO East)',
    subDaysAgo: 20,
    stageDaysAgo: 8,
    leaseExpiry: '2035-04-12',
    queriesCount: 0,
    undertakingStatus: 'Pending'
  },
  // 11. Eastern: Bhubaneswar Engg
  {
    id: 'APP-2026-E-4002',
    name: 'Bhubaneswar Premier Institute of Technology',
    permId: '1-591029302',
    region: 'Eastern',
    state: 'Odisha',
    type: 'Increase in Intake / New Course',
    route: 'Scrutiny + EVC',
    currentStage: 'EVC',
    intake: 1140,
    officer: 'S. Patnaik (RO Bhubaneswar)',
    supervisor: 'Dr. P. Sen (RO East)',
    subDaysAgo: 52,
    stageDaysAgo: 21,
    leaseExpiry: '2026-06-20', // Low lease
    evcStatus: 'Not Scheduled',
    queriesCount: 2
  },
  // 12. Central: Bhopal Tech
  {
    id: 'APP-2026-C-5001',
    name: 'Bhopal Institute of Technology & Management',
    permId: '1-692019401',
    region: 'Central',
    state: 'Madhya Pradesh',
    type: 'Extension of Approval (EoA)',
    route: 'Only Scrutiny',
    currentStage: 'Returned to Institution',
    intake: 540,
    officer: 'Deepak Chouhan (RO Bhopal)',
    supervisor: 'Dr. A. K. Shukla (RO Central)',
    subDaysAgo: 35,
    stageDaysAgo: 5,
    leaseExpiry: '2031-10-10',
    queriesCount: 1,
    undertakingStatus: 'Pending'
  },
  // 13. Central: Indore Institute
  {
    id: 'APP-2026-C-5002',
    name: 'Indore Devi Ahilya Engineering College',
    permId: '1-692019402',
    region: 'Central',
    state: 'Madhya Pradesh',
    type: 'Extension of Approval (EoA)',
    route: 'Scrutiny + EVC',
    currentStage: 'Decision Pending',
    intake: 880,
    officer: 'Deepak Chouhan (RO Bhopal)',
    supervisor: 'Dr. A. K. Shukla (RO Central)',
    subDaysAgo: 62,
    stageDaysAgo: 4,
    leaseExpiry: '2040-05-15',
    evcStatus: 'Completed',
    undertakingStatus: 'Verified'
  },
  // 14. South-Western: Kochi Maritime
  {
    id: 'APP-2026-SW-6001',
    name: 'Kochi Ocean Engineering & Naval Academy',
    permId: '1-789012301',
    region: 'South-Western',
    state: 'Kerala',
    type: 'Extension of Approval (EoA)',
    route: 'Only EVC',
    currentStage: 'EVC',
    intake: 420,
    officer: 'George Varghese (RO Kochi)',
    supervisor: 'Dr. Mathew Thomas (RO SW)',
    subDaysAgo: 48,
    stageDaysAgo: 23,
    leaseExpiry: '2026-05-01', // Expiring 1 day after cutoff!
    evcStatus: 'Not Scheduled',
    queriesCount: 1
  },
  // 15. South-Western: Trivandrum Poly
  {
    id: 'APP-2026-SW-6002',
    name: 'Trivandrum Institute of Technology & Telecom',
    permId: '1-789012302',
    region: 'South-Western',
    state: 'Kerala',
    type: 'Extension of Approval (EoA)',
    route: 'Only Scrutiny',
    currentStage: 'Approved',
    intake: 660,
    officer: 'George Varghese (RO Kochi)',
    supervisor: 'Dr. Mathew Thomas (RO SW)',
    subDaysAgo: 68,
    stageDaysAgo: 42,
    leaseExpiry: '2033-08-14',
    undertakingStatus: 'Verified'
  },
  // 16. South-Central: Hyderabad Tech
  {
    id: 'APP-2026-SC-7001',
    name: 'Hyderabad Cyber Valley Institute of Tech',
    permId: '1-890123401',
    region: 'South-Central',
    state: 'Telangana',
    type: 'Increase in Intake / New Course',
    route: 'Scrutiny + EVC',
    currentStage: 'EVC',
    intake: 1500, // High impact
    officer: 'K. S. Rao (RO Hyderabad)',
    supervisor: 'Dr. B. Reddy (RO South-Central)',
    subDaysAgo: 53,
    stageDaysAgo: 19,
    leaseExpiry: '2026-07-15', // Short lease
    evcStatus: 'Not Scheduled',
    queriesCount: 1
  },
  // 17. South-Central: Warangal Institute
  {
    id: 'APP-2026-SC-7002',
    name: 'Kakatiya Technical Institute Warangal',
    permId: '1-890123402',
    region: 'South-Central',
    state: 'Telangana',
    type: 'Extension of Approval (EoA)',
    route: 'EVC + SAC/SHC',
    currentStage: 'SAC/SHC',
    intake: 780,
    officer: 'K. S. Rao (RO Hyderabad)',
    supervisor: 'Dr. B. Reddy (RO South-Central)',
    subDaysAgo: 62,
    stageDaysAgo: 7,
    leaseExpiry: '2037-12-31',
    evcStatus: 'Completed',
    undertakingStatus: 'Evidence Submitted'
  },
  // 18. North-Western: Chandigarh Engg
  {
    id: 'APP-2026-NW-8001',
    name: 'Chandigarh Integrated Polytechnic & Engg',
    permId: '1-998811201',
    region: 'North-Western',
    state: 'Punjab',
    type: 'Extension of Approval (EoA)',
    route: 'Only Scrutiny',
    currentStage: 'Scrutiny',
    intake: 900,
    officer: 'Harpreet Singh (RO Chandigarh)',
    supervisor: 'Dr. G. S. Dhillon (RO NW)',
    subDaysAgo: 25,
    stageDaysAgo: 14,
    leaseExpiry: '2026-04-28', // WILL EXPIRE BEFORE CUTOFF!
    queriesCount: 2,
    undertakingStatus: 'Overdue'
  },
  // 19. North-Western: Jaipur Tech
  {
    id: 'APP-2026-NW-8002',
    name: 'Jaipur Pink City Institute of Technology',
    permId: '1-998811202',
    region: 'North-Western',
    state: 'Rajasthan',
    type: 'New Institution Approval',
    route: 'Scrutiny + EVC',
    currentStage: 'EVC',
    intake: 720,
    officer: 'Harpreet Singh (RO Chandigarh)',
    supervisor: 'Dr. G. S. Dhillon (RO NW)',
    subDaysAgo: 47,
    stageDaysAgo: 17,
    leaseExpiry: '2044-03-31',
    evcStatus: 'Scheduled',
    evcMember: 'Prof. Sandeep Rawat (MNIT Jaipur)',
    undertakingStatus: 'Verified'
  },
  // 20. Western: Sardar Patel Tech Gujarat
  {
    id: 'APP-2026-W-1004',
    name: 'Sardar Vallabhbhai Patel Institute of Tech',
    permId: '1-938210924',
    region: 'Western',
    state: 'Gujarat',
    type: 'Extension of Approval (EoA)',
    route: 'Only Scrutiny',
    currentStage: 'Approved',
    intake: 1350,
    officer: 'J. M. Mehta (RO Ahmedabad)',
    supervisor: 'Dr. P. R. Joshi (RO Western)',
    subDaysAgo: 75,
    stageDaysAgo: 45,
    leaseExpiry: '2040-01-01',
    undertakingStatus: 'Verified'
  },
  // 21. Western: Vadodara Polytech
  {
    id: 'APP-2026-W-1005',
    name: 'Vadodara Institute of Chemical Technology',
    permId: '1-938210925',
    region: 'Western',
    state: 'Gujarat',
    type: 'Increase in Intake / New Course',
    route: 'Scrutiny + EVC',
    currentStage: 'Scrutiny',
    intake: 600,
    officer: 'J. M. Mehta (RO Ahmedabad)',
    supervisor: 'Dr. P. R. Joshi (RO Western)',
    subDaysAgo: 15,
    stageDaysAgo: 5,
    leaseExpiry: '2036-05-18',
    queriesCount: 0
  },
  // 22. Northern: Lucknow Engg
  {
    id: 'APP-2026-N-2004',
    name: 'Lucknow Institute of Computational Sciences',
    permId: '1-482910114',
    region: 'Northern',
    state: 'Uttar Pradesh',
    type: 'Extension of Approval (EoA)',
    route: 'Only Scrutiny',
    currentStage: 'Re-Scrutiny',
    intake: 840,
    officer: 'Anil Verma (Scrutiny Off)',
    supervisor: 'Dr. Sunita Bansal (RO North)',
    subDaysAgo: 38,
    stageDaysAgo: 6,
    leaseExpiry: '2032-07-22',
    queriesCount: 1,
    undertakingStatus: 'Evidence Submitted'
  },
  // 23. Northern: Noida International Poly
  {
    id: 'APP-2026-N-2005',
    name: 'Noida Advanced Poly & Vocational Institute',
    permId: '1-482910115',
    region: 'Northern',
    state: 'Uttar Pradesh',
    type: 'Extension of Approval (EoA)',
    route: 'Scrutiny + EVC',
    currentStage: 'EVC',
    intake: 1260,
    officer: 'Anil Verma (Scrutiny Off)',
    supervisor: 'Dr. Sunita Bansal (RO North)',
    subDaysAgo: 51,
    stageDaysAgo: 20,
    leaseExpiry: '2026-06-01', // Low lease
    evcStatus: 'Not Scheduled',
    queriesCount: 1
  },
  // 24. Southern: Coimbatore Textile Tech
  {
    id: 'APP-2026-S-3004',
    name: 'Coimbatore Institute of Textile Engineering',
    permId: '1-291048824',
    region: 'Southern',
    state: 'Tamil Nadu',
    type: 'Extension of Approval (EoA)',
    route: 'Only Scrutiny',
    currentStage: 'Scrutiny',
    intake: 450,
    officer: 'T. V. Raman (RO Chennai)',
    supervisor: 'Dr. K. Swaminathan (RO South)',
    subDaysAgo: 10,
    stageDaysAgo: 3,
    leaseExpiry: '2035-12-15',
    queriesCount: 0
  },
  // 25. Southern: Tiruchirappalli Engg
  {
    id: 'APP-2026-S-3005',
    name: 'Tiruchirappalli National Engineering College',
    permId: '1-291048825',
    region: 'Southern',
    state: 'Tamil Nadu',
    type: 'Extension of Approval (EoA)',
    route: 'Scrutiny + EVC',
    currentStage: 'Decision Pending',
    intake: 1020,
    officer: 'T. V. Raman (RO Chennai)',
    supervisor: 'Dr. K. Swaminathan (RO South)',
    subDaysAgo: 64,
    stageDaysAgo: 3,
    leaseExpiry: '2038-02-28',
    evcStatus: 'Completed',
    undertakingStatus: 'Verified'
  },
  // 26. Eastern: Guwahati Valley Tech
  {
    id: 'APP-2026-E-4003',
    name: 'Guwahati Brahmaputra Engineering Academy',
    permId: '1-591029303',
    region: 'Eastern',
    state: 'Assam',
    type: 'Extension of Approval (EoA)',
    route: 'Only Scrutiny',
    currentStage: 'Scrutiny',
    intake: 540,
    officer: 'B. C. Roy (RO Kolkata)',
    supervisor: 'Dr. P. Sen (RO East)',
    subDaysAgo: 18,
    stageDaysAgo: 6,
    leaseExpiry: '2033-04-19',
    queriesCount: 0
  },
  // 27. Eastern: Patna Institute
  {
    id: 'APP-2026-E-4004',
    name: 'Patna Magadh Institute of Technical Education',
    permId: '1-591029304',
    region: 'Eastern',
    state: 'Bihar',
    type: 'New Institution Approval',
    route: 'Scrutiny + EVC',
    currentStage: 'EVC',
    intake: 600,
    officer: 'B. C. Roy (RO Kolkata)',
    supervisor: 'Dr. P. Sen (RO East)',
    subDaysAgo: 44,
    stageDaysAgo: 15,
    leaseExpiry: '2042-08-30',
    evcStatus: 'Scheduled',
    evcMember: 'Prof. A. K. Choudhury (IIT Patna)',
    undertakingStatus: 'Evidence Submitted'
  },
  // 28. Central: Raipur Tech
  {
    id: 'APP-2026-C-5003',
    name: 'Raipur Chhattisgarh Institute of Technology',
    permId: '1-692019403',
    region: 'Central',
    state: 'Chhattisgarh',
    type: 'Extension of Approval (EoA)',
    route: 'Only Scrutiny',
    currentStage: 'Scrutiny',
    intake: 720,
    officer: 'Deepak Chouhan (RO Bhopal)',
    supervisor: 'Dr. A. K. Shukla (RO Central)',
    subDaysAgo: 22,
    stageDaysAgo: 10,
    leaseExpiry: '2034-01-20',
    queriesCount: 0
  },
  // 29. Central: Gwalior Academy
  {
    id: 'APP-2026-C-5004',
    name: 'Gwalior Scindia Institute of Sciences',
    permId: '1-692019404',
    region: 'Central',
    state: 'Madhya Pradesh',
    type: 'Increase in Intake / New Course',
    route: 'Scrutiny + EVC',
    currentStage: 'Decision Pending',
    intake: 900,
    officer: 'Deepak Chouhan (RO Bhopal)',
    supervisor: 'Dr. A. K. Shukla (RO Central)',
    subDaysAgo: 66,
    stageDaysAgo: 5,
    leaseExpiry: '2039-11-12',
    evcStatus: 'Completed',
    undertakingStatus: 'Verified'
  },
  // 30. South-Western: Calicut Institute
  {
    id: 'APP-2026-SW-6003',
    name: 'Calicut Malabar Institute of Information Tech',
    permId: '1-789012303',
    region: 'South-Western',
    state: 'Kerala',
    type: 'Extension of Approval (EoA)',
    route: 'Only Scrutiny',
    currentStage: 'Scrutiny',
    intake: 480,
    officer: 'George Varghese (RO Kochi)',
    supervisor: 'Dr. Mathew Thomas (RO SW)',
    subDaysAgo: 14,
    stageDaysAgo: 4,
    leaseExpiry: '2031-09-01',
    queriesCount: 0
  },
  // 31. South-Central: Visakhapatnam Port
  {
    id: 'APP-2026-SC-7003',
    name: 'Visakhapatnam Marine & Defense Tech Institute',
    permId: '1-890123403',
    region: 'South-Central',
    state: 'Andhra Pradesh',
    type: 'Extension of Approval (EoA)',
    route: 'Scrutiny + EVC',
    currentStage: 'EVC',
    intake: 840,
    officer: 'K. S. Rao (RO Hyderabad)',
    supervisor: 'Dr. B. Reddy (RO South-Central)',
    subDaysAgo: 46,
    stageDaysAgo: 16,
    leaseExpiry: '2040-06-25',
    evcStatus: 'Scheduled',
    evcMember: 'Prof. K. Satyanarayana (AU Visakhapatnam)',
    undertakingStatus: 'Verified'
  },
  // 32. South-Central: Vijayawada Krishna Tech
  {
    id: 'APP-2026-SC-7004',
    name: 'Vijayawada Siddhartha College of Engineering',
    permId: '1-890123404',
    region: 'South-Central',
    state: 'Andhra Pradesh',
    type: 'Extension of Approval (EoA)',
    route: 'Only Scrutiny',
    currentStage: 'Approved',
    intake: 1200,
    officer: 'K. S. Rao (RO Hyderabad)',
    supervisor: 'Dr. B. Reddy (RO South-Central)',
    subDaysAgo: 72,
    stageDaysAgo: 38,
    leaseExpiry: '2041-10-31',
    undertakingStatus: 'Verified'
  },
  // 33. North-Western: Amritsar Golden Temple Tech
  {
    id: 'APP-2026-NW-8003',
    name: 'Guru Nanak Dev Polytechnic College Amritsar',
    permId: '1-998811203',
    region: 'North-Western',
    state: 'Punjab',
    type: 'Extension of Approval (EoA)',
    route: 'Only Scrutiny',
    currentStage: 'Scrutiny',
    intake: 600,
    officer: 'Harpreet Singh (RO Chandigarh)',
    supervisor: 'Dr. G. S. Dhillon (RO NW)',
    subDaysAgo: 24,
    stageDaysAgo: 11,
    leaseExpiry: '2033-03-25',
    queriesCount: 1,
    undertakingStatus: 'Pending'
  },
  // 34. North-Western: Jodhpur Thar Tech
  {
    id: 'APP-2026-NW-8004',
    name: 'Jodhpur Marwar Engineering College',
    permId: '1-998811204',
    region: 'North-Western',
    state: 'Rajasthan',
    type: 'Extension of Approval (EoA)',
    route: 'Scrutiny + EVC',
    currentStage: 'Decision Pending',
    intake: 720,
    officer: 'Harpreet Singh (RO Chandigarh)',
    supervisor: 'Dr. G. S. Dhillon (RO NW)',
    subDaysAgo: 60,
    stageDaysAgo: 4,
    leaseExpiry: '2038-07-20',
    evcStatus: 'Completed',
    undertakingStatus: 'Verified'
  },
  // 35. Western: Nagpur Vidarbha Tech
  {
    id: 'APP-2026-W-1006',
    name: 'Vidarbha Youth Welfare Institute of Tech',
    permId: '1-938210926',
    region: 'Western',
    state: 'Maharashtra',
    type: 'Extension of Approval (EoA)',
    route: 'Only Scrutiny',
    currentStage: 'Scrutiny',
    intake: 960,
    officer: 'R. K. Shinde (RO Pune)',
    supervisor: 'Dr. P. R. Joshi (RO Western)',
    subDaysAgo: 26,
    stageDaysAgo: 13,
    leaseExpiry: '2030-12-05',
    queriesCount: 0
  },
  // 36. Northern: Agra Taj Polytechnic
  {
    id: 'APP-2026-N-2006',
    name: 'Agra City Polytechnic & Management College',
    permId: '1-482910116',
    region: 'Northern',
    state: 'Uttar Pradesh',
    type: 'Extension of Approval (EoA)',
    route: 'Only Scrutiny',
    currentStage: 'Rejected',
    intake: 360,
    officer: 'V. S. Saxena (RO Kanpur)',
    supervisor: 'Dr. Sunita Bansal (RO North)',
    subDaysAgo: 50,
    stageDaysAgo: 20,
    leaseExpiry: '2025-12-01', // Expired lease
    queriesCount: 3,
    undertakingStatus: 'Overdue'
  },
  // 37. Southern: Hubli Rural Engg
  {
    id: 'APP-2026-S-3006',
    name: 'KLE Technological Society Hubli',
    permId: '1-291048826',
    region: 'Southern',
    state: 'Karnataka',
    type: 'Extension of Approval (EoA)',
    route: 'Only Scrutiny',
    currentStage: 'Approved',
    intake: 1080,
    officer: 'M. S. Murthy (RO Bangalore)',
    supervisor: 'Dr. K. Swaminathan (RO South)',
    subDaysAgo: 80,
    stageDaysAgo: 50,
    leaseExpiry: '2045-05-31',
    undertakingStatus: 'Verified'
  },
  // 38. Eastern: Siliguri North Bengal Tech
  {
    id: 'APP-2026-E-4005',
    name: 'North Bengal Institute of Technology',
    permId: '1-591029305',
    region: 'Eastern',
    state: 'West Bengal',
    type: 'Extension of Approval (EoA)',
    route: 'Scrutiny + EVC',
    currentStage: 'EVC',
    intake: 600,
    officer: 'B. C. Roy (RO Kolkata)',
    supervisor: 'Dr. P. Sen (RO East)',
    subDaysAgo: 45,
    stageDaysAgo: 16,
    leaseExpiry: '2034-08-11',
    evcStatus: 'Scheduled',
    evcMember: 'Prof. S. K. Mitra (Jadavpur University)',
    undertakingStatus: 'Verified'
  },
  // 39. Central: Jabalpur Tech
  {
    id: 'APP-2026-C-5005',
    name: 'Jabalpur Engineering & Vocational College',
    permId: '1-692019405',
    region: 'Central',
    state: 'Madhya Pradesh',
    type: 'Extension of Approval (EoA)',
    route: 'Only Scrutiny',
    currentStage: 'Scrutiny',
    intake: 420,
    officer: 'Deepak Chouhan (RO Bhopal)',
    supervisor: 'Dr. A. K. Shukla (RO Central)',
    subDaysAgo: 12,
    stageDaysAgo: 5,
    leaseExpiry: '2032-06-30',
    queriesCount: 0
  },
  // 40. Western: Nashik College
  {
    id: 'APP-2026-W-1007',
    name: 'Nashik District Maratha Vidya Prasarak Institute',
    permId: '1-938210927',
    region: 'Western',
    state: 'Maharashtra',
    type: 'Extension of Approval (EoA)',
    route: 'Scrutiny + EVC',
    currentStage: 'Decision Pending',
    intake: 960,
    officer: 'R. K. Shinde (RO Pune)',
    supervisor: 'Dr. P. R. Joshi (RO Western)',
    subDaysAgo: 58,
    stageDaysAgo: 6,
    leaseExpiry: '2037-03-31',
    evcStatus: 'Completed',
    undertakingStatus: 'Verified'
  }
];

/**
 * Calculates days difference between two ISO date strings
 */
export function getDaysDiff(futureDateStr: string, currentDateStr: string): number {
  const d1 = new Date(futureDateStr).getTime();
  const d2 = new Date(currentDateStr).getTime();
  return Math.round((d1 - d2) / (1000 * 60 * 60 * 24));
}

/**
 * Evaluates Deadline Guard backwards planning and risk metrics
 * Backwards calculation formula from PRD 6.H:
 * - Start from Approval Cutoff Date (e.g. 2026-04-30)
 * - Subtract typical durations of remaining stages
 * - Determines Latest Safe Date for current stage
 * - If Current Date > Latest Safe Date -> 'Will miss at current pace'
 * - If Current Date within 14 days of Latest Safe Date -> 'Tight'
 * - Otherwise -> 'On track'
 */
export function evaluateDeadlineGuard(
  app: Application,
  simulatedDate: string,
  config: SystemCalendarConfig,
  workingCalendarConfig: WorkingCalendarConfig = DEFAULT_WORKING_CALENDAR,
  deficienciesList: DeficiencyRecord[] = INITIAL_DEFICIENCIES
): {
  riskStatus: Application['riskStatus'];
  delayRiskScore: number;
  latestSafeDateForCurrentStage: string;
  daysRemainingInStage: number;
  daysToApprovalCutoff: number;
  workingDaysRemainingInStage: number;
  workingDaysToCutoff: number;
  workingCalendarVersion: string;
  riskReasons: string[];
  complianceHealthScore: number;
  isIncompleteData?: boolean;
  incompleteReasons?: string[];
} {
  // Feature 5 Check: Incomplete Data Detection
  const incompleteReasons: string[] = [];
  if (!app.approvedIntake || app.approvedIntake <= 0) {
    incompleteReasons.push('Missing approved intake seat allocation');
  }
  const leaseDoc = app.documents.find(d => d.type === 'Land Lease Deed');
  if (!leaseDoc || !leaseDoc.expiryDate || isNaN(Date.parse(leaseDoc.expiryDate))) {
    incompleteReasons.push('Missing registered land lease expiry date');
  }
  if (!app.submissionDate || isNaN(Date.parse(app.submissionDate))) {
    incompleteReasons.push('Missing formal submission date');
  }

  const isIncompleteData = incompleteReasons.length > 0;

  const cutoffDate = new Date(config.approvalCutoffDate);
  const curDate = new Date(simulatedDate);
  const daysToCutoff = Math.round((cutoffDate.getTime() - curDate.getTime()) / (1000 * 60 * 60 * 24));
  const workingDaysToCutoff = getWorkingDaysDiff(curDate, cutoffDate, workingCalendarConfig);

  // If data is incomplete, mark status as 'Data incomplete'
  if (isIncompleteData) {
    return {
      riskStatus: 'Data incomplete',
      delayRiskScore: 90,
      latestSafeDateForCurrentStage: config.approvalCutoffDate,
      daysRemainingInStage: 0,
      daysToApprovalCutoff: daysToCutoff,
      workingDaysRemainingInStage: 0,
      workingDaysToCutoff,
      workingCalendarVersion: workingCalendarConfig.version,
      riskReasons: incompleteReasons.map(r => `Data incomplete: ${r}. Deadline Guard cannot calculate statutory risk.`),
      complianceHealthScore: 30,
      isIncompleteData: true,
      incompleteReasons
    };
  }

  // Determine remaining stages based on route and currentStage
  let remainingTypicalWorkingDays = config.decisionTypicalDays; // Final statutory decision always needed

  if (app.currentStage === 'Submitted') {
    remainingTypicalWorkingDays += config.scrutinyTypicalDays;
    if (app.route.includes('EVC')) remainingTypicalWorkingDays += config.evcTypicalDays;
    if (app.route.includes('SAC/SHC')) remainingTypicalWorkingDays += config.sacShcTypicalDays;
  } else if (app.currentStage === 'Scrutiny' || app.currentStage === 'Re-Scrutiny' || app.currentStage === 'Returned to Institution' || app.currentStage === 'On Hold') {
    remainingTypicalWorkingDays += 6; // average remaining scrutiny working days
    if (app.route.includes('EVC')) remainingTypicalWorkingDays += config.evcTypicalDays;
    if (app.route.includes('SAC/SHC')) remainingTypicalWorkingDays += config.sacShcTypicalDays;
  } else if (app.currentStage === 'EVC') {
    remainingTypicalWorkingDays += (app.evc?.status === 'Not Scheduled' ? config.evcTypicalDays + 10 : 8);
    if (app.route.includes('SAC/SHC')) remainingTypicalWorkingDays += config.sacShcTypicalDays;
  } else if (app.currentStage === 'SAC/SHC') {
    remainingTypicalWorkingDays += config.sacShcTypicalDays;
  } else if (app.currentStage === 'Decision Pending') {
    remainingTypicalWorkingDays = config.decisionTypicalDays;
  } else {
    // Already Approved or Rejected
    return {
      riskStatus: 'On track',
      delayRiskScore: 0,
      latestSafeDateForCurrentStage: config.approvalCutoffDate,
      daysRemainingInStage: 999,
      daysToApprovalCutoff: daysToCutoff,
      workingDaysRemainingInStage: 999,
      workingDaysToCutoff,
      workingCalendarVersion: workingCalendarConfig.version,
      riskReasons: ['Application processing completed.'],
      complianceHealthScore: 100,
      isIncompleteData: false
    };
  }

  // Feature 1: Working-Days Calendar subtraction for Latest Safe Date
  const latestSafeDateStr = subtractWorkingDays(cutoffDate, remainingTypicalWorkingDays, workingCalendarConfig);
  const safeDate = new Date(latestSafeDateStr);
  const daysUntilSafeDate = Math.round((safeDate.getTime() - curDate.getTime()) / (1000 * 60 * 60 * 24));
  const workingDaysRemainingInStage = getWorkingDaysDiff(curDate, safeDate, workingCalendarConfig);

  const reasons: string[] = [];
  let riskScore = 15;

  // Check Lease Radar condition
  if (leaseDoc) {
    const daysToLeaseExpiry = getDaysDiff(leaseDoc.expiryDate, simulatedDate);
    const leaseExpiryDate = new Date(leaseDoc.expiryDate);
    if (leaseExpiryDate <= cutoffDate || daysToLeaseExpiry < 90) {
      reasons.push(`Lease deed expires on ${leaseDoc.expiryDate} (short/lapsed lease before academic approval window)`);
      riskScore += 35;
    }
  }

  // Check EVC unscheduled
  if (app.currentStage === 'EVC' && app.evc?.status === 'Not Scheduled') {
    reasons.push('Expert Visit Committee (EVC) not yet scheduled');
    riskScore += 30;
  }

  // Check EVC conflict
  if (app.evc?.hasConflict) {
    reasons.push('EVC Member double-booking scheduling conflict detected');
    riskScore += 20;
  }

  // Check Open queries / ageing
  const openQueries = app.observations ? app.observations.filter(o => o.status === 'Open').length : 0;
  if (openQueries > 0) {
    reasons.push(`${openQueries} open observation/scrutiny query awaiting resolution`);
    riskScore += (openQueries * 15);
  }

  // Check Overdue undertakings
  const overdueUndertakings = app.undertakings ? app.undertakings.filter(u => u.status === 'Overdue').length : 0;
  if (overdueUndertakings > 0) {
    reasons.push(`${overdueUndertakings} time-bound institutional undertaking overdue`);
    riskScore += 25;
  }

  // Feature 4: Check Unresolved Deficiencies
  const appDeficiencies = (deficienciesList || []).filter(d => d.applicationId === app.id);
  const unresolvedDeficiencies = appDeficiencies.filter(d => d.status !== 'Closed' && d.status !== 'Accepted');
  if (unresolvedDeficiencies.length > 0) {
    unresolvedDeficiencies.forEach(def => {
      reasons.push(`Unresolved deficiency: ${def.description} (Due ${def.dueDate}, Status: ${def.status})`);
    });
    riskScore += (unresolvedDeficiencies.length * 20);
  }

  // Determine Risk Status based on backwards planner & working days
  let riskStatus: Application['riskStatus'] = 'On track';
  if (workingDaysRemainingInStage < 0 || workingDaysToCutoff < remainingTypicalWorkingDays) {
    riskStatus = 'Will miss at current pace';
    if (!reasons.includes('Pace delay: remaining stages exceed days to cutoff deadline')) {
      reasons.push(`Pace delay: remaining stages require ~${remainingTypicalWorkingDays} working days but only ${workingDaysToCutoff} working days remain to statutory cutoff`);
    }
    riskScore = Math.max(riskScore, 75);
  } else if (workingDaysRemainingInStage <= config.advanceAlertDays || unresolvedDeficiencies.some(d => d.severity === 'major')) {
    riskStatus = 'Tight';
    reasons.push(`Tight timeline: within ${workingDaysRemainingInStage} working days of latest safe date (${latestSafeDateStr})`);
    riskScore = Math.max(riskScore, 45);
  }

  if (reasons.length === 0) {
    reasons.push('Processing proceeding within configured working-days stage durations');
  }

  riskScore = Math.min(100, Math.max(10, riskScore));

  // Compute compliance health score (100 minus penalties)
  let healthScore = 100;
  if (reasons.some(r => r.includes('Lease'))) healthScore -= 30;
  if (overdueUndertakings > 0) healthScore -= 25;
  if (openQueries > 0) healthScore -= 15;
  if (unresolvedDeficiencies.length > 0) healthScore -= 20;
  if (app.currentStage === 'Returned to Institution') healthScore -= 20;
  healthScore = Math.max(20, healthScore);

  return {
    riskStatus,
    delayRiskScore: riskScore,
    latestSafeDateForCurrentStage: latestSafeDateStr,
    daysRemainingInStage: daysUntilSafeDate,
    daysToApprovalCutoff: daysToCutoff,
    workingDaysRemainingInStage,
    workingDaysToCutoff,
    workingCalendarVersion: workingCalendarConfig.version,
    riskReasons: reasons,
    complianceHealthScore: healthScore,
    isIncompleteData: false
  };
}

/**
 * Generate full synthetic seed dataset of 40 applications
 */
export function generateSeedApplications(simulatedDateStr: string = DEFAULT_SIMULATED_DATE): Application[] {
  const baseDate = new Date(simulatedDateStr);

  return rawColleges.map((c) => {
    const subDate = new Date(baseDate.getTime() - c.subDaysAgo * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const stageDate = new Date(baseDate.getTime() - c.stageDaysAgo * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const documents: Application['documents'] = [
      {
        id: `DOC-${c.id}-1`,
        type: 'Land Lease Deed',
        filename: `${c.name.split(' ')[0]}_Registered_Lease_Deed.pdf`,
        fileSize: '3.4 MB',
        uploadDate: subDate,
        expiryDate: c.leaseExpiry,
        remainingDays: getDaysDiff(c.leaseExpiry, simulatedDateStr),
        validityStatus: getDaysDiff(c.leaseExpiry, simulatedDateStr) < 0 ? 'Expired' : (getDaysDiff(c.leaseExpiry, simulatedDateStr) < 90 ? 'Expiring Soon' : 'Valid'),
        expirySource: 'AI-proposed and confirmed',
        aiConfidence: 96.4,
        highlightedText: `Clause 4.1: "This registered lease agreement shall be valid and binding for a mandatory period ending on ${c.leaseExpiry}."`,
        officerConfirmed: true,
        confirmedBy: c.officer
      },
      {
        id: `DOC-${c.id}-2`,
        type: 'Building Plan NOC',
        filename: `${c.name.split(' ')[0]}_Municipal_NOC.pdf`,
        fileSize: '1.8 MB',
        uploadDate: subDate,
        expiryDate: '2030-12-31',
        remainingDays: getDaysDiff('2030-12-31', simulatedDateStr),
        validityStatus: 'Valid',
        expirySource: 'Manually Entered',
        officerConfirmed: true,
        confirmedBy: c.officer
      },
      {
        id: `DOC-${c.id}-3`,
        type: 'Fire Safety Certificate',
        filename: `${c.name.split(' ')[0]}_Fire_Safety_Certificate.pdf`,
        fileSize: '950 KB',
        uploadDate: subDate,
        expiryDate: '2027-06-30',
        remainingDays: getDaysDiff('2027-06-30', simulatedDateStr),
        validityStatus: 'Valid',
        expirySource: 'AI-proposed and confirmed',
        aiConfidence: 94.8,
        highlightedText: 'Valid under the Fire Services Act till 30th June 2027.',
        officerConfirmed: true,
        confirmedBy: c.officer
      }
    ];

    const undertakings: Application['undertakings'] = [
      {
        id: `UT-${c.id}-1`,
        condition: 'Submission of revised Occupancy Certificate for the newly built Academic Block B',
        dueDate: '2026-03-15',
        requiredEvidence: 'Certified Municipal Corporation Occupancy Certificate with architect seal',
        status: c.undertakingStatus || 'Pending',
        submittedEvidenceName: c.undertakingStatus === 'Evidence Submitted' || c.undertakingStatus === 'Verified' ? 'Municipal_Occupancy_Block_B_Certified.pdf' : undefined,
        submittedAt: c.undertakingStatus === 'Evidence Submitted' || c.undertakingStatus === 'Verified' ? '2026-02-20T14:30:00Z' : undefined,
        verifiedBy: c.undertakingStatus === 'Verified' ? c.officer : undefined,
        verificationDate: c.undertakingStatus === 'Verified' ? '2026-02-22T11:00:00Z' : undefined,
        verificationComments: c.undertakingStatus === 'Verified' ? 'Verified with municipal municipal portal serial #MC-9321. Approved.' : undefined,
        escalationLevel: c.undertakingStatus === 'Overdue' ? 2 : 0
      }
    ];

    const observations: Application['observations'] = [];
    if (c.queriesCount && c.queriesCount > 0) {
      observations.push({
        id: `OBS-${c.id}-1`,
        author: c.officer,
        authorRole: 'scrutiny_officer',
        timestamp: stageDate + 'T11:20:00Z',
        text: 'Clarification required regarding biometric faculty attendance log for Computer Science & Engineering department as per APH 2026 Clause 7.2.',
        status: 'Open'
      });
    }

    const stageHistory: Application['stageHistory'] = [
      {
        stage: 'Submitted',
        startedAt: subDate + 'T10:00:00Z',
        completedAt: subDate + 'T10:05:00Z',
        actor: `${c.name} (Registrar)`,
        actorRole: 'institution',
        outcome: 'Application Submitted Online with prescribed processing fee',
        durationDays: 0
      }
    ];

    if (c.currentStage !== 'Submitted') {
      stageHistory.push({
        stage: 'Scrutiny',
        startedAt: subDate + 'T10:05:00Z',
        completedAt: (c.currentStage === 'Scrutiny' || c.currentStage === 'Returned to Institution') ? undefined : stageDate + 'T16:00:00Z',
        actor: c.officer,
        actorRole: 'scrutiny_officer',
        outcome: (c.currentStage === 'Scrutiny' || c.currentStage === 'Returned to Institution') ? 'In Progress' : 'Scrutiny Recommended for Next Stage',
        comments: c.currentStage === 'Returned to Institution' ? 'Returned due to discrepancy in land survey number.' : 'All land and infrastructure documents verified.',
        durationDays: Math.max(1, c.subDaysAgo - c.stageDaysAgo)
      });
    }

    if (['EVC', 'SAC/SHC', 'Decision Pending', 'Approved', 'Rejected'].includes(c.currentStage)) {
      stageHistory.push({
        stage: 'EVC',
        startedAt: stageDate + 'T09:00:00Z',
        completedAt: c.currentStage === 'EVC' ? undefined : stageDate + 'T18:00:00Z',
        actor: c.evcMember || 'Prof. Expert Committee (AICTE Nominee)',
        actorRole: 'evc_coordinator',
        outcome: c.evcStatus === 'Completed' ? 'Inspection completed with minor undertakings' : 'Awaiting physical / hybrid inspection',
        durationDays: c.currentStage === 'EVC' ? c.stageDaysAgo : 14
      });
    }

    const evc: Application['evc'] = c.route.includes('EVC') ? {
      status: c.evcStatus || 'Not Scheduled',
      committeeMembers: c.evcMember ? [c.evcMember, 'Dr. Sunita Bansal (AICTE Observer)'] : [],
      scheduledDate: c.evcStatus === 'Scheduled' ? '2026-03-05' : undefined,
      hasConflict: c.hasConflict,
      conflictDetails: c.hasConflict ? 'Committee member Prof. Ramesh Kulkarni is assigned to two institutes on 2026-03-05 in different districts.' : undefined,
      outcomeRecord: c.evcStatus === 'Completed' ? 'Physical infrastructure verified. Lab equipment adequate. Recommended with condition of Occupancy Certificate.' : undefined,
      isNewInstitutionPriority: c.type === 'New Institution Approval'
    } : undefined;

    const partialApp: Application = {
      id: c.id,
      applicationNumber: c.id,
      institutionId: c.permId,
      institutionName: c.name,
      aictePermanentId: c.permId,
      region: c.region,
      state: c.state,
      type: c.type,
      route: c.route,
      routeVersion: 'APH-2026.v1',
      currentStage: c.currentStage,
      submissionDate: subDate,
      approvedIntake: c.intake,
      assignedOfficer: c.officer,
      supervisor: c.supervisor,
      lastUpdated: stageDate + 'T14:30:00Z',
      stageHistory,
      observations,
      evc,
      undertakings,
      documents,
      riskStatus: 'On track',
      delayRiskScore: 20,
      latestSafeDateForCurrentStage: '2026-04-15',
      daysRemainingInStage: 45,
      daysToApprovalCutoff: 60,
      riskReasons: [],
      complianceHealthScore: 90
    };

    // Calculate Deadline Guard initial risk
    const dg = evaluateDeadlineGuard(partialApp, simulatedDateStr, INITIAL_CALENDAR_CONFIG);
    return {
      ...partialApp,
      ...dg
    };
  });
}

/**
 * Generate initial cryptographic audit entries for the seed dataset
 */
export function generateInitialAuditLog(): AuditEntry[] {
  const entries: AuditEntry[] = [];
  let prevHash = GENESIS_HASH;

  const rawLogs = [
    {
      actor: 'System Initialization',
      actorRole: 'system_admin' as const,
      action: 'SYSTEM_BOOTSTRAP',
      objectType: 'System' as const,
      objectId: 'SYS-2026',
      timestamp: '2026-01-01T00:00:00Z',
      details: 'SAMAY core approval workflow engine and Deadline Guard initialized under Approval Process Handbook 2026-27 rules.'
    },
    {
      actor: 'Dr. V. K. Sharma (Adviser, Regulation Bureau)',
      actorRole: 'system_admin' as const,
      action: 'CALENDAR_CUTOFF_CONFIGURED',
      objectType: 'System' as const,
      objectId: 'CALENDAR-2026-27',
      timestamp: '2026-01-10T10:00:00Z',
      details: 'Statutory approval cutoff set to 2026-04-30 as per Supreme Court & APH directive. Rule version APH-2026.v1.4 locked.'
    },
    {
      actor: 'Shivaji Institute of Tech (Registrar)',
      actorRole: 'institution' as const,
      action: 'APPLICATION_SUBMITTED',
      objectType: 'Application' as const,
      objectId: 'APP-2026-W-1001',
      timestamp: '2026-01-10T14:30:00Z',
      details: 'Extension of Approval submitted with 1420 approved intake. Route assigned: Scrutiny + EVC.'
    },
    {
      actor: 'S. N. Patil (RO Mumbai)',
      actorRole: 'scrutiny_officer' as const,
      action: 'SCRUTINY_COMPLETED',
      objectType: 'Application' as const,
      objectId: 'APP-2026-W-1001',
      timestamp: '2026-02-07T16:00:00Z',
      details: 'Preliminary scrutiny cleared. Application routed to EVC Queue for committee scheduling.'
    },
    {
      actor: 'OCR & LLM Extraction Engine',
      actorRole: 'system_admin' as const,
      action: 'DOCUMENT_EXPIRY_PROPOSED',
      objectType: 'Document' as const,
      objectId: 'DOC-APP-2026-W-1001-1',
      timestamp: '2026-02-08T09:15:00Z',
      details: 'Extracted lease expiry date 2026-05-15 with 96.4% confidence from clause 4.1. Pending officer confirmation.'
    },
    {
      actor: 'S. N. Patil (RO Mumbai)',
      actorRole: 'scrutiny_officer' as const,
      action: 'DOCUMENT_EXPIRY_CONFIRMED',
      objectType: 'Document' as const,
      objectId: 'DOC-APP-2026-W-1001-1',
      timestamp: '2026-02-08T11:30:00Z',
      details: 'Officer confirmed AI proposed lease expiry 2026-05-15. Flagged as expiring within 15 days of academic cutoff.'
    },
    {
      actor: 'EVC Scheduling Engine',
      actorRole: 'evc_coordinator' as const,
      action: 'CONFLICT_DETECTED',
      objectType: 'EVC' as const,
      objectId: 'APP-2026-W-1002',
      timestamp: '2026-02-14T15:00:00Z',
      details: 'Double-booking conflict detected for Prof. Ramesh Kulkarni scheduled simultaneously at APP-2026-W-1002 and APP-2026-W-1003 on 2026-03-05.'
    },
    {
      actor: 'Deadline Guard Watchdog',
      actorRole: 'system_admin' as const,
      action: 'RISK_EVALUATION_PASS',
      objectType: 'System' as const,
      objectId: 'DG-CRON-CYCLE-01',
      timestamp: '2026-03-01T00:00:00Z',
      details: 'Evaluated 40 technical applications across 8 regions. 9 applications flagged as Will miss at current pace.'
    }
  ];

  rawLogs.forEach((l, idx) => {
    const hash = createBlockHash(
      prevHash,
      idx + 1,
      l.timestamp,
      l.actor,
      l.action,
      l.objectId,
      l.details
    );

    entries.push({
      id: `AUDIT-BLK-${idx + 1}`,
      blockIndex: idx + 1,
      timestamp: l.timestamp,
      actor: l.actor,
      actorRole: l.actorRole,
      action: l.action,
      objectType: l.objectType,
      objectId: l.objectId,
      details: l.details,
      previousHash: prevHash,
      hash
    });

    prevHash = hash;
  });

  return entries;
}

/**
 * Generate initial alert notifications
 */
export function generateInitialAlerts(): AlertNotification[] {
  return [
    {
      id: 'ALT-101',
      uniqueKey: 'ALT_STAGE_APP-2026-W-1001_EVC_NOT_SCHEDULED',
      applicationId: 'APP-2026-W-1001',
      institutionName: 'Shivaji Institute of Technology & Engineering',
      region: 'Western',
      eventType: 'EVC Due',
      recipientRole: 'evc_coordinator',
      recipientName: 'EVC Committee Coordinator (Western)',
      title: 'EVC Scheduling Overdue: Shivaji Institute of Technology',
      message: 'Application has spent 22 days in EVC stage without committee visit scheduled. Deadline Guard flags risk of missing 30 April cutoff.',
      timestamp: '2026-03-01T08:00:00Z',
      escalationLevel: 1,
      status: 'Pending',
      read: false,
      channel: 'In-App'
    },
    {
      id: 'ALT-102',
      uniqueKey: 'ALT_LEASE_APP-2026-W-1001_LEASE_EXPIRY',
      applicationId: 'APP-2026-W-1001',
      institutionName: 'Shivaji Institute of Technology & Engineering',
      region: 'Western',
      eventType: 'Lease Expiring Soon',
      recipientRole: 'institution',
      recipientName: 'Principal / Registrar, Shivaji Institute',
      title: 'Mandatory Land Lease Validity Alert',
      message: 'Your registered land lease expires on 15 May 2026. As per AICTE APH Chapter II, live lease must cover full academic cycle. Upload renewed registered lease deed.',
      timestamp: '2026-03-01T08:15:00Z',
      escalationLevel: 0,
      status: 'Sent',
      read: false,
      channel: 'SMS/WhatsApp'
    },
    {
      id: 'ALT-103',
      uniqueKey: 'ALT_CONFLICT_APP-2026-W-1002_KULKARNI_CONFLICT',
      applicationId: 'APP-2026-W-1002',
      institutionName: 'Vishwakarma Institute of Advanced Technology',
      region: 'Western',
      eventType: 'EVC Due',
      recipientRole: 'evc_coordinator',
      recipientName: 'EVC Coordinator (Western)',
      title: 'EVC Member Double-Booking Conflict Detected',
      message: 'Prof. Ramesh Kulkarni has two scheduled visits on 2026-03-05. Rebalance assignment immediately to avoid cancellation.',
      timestamp: '2026-02-28T17:30:00Z',
      escalationLevel: 1,
      status: 'Sent',
      read: false,
      channel: 'In-App'
    },
    {
      id: 'ALT-104',
      uniqueKey: 'ALT_STAGE_APP-2026-N-2001_SCRUTINY_OVERDUE',
      applicationId: 'APP-2026-N-2001',
      institutionName: 'Delhi Institute of Science & Polytechnic',
      region: 'Northern',
      eventType: 'Stage Overdue',
      recipientRole: 'regional_officer',
      recipientName: 'Dr. Sunita Bansal (RO North)',
      title: 'Scrutiny Ageing Breach: Delhi Institute of Science',
      message: 'Application ageing 18 days in Scrutiny (configured SLA: 12 days). Escalated to Regional Officer level.',
      timestamp: '2026-02-27T09:00:00Z',
      escalationLevel: 2,
      status: 'Late',
      read: false,
      channel: 'Email'
    }
  ];
}
