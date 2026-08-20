/**
 * Word- and phrase-level rewrite rules.
 *
 * Each exported rule takes a sentence and the active plan, and returns the
 * rewritten sentence plus the operations it performed. Rules never fire
 * unless the plan asks for their goal, which is what keeps a "Casual" run
 * from quietly applying formalizing edits.
 */

import { tagSentence, isContentTag } from '../../nlp/pos.js';
import { conform, matchCase } from '../../nlp/morphology.js';
import { ALL_PHRASE_RULES } from '../../data/phrases.js';
import {
  CONTRACTIONS, HEDGES, INTENSIFIERS, INTENSIFIER_COLLAPSE,
  INFORMAL_WORDS, FORMAL_WORDS, DISCOURSE_MARKERS,
} from '../../data/markers.js';
import { applyPhraseRules, phrasePattern, op, tidy } from './util.js';

/** Rule 1: wordy phrases, filler, and nominalizations. */
export function phraseRule(sentence, plan) {
  const active = ALL_PHRASE_RULES.filter((r) => r.goals.some((g) => plan.goals.has(g)));
  return applyPhraseRules(sentence, active, 'phrase');
}

const EXPAND = CONTRACTIONS.map(([short, long]) => ({ from: short, to: long, reason: 'Expanded for formal register' }));
// "let us" -> "let's" changes meaning too often to be worth it, and expanding
// "it is"/"that is" back is handled by the expand direction only.
const CONTRACT = CONTRACTIONS
  .filter(([, long]) => long !== 'let us')
  .map(([short, long]) => ({ from: long, to: short, reason: 'Contracted for conversational register' }));

/** Rule 2: contraction policy. */
export function contractionRule(sentence, plan) {
  if (plan.contractions === 'expand') return applyPhraseRules(sentence, EXPAND, 'contraction');
  if (plan.contractions === 'contract') return applyPhraseRules(sentence, CONTRACT, 'contraction');
  return { text: sentence, ops: [] };
}

const INFORMAL_RULES = Object.entries(INFORMAL_WORDS)
  .map(([from, to]) => ({ from, to, reason: 'Raised register' }))
  .sort((a, b) => b.from.length - a.from.length);
const FORMAL_RULES = Object.entries(FORMAL_WORDS)
  .map(([from, to]) => ({ from, to, reason: 'Lowered register' }))
  .sort((a, b) => b.from.length - a.from.length);

/** Rule 3: register-shifting vocabulary swaps. */
export function registerRule(sentence, plan) {
  if (plan.goals.has('formal')) return applyPhraseRules(sentence, INFORMAL_RULES, 'register');
  if (plan.goals.has('casual') || plan.goals.has('simplify')) {
    return applyPhraseRules(sentence, FORMAL_RULES, 'register');
  }
  return { text: sentence, ops: [] };
}

const COLLAPSE_RULES = Object.entries(INTENSIFIER_COLLAPSE)
  .map(([from, to]) => ({ from, to, reason: 'Collapsed intensifier into a stronger word' }));

/** Rule 4: intensifier policy. */
export function intensifierRule(sentence, plan) {
  if (plan.intensifiers === 'keep') return { text: sentence, ops: [] };

  // Collapsing is always safe and shortens the sentence, so try it first.
  const collapsed = applyPhraseRules(sentence, COLLAPSE_RULES, 'intensifier');
  if (plan.intensifiers === 'collapse') return collapsed;

  const strip = INTENSIFIERS
    .filter((w) => w !== 'so') // "so" is often a connective, not a degree word
    .map((w) => ({ from: w, to: '', reason: 'Removed degree intensifier' }));
  const stripped = applyPhraseRules(collapsed.text, strip, 'intensifier');
  return { text: stripped.text, ops: [...collapsed.ops, ...stripped.ops] };
}

const HEDGE_RULES = HEDGES
  .filter((h) => !['often', 'usually', 'generally', 'sometimes'].includes(h))
  .map((h) => ({ from: h, to: '', reason: 'Removed hedge' }))
  .sort((a, b) => b.from.length - a.from.length);

/** Rule 5: hedging policy. */
export function hedgeRule(sentence, plan) {
  if (plan.hedges === 'strip') {
    const result = applyPhraseRules(sentence, HEDGE_RULES, 'hedge', { limit: 2 });
    // Removing "I think" leaves "that" dangling: "I think that X" -> "That X".
    const cleaned = result.text.replace(/^That\s+/, '');
    if (cleaned !== result.text) {
      return { text: tidy(cleaned), ops: result.ops };
    }
    return result;
  }
  return { text: sentence, ops: [] };
}

