/**
 * Server entry point.
 *
 * Connects to the database if one is reachable and starts listening either
 * way: paraphrasing never depends on persistence.
 */

import { createApp } from './app.js';
import { connect, disconnect, state } from './db/connect.js';
import config from './config/env.js';

const app = createApp();

const dbState = await connect();

const server = app.listen(config.port, () => {
  // History is kept in the browser, so "no database" is a normal, complete
  // configuration rather than a missing one.
  const persistence = dbState.connected
    ? `${dbState.mode} (${config.mongoDbName})`
    : 'off - history is stored in the browser (set PERSISTENCE=true to also store it here)';
  console.log(`HumanInzer API listening on http://localhost:${config.port}`);
  console.log(`  engine:      ${config.engine}`);
  console.log(`  persistence: ${persistence}`);
});

async function shutdown(signal) {
  console.log(`\n${signal} received, shutting down`);
  server.close();
  await disconnect().catch(() => {});
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export { app, server, state };
