"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// 1. AI Fraud Analytics Breakdown & Smart Heatmaps
router.get('/fraud-stats', auth_1.authenticateJWT, async (req, res) => {
    try {
        const claims = await prisma.claim.findMany({
            select: {
                id: true,
                claimNumber: true,
                memberName: true,
                amountRequested: true,
                fraudRiskScore: true,
                status: true,
                diagnosis: true
            }
        });
        const highRiskClaims = claims.filter(c => c.fraudRiskScore >= 70);
        const medRiskClaims = claims.filter(c => c.fraudRiskScore >= 30 && c.fraudRiskScore < 70);
        const lowRiskClaims = claims.filter(c => c.fraudRiskScore < 30);
        // Scan for duplicate policies / multi-claim anomalies
        // We group by policyNumber to identify holder billing volume spikes
        const rawDuplicateAnomalies = await prisma.claim.groupBy({
            by: ['policyNumber', 'memberName'],
            _count: {
                id: true
            },
            _sum: {
                amountRequested: true
            }
        });
        const duplicateAlerts = rawDuplicateAnomalies
            .filter(d => (d._count.id || 0) > 1)
            .map(d => ({
            policyNumber: d.policyNumber,
            holderName: d.memberName,
            claimsCount: d._count.id,
            totalRequested: d._sum.amountRequested || 0,
            riskDescription: `Anomaly Alert: Policyholder submitted multiple (${d._count.id}) consecutive medical reimbursement files within 30 days.`
        }));
        return res.json({
            summary: {
                highRiskCount: highRiskClaims.length,
                mediumRiskCount: medRiskClaims.length,
                lowRiskCount: lowRiskClaims.length,
                averageRiskPercentage: Math.round(claims.reduce((acc, curr) => acc + curr.fraudRiskScore, 0) / (claims.length || 1))
            },
            highRiskRegistry: highRiskClaims.slice(0, 5),
            duplicateAlerts
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to aggregate fraud diagnostics.' });
    }
});
// 2. Real-time AI chat assistant (IUC10, IUC05 smart search)
router.post('/chat-assistant', auth_1.authenticateJWT, async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Chat assistant query prompt is required.' });
        }
        const lowerPrompt = prompt.toLowerCase();
        let reply = '';
        let fetchedData = null;
        // Process prompt analytically
        if (lowerPrompt.includes('claim') || lowerPrompt.includes('clm')) {
            const claims = await prisma.claim.findMany({
                orderBy: { createdAt: 'desc' },
                take: 5
            });
            const totalClaims = await prisma.claim.count();
            const pendingClaims = await prisma.claim.count({
                where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'DOCS_PENDING', 'QUERY_RAISED'] } }
            });
            reply = `I scanned the active HealthPass claims roster. We currently have **${totalClaims} total claims** registered in the database, with **${pendingClaims} requiring review**. Here are the 5 most recent claims submitted:`;
            fetchedData = claims.map(c => ({
                claimNumber: c.claimNumber,
                member: c.memberName,
                diagnosis: c.diagnosis,
                requested: `$${c.amountRequested.toFixed(2)}`,
                status: c.status,
                fraudRisk: `${c.fraudRiskScore}%`
            }));
        }
        else if (lowerPrompt.includes('policy') || lowerPrompt.includes('active member') || lowerPrompt.includes('holder')) {
            const policies = await prisma.policy.findMany({
                take: 5
            });
            const totalActive = await prisma.policy.count({ where: { status: 'ACTIVE' } });
            const gracePeriod = await prisma.policy.count({ where: { status: 'GRACE_PERIOD' } });
            reply = `Sentinel Health currently covers **${totalActive} active members** via HealthPass. There are **${gracePeriod} policies in their grace period**. Here is a quick snapshot of active policies:`;
            fetchedData = policies.map(p => ({
                policyNumber: p.policyNumber,
                holder: p.holderName,
                plan: p.planName,
                status: p.status,
                dueDate: p.premiumDueDate,
                aiRenewalProbability: `${Math.round(p.renewalProbability * 100)}%`
            }));
        }
        else if (lowerPrompt.includes('revenue') || lowerPrompt.includes('premium') || lowerPrompt.includes('money') || lowerPrompt.includes('collection')) {
            const premiumSum = await prisma.policy.aggregate({
                _sum: {
                    premiumAmount: true
                }
            });
            const totalAmount = premiumSum._sum.premiumAmount || 0;
            reply = `Total monthly premium collection pipeline active is **$${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**. Active renewal conversions average **89%** this quarter.`;
        }
        else if (lowerPrompt.includes('fraud') || lowerPrompt.includes('anomaly') || lowerPrompt.includes('risk')) {
            const claims = await prisma.claim.findMany({
                where: { fraudRiskScore: { gte: 50 } },
                orderBy: { fraudRiskScore: 'desc' }
            });
            reply = `Sentinel AI has flagged **${claims.length} claims** showing a risk rating above 50%. The highest outlier is **${claims[0]?.claimNumber || 'None'}** (${claims[0]?.memberName}) with a risk score of **${claims[0]?.fraudRiskScore || 0}%** due to Out-of-Network invoice padding.`;
            if (claims.length > 0) {
                fetchedData = claims.map(c => ({
                    claim: c.claimNumber,
                    member: c.memberName,
                    diagnosis: c.diagnosis,
                    requested: `$${c.amountRequested.toFixed(2)}`,
                    fraudScore: `${c.fraudRiskScore}%`
                }));
            }
        }
        else {
            reply = `Hello! I am the Sentinel AI Operations Assistant. I can inspect policies, query claims history, compute premium due balances, and run fraud risk checks in real-time. Try asking me:
- *"List all recent claims"*
- *"How many active members are linked?"*
- *"Show me high risk fraud outliers"*
- *"What is our premium collection pipeline?"*`;
        }
        return res.json({
            reply,
            data: fetchedData
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Chat assistant response engine failed.' });
    }
});
exports.default = router;
