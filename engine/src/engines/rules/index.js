/**
 * The deterministic rule engine.
 *
 * Pipeline, in order:
 *   1. build a plan from the tone preset and the requested reading grade
 *   2. rewrite each sentence through the lexical rules
 *   3. run the structural rules (voice, split, join) across the paragraph
 *   4. re-measure; if the grade still misses the target, run another pass
 *      with the corrective goals switched on (max 3 passes)
 *   5. reassemble, preserving the original paragraph structure
 *
 * Every edit is recorded as an op, so the returned trace fully explains the
 * difference between input and output. Given the same input and options the
 * output is byte-identical: the only randomness is a seeded tie-break.
 */

import { segmentSentences, countWords } from '../../nlp/tokenize.js';
import { computeReadability } from '../../nlp/readability.js';
import { buildSynonymIndex } from '../../data/synonyms.js';
import { getTone, getReadabilityTarget } from '../../data/tones.js';
import { hashSeed, makeRng } from './util.js';
import {
  phraseRule, contractionRule, registerRule, intensifierRule,
  hedgeRule, synonymRule, discourseRule,
} from './lexical.js';
import { voiceRule, splitRule, tryJoin, cleanupRule } from './structure.js';

const SYNONYM_INDEX = buildSynonymIndex();

const INTENSITY_THRESHOLDS = { light: 1.6, balanced: 0.8, strong: 0.25 };
const MAX_PASSES = 3;

/**
 * Build the plan that gates every rule.
 * @returns {object} plan
 */
export function buildPlan(options, currentGrade) {
  const tone = getTone(options.tone);
  const target = getReadabilityTarget(options.readabilityTarget);
  const intensity = INTENSITY_THRESHOLDS[options.intensity] !== undefined ? options.intensity : 'balanced';

  const explicitGrade = target.grade !== null;
  const targetGrade = explicitGrade
    ? target.grade
    : clamp(currentGrade + tone.gradeBias, 3, 18);

  const goals = new Set(tone.goals);
  // A grade target well below the current level needs the simplifying rules
  // even when the tone preset did not ask for them, and vice versa.
  if (targetGrade < currentGrade - 1.5) goals.add('simplify');
  if (targetGrade < currentGrade - 3) goals.add('concise');

  return {
    toneId: tone.id,
    toneLabel: tone.label,
    goals,
    targetRegister: tone.register,
    targetGrade,
    contractions: tone.contractions,
    hedges: tone.hedges,
    intensifiers: tone.intensifiers,
    voice: tone.voice,
    sentenceTarget: sentenceTargetFor(tone, targetGrade, explicitGrade),
    raiseGrade: targetGrade > currentGrade + 1,
    allowRaise: explicitGrade || tone.gradeBias > 0,
    swapThreshold: INTENSITY_THRESHOLDS[intensity],
    intensity,
    readabilityTargetId: target.id,
  };
}

/**
 * Words per sentence is the strongest lever on grade, so the tone's preferred
 * length is pulled toward whatever the requested grade implies.
 */
function sentenceTargetFor(tone, targetGrade, explicitGrade) {
  const impliedByGrade = clamp(6 + targetGrade * 1.1, 9, 30);
  // An explicit grade request wins outright; "auto" blends the tone's own
  // preference with what the grade implies.
  if (explicitGrade) return Math.round(impliedByGrade);
  return Math.round((tone.sentenceTarget + impliedByGrade) / 2);
}

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

const LEXICAL_RULES = [
  ['phrase', phraseRule],
  ['contraction', contractionRule],
  ['register', registerRule],
  ['intensifier', intensifierRule],
  ['hedge', hedgeRule],
  // Voice runs before the synonym rule: a phrasal replacement such as
  // "reviewed" -> "looked at" would hide the passive pattern from voiceRule.
  ['voice', voiceRule],
  ['synonym', synonymRule],
  ['discourse', discourseRule],
];

/**
 * Rewrite one paragraph.
 * @returns {{text:string, ops:object[]}}
 */
