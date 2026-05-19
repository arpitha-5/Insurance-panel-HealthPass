"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// 1. Get All Linked Policies (IUC05)
router.get('/', auth_1.authenticateJWT, async (req, res) => {
    try {
        const { status, search } = req.query;
        let filter = {};
        if (status) {
            filter.status = status;
        }
        if (search) {
            filter.OR = [
                { policyNumber: { contains: search } },
                { holderName: { contains: search } },
                { holderEmail: { contains: search } }
            ];
        }
        const policies = await prisma.policy.findMany({
            where: filter,
            orderBy: { createdAt: 'desc' }
        });
        return res.json(policies);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to retrieve policy registers.' });
    }
});
// 2. Validate Linked Policy (IUC04)
router.post('/validate', auth_1.authenticateJWT, async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Unauthenticated.' });
        const { policyNumber } = req.body;
        if (!policyNumber) {
            return res.status(400).json({ error: 'Policy Number is required for validation.' });
        }
        // Check integration state first
        const profile = await prisma.insurerProfile.findFirst();
        if (profile && !profile.integrationActive) {
            return res.status(503).json({
                isValid: false,
                error: 'INTEGRATION_SUSPENDED',
                message: 'The B2B synchronization panel has been suspended by Sentinel Health. Validation services are offline.'
            });
        }
        const policy = await prisma.policy.findUnique({
            where: { policyNumber }
        });
        // Create log for compliance audit trails
        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                userName: req.user.name,
                userRole: req.user.role,
                action: 'VALIDATE_POLICY',
                details: `Queried policy validation for: ${policyNumber}. Found match: ${!!policy}`,
                ipAddress: req.ip || '127.0.0.1',
                device: req.headers['user-agent'] || 'Unknown'
            }
        });
        if (!policy) {
            return res.json({
                isValid: false,
                message: 'No policy found matching the specified identification number in our records.'
            });
        }
        if (policy.status === 'EXPIRED') {
            return res.json({
                isValid: false,
                policy,
                message: 'Policy found but has expired. Validation declined.'
            });
        }
        if (policy.status === 'SUSPENDED') {
            return res.json({
                isValid: false,
                policy,
                message: 'Policy coverage is currently suspended. Validation declined.'
            });
        }
        return res.json({
            isValid: true,
            policy,
            message: 'Policy validated successfully. Coverage is currently active.'
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to execute policy validation query.' });
    }
});
// 3. Premium Due Reminder Sync (IUC06)
router.post('/:id/sync-reminders', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['ADMIN', 'SUPPORT_STAFF']), async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Unauthenticated.' });
        const { id } = req.params;
        const policy = await prisma.policy.findUnique({ where: { id } });
        if (!policy) {
            return res.status(404).json({ error: 'Policy not found.' });
        }
        // Trigger mock background sync event to HealthPass member app
        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                userName: req.user.name,
                userRole: req.user.role,
                action: 'SYNC_PREMIUM_REMINDER',
                details: `Dispatched premium payment reminder push for ${policy.holderName} (${policy.policyNumber}) to HealthPass core.`,
                ipAddress: req.ip || '127.0.0.1',
                device: req.headers['user-agent'] || 'Unknown'
            }
        });
        return res.json({
            success: true,
            message: `Premium reminder notification synced with HealthPass Gateway for ${policy.holderName}. Due date: ${policy.premiumDueDate}.`
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to push premium sync signals.' });
    }
});
// 4. Premium Payment Status Update (IUC07) - e.g. Pay premium, move out of grace
router.post('/:id/payment', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['ADMIN', 'SUPPORT_STAFF']), async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Unauthenticated.' });
        const { id } = req.params;
        const policy = await prisma.policy.findUnique({ where: { id } });
        if (!policy) {
            return res.status(404).json({ error: 'Policy not found.' });
        }
        // Calculate new premium due date in 1 month
        const currentDate = new Date(policy.premiumDueDate);
        currentDate.setMonth(currentDate.getMonth() + 1);
        const newDueDateStr = currentDate.toISOString().split('T')[0];
        // Push dates further to ensure policy stays active
        const endCoverDate = new Date();
        endCoverDate.setFullYear(endCoverDate.getFullYear() + 1);
        const newEndDateStr = endCoverDate.toISOString().split('T')[0];
        const updatedPolicy = await prisma.policy.update({
            where: { id },
            data: {
                status: 'ACTIVE',
                premiumDueDate: newDueDateStr,
                endDate: newEndDateStr
            }
        });
        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                userName: req.user.name,
                userRole: req.user.role,
                action: 'UPDATE_PREMIUM_PAYMENT',
                details: `Recorded payment of $${policy.premiumAmount} for policy ${policy.policyNumber}. Restored/maintained ACTIVE state.`,
                ipAddress: req.ip || '127.0.0.1',
                device: req.headers['user-agent'] || 'Unknown'
            }
        });
        return res.json({
            success: true,
            policy: updatedPolicy,
            message: `Payment registered successfully. Policy restored to active coverage. New premium due date: ${newDueDateStr}.`
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to register premium payment transactions.' });
    }
});
// 5. Policy Renewal Support (IUC08)
router.post('/:id/renew', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['ADMIN', 'SUPPORT_STAFF']), async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Unauthenticated.' });
        const { id } = req.params;
        const policy = await prisma.policy.findUnique({ where: { id } });
        if (!policy) {
            return res.status(404).json({ error: 'Policy not found.' });
        }
        // Renew for another year
        const endCoverDate = new Date();
        endCoverDate.setFullYear(endCoverDate.getFullYear() + 1);
        const newEndDateStr = endCoverDate.toISOString().split('T')[0];
        // Advance premium due date
        const premiumDueDate = new Date();
        premiumDueDate.setMonth(premiumDueDate.getMonth() + 1);
        const newPremiumDueDateStr = premiumDueDate.toISOString().split('T')[0];
        const updatedPolicy = await prisma.policy.update({
            where: { id },
            data: {
                status: 'ACTIVE',
                renewalOffered: true,
                endDate: newEndDateStr,
                premiumDueDate: newPremiumDueDateStr
            }
        });
        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                userName: req.user.name,
                userRole: req.user.role,
                action: 'RENEW_POLICY',
                details: `Renewed policy coverage term for ${policy.holderName} until ${newEndDateStr}.`,
                ipAddress: req.ip || '127.0.0.1',
                device: req.headers['user-agent'] || 'Unknown'
            }
        });
        return res.json({
            success: true,
            policy: updatedPolicy,
            message: `Policy successfully renewed. Term extended to ${newEndDateStr}.`
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to renew policy terms.' });
    }
});
// 6. Policy Expiry / Grace Handling (IUC09) - Manual status overrides
router.put('/:id/status', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['ADMIN', 'SUPPORT_STAFF']), async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Unauthenticated.' });
        const { id } = req.params;
        const { status } = req.body;
        const validStatuses = ['ACTIVE', 'GRACE_PERIOD', 'EXPIRED', 'SUSPENDED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid policy status designation.' });
        }
        const policy = await prisma.policy.findUnique({ where: { id } });
        if (!policy) {
            return res.status(404).json({ error: 'Policy not found.' });
        }
        const updatedPolicy = await prisma.policy.update({
            where: { id },
            data: { status }
        });
        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                userName: req.user.name,
                userRole: req.user.role,
                action: 'OVERRIDE_POLICY_STATUS',
                details: `Manually altered policy status of ${policy.policyNumber} from ${policy.status} to ${status}`,
                ipAddress: req.ip || '127.0.0.1',
                device: req.headers['user-agent'] || 'Unknown'
            }
        });
        return res.json(updatedPolicy);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to alter policy status flags.' });
    }
});
exports.default = router;
