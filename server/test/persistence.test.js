import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Storage tests against a real (embedded) MongoDB.
 *
 * These cover the path a browser-computed run takes when server persistence
 * is switched on: compute in the client, POST the finished result, then read
 * it back. The database runs in a temporary directory so the suite never
 * touches .data.
 *
 * Opt-in, because the app does not need a database by default and running
 * these downloads a ~60 MB MongoDB binary on a machine that has none. They
 * run when you ask for them:
 *
 *   npm run test:storage        (starts an embedded MongoDB)
 *   MONGODB_URI=... npm test    (or point at a database you already run)
 */

// The flag is the only signal: node --test runs each file in a child process
// with its own path in argv, so "was this file named explicitly" cannot be
// distinguished from a whole-directory run.
const enabled = process.env.TEST_PERSISTENCE === '1' || Boolean(process.env.MONGODB_URI);
const skip = enabled ? false : 'opt-in: npm run test:storage';

let server;
let base;
let disconnect;
const dataPath = path.join(os.tmpdir(), `humaninzer-test-${Date.now()}`);

before(async () => {
  if (!enabled) return;
  process.env.PERSISTENCE = 'true';
  process.env.MONGODB_DATA_PATH = dataPath;
  process.env.MONGODB_DB = 'humaninzer_test';

  const [{ createApp }, db] = await Promise.all([
    import('../src/app.js'),
    import('../src/db/connect.js'),
  ]);
  const state = await db.connect();
  assert.ok(state.connected, `database did not start: ${state.error}`);
  disconnect = db.disconnect;

  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://localhost:${server.address().port}/api`;
});

after(async () => {
  if (!enabled) return;
  server?.close();
  await disconnect?.();
  fs.rmSync(dataPath, { recursive: true, force: true });
});

const json = async (route, init) => {
  const response = await fetch(`${base}${route}`, {
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  });
  return { status: response.status, body: await response.json() };
};

const OPTIONS = {
  tone: 'concise', readabilityTarget: 'auto', intensity: 'balanced',
  engine: 'rules', seed: 42, preserve: [],
};

const computedRun = (overrides = {}) => ({
  title: 'Browser run',
  original: 'The results were reviewed by the board.',
  paraphrased: 'The board reviewed the results.',
  options: OPTIONS,
  metrics: {
    before: { readability: { summary: { consensusGrade: 9 } } },
    after: { readability: { summary: { consensusGrade: 7 } } },
  },
  trace: [{ rule: 'voice', reason: 'Passive rewritten as active', from: 'were reviewed by', to: 'reviewed' }],
  traceSummary: [{ rule: 'voice', count: 1, examples: [] }],
  plan: { toneLabel: 'Concise', targetGrade: 8 },
  passes: [{ pass: 0, edits: 1, grade: 7 }],
  ...overrides,
});

test('a browser-computed run round-trips through storage', { skip }, async () => {
  const created = await json('/runs', { method: 'POST', body: JSON.stringify(computedRun()) });
  assert.equal(created.status, 201);
  assert.ok(created.body.id);

  const fetched = await json(`/runs/${created.body.id}`);
  assert.equal(fetched.status, 200);
  assert.equal(fetched.body.run.contentParaphrased, 'The board reviewed the results.');
  assert.equal(fetched.body.run.options.seed, 42);
  assert.equal(fetched.body.run.trace[0].rule, 'voice');
  assert.equal(fetched.body.run.version, 1);
});

test('POST /runs rejects a malformed payload', { skip }, async () => {
  const bad = await json('/runs', {
    method: 'POST',
    body: JSON.stringify({ original: '', paraphrased: 'x', options: {} }),
  });
  assert.equal(bad.status, 400);
  assert.ok(bad.body.issues.length > 0);

  const badTone = await json('/runs', {
    method: 'POST',
    body: JSON.stringify(computedRun({ options: { ...OPTIONS, tone: 'pirate' } })),
  });
  assert.equal(badTone.status, 400);
});

test('a child run becomes version 2 and appears in the chain', { skip }, async () => {
  const parent = await json('/runs', { method: 'POST', body: JSON.stringify(computedRun({ title: 'Versioned' })) });
  const child = await json('/runs', {
    method: 'POST',
    body: JSON.stringify(computedRun({ title: 'Versioned', parentId: parent.body.id })),
  });

  assert.equal(child.status, 201);
  const chain = await json(`/runs/${parent.body.id}`);
  assert.deepEqual(chain.body.versions.map((v) => v.version), [1, 2]);
});

test('history lists, filters and searches', { skip }, async () => {
  await json('/runs', { method: 'POST', body: JSON.stringify(computedRun({ title: 'Findable kestrel' })) });

  const listed = await json('/runs?limit=50');
  assert.ok(listed.body.total >= 1);

  const searched = await json('/runs?search=kestrel');
  assert.equal(searched.body.items.length, 1);
  assert.equal(searched.body.items[0].title, 'Findable kestrel');

  const none = await json('/runs?search=noSuchTextAnywhere');
  assert.equal(none.body.items.length, 0);
});

test('a run can be renamed, favorited, exported and deleted', { skip }, async () => {
  const created = await json('/runs', { method: 'POST', body: JSON.stringify(computedRun()) });
  const id = created.body.id;

  const patched = await json(`/runs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title: 'Renamed', favorite: true }),
  });
  assert.equal(patched.body.run.title, 'Renamed');
  assert.equal(patched.body.run.favorite, true);

  const favorites = await json('/runs?favorite=true');
  assert.ok(favorites.body.items.some((item) => item.id === id));

  const exported = await fetch(`${base}/runs/${id}/export?format=md`);
  assert.match(exported.headers.get('content-disposition'), /renamed\.md/);
  assert.match(await exported.text(), /^# Renamed/);

  const deleted = await json(`/runs/${id}`, { method: 'DELETE' });
  assert.equal(deleted.body.deleted, 1);
  assert.equal((await json(`/runs/${id}`)).status, 404);
});

test('deleting a parent removes its versions too', { skip }, async () => {
  const parent = await json('/runs', { method: 'POST', body: JSON.stringify(computedRun()) });
  await json('/runs', { method: 'POST', body: JSON.stringify(computedRun({ parentId: parent.body.id })) });

  const deleted = await json(`/runs/${parent.body.id}`, { method: 'DELETE' });
  assert.equal(deleted.body.deleted, 2);
});
