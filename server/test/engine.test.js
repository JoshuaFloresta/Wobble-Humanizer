import test from 'node:test';
import assert from 'node:assert/strict';

import { paraphrase, TONE_IDS } from '@humaninzer/engine';
import { computeReadability } from '@humaninzer/engine/nlp/readability.js';
import { analyzeTone } from '@humaninzer/engine/nlp/tone.js';
import { diffWords, diffStats } from '@humaninzer/engine/lib/diff.js';
import { buildResult, summarizeStructure } from '@humaninzer/engine/lib/metrics.js';

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
  for (const tone of TONE_IDS) {
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

test('a hard line break between sentences survives a rewrite', () => {
  const text = 'It should be noted that this is the first line.\n'
    + 'In order to be clear, this is the second.\n'
    + 'A large number of lines must all survive.';
  const output = paraphrase(text, { tone: 'concise' }).output;
  assert.equal(output.split('\n').length, 3, `lines collapsed: ${JSON.stringify(output)}`);
});

test('list markers and indentation survive a rewrite', () => {
  const text = 'Here is the plan:\n'
    + '- We need to utilize the new process\n'
    + '- The team will facilitate a review\n'
    + '1. Obtain the required approvals';
  const lines = paraphrase(text, { tone: 'concise' }).output.split('\n');

  assert.equal(lines.length, 4);
  // The lead-in already ends in a colon and must not collect a second mark.
  assert.equal(lines[0], 'Here is the plan:');
  assert.ok(lines[1].startsWith('- '), `lost bullet: ${lines[1]}`);
  assert.ok(lines[2].startsWith('- '), `lost bullet: ${lines[2]}`);
  assert.ok(lines[3].startsWith('1. '), `lost numbering: ${lines[3]}`);
  // An unpunctuated list item stays unpunctuated rather than becoming a sentence.
  assert.ok(!lines[1].endsWith('.'), `list item gained a period: ${lines[1]}`);
});

// A guessed "hard-wrap rejoin" heuristic used to live here: it merged a line
// with no terminal punctuation into the next when that next line started in
// lower case. It fired on ordinary unpunctuated lists and notes just as often
// as on genuinely wrapped text, mashing separate lines into one run-on -- and
// once mashed together, a line ending and the next line starting with the
// same word read as a doubled word. Every line is now kept exactly as typed,
// with no guessing about the author's intent.
test('lines without terminal punctuation are kept separate, never merged', () => {
  const text = 'The team completed the migration last week\n'
    + 'they reviewed the results carefully\n'
    + 'the manager approved the final report';
  const output = paraphrase(text, { tone: 'concise' }).output;
  assert.equal(output.split('\n').length, 3, `lines were merged: ${JSON.stringify(output)}`);
});

test('a plain list without bullet markers is not collapsed into one line', () => {
  const text = 'Shopping list\nmilk and eggs\nbread and butter\ncoffee beans';
  const output = paraphrase(text, { tone: 'concise' }).output;
  assert.equal(output.split('\n').length, 4, `list lines were merged: ${JSON.stringify(output)}`);
});

// Only the pronoun is pinned: which verb the synonym rule lands on is a
// seeded choice among equally-ranked candidates, so asserting the whole
// sentence would make this a test of the RNG rather than of pronoun case.
test('a pronoun subject takes object case when a passive is made active', () => {
  const cases = [
    ['It was reviewed by the board.', /^The board \w+ it\.$/],
    ['They were notified by the manager.', /^The manager \w+ them\.$/],
    ['She was assisted by the team.', /^The team \w+ her\.$/],
  ];
  for (const [input, expected] of cases) {
    assert.match(paraphrase(input, { tone: 'concise' }).output, expected);
  }
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
  assert.equal(typeof result.structuralNote, 'string');
});

test('the structural note names voice and sentence-order changes, not vocabulary', () => {
  const withVoice = paraphrase('The report was reviewed by the board.', { tone: 'concise' });
  assert.match(summarizeStructure(withVoice.trace), /active voice/);

  const longSentence = paraphrase(
    'The team shipped the feature on time, and the board was pleased with the outcome, so everyone celebrated the win together.',
    { tone: 'concise', readabilityTarget: 'simple' },
  );
  if (longSentence.trace.some((e) => e.rule === 'split')) {
    assert.match(summarizeStructure(longSentence.trace), /split into two/);
  }

  const synonymOnly = [{ rule: 'synonym', reason: 'x', from: 'use', to: 'utilize' }];
  assert.equal(summarizeStructure(synonymOnly), 'No structural changes -- edits were vocabulary-level only.');

  assert.equal(summarizeStructure([]), 'No structural changes -- edits were vocabulary-level only.');
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
