import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Clean existing data
  await prisma.sessionLog.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.claim.deleteMany({});
  await prisma.policy.deleteMany({});
  await prisma.insurerProfile.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('🧹 Cleaned existing database tables.');

  // 2. Hash Passwords
  const salt = await bcrypt.genSalt(10);
  const defaultPasswordHash = await bcrypt.hash('password123', salt);

  // 3. Create Users
  const users = [
    {
      email: 'admin@sentinel.com',
      password: defaultPasswordHash,
      name: 'Sarah Jenkins',
      role: 'ADMIN',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      active: true,
      twoFactorEnabled: true,
      twoFactorSecret: 'JBSWY3DPEHPK3PXP'
    },
    {
      email: 'claims@sentinel.com',
      password: defaultPasswordHash,
      name: 'Michael Chen',
      role: 'CLAIMS_STAFF',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      active: true,
      twoFactorEnabled: false
    },
    {
      email: 'support@sentinel.com',
      password: defaultPasswordHash,
      name: 'Emma Watson',
      role: 'SUPPORT_STAFF',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      active: true,
      twoFactorEnabled: false
    },
    {
      email: 'auditor@sentinel.com',
      password: defaultPasswordHash,
      name: 'Arthur Pendragon',
      role: 'AUDITOR',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      active: true,
      twoFactorEnabled: false
    }
  ];

  for (const u of users) {
    await prisma.user.create({ data: u });
  }
  console.log('👥 Seeded Users (Admin, Claims Staff, Support Staff, Auditor).');

  // 4. Create Insurer Profile (IUC02)
  const profile = await prisma.insurerProfile.create({
    data: {
      companyName: 'Sentinel Health Insurance Corp',
      taxId: 'TX-987654321',
      supportEmail: 'partner-support@sentinelhealth.com',
      supportPhone: '+1 (800) 555-0199',
      address: '742 Evergreen Terrace, Suite 100, Austin, TX 78701',
      logo: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=120',
      integrationActive: true,
      apiEndpoint: 'https://api.sentinelhealth.com/v1/healthpass/validate',
      apiToken: 'shp_live_7a3d90f23d8c11e6b349f82d1c92a6ea'
    }
  });
  console.log('🏢 Seeded Insurer Profile.');

  // 5. Create Policies (IUC04, IUC05, IUC06, IUC07, IUC08, IUC09)
  const policies = [
    {
      policyNumber: 'POL-908123-HP',
      holderName: 'David Miller',
      holderEmail: 'david.miller@gmail.com',
      planName: 'Sentinel Elite Gold PPO',
      premiumAmount: 485.50,
      premiumDueDate: '2026-05-25',
      startDate: '2025-06-01',
      endDate: '2026-06-01',
      status: 'ACTIVE',
      renewalOffered: true,
      renewalProbability: 0.94
    },
    {
      policyNumber: 'POL-445892-HP',
      holderName: 'Jessica Taylor',
      holderEmail: 'jessica.t@yahoo.com',
      planName: 'Sentinel Core Silver HMO',
      premiumAmount: 320.00,
      premiumDueDate: '2026-05-01', // Grace period starts
      startDate: '2025-05-01',
      endDate: '2026-05-01',
      status: 'GRACE_PERIOD',
      renewalOffered: false,
      renewalProbability: 0.42
    },
    {
      policyNumber: 'POL-231149-HP',
      holderName: 'Marcus Aurelius',
      holderEmail: 'marcus.aurelius@rome.gov',
      planName: 'Sentinel High-Deductible HSA Premium',
      premiumAmount: 610.75,
      premiumDueDate: '2026-04-10', // Past grace, expired
      startDate: '2025-04-10',
      endDate: '2026-04-10',
      status: 'EXPIRED',
      renewalOffered: true,
      renewalProbability: 0.12
    },
    {
      policyNumber: 'POL-890234-HP',
      holderName: 'Sophia Loren',
      holderEmail: 'sophia.loren@hollywood.com',
      planName: 'Sentinel Elite Gold PPO',
      premiumAmount: 512.00,
      premiumDueDate: '2026-06-15',
      startDate: '2025-06-15',
      endDate: '2026-06-15',
      status: 'ACTIVE',
      renewalOffered: false,
      renewalProbability: 0.88
    },
    {
      policyNumber: 'POL-556778-HP',
      holderName: 'Robert Downey Jr.',
      holderEmail: 'rdj@stark.com',
      planName: 'Sentinel Executive Platinum Unlimited',
      premiumAmount: 1250.00,
      premiumDueDate: '2026-05-20',
      startDate: '2025-06-01',
      endDate: '2026-06-01',
      status: 'ACTIVE',
      renewalOffered: true,
      renewalProbability: 0.99
    },
    {
      policyNumber: 'POL-776632-HP',
      holderName: 'Emily Blunt',
      holderEmail: 'emily.blunt@actor.uk',
      planName: 'Sentinel Core Silver HMO',
      premiumAmount: 345.00,
      premiumDueDate: '2026-04-30', // Currently Suspended due to corporate change
      startDate: '2025-05-01',
      endDate: '2026-05-01',
      status: 'SUSPENDED',
      renewalOffered: false,
      renewalProbability: 0.05
    },
    {
      policyNumber: 'POL-112233-HP',
      holderName: 'John Doe',
      holderEmail: 'john.doe@gmail.com',
      planName: 'Sentinel Bronze Essential',
      premiumAmount: 195.00,
      premiumDueDate: '2026-05-05',
      startDate: '2025-05-05',
      endDate: '2026-05-05',
      status: 'GRACE_PERIOD',
      renewalOffered: true,
      renewalProbability: 0.78
    },
    {
      policyNumber: 'POL-445566-HP',
      holderName: 'Jane Smith',
      holderEmail: 'jane.smith@gmail.com',
      planName: 'Sentinel Elite Gold PPO',
      premiumAmount: 485.50,
      premiumDueDate: '2026-06-01',
      startDate: '2025-06-01',
      endDate: '2026-06-01',
      status: 'ACTIVE',
      renewalOffered: true,
      renewalProbability: 0.91
    }
  ];

  for (const p of policies) {
    await prisma.policy.create({ data: p });
  }
  console.log(`📋 Seeded ${policies.length} Policies.`);

  // 6. Create Claims (IUC10, IUC11, IUC12, IUC13)
  const claims = [
    {
      claimNumber: 'CLM-8902-2026',
      policyNumber: 'POL-908123-HP',
      memberName: 'David Miller',
      amountRequested: 4250.00,
      amountApproved: 3800.00,
      status: 'APPROVED',
      diagnosis: 'Acute Appendectomy & post-op recovery',
      serviceDate: '2026-05-10',
      fraudRiskScore: 8, // Very low risk
      urgencyRanking: 'HIGH',
      priorityScore: 82,
      documents: JSON.stringify([
        { id: 'doc1', name: 'hospital_invoice.pdf', url: '#', status: 'VERIFIED', category: 'BILL', uploadedAt: '2026-05-11' },
        { id: 'doc2', name: 'surgical_discharge_summary.pdf', url: '#', status: 'VERIFIED', category: 'MEDICAL_REPORT', uploadedAt: '2026-05-11' }
      ]),
      comments: JSON.stringify([
        { author: 'Michael Chen', role: 'CLAIMS_STAFF', text: 'Surgical and ICU invoice verified against hospital tariffs. Approving pre-negotiated rates.', date: '2026-05-12T14:32:00Z' }
      ]),
      timeline: JSON.stringify([
        { status: 'SUBMITTED', date: '2026-05-11T09:00:00Z', updatedBy: 'HealthPass API', note: 'Claim ingested from Member App' },
        { status: 'UNDER_REVIEW', date: '2026-05-11T10:15:00Z', updatedBy: 'Michael Chen', note: 'Manual adjudication initiated' },
        { status: 'APPROVED', date: '2026-05-12T14:35:00Z', updatedBy: 'Michael Chen', note: 'Surgical fees approved' }
      ])
    },
    {
      claimNumber: 'CLM-7711-2026',
      policyNumber: 'POL-445892-HP',
      memberName: 'Jessica Taylor',
      amountRequested: 850.00,
      amountApproved: 0,
      status: 'QUERY_RAISED',
      diagnosis: 'Magnetic Resonance Imaging (MRI) - Left Knee',
      serviceDate: '2026-05-02',
      fraudRiskScore: 32, // Medium risk
      urgencyRanking: 'MEDIUM',
      priorityScore: 48,
      documents: JSON.stringify([
        { id: 'doc3', name: 'mri_bill.pdf', url: '#', status: 'VERIFIED', category: 'BILL', uploadedAt: '2026-05-03' },
        { id: 'doc4', name: 'physician_referral.pdf', url: '#', status: 'PENDING_REVIEW', category: 'REFERRAL', uploadedAt: '2026-05-03' }
      ]),
      comments: JSON.stringify([
        { author: 'Michael Chen', role: 'CLAIMS_STAFF', text: 'Knee MRI request submitted. The diagnostic referral sheet seems blurred. Requested clean scan.', date: '2026-05-04T11:20:00Z' }
      ]),
      timeline: JSON.stringify([
        { status: 'SUBMITTED', date: '2026-05-03T18:40:00Z', updatedBy: 'HealthPass API', note: 'MRI claim received' },
        { status: 'QUERY_RAISED', date: '2026-05-04T11:22:00Z', updatedBy: 'Michael Chen', note: 'Requested legible copy of Physician Referral note.' }
      ])
    },
    {
      claimNumber: 'CLM-1209-2026',
      policyNumber: 'POL-556778-HP',
      memberName: 'Robert Downey Jr.',
      amountRequested: 18500.00,
      amountApproved: 18500.00,
      status: 'SETTLED',
      diagnosis: 'Emergency Cardiac Catheterization',
      serviceDate: '2026-05-05',
      fraudRiskScore: 12,
      urgencyRanking: 'CRITICAL',
      priorityScore: 97,
      documents: JSON.stringify([
        { id: 'doc5', name: 'cardiac_icu_invoice.pdf', url: '#', status: 'VERIFIED', category: 'BILL', uploadedAt: '2026-05-06' },
        { id: 'doc6', name: 'lab_reports_ecg.pdf', url: '#', status: 'VERIFIED', category: 'LAB_RESULTS', uploadedAt: '2026-05-06' }
      ]),
      comments: JSON.stringify([
        { author: 'Sarah Jenkins', role: 'ADMIN', text: 'Executive Platinum member emergency treatment. Auto-priority high-track. Bank transaction reference #TXN-778811 settled successfully.', date: '2026-05-07T16:00:00Z' }
      ]),
      timeline: JSON.stringify([
        { status: 'SUBMITTED', date: '2026-05-06T02:00:00Z', updatedBy: 'HealthPass API', note: 'Emergency claim ingested' },
        { status: 'UNDER_REVIEW', date: '2026-05-06T08:00:00Z', updatedBy: 'Michael Chen', note: 'Escalated to Executive tier' },
        { status: 'APPROVED', date: '2026-05-06T15:20:00Z', updatedBy: 'Sarah Jenkins', note: 'Approved under VIP zero-deductible waiver' },
        { status: 'SETTLED', date: '2026-05-07T16:00:00Z', updatedBy: 'System Auto-Pay', note: 'Electronic Fund Transfer completed' }
      ])
    },
    {
      claimNumber: 'CLM-4040-2026',
      policyNumber: 'POL-890234-HP',
      memberName: 'Sophia Loren',
      amountRequested: 3500.00,
      amountApproved: 0,
      status: 'REJECTED',
      diagnosis: 'Laser Vision Correction (Cosmetic LASIK)',
      serviceDate: '2026-04-20',
      fraudRiskScore: 55,
      urgencyRanking: 'LOW',
      priorityScore: 15,
      documents: JSON.stringify([
        { id: 'doc7', name: 'lasik_clinic_charge.pdf', url: '#', status: 'VERIFIED', category: 'BILL', uploadedAt: '2026-04-22' }
      ]),
      comments: JSON.stringify([
        { author: 'Michael Chen', role: 'CLAIMS_STAFF', text: 'Cosmetic procedures (LASIK) are explicitly excluded from this Gold PPO plan. Standard exclusion clause 14.b applies.', date: '2026-04-23T09:12:00Z' }
      ]),
      timeline: JSON.stringify([
        { status: 'SUBMITTED', date: '2026-04-22T10:00:00Z', updatedBy: 'HealthPass API' },
        { status: 'UNDER_REVIEW', date: '2026-04-22T14:00:00Z', updatedBy: 'Michael Chen' },
        { status: 'REJECTED', date: '2026-04-23T09:15:00Z', updatedBy: 'Michael Chen', note: 'Excluded cosmetic procedure.' }
      ])
    },
    {
      claimNumber: 'CLM-3312-2026',
      policyNumber: 'POL-908123-HP',
      memberName: 'David Miller',
      amountRequested: 12000.00,
      amountApproved: 0,
      status: 'UNDER_REVIEW',
      diagnosis: 'Repetitive Spine Adjustment Therapy (Out-of-Network)',
      serviceDate: '2026-05-14',
      fraudRiskScore: 87, // High risk (AI flagging possible billing inflation)
      urgencyRanking: 'MEDIUM',
      priorityScore: 71,
      documents: JSON.stringify([
        { id: 'doc8', name: 'chiropractic_invoice.pdf', url: '#', status: 'PENDING_REVIEW', category: 'BILL', uploadedAt: '2026-05-15' }
      ]),
      comments: JSON.stringify([
        { author: 'Michael Chen', role: 'CLAIMS_STAFF', text: 'AI Flagged high risk. $12,000 for 4 sessions of spinal adjustment is extremely above market standard. Undergoing intensive fraud audit.', date: '2026-05-16T10:00:00Z' }
      ]),
      timeline: JSON.stringify([
        { status: 'SUBMITTED', date: '2026-05-15T11:00:00Z', updatedBy: 'HealthPass API' },
        { status: 'UNDER_REVIEW', date: '2026-05-16T09:30:00Z', updatedBy: 'Michael Chen', note: 'AI risk model triggered manual review' }
      ])
    },
    {
      claimNumber: 'CLM-1002-2026',
      policyNumber: 'POL-112233-HP',
      memberName: 'John Doe',
      amountRequested: 450.00,
      amountApproved: 0,
      status: 'SUBMITTED',
      diagnosis: 'Consultation & Blood Panel Lab Work',
      serviceDate: '2026-05-16',
      fraudRiskScore: 15,
      urgencyRanking: 'LOW',
      priorityScore: 35,
      documents: JSON.stringify([
        { id: 'doc9', name: 'diagnostic_invoice.pdf', url: '#', status: 'PENDING_REVIEW', category: 'BILL', uploadedAt: '2026-05-17' }
      ]),
      comments: JSON.stringify([]),
      timeline: JSON.stringify([
        { status: 'SUBMITTED', date: '2026-05-17T15:44:00Z', updatedBy: 'HealthPass API', note: 'Claim filed' }
      ])
    },
    {
      claimNumber: 'CLM-1003-2026',
      policyNumber: 'POL-445566-HP',
      memberName: 'Jane Smith',
      amountRequested: 3800.00,
      amountApproved: 0,
      status: 'DOCS_PENDING',
      diagnosis: 'Chronic Bronchitis Inpatient Treatment',
      serviceDate: '2026-05-10',
      fraudRiskScore: 21,
      urgencyRanking: 'HIGH',
      priorityScore: 68,
      documents: JSON.stringify([
        { id: 'doc10', name: 'icu_stay_invoice.pdf', url: '#', status: 'VERIFIED', category: 'BILL', uploadedAt: '2026-05-11' },
        { id: 'doc11', name: 'discharge_form.pdf', url: '#', status: 'REJECTED', category: 'MEDICAL_REPORT', uploadedAt: '2026-05-11' }
      ]),
      comments: JSON.stringify([
        { author: 'Michael Chen', role: 'CLAIMS_STAFF', text: 'The uploaded discharge form is missing the physician stamp and signing credentials. Set status to Docs Pending and alerted.', date: '2026-05-13T10:44:00Z' }
      ]),
      timeline: JSON.stringify([
        { status: 'SUBMITTED', date: '2026-05-11T12:00:00Z', updatedBy: 'HealthPass API' },
        { status: 'UNDER_REVIEW', date: '2026-05-12T09:00:00Z', updatedBy: 'Michael Chen' },
        { status: 'DOCS_PENDING', date: '2026-05-13T10:45:00Z', updatedBy: 'Michael Chen', note: 'Awaiting certified physician stamp on discharge papers' }
      ])
    }
  ];

  for (const c of claims) {
    await prisma.claim.create({ data: c });
  }
  console.log(`⚕️ Seeded ${claims.length} Claims.`);

  // 7. Seed Session Logs (Active device management)
  const sessions = [
    {
      userId: 'Sarah Jenkins',
      userName: 'Sarah Jenkins',
      ipAddress: '192.168.1.42',
      device: 'Chrome on Windows 11 (Desktop)',
      location: 'Austin, TX',
      active: true,
      lastActive: new Date()
    },
    {
      userId: 'Sarah Jenkins',
      userName: 'Sarah Jenkins',
      ipAddress: '172.56.21.90',
      device: 'Safari on iPhone 15 Pro (Mobile)',
      location: 'Dallas, TX',
      active: false,
      lastActive: new Date(Date.now() - 3600000 * 4) // 4 hours ago
    },
    {
      userId: 'Michael Chen',
      userName: 'Michael Chen',
      ipAddress: '192.168.1.112',
      device: 'Firefox on macOS Sonoma (Desktop)',
      location: 'Austin, TX',
      active: true,
      lastActive: new Date()
    }
  ];

  for (const s of sessions) {
    await prisma.sessionLog.create({ data: s });
  }
  console.log('💻 Seeded Active Security Session Logs.');

  // 8. Seed Compliance Audit Logs
  const auditLogs = [
    {
      userId: 'system',
      userName: 'HealthPass Core Sync',
      userRole: 'SYSTEM',
      action: 'API_INTEGRATION_SYNC',
      details: 'Synchronized 18 pending policy validations and 3 renewal schedules successfully.',
      ipAddress: '44.204.12.189',
      device: 'HealthPass Core Server IP'
    },
    {
      userId: 'admin-id',
      userName: 'Sarah Jenkins',
      userRole: 'ADMIN',
      action: 'UPDATE_INSURER_PROFILE',
      details: 'Updated official B2B support hotline and tax identifier numbers.',
      ipAddress: '192.168.1.42',
      device: 'Chrome on Windows 11'
    },
    {
      userId: 'claims-id',
      userName: 'Michael Chen',
      userRole: 'CLAIMS_STAFF',
      action: 'APPROVE_CLAIM',
      details: 'Approved claim CLM-8902-2026 for member David Miller for $3,800.00.',
      ipAddress: '192.168.1.112',
      device: 'Firefox on macOS Sonoma'
    }
  ];

  for (const al of auditLogs) {
    await prisma.auditLog.create({ data: al });
  }
  console.log('🛡️ Seeded Security Compliance Audit Logs.');

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed with error:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
