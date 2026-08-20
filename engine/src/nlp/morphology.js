/**
 * Minimal inflection engine.
 *
 * When the paraphraser swaps one word for another it must carry the original
 * word's grammatical form across, or "he utilized it" becomes "he use it".
 * This module detects the surface form of a token and re-applies it to the
 * replacement, using an irregular table plus regular orthographic rules.
 */

const IRREGULAR_VERBS = {
  be: { past: 'was', participle: 'been', third: 'is', gerund: 'being' },
  have: { past: 'had', participle: 'had', third: 'has', gerund: 'having' },
  do: { past: 'did', participle: 'done', third: 'does', gerund: 'doing' },
  say: { past: 'said', participle: 'said' },
  go: { past: 'went', participle: 'gone' },
  get: { past: 'got', participle: 'gotten', gerund: 'getting' },
  make: { past: 'made', participle: 'made' },
  know: { past: 'knew', participle: 'known' },
  think: { past: 'thought', participle: 'thought' },
  take: { past: 'took', participle: 'taken' },
  see: { past: 'saw', participle: 'seen' },
  come: { past: 'came', participle: 'come' },
  give: { past: 'gave', participle: 'given' },
  find: { past: 'found', participle: 'found' },
  tell: { past: 'told', participle: 'told' },
  become: { past: 'became', participle: 'become' },
  show: { past: 'showed', participle: 'shown' },
  leave: { past: 'left', participle: 'left' },
  feel: { past: 'felt', participle: 'felt' },
  put: { past: 'put', participle: 'put', gerund: 'putting' },
  bring: { past: 'brought', participle: 'brought' },
  begin: { past: 'began', participle: 'begun', gerund: 'beginning' },
  keep: { past: 'kept', participle: 'kept' },
  hold: { past: 'held', participle: 'held' },
  write: { past: 'wrote', participle: 'written' },
  hear: { past: 'heard', participle: 'heard' },
  let: { past: 'let', participle: 'let', gerund: 'letting' },
  mean: { past: 'meant', participle: 'meant' },
  set: { past: 'set', participle: 'set', gerund: 'setting' },
  meet: { past: 'met', participle: 'met' },
  run: { past: 'ran', participle: 'run', gerund: 'running' },
  pay: { past: 'paid', participle: 'paid' },
  speak: { past: 'spoke', participle: 'spoken' },
  lead: { past: 'led', participle: 'led' },
  grow: { past: 'grew', participle: 'grown' },
  lose: { past: 'lost', participle: 'lost' },
  build: { past: 'built', participle: 'built' },
  understand: { past: 'understood', participle: 'understood' },
  break: { past: 'broke', participle: 'broken' },
  spend: { past: 'spent', participle: 'spent' },
  cut: { past: 'cut', participle: 'cut', gerund: 'cutting' },
  rise: { past: 'rose', participle: 'risen' },
  drive: { past: 'drove', participle: 'driven' },
  buy: { past: 'bought', participle: 'bought' },
  choose: { past: 'chose', participle: 'chosen' },
  send: { past: 'sent', participle: 'sent' },
  deal: { past: 'dealt', participle: 'dealt' },
  win: { past: 'won', participle: 'won', gerund: 'winning' },
  teach: { past: 'taught', participle: 'taught' },
  seek: { past: 'sought', participle: 'sought' },
  draw: { past: 'drew', participle: 'drawn' },
  stand: { past: 'stood', participle: 'stood' },
  sit: { past: 'sat', participle: 'sat', gerund: 'sitting' },
  hear: { past: 'heard', participle: 'heard' },
  read: { past: 'read', participle: 'read' },
  hold: { past: 'held', participle: 'held' },
  sell: { past: 'sold', participle: 'sold' },
  catch: { past: 'caught', participle: 'caught' },
  fall: { past: 'fell', participle: 'fallen' },
  forget: { past: 'forgot', participle: 'forgotten', gerund: 'forgetting' },
  cost: { past: 'cost', participle: 'cost' },
  hit: { past: 'hit', participle: 'hit', gerund: 'hitting' },
};

const IRREGULAR_PLURALS = {
  person: 'people', child: 'children', man: 'men', woman: 'women',
  foot: 'feet', tooth: 'teeth', mouse: 'mice', goose: 'geese',
  criterion: 'criteria', phenomenon: 'phenomena', analysis: 'analyses',
  basis: 'bases', crisis: 'crises', thesis: 'theses', datum: 'data',
  medium: 'media', index: 'indices', matrix: 'matrices', appendix: 'appendices',
};

const VOWELS = 'aeiou';

/** Copy the capitalization pattern of `source` onto `target`. */
export function matchCase(source, target) {
  if (!source || !target) return target;
  if (source === source.toUpperCase() && source.length > 1) return target.toUpperCase();
  if (source[0] === source[0].toUpperCase()) {
    return target[0].toUpperCase() + target.slice(1);
  }
  return target;
}

