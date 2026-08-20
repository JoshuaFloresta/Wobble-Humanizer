import test from 'node:test';
import assert from 'node:assert/strict';

import { summarize } from '@humaninzer/engine';
import { computeReadability } from '@humaninzer/engine/nlp/readability.js';
import { segmentSentences } from '@humaninzer/engine/nlp/tokenize.js';

const REPORT = 'The migration to the new onboarding system began in March. '
  + 'The operations team led the work, coordinating with twelve stakeholders across four departments. '
  + 'Early results were promising: completion rates rose by eighteen percent in the first month. '
  + 'However, the team encountered significant friction with the legacy identity provider. '
  + 'That friction delayed the second phase by roughly three weeks. '
  + 'Support tickets fell overall, which the team took as a good sign. '
  + 'The board reviewed the outcome in June and approved the next phase.';

test('a summary is shorter than its source', () => {
  const result = summarize(REPORT, { summaryLength: 'standard', rewrite: false });
  const before = computeReadability(REPORT).counts.words;
  const after = computeReadability(result.output).counts.words;
  assert.ok(after < before, `expected fewer words, got ${after} of ${before}`);
  assert.ok(result.kept < result.total);
});

test('every summary length keeps progressively more', () => {
  const brief = summarize(REPORT, { summaryLength: 'brief', rewrite: false });
  const standard = summarize(REPORT, { summaryLength: 'standard', rewrite: false });
  const detailed = summarize(REPORT, { summaryLength: 'detailed', rewrite: false });

  assert.ok(brief.kept <= standard.kept, 'brief should keep no more than standard');
  assert.ok(standard.kept <= detailed.kept, 'standard should keep no more than detailed');
  assert.ok(detailed.kept < detailed.total, 'detailed should still cut something');
});

test('kept sentences are verbatim and stay in document order', () => {
  const result = summarize(REPORT, { summaryLength: 'detailed', rewrite: false });
  const source = segmentSentences(REPORT).map((s) => s.text);
  const kept = segmentSentences(result.output).map((s) => s.text);

  for (const sentence of kept) {
    assert.ok(source.includes(sentence), `summary invented a sentence: ${sentence}`);
  }

  const positions = kept.map((sentence) => source.indexOf(sentence));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b), 'order was not preserved');
});

test('an explicit sentence count is honoured', () => {
  const result = summarize(REPORT, { sentences: 3, rewrite: false });
  assert.equal(result.kept, 3);
  assert.equal(segmentSentences(result.output).length, 3);
});

test('the trace explains every sentence, kept or dropped', () => {
  const result = summarize(REPORT, { summaryLength: 'standard', rewrite: false });
  const accounted = result.trace.filter((e) => e.rule === 'keep' || e.rule === 'drop');
  assert.equal(accounted.length, result.total);
  for (const entry of accounted) {
    assert.ok(entry.reason, 'missing reason');
    assert.ok(entry.from, 'missing sentence text');
    assert.equal(typeof entry.score, 'number');
  }
});

test('summarising is deterministic', () => {
  const a = summarize(REPORT, { summaryLength: 'standard', tone: 'concise' });
  const b = summarize(REPORT, { summaryLength: 'standard', tone: 'concise' });
  assert.equal(a.output, b.output);
  assert.deepEqual(a.trace, b.trace);
});

test('the tone pipeline runs over the extract when asked', () => {
  const plain = summarize(REPORT, { summaryLength: 'detailed', rewrite: false });
  const toned = summarize(REPORT, { summaryLength: 'detailed', tone: 'academic' });

  assert.ok(toned.trace.some((e) => e.rule === 'keep'), 'selection should be traced');
  assert.ok(
    toned.trace.some((e) => e.rule !== 'keep' && e.rule !== 'drop'),
    'rewrite edits should be traced too',
  );
  assert.notEqual(toned.output, plain.output);
});

test('text too short to summarise is returned intact', () => {
  const single = summarize('The board approved the plan.', { summaryLength: 'brief', rewrite: false });
  assert.equal(single.output, 'The board approved the plan.');
  assert.equal(single.kept, 1);
  assert.equal(single.trace[0].rule, 'keep-all');
});

test('empty input summarises to nothing without throwing', () => {
  const result = summarize('   ', {});
  assert.equal(result.output, '');
  assert.deepEqual(result.trace, []);
});

test('paragraph structure survives summarisation', () => {
  const text = `${REPORT}\n\nA second paragraph opens here with its own claim. `
    + 'It continues with a supporting sentence that adds detail. '
    + 'And it closes with a conclusion worth keeping.';
  const result = summarize(text, { summaryLength: 'detailed', rewrite: false });
  assert.equal(result.output.split(/\n\n/).length, 2, 'both paragraphs should survive');
});
