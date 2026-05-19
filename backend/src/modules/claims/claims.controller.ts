import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateJWT, requireRoles, AuthenticatedRequest } from '../../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Helper to update claim timeline
function appendTimeline(currentTimelineStr: string, status: string, updatedBy: string, note?: string) {
  try {
    const timeline = JSON.parse(currentTimelineStr || '[]');
    timeline.push({
      status,
      date: new Date().toISOString(),
      updatedBy,
      note: note || `Claim status updated to ${status}`
    });
    return JSON.stringify(timeline);
  } catch (error) {
    return currentTimelineStr;
  }
}

// 1. Get All Claims (IUC10)
router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, search, urgency } = req.query;

    let filter: any = {};
    if (status) {
      filter.status = status as string;
    }
    if (urgency) {
      filter.urgencyRanking = urgency as string;
    }
    if (search) {
      filter.OR = [
        { claimNumber: { contains: search as string } },
        { policyNumber: { contains: search as string } },
        { memberName: { contains: search as string } },
        { diagnosis: { contains: search as string } }
      ];
    }

    const claims = await prisma.claim.findMany({
      where: filter,
      orderBy: [
        { priorityScore: 'desc' }, // AI auto-prioritization order first
        { createdAt: 'desc' }
      ]
    });

    return res.json(claims);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve claims register.' });
  }
});

// 2. Claim Intake Review / Detail (IUC10)
router.get('/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const claim = await prisma.claim.findUnique({ where: { id } });
    if (!claim) {
      return res.status(404).json({ error: 'Claim registry not found.' });
    }

    // Grab corresponding policy data as well for cross-referencing coverages
    const policy = await prisma.policy.findUnique({
      where: { policyNumber: claim.policyNumber }
    });

    return res.json({
      claim,
      policyCoverage: policy || null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to perform claim intake check.' });
  }
});

// 3. Request Additional Documents (IUC11)
router.post('/:id/request-documents', authenticateJWT, requireRoles(['ADMIN', 'CLAIMS_STAFF']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated.' });
    const { id } = req.params;
    const { documentName, commentText } = req.body;

    if (!documentName) {
      return res.status(400).json({ error: 'Specific requested document name is required.' });
    }

    const claim = await prisma.claim.findUnique({ where: { id } });
    if (!claim) {
      return res.status(404).json({ error: 'Claim not found.' });
    }

    // 1. Update Documents JSON Array
    const docs = JSON.parse(claim.documents || '[]');
    const newDocId = `doc_${Date.now()}`;
    docs.push({
      id: newDocId,
      name: documentName,
      url: '#',
      status: 'PENDING',
      category: 'ADDITIONAL_REQUEST',
      uploadedAt: null
    });

    // 2. Update Comments JSON Array
    const comments = JSON.parse(claim.comments || '[]');
    const requestedComment = `Missing document requested: "${documentName}". ${commentText || ''}`;
    comments.push({
      author: req.user.name,
      role: req.user.role,
      text: requestedComment,
      date: new Date().toISOString()
    });

    // 3. Update status & timeline
    const updatedStatus = 'QUERY_RAISED';
    const updatedTimeline = appendTimeline(
      claim.timeline,
      updatedStatus,
      req.user.name,
      `Requested missing document: ${documentName}`
    );

    const updatedClaim = await prisma.claim.update({
      where: { id },
      data: {
        documents: JSON.stringify(docs),
        comments: JSON.stringify(comments),
        status: updatedStatus,
        timeline: updatedTimeline
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'CLAIM_REQUEST_DOCS',
        details: `Dispatched document request for "${documentName}" on claim ${claim.claimNumber}. Status changed to QUERY_RAISED.`,
        ipAddress: req.ip || '127.0.0.1',
        device: req.headers['user-agent'] || 'Unknown'
      }
    });

    return res.json(updatedClaim);

  } catch (error) {
    console.error('Request documents error:', error);
    res.status(500).json({ error: 'Failed to request document upload.' });
  }
});

