/**
 * Health and status. The client polls this once at startup to learn whether
 * history is available before deciding where to store runs.
 */

import { Router } from 'express';
import mongoose from 'mongoose';
import { state as dbState, isConnected } from '../db/connect.js';
import { DEFAULT_ENGINE, listEngines } from '@humaninzer/engine';
import config from '../config/env.js';

const router = Router();
const startedAt = Date.now();

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    persistence: {
      available: isConnected(),
      mode: dbState.mode,
      readyState: mongoose.connection.readyState,
      error: dbState.error,
    },
    engine: { default: DEFAULT_ENGINE, available: listEngines().map((e) => e.id) },
    limits: { maxInputChars: config.maxInputChars },
    version: '1.0.0',
  });
});

export default router;
