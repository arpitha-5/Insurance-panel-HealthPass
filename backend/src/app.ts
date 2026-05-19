import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';

// Import route modules
import authRoutes from './modules/auth/auth.controller';
import insurerRoutes from './modules/insurer/insurer.controller';
import policyRoutes from './modules/policies/policies.controller';
import claimRoutes from './modules/claims/claims.controller';
import aiRoutes from './modules/ai/ai.controller';
import analyticsRoutes from './modules/analytics/analytics.controller';

dotenv.config();

const app = express();

// Configure CORS to support seamless frontend dashboard requests
app.use(cors({
  origin: '*', // Allow all in development/demo mode
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check API
app.get('/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'HealthPass Insurance Partner Panel API Gateway',
    timestamp: new Date()
  });
});

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/insurer', insurerRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);

// Global Error Handler Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Exception:', err);
  
  res.status(err.status || 500).json({
    error: err.message || 'A severe unhandled exception occurred within the application gateway.'
  });
});

export default app;
