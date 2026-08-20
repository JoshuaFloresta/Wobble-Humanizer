import test from 'node:test';
import assert from 'node:assert/strict';

import { ALL_SYNONYM_SETS, buildSynonymIndex } from '@humaninzer/engine/data/synonyms.js';

// lookupEntry (engines/rules/lexical.js) resolves a lemma+pos pair to the
// *first* matching entry in the index. Two senses sharing a lemma under the
// same part of speech silently shadow one another -- whichever sense was
// registered first always wins, even when the sentence means the other one.
// This is the regression test for that failure mode.
test('no lemma is claimed by two senses under the same part of speech', () => {
  const seen = new Map(); // "pos|lemma" -> sense
  const collisions = [];

  for (const set of ALL_SYNONYM_SETS) {
    for (const [lemma] of set.variants) {
      const key = `${set.pos}|${lemma}`;
      const owner = seen.get(key);
      if (owner && owner !== set.sense) {
        collisions.push(`${key}: "${owner}" vs "${set.sense}"`);
      } else {
        seen.set(key, set.sense);
      }
    }
  }

  assert.deepEqual(collisions, [], `lemma+pos claimed by more than one sense: ${collisions.join(', ')}`);
});

test('every synonym variant has a valid register and a plausible grade', () => {
  const offenders = [];
  for (const set of ALL_SYNONYM_SETS) {
    for (const [lemma, register, grade] of set.variants) {
      if (register < -2 || register > 2) offenders.push(`${set.sense}/${lemma}: register ${register} out of [-2,2]`);
      if (grade < 1 || grade > 18) offenders.push(`${set.sense}/${lemma}: grade ${grade} out of [1,18]`);
    }
  }
  assert.deepEqual(offenders, []);
});

test('every sense resolves through the built index for each of its own lemmas', () => {
  const index = buildSynonymIndex();
  for (const set of ALL_SYNONYM_SETS) {
    for (const [lemma] of set.variants) {
      const entries = index.get(lemma);
      assert.ok(entries && entries.some((e) => e.pos === set.pos && e.sense === set.sense),
        `${set.pos}/${lemma} does not resolve back to sense "${set.sense}"`);
    }
  }
});