// 4. Update Claim Status (IUC12) - Generic state progress
router.put('/:id/status', authenticateJWT, requireRoles(['ADMIN', 'CLAIMS_STAFF']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated.' });
    const { id } = req.params;
    const { status, note } = req.body;

    const validStatuses = ['SUBMITTED', 'UNDER_REVIEW', 'QUERY_RAISED', 'DOCS_PENDING', 'APPROVED', 'REJECTED', 'SETTLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid claim status parameter.' });
    }

    const claim = await prisma.claim.findUnique({ where: { id } });
    if (!claim) {
      return res.status(404).json({ error: 'Claim not found.' });
    }

    const updatedTimeline = appendTimeline(claim.timeline, status, req.user.name, note);

    const updatedClaim = await prisma.claim.update({
      where: { id },
      data: {
        status,
        timeline: updatedTimeline
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'UPDATE_CLAIM_STATUS',
        details: `Updated state of claim ${claim.claimNumber} to ${status}. Note: ${note || 'None'}`,
        ipAddress: req.ip || '127.0.0.1',
        device: req.headers['user-agent'] || 'Unknown'
      }
    });

    return res.json(updatedClaim);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update claim state parameters.' });
  }
});

// 5. Final Adjudication / Update Settlement or Rejection (IUC13)
router.post('/:id/adjudicate', authenticateJWT, requireRoles(['ADMIN', 'CLAIMS_STAFF']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated.' });
    const { id } = req.params;
    const { decision, amountApproved, rejectionReason, internalNote } = req.body;

    if (decision !== 'APPROVE' && decision !== 'REJECT') {
      return res.status(400).json({ error: 'Adjudication decision must be either APPROVE or REJECT.' });
    }

    const claim = await prisma.claim.findUnique({ where: { id } });
    if (!claim) {
      return res.status(404).json({ error: 'Claim not found.' });
    }

    const comments = JSON.parse(claim.comments || '[]');
    let updatedStatus = '';
    let detailsText = '';

    if (decision === 'APPROVE') {
      if (typeof amountApproved !== 'number' || amountApproved < 0) {
        return res.status(400).json({ error: 'Approved financial amount is required.' });
      }

      updatedStatus = 'APPROVED';
      detailsText = `Approved claim for $${amountApproved.toFixed(2)}. ${internalNote || ''}`;
      comments.push({
        author: req.user.name,
        role: req.user.role,
        text: `Adjudication Decision: APPROVED. Approved Coverage Amount: $${amountApproved.toFixed(2)}. Note: ${internalNote || 'None'}`,
        date: new Date().toISOString()
      });
    } else {
      if (!rejectionReason) {
        return res.status(400).json({ error: 'A formal rejection reason is required.' });
      }

      updatedStatus = 'REJECTED';
      detailsText = `Rejected claim. Reason: ${rejectionReason}. ${internalNote || ''}`;
      comments.push({
        author: req.user.name,
        role: req.user.role,
        text: `Adjudication Decision: REJECTED. Exclusion Reason: "${rejectionReason}". Note: ${internalNote || 'None'}`,
        date: new Date().toISOString()
      });
    }

    const updatedTimeline = appendTimeline(claim.timeline, updatedStatus, req.user.name, detailsText);

    const updatedClaim = await prisma.claim.update({
      where: { id },
      data: {
        status: updatedStatus,
        amountApproved: decision === 'APPROVE' ? amountApproved : 0,
        comments: JSON.stringify(comments),
        timeline: updatedTimeline
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: decision === 'APPROVE' ? 'CLAIM_ADJUDICATION_APPROVE' : 'CLAIM_ADJUDICATION_REJECT',
        details: `Finalized adjudication decision on ${claim.claimNumber}: ${updatedStatus}. Details: ${detailsText}`,
        ipAddress: req.ip || '127.0.0.1',
        device: req.headers['user-agent'] || 'Unknown'
      }
    });

    return res.json(updatedClaim);

  } catch (error) {
    res.status(500).json({ error: 'Failed to process claim adjudication decision.' });
  }
});

