/**
 * Run the opt-in storage suite.
 *
 * A thin wrapper so the flag works the same on every shell: setting an
 * environment variable inline is not portable to Windows npm scripts.
 */

import { spawnSync } from 'node:child_process';

const result = spawnSync(
  process.execPath,
  ['--test', 'test/persistence.test.js'],
  { stdio: 'inherit', env: { ...process.env, TEST_PERSISTENCE: '1' } },
);

process.exit(result.status ?? 1);
