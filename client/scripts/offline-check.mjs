/**
 * Offline check.
 *
 * Verifies the two claims offline mode rests on:
 *   1. a rewrite computed in the browser is byte-identical to the same
 *      rewrite computed by the server engine, and
 *   2. the app renders its controls with every network call failing.
 *
 * No API server is needed -- that is the point.
 */

import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Every network call fails, as it would with the machine offline.
globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.document = {
  documentElement: { setAttribute() {}, removeAttribute() {} },
  createElement: () => ({ style: {}, setAttribute() {} }),
  body: { appendChild() {}, removeChild() {} },
};
globalThis.window = { addEventListener() {}, removeEventListener() {} };
// Node exposes navigator as a getter-only global, so it has to be redefined.
Object.defineProperty(globalThis, 'navigator', {
  value: { onLine: false },
  configurable: true,
});

const { paraphraseLocally, analyzeLocally, localPresets } = await import(
  pathToFileURL(path.join(root, 'src', 'lib', 'engine.js')).href
);
const { paraphrase, buildResult } = await import('@humaninzer/engine');

const TEXT = 'It should be noted that the results were reviewed by the board, and it was '
  + 'determined that the outcome was very good. The team shipped the change in March. '
  + 'Support tickets fell by eighteen percent over the following month. '
  + 'The board approved the next phase in June.';

let checks = 0;
const check = async (label, fn) => {
  await fn();
  checks++;
  console.log(`ok   ${label}`);
};

await check('presets available with no network', () => {
  const presets = localPresets();
  assert.equal(presets.tones.length, 7);
  assert.equal(presets.readabilityTargets.length, 5);
});

await check('rewrite works with no network', () => {
  const result = paraphraseLocally(TEXT, { tone: 'concise' });
  assert.ok(result.paraphrased.length > 0);
  assert.ok(result.trace.length > 0);
  assert.equal(result.computedLocally, true);
});

await check('metrics work with no network', () => {
  const metrics = analyzeLocally(TEXT);
  assert.ok(metrics.readability.summary.consensusGrade > 0);
  assert.ok(metrics.tone.dominant.label);
});

await check('browser output is byte-identical to server output', () => {
  for (const tone of ['neutral', 'formal', 'casual', 'concise', 'persuasive', 'academic', 'friendly']) {
    const browser = paraphraseLocally(TEXT, { tone });
    const engineResult = paraphrase(TEXT, { tone });
    const server = buildResult({ original: TEXT, paraphrased: engineResult.output, engineResult });

    assert.equal(browser.paraphrased, server.paraphrased, `${tone}: output differs`);
    assert.equal(browser.options.seed, engineResult.seed, `${tone}: seed differs`);
    assert.deepEqual(browser.trace, server.trace, `${tone}: trace differs`);
    assert.deepEqual(browser.metrics, server.metrics, `${tone}: metrics differ`);
  }
});

await check('summarising works with no network', () => {
  const result = paraphraseLocally(TEXT, { mode: 'summarize', summaryLength: 'brief' });
  assert.ok(result.paraphrased.length > 0);
  assert.ok(result.summary.kept < result.summary.total, 'a summary should cut something');
  assert.ok(result.trace.some((entry) => entry.rule === 'keep'));
});

const { localHistory } = await import(
  pathToFileURL(path.join(root, 'src', 'lib', 'localHistory.js')).href
);

await (async () => {
  const computed = paraphraseLocally(TEXT, { tone: 'concise' });
  const entry = await localHistory.add(computed);
  const restored = await localHistory.get(entry.id);

  await check('history stores a complete run with no network', () => {
    assert.equal(restored.contentOriginal, computed.original);
    assert.equal(restored.contentParaphrased, computed.paraphrased);
    assert.deepEqual(restored.trace, computed.trace);
    assert.deepEqual(restored.metrics, computed.metrics);
    assert.deepEqual(restored.diff, computed.diff);
    assert.deepEqual(restored.plan, computed.plan);
    assert.equal(restored.seed, computed.options.seed);
  });

  await check('re-adding a run replaces it rather than duplicating', async () => {
    const again = await localHistory.add({ ...computed, id: entry.id });
    assert.equal(again.id, entry.id);
    assert.equal((await localHistory.list()).length, 1);
  });

  await check('history survives a reopen and can be edited and cleared', async () => {
    const listed = await localHistory.list();
    assert.equal(listed.length, 1);
    await localHistory.update(entry.id, { favorite: true });
    assert.equal((await localHistory.get(entry.id)).favorite, true);
    await localHistory.clear();
    assert.equal((await localHistory.list()).length, 0);
  });
})();

// Render the app with everything failing, to prove a cold start still works.
execFileSync('npx', ['vite', 'build', '--config', 'vite.ssrcheck.config.js', '--logLevel', 'error'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
const { render } = await import(pathToFileURL(path.join(root, '.ssr-check', 'ssrcheck.js')).href);

await check('app renders its controls offline', () => {
  const html = render();
  for (const needle of ['HumanInzer', 'Your text', 'Settings', 'Concise', 'Reading level', 'sketch-panel']) {
    assert.ok(html.includes(needle), `offline render missing "${needle}"`);
  }
  assert.ok(!html.includes('Sharpening pencils'), 'controls should not be stuck loading offline');
});

console.log(`\n${checks} offline checks passed`);
