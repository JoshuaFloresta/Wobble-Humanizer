import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

/**
 * API tests run against the real Express app on an ephemeral port with no
 * database, which also exercises the "persistence unavailable" paths that
 * matter most when self-hosting.
 */

let server;
let base;

before(async () => {
  process.env.PERSISTENCE = 'false';
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://localhost:${server.address().port}/api`;
});

after(() => server?.close());

const post = (path, body) => fetch(`${base}${path}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

test('GET /health reports status and capabilities', async () => {
  const response = await fetch(`${base}/health`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.status, 'ok');
  assert.ok(body.engine.available.includes('rules'));
});

test('GET /presets serves the tone and target tables', async () => {
  const body = await (await fetch(`${base}/presets`)).json();
  assert.equal(body.tones.length, 7);
  assert.equal(body.readabilityTargets.length, 5);
  assert.ok(body.limits.maxInputChars > 0);
});

test('POST /paraphrase returns output, metrics, diff and trace', async () => {
  const response = await post('/paraphrase', {
    text: 'It should be noted that the team utilized a large number of tools in order to facilitate the migration.',
    tone: 'concise',
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.ok(body.paraphrased.length > 0);
  assert.ok(body.metrics.before.readability.summary.consensusGrade > 0);
  assert.ok(body.metrics.after.readability.summary.consensusGrade > 0);
  assert.ok(body.metrics.delta.counts.words < 0, 'concise should remove words');
  assert.ok(body.diff.segments.length > 0);
  assert.ok(body.trace.length > 0);
  assert.equal(body.persisted, false);
  assert.equal(typeof body.timing.engineMs, 'number');
});

test('POST /paraphrase rejects empty and oversized input', async () => {
  const empty = await post('/paraphrase', { text: '' });
  assert.equal(empty.status, 400);
  assert.equal((await empty.json()).issues[0].path, 'text');

  const huge = await post('/paraphrase', { text: 'word '.repeat(200000) });
  assert.equal(huge.status, 400);
});

test('POST /paraphrase rejects an unknown tone', async () => {
  const response = await post('/paraphrase', { text: 'Hello there.', tone: 'shakespearean' });
  assert.equal(response.status, 400);
});

test('POST /analyze returns metrics without rewriting', async () => {
  const body = await (await post('/analyze', { text: 'The board reviewed the results.' })).json();
  assert.ok(body.metrics.readability.summary.consensusGrade >= 0);
  assert.ok(body.metrics.tone.dominant.label);
  assert.equal(body.metrics.readability.counts.sentences, 1);
});

test('POST /export renders markdown for an unsaved run', async () => {
  const run = await (await post('/paraphrase', { text: 'The results were reviewed by the board.', tone: 'formal' })).json();
  const response = await post('/export', { format: 'md', run: { ...run, title: 'Board note' } });
  const markdown = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /markdown/);
  assert.match(markdown, /^# Board note/);
  assert.match(markdown, /## Readability/);
  assert.match(markdown, /## What changed and why/);
});

test('history endpoints answer 503 when there is no database', async () => {
  const response = await fetch(`${base}/runs`);
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, 'Persistence unavailable');
});

test('unknown endpoints return a JSON 404', async () => {
  const response = await fetch(`${base}/nope`);
  assert.equal(response.status, 404);
  assert.equal((await response.json()).error, 'Unknown endpoint');
});

test('POST /runs validates a browser-computed run before storing it', async () => {
  // No database in this suite, so a valid payload reaches the 503 rather than
  // the 400 -- which is exactly what distinguishes the two failure modes.
  const valid = await post('/runs', {
    original: 'The results were reviewed by the board.',
    paraphrased: 'The board reviewed the results.',
    options: { tone: 'concise', readabilityTarget: 'auto', intensity: 'balanced', engine: 'rules', preserve: [] },
    metrics: { before: {}, after: {} },
    trace: [{ rule: 'voice', reason: 'Passive rewritten as active', from: 'a', to: 'b' }],
  });
  assert.equal(valid.status, 503);
  assert.equal((await valid.json()).error, 'Persistence unavailable');

  const invalid = await post('/runs', { original: '', paraphrased: 'x', options: {} });
  assert.equal(invalid.status, 503);
});

test('POST /summarize shortens the text and explains each sentence', async () => {
  const text = 'The migration began in March. The operations team led the work with twelve stakeholders. '
    + 'Early results were promising: completion rates rose eighteen percent. '
    + 'However, the team hit friction with the legacy identity provider. '
    + 'The board reviewed the outcome in June and approved the next phase.';

  const response = await post('/summarize', { text, summaryLength: 'brief' });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.ok(body.metrics.after.readability.counts.words < body.metrics.before.readability.counts.words);
  assert.ok(body.trace.some((entry) => entry.rule === 'keep'));
  assert.ok(body.trace.some((entry) => entry.rule === 'drop'));
  assert.equal(body.options.mode, 'summarize');
});

test('mode=summarize on /paraphrase is the same thing', async () => {
  const text = 'The migration began in March. The team led the work. Results were promising overall. '
    + 'The board approved the next phase in June.';
  const viaMode = await (await post('/paraphrase', { text, mode: 'summarize', summaryLength: 'brief' })).json();
  const viaRoute = await (await post('/summarize', { text, summaryLength: 'brief' })).json();
  assert.equal(viaMode.paraphrased, viaRoute.paraphrased);
});

test('GET /presets advertises the modes and summary lengths', async () => {
  const body = await (await fetch(`${base}/presets`)).json();
  assert.deepEqual(body.modes.map((m) => m.id), ['rewrite', 'summarize']);
  assert.deepEqual(body.summaryLengths.map((l) => l.id), ['brief', 'standard', 'detailed']);
  assert.equal(body.defaults.mode, 'rewrite');
});
