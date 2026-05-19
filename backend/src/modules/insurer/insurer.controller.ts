import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateJWT, requireRoles, AuthenticatedRequest } from '../../middleware/auth';
import * as crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// Helper to get the insurer profile (assumes single tenant/insurer profile for Sentinel Health in this B2B instance)
async function getProfileInstance() {
  let profile = await prisma.insurerProfile.findFirst();
  if (!profile) {
    profile = await prisma.insurerProfile.create({
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
  }
  return profile;
}

// 1. Fetch Profile (IUC02)
router.get('/profile', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const profile = await getProfileInstance();
    return res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve partner profile.' });
  }
});

// 2. Update Profile (IUC02)
router.put('/profile', authenticateJWT, requireRoles(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated.' });
    const profile = await getProfileInstance();
    const { companyName, taxId, supportEmail, supportPhone, address, logo } = req.body;

    const updatedProfile = await prisma.insurerProfile.update({
      where: { id: profile.id },
      data: {
        companyName,
        taxId,
        supportEmail,
        supportPhone,
        address,
        logo
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'UPDATE_INSURER_PROFILE',
        details: `Updated general corporate profile parameters for ${companyName}`,
        ipAddress: req.ip || '127.0.0.1',
        device: req.headers['user-agent'] || 'Unknown'
      }
    });

    return res.json(updatedProfile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update partner profile.' });
  }
});

// 3. Configure Policy Validation API (IUC03)
router.put('/profile/api-config', authenticateJWT, requireRoles(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated.' });
    const profile = await getProfileInstance();
    const { apiEndpoint } = req.body;

    const updatedProfile = await prisma.insurerProfile.update({
      where: { id: profile.id },
      data: { apiEndpoint }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'CONFIGURE_VALIDATION_API',
        details: `Configured HealthPass validation webhook endpoint to: ${apiEndpoint}`,
        ipAddress: req.ip || '127.0.0.1',
        device: req.headers['user-agent'] || 'Unknown'
      }
    });

    return res.json(updatedProfile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to configure API integration settings.' });
  }
});

// 4. Regenerate Secret API Token (IUC03)
router.post('/profile/regenerate-token', authenticateJWT, requireRoles(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated.' });
    const profile = await getProfileInstance();
    
    // Generate secure randomized hash resembling production app token
    const tokenBytes = crypto.randomBytes(24);
    const apiToken = `shp_live_${tokenBytes.toString('hex')}`;

    const updatedProfile = await prisma.insurerProfile.update({
      where: { id: profile.id },
      data: { apiToken }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'REGENERATE_INTEGRATION_TOKEN',
        details: `Regenerated the live API Integration Security Token for HealthPass sync.`,
        ipAddress: req.ip || '127.0.0.1',
        device: req.headers['user-agent'] || 'Unknown'
      }
    });

    return res.json({ apiToken });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate new integration credentials.' });
  }
});

// 5. Integration Toggle (IUC15) - Suspend or Restore HealthPass Integration
router.put('/profile/integration-toggle', authenticateJWT, requireRoles(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated.' });
    const profile = await getProfileInstance();
    const { active } = req.body;

    if (typeof active !== 'boolean') {
      return res.status(400).json({ error: 'Integration state parameter must be a boolean.' });
    }

    const updatedProfile = await prisma.insurerProfile.update({
      where: { id: profile.id },
      data: { integrationActive: active }
    });

    // Logging the suspension/restoration audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: active ? 'RESTORE_INTEGRATION' : 'SUSPEND_INTEGRATION',
        details: active 
          ? 'Restored HealthPass core synchronization pipelines and active policy queries.' 
          : 'Suspended B2B HealthPass integration completely. Blocked validation requests.',
        ipAddress: req.ip || '127.0.0.1',
        device: req.headers['user-agent'] || 'Unknown'
      }
    });

    return res.json(updatedProfile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle integration switch.' });
  }
});

// 6. Test Handshake / Health Check (IUC03)
router.post('/profile/api-health-check', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const profile = await getProfileInstance();

    if (!profile.integrationActive) {
      return res.json({
        success: false,
        status: 'SUSPENDED',
        responseTimeMs: 0,
        message: 'The integration pipeline has been manually suspended by the Insurer Administrator.'
      });
    }

    if (!profile.apiEndpoint) {
      return res.json({
        success: false,
        status: 'UNCONFIGURED',
        responseTimeMs: 0,
        message: 'Validation API Endpoint URL is not configured.'
      });
    }

    // Mock API ping with realistic latency
    const latency = Math.floor(Math.random() * 230) + 40;
    const isMockHealthy = !profile.apiEndpoint.includes('offline');

    return res.json({
      success: isMockHealthy,
      status: isMockHealthy ? 'OPERATIONAL' : 'DOWNTIME_DETECTED',
      responseTimeMs: latency,
      message: isMockHealthy 
        ? `Successfully established connection to HealthPass Gateway. Status 200 OK.`
        : `Connection to HealthPass Gateway failed. Endpoint timed out. Status 504 Gateway Timeout.`
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to run connection testing.' });
  }
});

export default router;
