/**
 * Environment configuration.
 *
 * Everything has a working default so the app runs with no .env at all,
 * which is the point of a self-hosted personal tool.
 */

import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAX_INPUT_CHARS } from '@humaninzer/engine';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '../../..');

const int = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
};

export const config = {
  port: int(process.env.PORT, 4000),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Leave MONGODB_URI unset to run an embedded MongoDB with on-disk storage.
  mongoUri: process.env.MONGODB_URI || '',
  mongoDbName: process.env.MONGODB_DB || 'humaninzer',
  mongoDataPath: process.env.MONGODB_DATA_PATH || path.join(ROOT, '.data', 'mongo'),

  // Off by default: the client stores complete runs in IndexedDB, so a
  // database is only worth starting when history needs to be shared between
  // browsers or survive clearing site data. Set PERSISTENCE=true to enable.
  persistence: (process.env.PERSISTENCE || 'false') === 'true',

  engine: process.env.PARAPHRASE_ENGINE || 'rules',
  maxInputChars: int(process.env.MAX_INPUT_CHARS, MAX_INPUT_CHARS),
  corsOrigin: process.env.CORS_ORIGIN || '*',
};

export default config;
