import { SupportedLanguage } from './types';

export interface APHRuleItem {
  id: string;
  chapter: string;
  clause: string;
  title: string;
  summary: string;
  legalReference: string;
}

export const APH_RULES: APHRuleItem[] = [
  {
    id: 'APH-R1',
    chapter: 'Chapter I',
    clause: 'Clause 1.4 (Statutory Approval Cutoff)',
    title: 'Final Approval Cutoff Date 30th April',
    summary: 'No Extension of Approval (EoA), New Course, or Intake increase shall be granted after 30th April of the preceding academic calendar year, in strict compliance with the Supreme Court ruling.',
    legalReference: 'Supreme Court Civil Appeal No. 9048 of 2012 / APH 2024-27 Clause 1.4'
  },
  {
    id: 'APH-R2',
    chapter: 'Chapter II',
    clause: 'Clause 2.11 (Land & Lease Validity)',
    title: 'Land Ownership and Mandatory Remaining Lease Period',
    summary: 'Institutions operating on leased land must possess a registered lease deed of at least 30 years (or minimum remaining 5 years beyond current academic session). If remaining lease expires prior to academic year completion, EoA shall not be issued without registered renewal deed.',
    legalReference: 'AICTE Approval Process Handbook Clause 2.11 & AICTE FAQ Bulletin'
  },
  {
    id: 'APH-R3',
    chapter: 'Chapter III',
    clause: 'Clause 3.6 (Expert Visit Committee Norms)',
    title: 'EVC Quorum & Conflict of Interest Safeguards',
    summary: 'EVC committee shall consist of minimum 2 independent domain experts. No expert shall be assigned to multiple institutes on identical dates or within conflict proximity. Inspection reports must be uploaded within 24 hours of visit.',
    legalReference: 'AICTE Regulation Bureau Manual Section 4.3'
  },
  {
    id: 'APH-R4',
    chapter: 'Chapter IV',
    clause: 'Clause 4.8 (Time-Bound Undertakings)',
    title: 'Compliance Verification & Undertaking Escalation Ladder',
    summary: 'Approvals granted subject to undertakings (e.g. Occupancy Certificate, Lab upgrades) must be satisfied within specified days. Unfulfilled undertakings trigger escalation ladder: +3d Supervisor, +7d Regional Officer, +14d Bureau Officer / No Admission Category.',
    legalReference: 'Standing Hearing Committee Circular 2018 / APH Clause 4.8'
  },
  {
    id: 'APH-R5',
    chapter: 'Chapter V',
    clause: 'Clause 5.2 (Statutory Decision Authority)',
    title: 'Competent Authority Final Grant / Rejection',
    summary: 'Automated algorithms, scrutiny panels and EVC teams are advisory and decision-support only. Final statutory grant or speaking order rejection remains exclusively with the Competent AICTE Authority (Chairman / Member Secretary).',
    legalReference: 'AICTE Act 1987 Section 10(k)'
  }
];