/** Candidate base forms for a surface word, best guess first. */
export function candidateLemmas(word) {
  const w = word.toLowerCase();
  const out = [w];
  const undouble = (s) => (/([bdfglmnprt])\1$/.test(s) ? s.slice(0, -1) : s);

  if (w.endsWith('ies') && w.length > 4) out.push(w.slice(0, -3) + 'y');
  if (w.endsWith('es') && w.length > 3) out.push(w.slice(0, -2), w.slice(0, -1));
  else if (w.endsWith('s') && !w.endsWith('ss')) out.push(w.slice(0, -1));
  if (w.endsWith('ied') && w.length > 4) out.push(w.slice(0, -3) + 'y');
  if (w.endsWith('ed') && w.length > 3) {
    out.push(w.slice(0, -1), w.slice(0, -2), undouble(w.slice(0, -2)));
  }
  if (w.endsWith('ing') && w.length > 4) {
    out.push(w.slice(0, -3), w.slice(0, -3) + 'e', undouble(w.slice(0, -3)));
  }
  if (w.endsWith('ly') && w.length > 3) out.push(w.slice(0, -2));
  if (w.endsWith('est') && w.length > 4) out.push(w.slice(0, -3), w.slice(0, -2));
  else if (w.endsWith('er') && w.length > 3) out.push(w.slice(0, -2), w.slice(0, -1));

  return [...new Set(out)];
}

/**
 * Score a candidate synonym against the plan.
 *
 * Register distance dominates: a "Formal" run should prefer "obtain" over
 * "get" even when both sit at the requested reading grade. Grade distance
 * breaks the remaining ties, so "Simple" pulls the same set the other way.
 */
function scoreVariant(variant, plan) {
  const registerCost = Math.abs(variant.register - plan.targetRegister) * 2.0;
  // Asymmetric on purpose. A word above the target grade hurts the reader;
  // a word below it does not, so "good" must not lose to "excellent" just
  // because "excellent" sits nearer the target number.
  const over = variant.grade - plan.targetGrade;
  const belowWeight = plan.raiseGrade ? 0.35 : 0.08;
  const gradeCost = over > 0 ? over * 0.5 : -over * belowWeight;
  return -(registerCost + gradeCost);
}

// Candidates within this many score points of the best are treated as
// equally good, so the seed picks among them instead of always taking the
// single top-ranked word. Wide enough to give real variety between runs,
// narrow enough that every candidate in the band is still a defensible
// choice for the target register and grade.
const SWAP_EPSILON = 0.3;

/**
 * Rule 6: sense-scoped synonym substitution.
 *
 * Uses the POS tag to pick the right sense, re-inflects the replacement to
 * the original's form, and records one decision per lemma so the same word
 * is rewritten the same way throughout the document.
 */
export function synonymRule(sentence, plan, ctx) {
  const tokens = tagSentence(sentence);
  const index = ctx.synonymIndex;
  const edits = [];
  const ops = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!isContentTag(token.pos)) continue;
    if (ctx.preserve.has(token.lower)) continue;
    // Skip mid-sentence capitals: almost always proper nouns.
    if (i > 0 && /^[A-Z]/.test(token.text) && token.text !== token.text.toUpperCase()) continue;

    // Two-word variants ("find out", "look at") take precedence.
    const next = tokens[i + 1];
    const bigram = next ? `${token.lower} ${next.lower}` : null;
    const match = (bigram && lookupEntry(index, [bigram], token.pos))
      || lookupEntry(index, candidateLemmas(token.lower), token.pos);
    if (!match) continue;

    const { entry, lemma } = match;
    const isBigram = lemma.includes(' ');
    const surface = isBigram ? `${token.text} ${next.text}` : token.text;

    const decisionKey = `${entry.sense}:${entry.pos}`;
    let chosen = ctx.decisions.get(decisionKey);

    if (chosen === undefined) {
      const currentScore = scoreVariant(entry, plan);
      const ranked = entry.variants
        .map((v) => ({ v, score: scoreVariant(v, plan) }))
        .sort((a, b) => b.score - a.score);
      const best = ranked[0];
      // Only swap when the gain is worth the churn.
      if (best.score - currentScore >= plan.swapThreshold) {
        // Among the words that score within SWAP_EPSILON of the best, the
        // seed picks one rather than always taking the top-ranked word --
        // this is what makes two runs of the same request read differently
        // while every candidate in the band stays equally defensible.
        const tied = ranked.filter((r) => r.v.lemma !== entry.lemma && best.score - r.score <= SWAP_EPSILON);
        chosen = tied.length ? tied[Math.floor(ctx.rng() * tied.length)].v : best.v;
      } else {
        chosen = null;
      }
      ctx.decisions.set(decisionKey, chosen);
    }

    if (!chosen || chosen.lemma === entry.lemma) continue;

    const replacement = buildReplacement(token, entry, chosen, surface, isBigram);

    edits.push({ surface, replacement, index: i, span: isBigram ? 2 : 1 });
    ops.push(op('synonym', `${entry.pos} sense "${entry.sense}" tuned to ${plan.toneLabel}`, surface, replacement, {
      register: chosen.register,
      grade: chosen.grade,
    }));
    if (isBigram) i++;
  }

  if (!edits.length) return { text: sentence, ops: [] };
  return { text: applyTokenEdits(sentence, tokens, edits), ops };
}

