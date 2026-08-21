/**
 * Sentence-level structural rules.
 *
 * These are the edits that actually move a reading grade: sentence length is
 * the dominant term in every formula in readability.js, so splitting and
 * joining do more than vocabulary swaps ever will. They are also the riskiest
 * rules, so each one refuses to fire unless its pattern matches cleanly.
 */

import { tagSentence, DETERMINERS, PRONOUNS, AUXILIARIES } from '../../nlp/pos.js';
import { IRREGULAR_VERBS, toThirdPerson, toPast, matchCase } from '../../nlp/morphology.js';
import { countWords } from '../../nlp/tokenize.js';
import { op, splitTerminal, tidy } from './util.js';

// participle -> base, derived from the irregular table so the two stay in sync.
const PARTICIPLE_TO_BASE = (() => {
  const map = new Map();
  for (const [base, forms] of Object.entries(IRREGULAR_VERBS)) {
    if (forms.participle) map.set(forms.participle, base);
    if (forms.past) map.set(forms.past, base);
  }
  return map;
})();

/** Best guess at the base form of a past participle. */
function participleBase(word) {
  const w = word.toLowerCase();
  if (PARTICIPLE_TO_BASE.has(w)) return PARTICIPLE_TO_BASE.get(w);
  if (w.endsWith('ied')) return w.slice(0, -3) + 'y';
  if (w.endsWith('ed')) {
    const stem = w.slice(0, -2);
    if (/([bdfglmnprt])\1$/.test(stem)) return stem.slice(0, -1);
    if (/[^aeiou]$/.test(stem) && /[aeiou][^aeiou]$/.test(stem)) return stem;
    return w.slice(0, -1).endsWith('e') ? w.slice(0, -1) : stem;
  }
  if (w.endsWith('en')) return w.slice(0, -2);
  return w;
}

const PARTICLES = new Set(['out', 'up', 'off', 'down', 'in', 'away', 'back', 'over', 'through', 'aside']);
const TIME_MARKERS = new Set(['last', 'next', 'this', 'yesterday', 'today', 'tomorrow', 'tonight', 'earlier', 'later', 'recently', 'soon', 'again', 'then']);
const CLAUSE_MARKERS = new Set(['and', 'but', 'so', 'which', 'while', 'that', 'when', 'because']);

const PLURAL_AGENTS = new Set(['they', 'we', 'people', 'others', 'users', 'members', 'teams']);

// Subject form -> object form, for the pronoun promoted out of a passive.
const OBJECT_PRONOUNS = {
  i: 'me', we: 'us', he: 'him', she: 'her', they: 'them', it: 'it', you: 'you',
};

/**
 * Rule 8: passive to active.
 *
 * Only rewrites passives that name their agent ("was reviewed by the board"),
 * because an agentless passive has no subject to promote and guessing one
 * would invent content. That restraint is deliberate.
 */
export function voiceRule(sentence, plan) {
  if (plan.voice !== 'active') return { text: sentence, ops: [] };

  const { body, terminal } = splitTerminal(sentence);
  const tokens = tagSentence(body);

  for (let i = 1; i < tokens.length - 2; i++) {
    const aux = tokens[i];
    if (!AUXILIARIES.has(aux.lower)) continue;

    const participle = tokens[i + 1].pos === 'adv' ? tokens[i + 2] : tokens[i + 1];
    if (!participle || !/(?:ed|en|wn|ne|de|te|ht|ft|lt|pt)$/.test(participle.lower)) continue;

    // A phrasal verb keeps its particle between the participle and "by".
    const afterParticiple = tokens[participle.index + 1];
    const particle = afterParticiple && PARTICLES.has(afterParticiple.lower) ? afterParticiple : null;
    const verbEnd = particle || participle;

    const byToken = tokens.find((t, idx) => idx > verbEnd.index && t.lower === 'by');
    if (!byToken) continue;

    const subject = body.slice(0, aux.start).trim();

    // The agent is the noun phrase right after "by": it ends at the next
    // preposition, clause marker or punctuation. Everything past it is
    // carried through verbatim, so mid-sentence passives convert cleanly.
    const agentTokens = [];
    for (let k = byToken.index + 1; k < tokens.length; k++) {
      const token = tokens[k];
      if (token.pos === 'prep' || CLAUSE_MARKERS.has(token.lower)) break;
      // "by engineering last week": a time expression or a second determiner
      // starts a new phrase, so the agent has already ended.
      if (agentTokens.length && (TIME_MARKERS.has(token.lower) || token.pos === 'det')) break;
      const previous = tokens[k - 1];
      const gap = body.slice(previous ? previous.end : byToken.end, token.start);
      if (/[,;:]/.test(gap)) break;
      agentTokens.push(token);
      if (agentTokens.length >= 6) break;
    }
    if (!subject || !agentTokens.length) continue;

    const agentEnd = agentTokens[agentTokens.length - 1].end;
    const agent = body.slice(agentTokens[0].start, agentEnd);
    const tail = body.slice(agentEnd);
    // Anything between the participle and "by" is extra structure we would
    // have to re-order; leave those alone.
    if (body.slice(verbEnd.end, byToken.start).trim()) continue;

    const base = participleBase(participle.text);
    const agentHead = agent.toLowerCase().split(/\s+/).pop();
    const plural = PLURAL_AGENTS.has(agentHead) || /(?<!s)s$/.test(agentHead);

    let verb;
    if (['was', 'were'].includes(aux.lower)) verb = toPast(base);
    else if (['is', 'are'].includes(aux.lower)) verb = plural ? base : toThirdPerson(base);
    else if (['be', 'been', 'being'].includes(aux.lower)) continue;
    else verb = base;

    if (particle) verb = `${verb} ${particle.text}`;
    // The subject becomes the object, so a pronoun has to change case with it:
    // "It was reviewed by the board" is "The board reviewed it", never "It".
    const object = OBJECT_PRONOUNS[subject.toLowerCase()]
      || subject.replace(/^(The|A|An)\s/, (m) => m.toLowerCase());
    const rewritten = tidy(`${matchCase(subject, agent)} ${verb} ${object}${tail}`) + terminal;

    return {
      text: rewritten,
      ops: [op('voice', 'Passive rewritten as active', sentence, rewritten)],
    };
  }

  return { text: sentence, ops: [] };
}

