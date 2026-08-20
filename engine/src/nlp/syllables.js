/**
 * Heuristic English syllable counter.
 *
 * Readability formulas are very sensitive to syllable counts, so this uses
 * the standard vowel-group scan hardened with the exception classes that
 * actually matter in prose: silent -e, syllabic -le, silent -ed, silent -es,
 * decomposable suffixes, and a table of frequent irregulars. It is fully
 * deterministic, which matters more here than chasing the last few percent.
 */

const EXCEPTIONS = new Map(Object.entries({
  business: 2, wednesday: 2, everything: 3, everyone: 3, anything: 3,
  people: 2, evening: 2, different: 3, interesting: 3, comfortable: 3,
  vegetable: 3, restaurant: 3, chocolate: 3, family: 3, camera: 3,
  favorite: 3, average: 3, beautiful: 3, area: 3, idea: 3, real: 1,
  science: 2, quiet: 2, being: 2, doing: 2, going: 2, seeing: 2,
  recipe: 3, coyote: 3, adobe: 3, maybe: 2, cafe: 2, resume: 2,
  poem: 2, poet: 2, create: 2, react: 2, theater: 3, museum: 3,
  every: 2, general: 3, several: 3, federal: 3, natural: 3, actually: 4,
  usually: 4, probably: 3, basically: 4, especially: 4, literally: 4,
  onion: 2, union: 2, million: 2, billion: 2, opinion: 3, question: 2,
  ninety: 2, forty: 2, thirty: 2, once: 1, twice: 1, judgement: 2,
  lion: 2, quiche: 1, queue: 1, aisle: 1, choir: 2, colonel: 2,
}));

// Suffixes that can be split off and counted separately; the base keeps its
// own silent-e handling ("hopeless" -> "hope" + "less" = 2, not 3).
const SUFFIXES = [
  ['lessness', 3], ['fulness', 3], ['less', 1], ['ness', 1], ['ment', 1],
  ['ful', 1], ['ship', 1], ['hood', 1], ['wise', 1], ['like', 1], ['some', 1],
];

const VOWELS = 'aeiouy';

function vowelGroups(w) {
  let count = 0;
  let prevVowel = false;
  for (let i = 0; i < w.length; i++) {
    const isVowel = VOWELS.includes(w[i]);
    if (isVowel && !prevVowel) count++;
    prevVowel = isVowel;
  }
  return count;
}

/**
 * @param {string} word
 * @returns {number} syllable count; at least 1 for any alphabetic word
 */
export function countSyllables(word) {
  const w = String(word).toLowerCase().replace(/[^a-z']/g, '').replace(/'/g, '');
  if (!w) return 0;
  return syllablesOf(w, true);
}

function syllablesOf(w, allowSuffixSplit) {
  if (EXCEPTIONS.has(w)) return EXCEPTIONS.get(w);

  // Inflected form of a known irregular ("families" -> "family").
  for (const [suffix, base] of [['ies', 'y'], ['ied', 'y'], ['ily', 'y']]) {
    if (w.endsWith(suffix)) {
      const stem = w.slice(0, -suffix.length) + base;
      if (EXCEPTIONS.has(stem)) return EXCEPTIONS.get(stem) + (suffix === 'ily' ? 1 : 0);
    }
  }
  for (const suffix of ['s', 'es', 'ed', 'ing', 'ly']) {
    if (!w.endsWith(suffix)) continue;
    const stem = w.slice(0, -suffix.length);
    // "creating" -> "creat" -> also try "create" before giving up.
    for (const candidate of [stem, stem + 'e']) {
      if (!EXCEPTIONS.has(candidate)) continue;
      const root = candidate.replace(/e$/, '');
      const adds = suffix === 'ing' || suffix === 'ly' ? 1
        : suffix === 'ed' && /[td]$/.test(root) ? 1
        : 0;
      return EXCEPTIONS.get(candidate) + adds;
    }
  }

  // Split off a decomposable suffix and count the two halves independently.
  if (allowSuffixSplit) {
    for (const [suffix, beats] of SUFFIXES) {
      if (w.length > suffix.length + 2 && w.endsWith(suffix)) {
        return syllablesOf(w.slice(0, -suffix.length), false) + beats;
      }
    }
  }

  let count = vowelGroups(w);

  // Silent trailing -e ("make"), but consonant+le keeps its beat ("table").
  if (count > 1 && /[^aeiou]e$/.test(w) && !/[^aeiou]le$/.test(w)) count--;

  // Silent -es ("makes"), except after a sibilant ("boxes", "watches").
  if (count > 1 && /[^aeiousxzgh]es$/.test(w)) count--;

  // Silent -ed ("jumped"), except after t/d ("wanted", "needed").
  if (count > 1 && /[^tdi]ed$/.test(w)) count--;

  return Math.max(1, count);
}

/** Words of 3+ syllables, excluding the familiar cases Gunning Fog exempts. */
export function isComplexWord(word) {
  const raw = String(word);
  const w = raw.toLowerCase();
  if (w.length < 4) return false;
  if (raw.length > 1 && raw === raw.toUpperCase()) return false; // acronyms
  if (countSyllables(w) < 3) return false;
  // Familiar words made three-syllable only by an inflection.
  const base = w.replace(/(?:es|ed|ing)$/, '');
  if (base !== w && countSyllables(base) < 3) return false;
  // Compounds of short words.
  if (w.includes('-') && w.split('-').every((p) => countSyllables(p) < 3)) return false;
  return true;
}

/** Polysyllabic = 3+ syllables with no exclusions (SMOG's definition). */
export function isPolysyllabic(word) {
  return countSyllables(word) >= 3;
}
