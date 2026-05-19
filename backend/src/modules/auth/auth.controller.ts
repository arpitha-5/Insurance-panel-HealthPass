import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { authenticateJWT, AuthenticatedRequest } from '../../middleware/auth';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'healthpass_premium_insurance_partner_secret_2026';

// 1. User Login (IUC01)
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!user.active) {
      return res.status(403).json({ error: 'Your account has been deactivated. Contact Admin.' });
    }

    // Role check - allow selection
    if (role && user.role !== role) {
      return res.status(403).json({ error: `Account exists but does not possess the ${role} role.` });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      return res.json({
        requires2FA: true,
        email: user.email,
        tempToken: jwt.sign(
          { id: user.id, email: user.email, name: user.name, role: user.role, isTemp: true },
          JWT_SECRET,
          { expiresIn: '5m' }
        )
      });
    }

    // Direct Login (No 2FA)
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Create session record
    const ipAddress = req.ip || '127.0.0.1';
    const device = req.headers['user-agent'] || 'Unknown Browser';
    await prisma.sessionLog.create({
      data: {
        userId: user.id,
        userName: user.name,
        ipAddress,
        device,
        location: 'Austin, TX',
        active: true
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'USER_LOGIN',
        details: `Successfully logged in. Role: ${user.role}`,
        ipAddress,
        device
      }
    });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });

  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 2. Verify 2FA Challenge (IUC01)
router.post('/login/verify-2fa', async (req, res) => {
  try {
    const { tempToken, code } = req.body;

    if (!tempToken || !code) {
      return res.status(400).json({ error: 'Authentication token and 2FA code are required.' });
    }

    // Verify tempToken
    let decoded: any;
    try {
      decoded = jwt.verify(tempToken, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: '2FA session expired. Please log in again.' });
    }

    if (!decoded.isTemp) {
      return res.status(403).json({ error: 'Invalid 2FA token.' });
    }

    // Demo Verification - any 6 digit code will work, or standard 123456
    if (code !== '123456' && code !== '000000') {
      return res.status(401).json({ error: 'Invalid two-factor code. Try 123456.' });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return res.status(404).json({ error: 'User record not found.' });
    }

    // Issue main token
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    const ipAddress = req.ip || '127.0.0.1';
    const device = req.headers['user-agent'] || 'Unknown Browser';

    // Create session record
    await prisma.sessionLog.create({
      data: {
        userId: user.id,
        userName: user.name,
        ipAddress,
        device,
        location: 'Austin, TX',
        active: true
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'USER_LOGIN_2FA',
        details: `Successfully completed 2FA challenge and logged in.`,
        ipAddress,
        device
      }
    });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });

  } catch (error) {
    console.error('2FA Verification error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 3. Get Logged in User Profile Details
router.get('/me', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated.' });
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        twoFactorEnabled: true,
        active: true,
        createdAt: true
      }
    });

    return res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user context.' });
  }
});

// 4. Toggle 2FA Setting
router.post('/toggle-2fa', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated.' });
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (!user) return res.status(404).json({ error: 'User not found.' });

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { twoFactorEnabled: !user.twoFactorEnabled },
      select: { twoFactorEnabled: true }
    });

    // Log this security setting change
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'SECURITY_TOGGLE_2FA',
        details: `Two-Factor Authentication toggled to: ${updatedUser.twoFactorEnabled}`,
        ipAddress: req.ip || '127.0.0.1',
        device: req.headers['user-agent'] || 'Unknown'
      }
    });

    return res.json({
      message: `2FA successfully ${updatedUser.twoFactorEnabled ? 'enabled' : 'disabled'}.`,
      twoFactorEnabled: updatedUser.twoFactorEnabled
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update security parameters.' });
  }
});

// 5. Get Active Security Sessions
router.get('/sessions', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated.' });
    const sessions = await prisma.sessionLog.findMany({
      where: { userId: req.user.id },
      orderBy: { lastActive: 'desc' }
    });

    return res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch session list.' });
  }
});

// 6. Terminate Session
router.post('/sessions/:id/terminate', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated.' });
    const { id } = req.params;

    const session = await prisma.sessionLog.findUnique({ where: { id } });
    if (!session || session.userId !== req.user.id) {
      return res.status(404).json({ error: 'Session not found or unauthorized.' });
    }

    await prisma.sessionLog.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'SECURITY_TERMINATE_SESSION',
        details: `Terminated security session from IP: ${session.ipAddress} (${session.device})`,
        ipAddress: req.ip || '127.0.0.1',
        device: req.headers['user-agent'] || 'Unknown'
      }
    });

    return res.json({ message: 'Session successfully revoked.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to terminate session.' });
  }
});

// 7. Get Audit Logs (Compliance Audit Logs)
router.get('/audit-logs', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Auditors or Admins can see all logs. Others can see their own.
    let logs;
    if (req.user?.role === 'ADMIN' || req.user?.role === 'AUDITOR') {
      logs = await prisma.auditLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 100
      });
    } else {
      logs = await prisma.auditLog.findMany({
        where: { userId: req.user?.id },
        orderBy: { timestamp: 'desc' },
        take: 50
      });
    }

    return res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to query audit logs.' });
  }
});

export default router;
