import test from 'node:test';
import assert from 'node:assert/strict';

import { paraphrase } from '@humaninzer/engine';
import { computeReadability } from '@humaninzer/engine/nlp/readability.js';
import { analyzeTone } from '@humaninzer/engine/nlp/tone.js';
import { diffWords, diffStats } from '@humaninzer/engine/lib/diff.js';
import { buildResult } from '@humaninzer/engine/lib/metrics.js';

const WORDY = 'It should be noted that the team utilized a large number of different tools '
  + 'in order to facilitate the migration. The results were reviewed by the board, and it '
  + 'was determined that the outcome was very good.';

test('identical input and options produce identical output', () => {
  const a = paraphrase(WORDY, { tone: 'concise' });
  const b = paraphrase(WORDY, { tone: 'concise' });
  assert.equal(a.output, b.output);
  assert.equal(a.seed, b.seed);
  assert.deepEqual(a.trace, b.trace);
});

test('an explicit seed reproduces its own output', () => {
  const a = paraphrase(WORDY, { tone: 'formal', seed: 12345 });
  const b = paraphrase(WORDY, { tone: 'formal', seed: 12345 });
  assert.equal(a.output, b.output);
});

test('every tone preset produces output and a trace', () => {
  for (const tone of ['neutral', 'formal', 'casual', 'concise', 'persuasive', 'academic', 'friendly']) {
    const result = paraphrase(WORDY, { tone });
    assert.ok(result.output.length > 0, `${tone} produced no output`);
    assert.ok(result.trace.length > 0, `${tone} produced no edits`);
    assert.equal(result.plan.toneId, tone);
  }
});

test('concise removes words, academic raises the reading grade', () => {
  const source = computeReadability(WORDY);
  const concise = paraphrase(WORDY, { tone: 'concise' });
  const academic = paraphrase(WORDY, { tone: 'academic' });

  assert.ok(
    computeReadability(concise.output).counts.words < source.counts.words,
    'concise should shorten the text',
  );
  assert.ok(
    computeReadability(academic.output).summary.consensusGrade > source.summary.consensusGrade,
    'academic should raise the grade',
  );
});

test('formal raises formality and casual lowers it', () => {
  const base = analyzeTone(WORDY).metrics.formality.value;
  const formal = analyzeTone(paraphrase(WORDY, { tone: 'formal' }).output).metrics.formality.value;
  const casual = analyzeTone(paraphrase(WORDY, { tone: 'casual' }).output).metrics.formality.value;
  assert.ok(formal >= base, 'formal should not lower formality');
  assert.ok(casual <= formal, 'casual should be less formal than formal');
});

test('a simple reading target lowers the grade', () => {
  const source = computeReadability(WORDY).summary.consensusGrade;
  const simple = paraphrase(WORDY, { tone: 'neutral', readabilityTarget: 'simple' });
  assert.ok(
    computeReadability(simple.output).summary.consensusGrade < source,
    'simple target should lower the grade',
  );
});

test('passive with a named agent becomes active', () => {
  const result = paraphrase('The results were reviewed by the board.', { tone: 'concise' });
  // Assert the structure, not the verb: the synonym rule may legitimately
  // pick a different word for the same sense once the clause is active.
  assert.match(result.output, /^The board \w+ the results\.$/);
  assert.ok(!/were reviewed by/.test(result.output));
  assert.ok(result.trace.some((entry) => entry.rule === 'voice'));
});

test('an agentless passive is left alone rather than invented', () => {
  const result = paraphrase('The report was filed on Friday.', { tone: 'concise' });
  assert.match(result.output, /was filed/);
});

test('preserved words are never swapped', () => {
  const text = 'The team utilized Kubernetes to facilitate the migration.';
  const result = paraphrase(text, { tone: 'casual', preserve: ['utilized'] });
  assert.match(result.output, /utilized/);
});

test('every trace entry names a rule, a reason and both texts', () => {
  const result = paraphrase(WORDY, { tone: 'formal' });
  for (const entry of result.trace) {
    assert.ok(entry.rule, 'missing rule');
    assert.ok(entry.reason, 'missing reason');
    assert.ok(typeof entry.from === 'string' && entry.from.length > 0, 'missing source text');
    assert.ok(typeof entry.to === 'string', 'missing replacement text');
  }
});

test('empty input returns empty output without throwing', () => {
  const result = paraphrase('   ', { tone: 'neutral' });
  assert.equal(result.output, '');
  assert.deepEqual(result.trace, []);
});

test('paragraph structure survives a rewrite', () => {
  const text = 'It should be noted that this is the first paragraph.\n\nIn order to be clear, this is the second.';
  const result = paraphrase(text, { tone: 'concise' });
  assert.equal(result.output.split(/\n\n/).length, 2);
});

test('word diff aligns on tokens', () => {
  const segments = diffWords('the team utilized many tools', 'the team applied many tools');
  const stats = diffStats(segments);
  assert.equal(stats.added, 1);
  assert.equal(stats.removed, 1);
  assert.equal(stats.unchanged, 4);
});

test('buildResult reports before, after and delta together', () => {
  const engineResult = paraphrase(WORDY, { tone: 'concise' });
  const result = buildResult({ original: WORDY, paraphrased: engineResult.output, engineResult });
  assert.ok(result.metrics.before.readability.summary.consensusGrade > 0);
  assert.ok(result.metrics.after.readability.summary.consensusGrade > 0);
  assert.equal(
    result.metrics.delta.counts.words,
    result.metrics.after.readability.counts.words - result.metrics.before.readability.counts.words,
  );
  assert.ok(result.traceSummary.length > 0);
});

test('phrasal passives convert with their particle', () => {
  const cases = [
    ['The proposal was turned down by the committee.', 'The committee turned down the proposal.'],
    ['The feature was rolled out by engineering last week.', 'Engineering rolled out the feature last week.'],
  ];
  for (const [input, expected] of cases) {
    assert.equal(paraphrase(input, { tone: 'concise' }).output, expected);
  }
});

test('the agent stops at the following prepositional phrase', () => {
  const result = paraphrase(
    'The implementation was carried out by the operations team over the course of the last quarter.',
    { tone: 'concise' },
  );
  assert.match(result.output, /^The operations team carried out the implementation over the course/);
});

test('text after a mid-sentence passive is carried through', () => {
  const result = paraphrase(
    'The results were reviewed by the board, and it was determined that the outcome was good.',
    { tone: 'concise' },
  );
  assert.match(result.output, /^The board reviewed the results, and it was/);
});