/** Third-person singular present: "use" -> "uses", "try" -> "tries". */
export function toThirdPerson(verb) {
  const irr = IRREGULAR_VERBS[verb];
  if (irr && irr.third) return irr.third;
  if (/(?:s|sh|ch|x|z|o)$/.test(verb)) return verb + 'es';
  if (/[^aeiou]y$/.test(verb)) return verb.slice(0, -1) + 'ies';
  return verb + 's';
}

/** Simple past, or past participle when `participle` is set. */
export function toPast(verb, participle = false) {
  const irr = IRREGULAR_VERBS[verb];
  if (irr) return participle ? irr.participle : irr.past;
  if (/e$/.test(verb)) return verb + 'd';
  if (/[^aeiou]y$/.test(verb)) return verb.slice(0, -1) + 'ied';
  if (shouldDoubleFinal(verb)) return verb + verb.slice(-1) + 'ed';
  return verb + 'ed';
}

/** Present participle: "use" -> "using", "run" -> "running". */
export function toGerund(verb) {
  const irr = IRREGULAR_VERBS[verb];
  if (irr && irr.gerund) return irr.gerund;
  if (/ie$/.test(verb)) return verb.slice(0, -2) + 'ying';
  if (/[^aeiou]e$/.test(verb)) return verb.slice(0, -1) + 'ing';
  if (shouldDoubleFinal(verb)) return verb + verb.slice(-1) + 'ing';
  return verb + 'ing';
}

/** Plural of a noun. */
export function toPlural(noun) {
  if (IRREGULAR_PLURALS[noun]) return IRREGULAR_PLURALS[noun];
  if (/(?:s|sh|ch|x|z)$/.test(noun)) return noun + 'es';
  if (/[^aeiou]y$/.test(noun)) return noun.slice(0, -1) + 'ies';
  if (/fe$/.test(noun)) return noun.slice(0, -2) + 'ves';
  if (/[^f]f$/.test(noun)) return noun.slice(0, -1) + 'ves';
  return noun + 's';
}

/** Comparative, or superlative when `superlative` is set. */
export function toComparative(adj, superlative = false) {
  const suffix = superlative ? 'est' : 'er';
  if (/e$/.test(adj)) return adj + suffix.slice(1);
  if (/[^aeiou]y$/.test(adj)) return adj.slice(0, -1) + 'i' + suffix;
  if (shouldDoubleFinal(adj)) return adj + adj.slice(-1) + suffix;
  return adj + suffix;
}

function shouldDoubleFinal(word) {
  // Single-syllable consonant-vowel-consonant: "run" -> "running".
  if (word.length < 3) return false;
  const a = word[word.length - 3];
  const b = word[word.length - 2];
  const c = word[word.length - 1];
  return (
    !VOWELS.includes(a) && VOWELS.includes(b) && !VOWELS.includes(c) &&
    !'wxy'.includes(c) && countVowelGroups(word) === 1
  );
}

function countVowelGroups(w) {
  let n = 0;
  let prev = false;
  for (const ch of w) {
    const v = 'aeiouy'.includes(ch);
    if (v && !prev) n++;
    prev = v;
  }
  return n;
}

/**
 * Detect the surface form of an inflected word given its lemma.
 * @returns {'base'|'third'|'past'|'participle'|'gerund'|'plural'|'comparative'|'superlative'}
 */
export function detectForm(surface, lemma, pos) {
  const s = surface.toLowerCase();
  const l = lemma.toLowerCase();
  if (s === l) return 'base';
  if (pos === 'noun') {
    return s === toPlural(l) || (s.endsWith('s') && !l.endsWith('s')) ? 'plural' : 'base';
  }
  if (pos === 'adj' || pos === 'adv') {
    if (s === toComparative(l)) return 'comparative';
    if (s === toComparative(l, true)) return 'superlative';
    return 'base';
  }
  if (s === toThirdPerson(l)) return 'third';
  if (s === toGerund(l)) return 'gerund';
  if (s === toPast(l)) return 'past';
  if (s === toPast(l, true)) return 'participle';
  if (s.endsWith('ing')) return 'gerund';
  if (s.endsWith('ed')) return 'past';
  if (s.endsWith('s')) return pos === 'verb' ? 'third' : 'plural';
  return 'base';
}

/** Apply a detected form to a replacement lemma. */
export function applyForm(lemma, form, pos) {
  switch (form) {
    case 'third': return toThirdPerson(lemma);
    case 'past': return toPast(lemma);
    case 'participle': return toPast(lemma, true);
    case 'gerund': return toGerund(lemma);
    case 'plural': return toPlural(lemma);
    case 'comparative': return toComparative(lemma);
    case 'superlative': return toComparative(lemma, true);
    default: return lemma;
  }
}

/**
 * Re-inflect `replacement` so it matches how `surface` inflects `lemma`,
 * including capitalization.
 */
export function conform(surface, lemma, replacement, pos) {
  const form = detectForm(surface, lemma, pos);
  return matchCase(surface, applyForm(replacement, form, pos));
}

export { IRREGULAR_VERBS, IRREGULAR_PLURALS };