export const TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    systemTitle: 'SAMAY',
    subTitle: 'AICTE Smart Approval, Monitoring & Alert System',
    problemStatement: 'SIH 2026 · AICTE Regulation Bureau · Problem SIH26262',
    deadlineGuard: 'Deadline Guard',
    countdown: 'Days to Statutory Cutoff (30 April)',
    onTrack: 'On Track',
    tight: 'Tight Timeline',
    willMiss: 'Will Miss at Current Pace',
    studentImpact: 'Student-Impact Triage',
    studentImpactDesc: 'Ranks at-risk institutions by approved student intake to prevent academic disruptions',
    studentsAffected: 'Students Affected',
    leaseRadar: 'Lease Radar',
    leaseRadarDesc: 'Institutions with short or lapsing land leases before approval window',
    auditLedger: 'Tamper-Evident Audit Chain',
    auditDesc: 'Cryptographically chained SHA-256 blocks with instant integrity verification',
    evcScheduler: 'EVC Scheduling & Conflicts',
    undertakingsRegister: 'Institutional Undertakings',
    roleSwitcher: 'Switch Role',
    activeRegion: 'Region Scope',
    advanceClock: 'Simulate Clock',
    runDemo: 'Run 3-Min Demo Script',
    verifyChain: 'Verify Cryptographic Integrity',
    simulateTampering: 'Simulate Tampering Attack',
    restoreIntegrity: 'Restore Chain Integrity',
    officerCopilot: 'Officer Copilot AI',
    quickFilters: 'Filter by Region / Stage / Risk',
    electronicCaseSummary: 'Generate Electronic Case Summary',
    grantApproval: 'Grant Statutory Approval (EoA)',
    rejectApplication: 'Reject with Speaking Order',
    returnWithReason: 'Return with Reason',
    resubmit: 'Resubmit with Clarifications',
    scheduleEvc: 'Schedule Expert Visit',
    resolveConflict: 'Reassign / Resolve Conflict',
    uploadRenewedLease: 'Upload Renewed Registered Lease',
    ocrExtract: 'Extract Lease Expiry Date via OCR & AI',
    confirmExpiry: 'Confirm Extracted Expiry Date',
    complianceHealth: 'Compliance Health Score'
  },
  hi: {
    systemTitle: 'समय (SAMAY)',
    subTitle: 'अखिल भारतीय तकनीकी शिक्षा परिषद (एआईसीटीई) अनुमोदन एवं सतर्कता प्रणाली',
    problemStatement: 'स्मार्ट इंडिया हैकाथॉन 2026 · एआईसीटीई विनियमन ब्यूरो · समस्या कोड SIH26262',
    deadlineGuard: 'डेडलाइन गार्ड (समय रक्षक)',
    countdown: 'वैधानिक अनुमोदन अंतिम तिथि (30 अप्रैल) तक शेष दिन',
    onTrack: 'समय पर (सक्रिय)',
    tight: 'कठिन समय सीमा (सावधानी)',
    willMiss: 'वर्तमान गति से विलंबित (गंभीर)',
    studentImpact: 'छात्र-प्रभाव प्राथमिकता सूची',
    studentImpactDesc: 'छात्रों के भविष्य की सुरक्षा के लिए छात्र संख्या के आधार पर जोखिम वाले संस्थानों की प्राथमिकता',
    studentsAffected: 'प्रभावित छात्र संख्या',
    leaseRadar: 'पट्टा वैधता रडार (Lease Radar)',
    leaseRadarDesc: 'अनुमोदन खिड़की से पहले समाप्त होने वाले भूमि पट्टा दस्तावेजों की पहचान',
    auditLedger: 'छेड़छाड़-प्रमाणित ऑडिट लेजर',
    auditDesc: 'क्रिप्टोग्राफिक SHA-256 ब्लॉकचेन सत्यापन प्रणाली',
    evcScheduler: 'विशेषज्ञ समिति (EVC) समय-सारणी एवं द्वंद्व पहचान',
    undertakingsRegister: 'संस्थान वचनबद्धता एवं अनुपालन',
    roleSwitcher: 'भूमिका बदलें',
    activeRegion: 'क्षेत्रीय दायरा',
    advanceClock: 'सिम्युलेटेड घड़ी आगे बढ़ाएं',
    runDemo: '3 मिनट की डेमो स्क्रिप्ट चलाएं',
    verifyChain: 'क्रिप्टोग्राफिक अखंडता सत्यापित करें',
    simulateTampering: 'छेड़छाड़ (Tampering) का परीक्षण करें',
    restoreIntegrity: 'अखंडता पुनर्स्थापित करें',
    officerCopilot: 'अधिकारी सहायक एआई (Copilot)',
    quickFilters: 'क्षेत्र / चरण / जोखिम अनुसार फ़िल्टर',
    electronicCaseSummary: 'इलेक्ट्रॉनिक केस सारांश तैयार करें',
    grantApproval: 'वैधानिक अनुमोदन प्रदान करें (सक्षम प्राधिकारी)',
    rejectApplication: 'कारण सहित अस्वीकृत करें',
    returnWithReason: 'संस्थान को कारण सहित वापस भेजें',
    resubmit: 'स्पष्टीकरण के साथ पुनः प्रस्तुत करें',
    scheduleEvc: 'विशेषज्ञ समिति दौरा निर्धारित करें',
    resolveConflict: 'द्वंद्व का समाधान करें',
    uploadRenewedLease: 'नवीनीकृत पंजीकृत पट्टा अपलोड करें',
    ocrExtract: 'ओसीआर और एआई द्वारा पट्टा समाप्ति तिथि निकालें',
    confirmExpiry: 'निकाली गई तिथि की पुष्टि करें',
    complianceHealth: 'अनुपालन स्वास्थ्य स्कोर'
  },
  mr: {
    systemTitle: 'समय (SAMAY)',
    subTitle: 'अखिल भारतीय तंत्रशिक्षण परिषद (AICTE) मान्यता आणि दक्षता प्रणाली',
    problemStatement: 'स्मार्ट इंडिया हॅकाथॉन २०२६ · AICTE नियमन ब्युरो · समस्या क्र. SIH26262',
    deadlineGuard: 'डेडलाइन गार्ड (अंतिम मुदत रक्षक)',
    countdown: 'मान्यता अंतिम मुदतीपर्यंत (३० एप्रिल) उर्वरित दिवस',
    onTrack: 'वेळेवर प्रगतीपथावर',
    tight: 'मर्यादित कालावधी',
    willMiss: 'सध्याच्या गतीने मुदत चुकण्याची शक्यता',
    studentImpact: 'विद्यार्थी-प्रभाव प्राधान्य क्रमवारी',
    studentImpactDesc: 'विद्यार्थ्यांचे नुकसान टाळण्यासाठी मंजूर प्रवेश क्षमतेनुसार धोका असलेल्या संस्थांची वर्गवारी',
    studentsAffected: 'बाधित विद्यार्थी संख्या',
    leaseRadar: 'जमीन भाडेपट्टा रडार (Lease Radar)',
    leaseRadarDesc: 'मान्यता कालावधीपूर्वी मुदत संपणाऱ्या भाडेपट्ट्यांची स्वयंचलित सूचना',
    auditLedger: 'अखंडता-तपासणी ऑडिट नोंदवही',
    auditDesc: 'SHA-256 क्रिप्टोग्राफिक ब्लॉकचेन पडताळणी',
    evcScheduler: 'तज्ज्ञ समिती (EVC) नियोजन आणि संघर्ष निवारण',
    undertakingsRegister: 'हमीपत्र व अनुपालन व्यवस्थापन',
    roleSwitcher: 'भूमिका बदला',
    activeRegion: 'प्रादेशिक व्याप्ती',
    advanceClock: 'घड्याळ पुढे सरकवा',
    runDemo: '३ मिनिटांचे प्रात्यक्षिक सुरू करा',
    verifyChain: 'क्रिप्टोग्राफिक अखंडता पडताळा',
    simulateTampering: 'डेटा फेरफार चाचणी करा',
    restoreIntegrity: 'नोंदवही पूर्ववत करा',
    officerCopilot: 'अधिकारी सहाय्यक एआय (Copilot)',
    quickFilters: 'विभाग / टप्पा / धोका वर्गवारीनुसार शोधा',
    electronicCaseSummary: 'इलेक्ट्रॉनिक केस सारांश तयार करा',
    grantApproval: 'वैधानिक मान्यता प्रदान करा (सक्षम प्राधिकारी)',
    rejectApplication: 'सकारण नामंजूर करा',
    returnWithReason: 'त्रुटीसह संस्थेकडे परत पाठवा',
    resubmit: 'खुलाश्यासह पुन्हा सादर करा',
    scheduleEvc: 'तज्ज्ञ समिती भेट निश्चित करा',
    resolveConflict: 'संघर्ष सोडवा',
    uploadRenewedLease: 'नूतनीकृत भाडेपट्टा दस्तऐवज अपलोड करा',
    ocrExtract: 'दस्तऐवजातून मुदत संपण्याची तारीख ओळखा',
    confirmExpiry: 'ओळखलेल्या तारखेची पुष्टी करा',
    complianceHealth: 'अनुपालन आरोग्य गुण'
  }
};