function rewriteParagraph(paragraph, plan, ctx) {
  const sentences = segmentSentences(paragraph).map((s) => s.text);
  const ops = [];
  let rewritten = [];

  for (let i = 0; i < sentences.length; i++) {
    let text = sentences[i];
    ctx.sentenceIndex = i;

    for (const [id, rule] of LEXICAL_RULES) {
      const result = rule(text, plan, ctx);
      if (result.text !== text) {
        text = result.text;
        for (const o of result.ops) ops.push({ ...o, sentence: i });
      }
    }

    // Split before joining: a long sentence that becomes two short ones
    // should not immediately be merged back together.
    const split = splitRule(text, plan);
    if (split.text !== text) {
      text = split.text;
      for (const o of split.ops) ops.push({ ...o, sentence: i });
    }

    const cleaned = cleanupRule(text);
    rewritten.push(cleaned.text);
    for (const o of cleaned.ops) ops.push({ ...o, sentence: i });
  }

  // Joining pass: only when this paragraph actually reads shorter than the
  // target. Merging already-long sentences pushes the grade the wrong way.
  const avgLength = rewritten.length
    ? rewritten.reduce((sum, s) => sum + countWords(s), 0) / rewritten.length
    : 0;
  if (plan.sentenceTarget >= 18 && avgLength < plan.sentenceTarget - 4) {
    const merged = [];
    for (let i = 0; i < rewritten.length; i++) {
      const next = rewritten[i + 1];
      const join = next ? tryJoin(rewritten[i], next, plan) : null;
      if (join) {
        merged.push(join.text);
        ops.push({ ...join.ops[0], sentence: i });
        i++;
      } else {
        merged.push(rewritten[i]);
      }
    }
    rewritten = merged;
  }

  return { text: rewritten.join(' '), ops };
}

/**
 * Paraphrase text.
 *
 * @param {string} text
 * @param {object} options {tone, readabilityTarget, intensity, seed, preserve}
 * @returns {{output:string, trace:object[], plan:object, passes:object[], engine:string}}
 */
export function paraphrase(text, options = {}) {
  const input = String(text || '');
  if (!input.trim()) {
    return { output: '', trace: [], plan: null, passes: [], engine: 'rules' };
  }

  const baseline = computeReadability(input);
  const currentGrade = baseline.summary ? baseline.summary.consensusGrade : 10;
  const plan = buildPlan(options, currentGrade);

  const seed = Number.isInteger(options.seed)
    ? options.seed
    : hashSeed(`${input}|${plan.toneId}|${plan.readabilityTargetId}|${plan.intensity}`);

  const ctx = {
    synonymIndex: SYNONYM_INDEX,
    decisions: new Map(),
    preserve: new Set((options.preserve || []).map((w) => String(w).toLowerCase())),
    rng: makeRng(seed),
    sentenceIndex: 0,
  };

  const paragraphs = input.split(/\n[ \t]*\n/);
  const trace = [];
  const passes = [];
  let working = paragraphs;
  let activePlan = plan;

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const passOps = [];
    working = working.map((paragraph, pIndex) => {
      if (!paragraph.trim()) return paragraph;
      const result = rewriteParagraph(paragraph, activePlan, ctx);
      for (const o of result.ops) passOps.push({ ...o, pass, paragraph: pIndex });
      return result.text;
    });

    const joined = working.join('\n\n');
    const measured = computeReadability(joined);
    const grade = measured.summary ? measured.summary.consensusGrade : currentGrade;

    trace.push(...passOps);
    passes.push({
      pass,
      edits: passOps.length,
      grade,
      sentenceTarget: activePlan.sentenceTarget,
      goals: [...activePlan.goals],
    });

    const gap = grade - activePlan.targetGrade;
    const converged = Math.abs(gap) <= 1.2
      || passOps.length === 0
      || (gap < 0 && !activePlan.allowRaise);
    if (converged || pass === MAX_PASSES - 1) break;

    // Missed the target: tighten the plan and go again. Shortening sentences
    // is the lever with the most effect, so it moves first.
    activePlan = correctPlan(activePlan, gap);
  }

  return {
    output: working.join('\n\n').trim(),
    trace,
    plan: serializePlan(activePlan),
    passes,
    engine: 'rules',
    seed,
  };
}

/** Adjust a plan that overshot or undershot its grade target. */
function correctPlan(plan, gap) {
  const goals = new Set(plan.goals);
  const next = { ...plan, goals };
  if (gap > 0) {
    goals.add('simplify');
    goals.add('concise');
    next.sentenceTarget = Math.max(10, plan.sentenceTarget - 3);
    next.swapThreshold = Math.max(0.2, plan.swapThreshold - 0.3);
  } else {
    goals.delete('simplify');
    next.sentenceTarget = Math.min(30, plan.sentenceTarget + 3);
  }
  return next;
}

function serializePlan(plan) {
  return { ...plan, goals: [...plan.goals] };
}

export { SYNONYM_INDEX };