/**
 * Inflect the replacement to match the original.
 *
 * For a phrasal replacement the inflection lands on the head word only, so
 * "determined" -> "found out" rather than the ungrammatical "find out".
 */
function buildReplacement(token, entry, chosen, surface, isBigram) {
  const head = entry.lemma.includes(' ') ? entry.lemma.split(' ')[0] : entry.lemma;
  const sourceHead = isBigram ? token.text : surface;

  if (chosen.lemma.includes(' ')) {
    const [chosenHead, ...tail] = chosen.lemma.split(' ');
    const inflected = conform(sourceHead, head, chosenHead, entry.pos);
    return [inflected, ...tail].join(' ');
  }
  return conform(sourceHead, head, chosen.lemma, entry.pos);
}

function lookupEntry(index, lemmas, pos) {
  for (const lemma of lemmas) {
    const entries = index.get(lemma);
    if (!entries) continue;
    const entry = entries.find((e) => e.pos === pos)
      || (pos === 'adv' ? entries.find((e) => e.pos === 'adj') : null);
    if (entry) return { entry, lemma };
  }
  return null;
}

/** Rewrite a sentence from token-indexed edits, right to left. */
function applyTokenEdits(sentence, tokens, edits) {
  let out = sentence;
  for (const edit of [...edits].sort((a, b) => b.index - a.index)) {
    const first = tokens[edit.index];
    const last = tokens[edit.index + edit.span - 1];
    out = out.slice(0, first.start) + edit.replacement + out.slice(last.end);
  }
  return out;
}

const OPENER_INDEX = (() => {
  const map = new Map();
  for (const group of DISCOURSE_MARKERS) {
    for (const [word, register] of group.variants) {
      map.set(word, { relation: group.relation, register, variants: group.variants });
    }
  }
  return map;
})();

/**
 * Rule 7: sentence-opening connectives.
 *
 * Swaps the connective for one expressing the same logical relation at the
 * target register ("But" -> "However"), never changing the relation itself.
 */
export function discourseRule(sentence, plan) {
  const match = sentence.match(/^([A-Za-z]+(?:\s[a-z]+){0,2})([,\s])/);
  if (!match) return { text: sentence, ops: [] };

  // Try the longest opener first ("that said" before "that").
  const candidates = [match[1], match[1].split(/\s/).slice(0, 2).join(' '), match[1].split(/\s/)[0]];
  for (const candidate of candidates) {
    const entry = OPENER_INDEX.get(candidate.toLowerCase());
    if (!entry) continue;

    const ranked = entry.variants
      .map(([word, register]) => ({ word, register, cost: Math.abs(register - plan.targetRegister) }))
      .sort((a, b) => a.cost - b.cost);
    const best = ranked[0];
    if (best.word === candidate.toLowerCase()) return { text: sentence, ops: [] };
    if (Math.abs(entry.register - plan.targetRegister) - best.cost < 1) return { text: sentence, ops: [] };

    const replacement = matchCase(candidate, best.word);
    const rest = sentence.slice(candidate.length);
    // A multi-word connective needs a comma after it; a single word may not.
    const needsComma = best.word.includes(' ') && !rest.startsWith(',');
    const text = replacement + (needsComma ? ',' : '') + rest;
    return {
      text,
      ops: [op('discourse', `${entry.relation} connective set to ${plan.toneLabel} register`, candidate, replacement)],
    };
  }

  return { text: sentence, ops: [] };
}
