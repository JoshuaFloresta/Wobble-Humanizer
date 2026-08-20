/**
 * Database connection.
 *
 * Three modes, tried in order:
 *   uri     - MONGODB_URI is set (Atlas, or a local mongod)
 *   memory  - embedded MongoDB with an on-disk dbPath, so history survives
 *             restarts without anything installed
 *   none    - no database reachable; the API still paraphrases and analyzes,
 *             and the client falls back to localStorage for history
 *
 * The API is designed to degrade rather than fail: losing history is not a
 * reason for the tool to stop working.
 */

import fs from 'node:fs';
import mongoose from 'mongoose';
import config from '../config/env.js';

export const state = {
  mode: 'none',
  uri: '',
  connected: false,
  error: null,
};

let memoryServer = null;

export async function connect() {
  if (!config.persistence) {
    state.mode = 'none';
    state.error = 'Persistence disabled by configuration (PERSISTENCE=false)';
    return state;
  }

  mongoose.set('strictQuery', true);

  try {
    if (config.mongoUri) {
      state.mode = 'uri';
      state.uri = config.mongoUri;
    } else {
      state.mode = 'memory';
      state.uri = await startEmbedded();
    }

    await mongoose.connect(state.uri, {
      dbName: config.mongoDbName,
      serverSelectionTimeoutMS: 8000,
    });

    state.connected = true;
    state.error = null;
  } catch (error) {
    state.mode = 'none';
    state.connected = false;
    state.error = error.message;
    // Deliberately not rethrown: paraphrasing does not need a database.
    console.warn(`[db] running without persistence: ${error.message}`);
  }

  return state;
}

async function startEmbedded() {
  fs.mkdirSync(config.mongoDataPath, { recursive: true });
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  memoryServer = await MongoMemoryServer.create({
    instance: {
      dbPath: config.mongoDataPath,
      storageEngine: 'wiredTiger', // required for the data to outlive the process
      dbName: config.mongoDbName,
    },
  });
  return memoryServer.getUri();
}

export async function disconnect() {
  if (mongoose.connection.readyState) await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
  state.connected = false;
}

export function isConnected() {
  return state.connected && mongoose.connection.readyState === 1;
}
