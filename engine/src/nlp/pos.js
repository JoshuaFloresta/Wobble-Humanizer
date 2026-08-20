/**
 * Lightweight part-of-speech tagger.
 *
 * A full statistical tagger would be overkill here: the engine only needs to
 * know whether a token is a noun, verb, adjective or adverb so it can pick
 * the right synonym set and avoid ungrammatical swaps. This is a closed-class
 * lexicon plus suffix heuristics plus a handful of contextual repair rules,
 * which is accurate enough for that gate and costs microseconds.
 */

import { tokenizeWords } from './tokenize.js';

const DETERMINERS = new Set(['a', 'an', 'the', 'this', 'that', 'these', 'those', 'each', 'every', 'some', 'any', 'no', 'all', 'both', 'either', 'neither', 'another', 'such', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'whose']);
const PREPOSITIONS = new Set(['about', 'above', 'across', 'after', 'against', 'along', 'among', 'around', 'at', 'before', 'behind', 'below', 'beneath', 'beside', 'between', 'beyond', 'by', 'despite', 'down', 'during', 'except', 'for', 'from', 'in', 'inside', 'into', 'like', 'near', 'of', 'off', 'on', 'onto', 'outside', 'over', 'past', 'since', 'through', 'throughout', 'to', 'toward', 'towards', 'under', 'until', 'up', 'upon', 'with', 'within', 'without']);
const PRONOUNS = new Set(['i', 'me', 'you', 'he', 'him', 'she', 'it', 'we', 'us', 'they', 'them', 'who', 'whom', 'which', 'what', 'myself', 'yourself', 'himself', 'herself', 'itself', 'ourselves', 'themselves', 'mine', 'yours', 'hers', 'ours', 'theirs', 'anyone', 'everyone', 'someone', 'nobody', 'something', 'nothing', 'anything', 'everything']);
const CONJUNCTIONS = new Set(['and', 'or', 'but', 'nor', 'so', 'yet', 'because', 'although', 'though', 'while', 'whereas', 'unless', 'if', 'when', 'whenever', 'where', 'wherever', 'than', 'whether', 'since', 'as']);
const MODALS = new Set(['can', 'could', 'may', 'might', 'must', 'shall', 'should', 'will', 'would', 'ought']);
const AUXILIARIES = new Set(['is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'has', 'have', 'had', 'do', 'does', 'did']);
const ADVERBS = new Set(['very', 'too', 'also', 'just', 'only', 'even', 'still', 'already', 'always', 'never', 'often', 'sometimes', 'usually', 'rarely', 'here', 'there', 'now', 'then', 'today', 'yesterday', 'tomorrow', 'soon', 'again', 'once', 'twice', 'well', 'quite', 'rather', 'almost', 'nearly', 'perhaps', 'maybe', 'however', 'therefore', 'moreover', 'furthermore', 'otherwise', 'instead', 'indeed', 'thus', 'hence', 'not', 'more', 'most', 'less', 'least']);

// Frequent words whose most common tag is worth pinning down.
const LEXICON = new Map(Object.entries({
  use: 'verb', used: 'verb', uses: 'verb', help: 'verb', need: 'verb',
  make: 'verb', made: 'verb', get: 'verb', got: 'verb', give: 'verb',
  take: 'verb', show: 'verb', find: 'verb', think: 'verb', know: 'verb',
  want: 'verb', tell: 'verb', ask: 'verb', work: 'verb', try: 'verb',
  people: 'noun', time: 'noun', way: 'noun', thing: 'noun', things: 'noun',
  year: 'noun', day: 'noun', man: 'noun', woman: 'noun', child: 'noun',
  team: 'noun', data: 'noun', result: 'noun', results: 'noun',
  good: 'adj', bad: 'adj', new: 'adj', old: 'adj', great: 'adj',
  big: 'adj', small: 'adj', large: 'adj', long: 'adj', short: 'adj',
  high: 'adj', low: 'adj', important: 'adj', clear: 'adj', hard: 'adj',
  easy: 'adj', main: 'adj', key: 'adj', whole: 'adj', many: 'adj',
}));

const SUFFIX_RULES = [
  [/(?:tion|sion|ment|ness|ity|ance|ence|ship|hood|ism|ist|dom|age|ure|ary)$/, 'noun'],
  [/(?:er|or|ian|eer)s?$/, 'noun'],
  [/(?:ize|ise|ify|ate|en)$/, 'verb'],
  [/(?:able|ible|al|ful|ic|ive|less|ous|ish|ary|ent|ant)$/, 'adj'],
  [/(?:ly)$/, 'adv'],
  [/(?:ing)$/, 'verb'],
  [/(?:ed)$/, 'verb'],
];

/**
 * Tag one sentence.
 * @param {string} sentence
 * @returns {{text:string,start:number,end:number,lower:string,pos:string,index:number}[]}
 */
export function tagSentence(sentence) {
  const tokens = tokenizeWords(sentence).map((t, index) => ({ ...t, index, pos: null }));

  // Pass 1: lexicon and closed classes.
  for (const token of tokens) {
    token.pos = lookup(token.lower);
  }

  // Pass 2: suffix heuristics for anything still unknown.
  for (const token of tokens) {
    if (token.pos) continue;
    if (/^\d/.test(token.text)) { token.pos = 'num'; continue; }
    token.pos = suffixGuess(token.lower) || 'noun';
  }

  // Pass 3: contextual repair.
  for (let i = 0; i < tokens.length; i++) {
    const prev = tokens[i - 1];
    const next = tokens[i + 1];
    const token = tokens[i];

    // "to <word>" is an infinitive verb, not a noun.
    if (prev && prev.lower === 'to' && token.pos === 'noun' && !next) token.pos = 'verb';
    if (prev && prev.lower === 'to' && token.pos === 'noun' && next && next.pos !== 'noun') token.pos = 'verb';

    // After a modal or auxiliary "do", the next content word is a verb.
    if (prev && (MODALS.has(prev.lower) || ['do', 'does', 'did'].includes(prev.lower)) && token.pos === 'noun') {
      token.pos = 'verb';
    }

    // After a determiner, a verb-tagged word is really a noun ("the change").
    if (prev && DETERMINERS.has(prev.lower) && token.pos === 'verb' && !/ing$/.test(token.lower)) {
      token.pos = 'noun';
    }

    // Adjective directly before a noun stays adjective; a noun before a noun
    // is a modifier, which for our purposes behaves like an adjective.
    if (token.pos === 'verb' && next && next.pos === 'noun' && prev && DETERMINERS.has(prev.lower)) {
      token.pos = 'adj';
    }

    // "be/is/are + past participle" is passive: keep the participle a verb.
    if (prev && AUXILIARIES.has(prev.lower) && token.pos === 'adj' && /(?:ed|en)$/.test(token.lower)) {
      token.pos = 'verb';
    }

    // A word after an adverb and before a noun is adjectival ("very large team").
    if (prev && prev.pos === 'adv' && next && next.pos === 'noun' && token.pos === 'noun') {
      token.pos = 'adj';
    }
  }

  return tokens;
}

function lookup(lower) {
  if (DETERMINERS.has(lower)) return 'det';
  if (PRONOUNS.has(lower)) return 'pron';
  if (MODALS.has(lower)) return 'modal';
  if (AUXILIARIES.has(lower)) return 'aux';
  if (CONJUNCTIONS.has(lower)) return 'conj';
  if (PREPOSITIONS.has(lower)) return 'prep';
  if (ADVERBS.has(lower)) return 'adv';
  if (LEXICON.has(lower)) return LEXICON.get(lower);
  return null;
}

function suffixGuess(lower) {
  for (const [pattern, tag] of SUFFIX_RULES) {
    if (pattern.test(lower)) return tag;
  }
  return null;
}

/** True when the tag is an open-class tag eligible for synonym replacement. */
export function isContentTag(pos) {
  return pos === 'noun' || pos === 'verb' || pos === 'adj' || pos === 'adv';
}

export { DETERMINERS, PREPOSITIONS, PRONOUNS, CONJUNCTIONS, MODALS, AUXILIARIES, ADVERBS };
