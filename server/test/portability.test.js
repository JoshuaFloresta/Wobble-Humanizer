import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The engine package ships to the browser as well as running here, so it must
 * stay free of platform APIs. This guards that property directly: a stray
 * `node:fs` import would break offline mode at build time rather than
 * obviously, so it is worth a test rather than a convention.
 */

const engineSrc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../engine/src');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

test('the engine imports no Node built-ins', () => {
  const offenders = [];
  for (const file of walk(engineSrc).filter((f) => f.endsWith('.js'))) {
    const source = fs.readFileSync(file, 'utf8');
    if (/from\s+['"]node:/.test(source) || /require\(['"]node:/.test(source)) {
      offenders.push(path.relative(engineSrc, file));
    }
  }
  assert.deepEqual(offenders, [], `engine modules must stay platform-free: ${offenders.join(', ')}`);
});

test('the engine imports no third-party packages', () => {
  const offenders = [];
  for (const file of walk(engineSrc).filter((f) => f.endsWith('.js'))) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      const specifier = match[1];
      if (!specifier.startsWith('.') && !specifier.startsWith('node:')) {
        offenders.push(`${path.relative(engineSrc, file)} -> ${specifier}`);
      }
    }
  }
  assert.deepEqual(offenders, [], `engine must have no runtime dependencies: ${offenders.join(', ')}`);
});

test('the engine entry point exports the documented surface', async () => {
  const engine = await import('@humaninzer/engine');
  for (const name of [
    'paraphrase', 'buildResult', 'measure', 'diffWords',
    'computeReadability', 'analyzeTone', 'TONE_PRESETS', 'READABILITY_TARGETS',
    'toMarkdown', 'toPlainText', 'toJson', 'ENGINE_VERSION',
  ]) {
    assert.ok(engine[name] !== undefined, `missing export: ${name}`);
  }
});
