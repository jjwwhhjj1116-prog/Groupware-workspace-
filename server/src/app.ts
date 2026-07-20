import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '3mb' }));
app.use(cookieParser());

// Operational Endpoints
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/readyz', (req, res) => {
  // TODO: Add DB ping check here
  res.status(200).json({ status: 'ready', db: 'unverified' });
});

import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import taskRoutes from './routes/tasks';
import processRoutes from './routes/process';
import auditRoutes from './routes/audit';
import notificationRoutes from './routes/notifications';
import importRoutes from './routes/import';
import estimateRequestRoutes from './routes/estimateRequests';

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/process', processRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/import', importRoutes);
app.use('/api/estimate-requests', estimateRequestRoutes);
app.get('/api/ping', (req, res) => {
  res.json({ message: 'pong' });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Global Error Handler
app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Error:', err);
  res.status((err as any).status || 500).json({
    error: (err as any).message || 'Internal Server Error',
    requestId: req.headers['x-request-id']
  });
});

export default app;
