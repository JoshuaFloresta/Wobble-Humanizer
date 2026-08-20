import test from 'node:test';
import assert from 'node:assert/strict';

import { segmentSentences, tokenizeWords, countWords } from '@humaninzer/engine/nlp/tokenize.js';
import { countSyllables, isComplexWord } from '@humaninzer/engine/nlp/syllables.js';
import { computeReadability } from '@humaninzer/engine/nlp/readability.js';
import { analyzeTone } from '@humaninzer/engine/nlp/tone.js';
import { analyzeNaturalness } from '@humaninzer/engine/nlp/naturalness.js';
import { conform, toPast, toGerund, toPlural } from '@humaninzer/engine/nlp/morphology.js';
import { tagSentence } from '@humaninzer/engine/nlp/pos.js';

test('sentence segmentation keeps abbreviations intact', () => {
  const sentences = segmentSentences('Dr. Smith left at 3.5 p.m. Was it worth it? Yes!');
  assert.deepEqual(sentences.map((s) => s.text), [
    'Dr. Smith left at 3.5 p.m.',
    'Was it worth it?',
    'Yes!',
  ]);
});

test('segmentation treats a blank line as a boundary', () => {
  const sentences = segmentSentences('First para\n\nSecond para');
  assert.equal(sentences.length, 2);
});

test('offsets returned by tokenizeWords address the original string', () => {
  const text = 'the quick fox';
  for (const token of tokenizeWords(text)) {
    assert.equal(text.slice(token.start, token.end), token.text);
  }
});

test('syllable counter handles silent endings and irregulars', () => {
  const expected = {
    jumped: 1, wanted: 2, table: 2, little: 2, people: 2, business: 2,
    created: 3, making: 2, hopeless: 2, university: 5, makes: 1, boxes: 2,
  };
  for (const [word, count] of Object.entries(expected)) {
    assert.equal(countSyllables(word), count, `${word} should be ${count} syllables`);
  }
});

test('complex-word test excludes inflections and acronyms', () => {
  assert.equal(isComplexWord('information'), true);
  assert.equal(isComplexWord('created'), false);
  assert.equal(isComplexWord('NASA'), false);
});

test('readability separates simple from difficult prose', () => {
  const easy = computeReadability('The cat sat on the mat. It was warm. We were glad.');
  const hard = computeReadability(
    'Notwithstanding the aforementioned considerations, the implementation of a comprehensive '
    + 'organizational restructuring initiative necessitates substantial deliberation.',
  );
  assert.ok(easy.summary.consensusGrade < hard.summary.consensusGrade);
  assert.ok(easy.scores.fleschReadingEase.value > hard.scores.fleschReadingEase.value);
  assert.equal(Object.keys(easy.scores).length, 6);
});

test('readability reports empty input without throwing', () => {
  const result = computeReadability('');
  assert.equal(result.empty, true);
  assert.equal(result.summary, null);
});

test('tone analysis distinguishes casual from academic register', () => {
  const casual = analyzeTone("I don't think we can use this stuff. It's kind of a big problem.");
  const academic = analyzeTone(
    'The committee determined that the proposed methodology was insufficient. '
    + 'Subsequent analysis demonstrated significant deficiencies.',
  );
  assert.ok(casual.metrics.formality.value < academic.metrics.formality.value);
  assert.equal(casual.dominant.id, 'casual');
});

test('passive voice is detected and scored', () => {
  const passive = analyzeTone('The results were reviewed by the board. The decision was made later.');
  const active = analyzeTone('The board reviewed the results. We decided later.');
  assert.ok(passive.metrics.passiveVoice.value > active.metrics.passiveVoice.value);
});

test('morphology inflects regular and irregular forms', () => {
  assert.equal(toPast('use'), 'used');
  assert.equal(toPast('go'), 'went');
  assert.equal(toGerund('run'), 'running');
  assert.equal(toPlural('analysis'), 'analyses');
  assert.equal(conform('utilized', 'utilize', 'use', 'verb'), 'used');
  assert.equal(conform('Utilizing', 'utilize', 'use', 'verb'), 'Using');
});

test('tagger identifies the parts of speech the engine gates on', () => {
  const tagged = tagSentence('The team utilized a comprehensive approach.');
  const byWord = Object.fromEntries(tagged.map((t) => [t.lower, t.pos]));
  assert.equal(byWord.team, 'noun');
  assert.equal(byWord.utilized, 'verb');
  assert.equal(byWord.comprehensive, 'adj');
});

test('naturalness scores generated-sounding text lower than plain prose', () => {
  const generated = analyzeNaturalness(
    'It is important to note that our platform leverages a robust, cutting-edge ecosystem. '
    + 'Moreover, we navigate the complexities of modern business. Furthermore, our solution '
    + "boasts seamless integration. In today's fast-paced world, we unlock the potential of every team.",
  );
  const plain = analyzeNaturalness(
    'I fixed the bug this morning. It took longer than expected. The root cause was a stale '
    + 'cache entry that nobody had cleaned up in months. Once I found it, the fix itself was three lines.',
  );
  assert.ok(plain.composite > generated.composite);
  assert.ok(generated.metrics.aiTells.evidence.length > 0);
});

test('naturalness reports empty on too little text without throwing', () => {
  assert.equal(analyzeNaturalness('').empty, true);
  assert.equal(analyzeNaturalness('One sentence only.').empty, true);
});

test('naturalness rewards varied sentence length over uniform length', () => {
  const uniform = analyzeNaturalness('The cat sat down. The dog ran fast. The bird flew high. The fish swam deep.');
  const varied = analyzeNaturalness('The cat sat. Meanwhile, the old dog that lived next door ran across the yard as fast as it could. Birds flew.');
  assert.ok(varied.metrics.burstiness.value > uniform.metrics.burstiness.value);
});
