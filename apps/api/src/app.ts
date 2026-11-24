import express from 'express';
import cors from 'cors';
import { errorHandler } from './utils/errors';
import { usersRouter } from './modules/users/users.router';
import { workspacesRouter } from './modules/workspaces/workspaces.router';
import { importsRouter } from './modules/imports/imports.router';
import { insightsRouter } from './modules/insights/insights.router';
import { plansRouter } from './modules/plans/plans.router';
import { assistantRouter } from './modules/assistant/assistant.router';
import { speechRouter } from './modules/speech/speech.router';
import { collaborationRouter } from './modules/collaboration/collaboration.router';
import { flagsRouter } from './modules/flags/flags.router';

export function createApp() {
  const app = express();

  // Middleware
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request ID tracer
  app.use((req, res, next) => {
    const reqId = (req.headers['x-request-id'] as string) || `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    res.setHeader('X-Request-Id', reqId);
    next();
  });

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'outingmate-api', timestamp: new Date().toISOString() });
  });

  // API v1 routes
  const v1 = express.Router();
  v1.use('/users', usersRouter);
  v1.use('/workspaces', workspacesRouter);
  v1.use('/', workspacesRouter); // for /invitations/:token/accept
  v1.use('/', importsRouter); // for /workspaces/:id/imports and /imports/:id
  v1.use('/', insightsRouter); // for /workspaces/:id/insights and /insights/:id
  v1.use('/', plansRouter); // for /workspaces/:id/plans and /plans/:id
  v1.use('/', assistantRouter); // for /workspaces/:id/assistant and /assistant/sessions/:id
  v1.use('/speech', speechRouter);
  v1.use('/', collaborationRouter); // for /workspaces/:id/votes, /tasks, /expenses, /comments
  v1.use('/', flagsRouter);

  app.use('/api/v1', v1);

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
