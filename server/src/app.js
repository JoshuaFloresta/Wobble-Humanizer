/**
 * Express application.
 *
 * Split from index.js so tests can mount the app without binding a port or
 * starting a database.
 */

import express from 'express';
import cors from 'cors';
import { ZodError } from 'zod';
import config from './config/env.js';
import healthRoutes from './routes/health.js';
import presetRoutes from './routes/presets.js';
import paraphraseRoutes from './routes/paraphrase.js';
import runRoutes from './routes/runs.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: '2mb' }));

  app.use('/api', healthRoutes);
  app.use('/api', presetRoutes);
  app.use('/api', paraphraseRoutes);
  app.use('/api', runRoutes);

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Unknown endpoint' }));

  // Validation errors are the user's problem to fix, so report them field by
  // field rather than as a generic 400.
  app.use((error, _req, res, _next) => {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: 'Invalid request',
        issues: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    if (error?.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid id' });
    }
    console.error('[api]', error);
    res.status(500).json({
      error: 'Internal error',
      detail: config.nodeEnv === 'production' ? undefined : error.message,
    });
  });

  return app;
}

export default createApp;