// 6. Complete Claim Settlement (IUC13) - Move APPROVED to SETTLED
router.post('/:id/settle', authenticateJWT, requireRoles(['ADMIN', 'CLAIMS_STAFF']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated.' });
    const { id } = req.params;
    const { transactionReference, bankRoutingNumber } = req.body;

    const claim = await prisma.claim.findUnique({ where: { id } });
    if (!claim) {
      return res.status(404).json({ error: 'Claim not found.' });
    }

    if (claim.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Only approved claims can be processed for wire settlement.' });
    }

    const txnRef = transactionReference || `TXN-EFT-${Math.floor(Math.random() * 900000) + 100000}`;
    const bankRef = bankRoutingNumber ? `Routing: ${bankRoutingNumber}` : 'Standard Clearinghouse Wire';

    const comments = JSON.parse(claim.comments || '[]');
    comments.push({
      author: 'Electronic Pay Systems',
      role: 'SYSTEM',
      text: `Settlement completed successfully. Disbursed $${claim.amountApproved.toFixed(2)} via direct electronic fund transfer. Reference ID: ${txnRef}. ${bankRef}`,
      date: new Date().toISOString()
    });

    const updatedStatus = 'SETTLED';
    const updatedTimeline = appendTimeline(
      claim.timeline,
      updatedStatus,
      'System Auto-Pay',
      `Direct deposit cleared. Reference: ${txnRef}`
    );

    const updatedClaim = await prisma.claim.update({
      where: { id },
      data: {
        status: updatedStatus,
        comments: JSON.stringify(comments),
        timeline: updatedTimeline
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'CLAIM_SETTLEMENT',
        details: `Settled claim ${claim.claimNumber} for $${claim.amountApproved.toFixed(2)}. EFT Reference: ${txnRef}`,
        ipAddress: req.ip || '127.0.0.1',
        device: req.headers['user-agent'] || 'Unknown'
      }
    });

    return res.json(updatedClaim);

  } catch (error) {
    res.status(500).json({ error: 'Failed to process EFT wire settlement.' });
  }
});

// 7. Add Internal Staff Note / Team Comments
router.post('/:id/comments', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated.' });
    const { id } = req.params;
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Comment body text is required.' });
    }

    const claim = await prisma.claim.findUnique({ where: { id } });
    if (!claim) {
      return res.status(404).json({ error: 'Claim not found.' });
    }

    const comments = JSON.parse(claim.comments || '[]');
    comments.push({
      author: req.user.name,
      role: req.user.role,
      text,
      date: new Date().toISOString()
    });

    const updatedClaim = await prisma.claim.update({
      where: { id },
      data: {
        comments: JSON.stringify(comments)
      }
    });

    return res.json(updatedClaim);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add collaboration comments.' });
  }
});

// 8. Interactive OCR Bill Scanning Simulator
router.post('/ocr/simulate', authenticateJWT, async (req, res) => {
  try {
    const { fileName } = req.body;

    // Simulate network delay for premium look
    const mockScannerResults = [
      {
        fileName: 'hospital_bill.pdf',
        extractedAmount: 1850.00,
        extractedDiagnosis: 'Acute Inpatient Bronchitis & IV Treatment',
        serviceDate: '2026-05-09',
        confidenceScore: 98.4,
        policyCandidate: 'POL-445566-HP',
        patientName: 'Jane Smith'
      },
      {
        fileName: 'mri_scan_invoice.pdf',
        extractedAmount: 950.00,
        extractedDiagnosis: 'Knee MRI scan with diagnostic evaluation',
        serviceDate: '2026-05-14',
        confidenceScore: 95.8,
        policyCandidate: 'POL-445892-HP',
        patientName: 'Jessica Taylor'
      },
      {
        fileName: 'dental_checkup.pdf',
        extractedAmount: 250.00,
        extractedDiagnosis: 'Routine Dental scaling & cavity filling',
        serviceDate: '2026-05-18',
        confidenceScore: 91.2,
        policyCandidate: 'POL-908123-HP',
        patientName: 'David Miller'
      }
    ];

    // Standard fallback
    const result = mockScannerResults.find(m => fileName?.toLowerCase().includes(m.fileName.split('.')[0])) || {
      fileName: fileName || 'uploaded_document.pdf',
      extractedAmount: Math.floor(Math.random() * 4500) + 500,
      extractedDiagnosis: 'Unspecified outpatient consultation & diagnostic checkup',
      serviceDate: new Date().toISOString().split('T')[0],
      confidenceScore: 88.7,
      policyCandidate: 'POL-908123-HP',
      patientName: 'David Miller'
    };

    return res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'OCR simulation scan engine failed.' });
  }
});

export default router;
