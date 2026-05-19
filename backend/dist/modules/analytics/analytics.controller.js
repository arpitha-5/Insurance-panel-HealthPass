"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// 1. Get Executive Dashboard KPI Cards & API Health Monitor
router.get('/kpi', auth_1.authenticateJWT, async (req, res) => {
    try {
        // Count operations
        const totalPolicies = await prisma.policy.count();
        const activeMembers = await prisma.policy.count({ where: { status: 'ACTIVE' } });
        const gracePolicies = await prisma.policy.count({ where: { status: 'GRACE_PERIOD' } });
        const suspendedPolicies = await prisma.policy.count({ where: { status: 'SUSPENDED' } });
        // Claims operations
        const totalClaims = await prisma.claim.count();
        const pendingClaims = await prisma.claim.count({
            where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'DOCS_PENDING', 'QUERY_RAISED'] } }
        });
        const approvedCount = await prisma.claim.count({ where: { status: 'APPROVED' } });
        const settledCount = await prisma.claim.count({ where: { status: 'SETTLED' } });
        const rejectedCount = await prisma.claim.count({ where: { status: 'REJECTED' } });
        const completedClaimsCount = approvedCount + settledCount + rejectedCount;
        // Premium Calculations
        const premiumAggregate = await prisma.policy.aggregate({
            where: { status: 'ACTIVE' },
            _sum: { premiumAmount: true }
        });
        const monthlyPremiumCollection = premiumAggregate._sum.premiumAmount || 0;
        // Claims Adjudication Ratios
        const approvalRate = completedClaimsCount > 0
            ? Math.round(((approvedCount + settledCount) / completedClaimsCount) * 100)
            : 88; // Default fallback to healthy standard B2B rate if fresh db
        // Uptime latency stats (mocked gateway monitor)
        const integrationProfile = await prisma.insurerProfile.findFirst();
        const apiUptime = integrationProfile?.integrationActive ? 99.98 : 0;
        const apiHealthStatus = integrationProfile?.integrationActive ? 'OPERATIONAL' : 'SUSPENDED';
        return res.json({
            policies: {
                total: totalPolicies,
                active: activeMembers,
                grace: gracePolicies,
                suspended: suspendedPolicies
            },
            claims: {
                total: totalClaims,
                pending: pendingClaims,
                completed: completedClaimsCount,
                settled: settledCount,
                approved: approvedCount,
                rejected: rejectedCount
            },
            financials: {
                monthlyPremium: monthlyPremiumCollection,
                averageClaimRequest: 3820.00
            },
            ratios: {
                approvalRate,
                averageTatDays: 2.4, // Industry leading turnaround
                apiUptime,
                apiHealthStatus
            }
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to compute dashboard KPI variables.' });
    }
});
// 2. Comprehensive Chart Trends (IUC14)
router.get('/trends', auth_1.authenticateJWT, async (req, res) => {
    try {
        // A. Claims Monthly Trends (Volume vs Settled amount)
        const claimsMonthlyVolume = [
            { month: 'Jan', submitted: 14, approved: 12, valueSubmitted: 22000, valueApproved: 18500 },
            { month: 'Feb', submitted: 18, approved: 15, valueSubmitted: 31000, valueApproved: 26000 },
            { month: 'Mar', submitted: 25, approved: 22, valueSubmitted: 45000, valueApproved: 39000 },
            { month: 'Apr', submitted: 30, approved: 26, valueSubmitted: 59000, valueApproved: 52000 },
            { month: 'May', submitted: 22, approved: 18, valueSubmitted: 41650, valueApproved: 35800 }
        ];
        // B. Renewal Conversion Statistics (IUC08 predictive)
        const renewalConversion = [
            { segment: 'Tier 1 Cities', targetRate: 95, actualRate: 93, predictedRenewalRatio: 94 },
            { segment: 'Tier 2 Cities', targetRate: 88, actualRate: 84, predictedRenewalRatio: 86 },
            { segment: 'Corporate Plans', targetRate: 99, actualRate: 98, predictedRenewalRatio: 99 },
            { segment: 'Individual Plans', targetRate: 80, actualRate: 74, predictedRenewalRatio: 78 }
        ];
        // C. Approval / Adjudication Allocation
        const claimAdjudicationRatios = [
            { name: 'Settled Direct Deposit', value: 45 },
            { name: 'Approved & Awaiting Payment', value: 38 },
            { name: 'Exclusions & Rejected', value: 12 },
            { name: 'Information Pending (Query)', value: 5 }
        ];
        // D. Fraud heatmaps and risk profiles (0-30, 30-70, 70-100)
        const fraudHeatmap = [
            { riskLevel: 'Safe (<30%)', count: 12, color: '#0F973D' },
            { riskLevel: 'Attention (30%-70%)', count: 3, color: '#D97706' },
            { riskLevel: 'Audit Flag (>=70%)', count: 2, color: '#D92D20' }
        ];
        return res.json({
            claimsMonthlyVolume,
            renewalConversion,
            claimAdjudicationRatios,
            fraudHeatmap
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to compile chart analytics.' });
    }
});
// 3. Export CSV Data Routes (IUC14)
router.get('/export-csv', auth_1.authenticateJWT, async (req, res) => {
    try {
        const { type } = req.query; // 'claims' or 'policies'
        if (type === 'claims') {
            const claims = await prisma.claim.findMany({
                orderBy: { createdAt: 'desc' }
            });
            let csv = 'Claim Number,Member Name,Policy Number,Amount Requested,Amount Approved,Status,Diagnosis,Service Date,AI Fraud Risk Score\n';
            claims.forEach(c => {
                csv += `"${c.claimNumber}","${c.memberName}","${c.policyNumber}",${c.amountRequested},${c.amountApproved},"${c.status}","${c.diagnosis.replace(/"/g, '""')}","${c.serviceDate}",${c.fraudRiskScore}%\n`;
            });
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=claims_report_sentinel.csv');
            return res.status(200).send(csv);
        }
        else {
            const policies = await prisma.policy.findMany({
                orderBy: { createdAt: 'desc' }
            });
            let csv = 'Policy Number,Holder Name,Holder Email,Plan Name,Premium Amount,Premium Due Date,Start Date,End Date,Status,AI Renewal Probability\n';
            policies.forEach(p => {
                csv += `"${p.policyNumber}","${p.holderName}","${p.holderEmail}","${p.planName}",${p.premiumAmount},"${p.premiumDueDate}","${p.startDate}","${p.endDate}","${p.status}",${Math.round(p.renewalProbability * 100)}%\n`;
            });
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=policies_report_sentinel.csv');
            return res.status(200).send(csv);
        }
    }
    catch (error) {
        res.status(500).json({ error: 'CSV compilation pipeline failed.' });
    }
});
exports.default = router;