// Coordinators that can begin an independent clause after a comma.
const SPLIT_POINTS = [
  { marker: ', and ', lead: '' },
  { marker: ', but ', lead: 'However, ' },
  { marker: ', so ', lead: 'As a result, ' },
  { marker: ', which ', lead: 'This ' },
  { marker: ', yet ', lead: 'However, ' },
  { marker: '; ', lead: '' },
];

/**
 * Rule 9: split an over-long sentence at a coordinator.
 *
 * Fires only when the sentence is meaningfully longer than the tone's target
 * and both halves would stand alone as sentences.
 */
export function splitRule(sentence, plan) {
  const words = countWords(sentence);
  if (words < plan.sentenceTarget + 4) return { text: sentence, ops: [] };

  const { body, terminal } = splitTerminal(sentence);
  let best = null;

  for (const point of SPLIT_POINTS) {
    const idx = body.toLowerCase().indexOf(point.marker);
    if (idx === -1) continue;
    const left = body.slice(0, idx).trim();
    const right = body.slice(idx + point.marker.length).trim();
    if (!standsAlone(left) || !standsAlone(right)) continue;
    // Prefer the split closest to the middle so the halves stay balanced.
    const balance = Math.abs(countWords(left) - countWords(right));
    if (!best || balance < best.balance) best = { point, left, right, balance };
  }

  if (!best) return { text: sentence, ops: [] };

  const secondRaw = best.point.lead + best.right;
  const second = secondRaw.charAt(0).toUpperCase() + secondRaw.slice(1);
  const text = `${best.left}. ${second}${terminal || '.'}`;

  return {
    text,
    ops: [op('split', `Sentence of ${words} words split toward a ${plan.sentenceTarget}-word target`, sentence, text)],
  };
}

/** A clause stands alone if it has a subject-ish token and a verb. */
function standsAlone(clause) {
  if (countWords(clause) < 4) return false;
  const tokens = tagSentence(clause);
  const hasVerb = tokens.some((t) => t.pos === 'verb' || t.pos === 'aux' || t.pos === 'modal');
  const hasSubject = tokens.some((t, i) => (
    (t.pos === 'pron' || t.pos === 'noun' || DETERMINERS.has(t.lower))
    && tokens.slice(i + 1).some((n) => n.pos === 'verb' || n.pos === 'aux' || n.pos === 'modal')
  ));
  return hasVerb && hasSubject;
}

/**
 * Rule 10: join two short adjacent sentences.
 *
 * The inverse of splitRule, used when a tone asks for a higher grade. Runs
 * across sentence pairs, so it lives in the pipeline rather than here as a
 * per-sentence rule; this function decides whether one pair may be joined.
 */
export function tryJoin(first, second, plan) {
  const firstWords = countWords(first);
  const secondWords = countWords(second);
  if (firstWords + secondWords > plan.sentenceTarget + 10) return null;
  if (firstWords < 3 || secondWords < 3) return null;
  if (!/[.]["')\]]?$/.test(first)) return null; // never merge across ? or !
  if (/^(However|Therefore|Moreover|Furthermore|In conclusion)/i.test(second)) return null;

  const left = first.replace(/[.]["')\]]?$/, '');
  const right = second.charAt(0).toLowerCase() + second.slice(1);
  const connective = /^(it|this|that|they|he|she|we|i)\b/i.test(second) ? ', and ' : '; ';
  const text = `${left}${connective}${right}`;

  return {
    text,
    ops: [op('join', `Two short sentences merged toward a ${plan.sentenceTarget}-word target`, `${first} ${second}`, text)],
  };
}

/**
 * Rule 11: final cleanup.
 *
 * Normalizes spacing and punctuation left behind by other rules and makes
 * sure the sentence still ends in a terminal mark.
 */
export function cleanupRule(sentence) {
  let text = tidy(sentence)
    .replace(/\s+/g, ' ')
    .replace(/\ba\s+([aeiou])/gi, (m, v) => m.replace(/^([Aa])\s/, '$1n '))
    .replace(/\ban\s+([^aeiou\s])/gi, (m) => m.replace(/^([Aa])n\s/, '$1 '));
  // A colon or semicolon already closes the line -- a lead-in such as
  // "Here is the plan:" must not pick up a second mark and become "plan:.".
  if (text && !/[.!?:;]["'”’)\]]?$/.test(text)) text += '.';
  return { text, ops: text === sentence ? [] : [op('cleanup', 'Normalized spacing, articles and punctuation', sentence, text)] };
}
