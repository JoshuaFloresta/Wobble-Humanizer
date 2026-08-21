/**
 * Metrics assembly.
 *
 * One place that turns text into the metrics object the UI renders, and one
 * place that computes before/after deltas. Keeping this together guarantees
 * the "before" and "after" columns are always produced by identical code.
 */

import { computeReadability } from '../nlp/readability.js';
import { analyzeTone } from '../nlp/tone.js';
import { analyzeNaturalness } from '../nlp/naturalness.js';
import { diffWords, diffStats } from './diff.js';

/**
 * @param {string} text
 * @returns {object} readability + tone + naturalness metrics for one piece of text
 */
export function measure(text) {
  const readability = computeReadability(text);
  const tone = analyzeTone(text);
  const naturalness = analyzeNaturalness(text);
  return {
    readability,
    tone,
    naturalness,
    empty: Boolean(readability.empty),
  };
}

/** Signed change between two metric snapshots, for the delta chips. */
export function delta(before, after) {
  if (before.empty || after.empty) return null;

  const scoreDelta = (key) => round(
    after.readability.scores[key].value - before.readability.scores[key].value,
  );
  const toneDelta = (key) => round(
    after.tone.metrics[key].value - before.tone.metrics[key].value,
  );
  const naturalDelta = (key) => round(
    after.naturalness.metrics[key].value - before.naturalness.metrics[key].value,
  );
  const naturalness = before.naturalness.empty || after.naturalness.empty ? null : {
    composite: round(after.naturalness.composite - before.naturalness.composite),
    burstiness: naturalDelta('burstiness'),
    diversity: naturalDelta('diversity'),
    aiTells: naturalDelta('aiTells'),
    openerVariety: naturalDelta('openerVariety'),
  };

  return {
    readability: {
      fleschReadingEase: scoreDelta('fleschReadingEase'),
      fleschKincaidGrade: scoreDelta('fleschKincaidGrade'),
      gunningFog: scoreDelta('gunningFog'),
      smog: scoreDelta('smog'),
      colemanLiau: scoreDelta('colemanLiau'),
      automatedReadability: scoreDelta('automatedReadability'),
      consensusGrade: round(after.readability.summary.consensusGrade - before.readability.summary.consensusGrade),
    },
    tone: {
      formality: toneDelta('formality'),
      confidence: toneDelta('confidence'),
      sentiment: toneDelta('sentiment'),
      subjectivity: toneDelta('subjectivity'),
      personalVoice: toneDelta('personalVoice'),
      passiveVoice: toneDelta('passiveVoice'),
    },
    naturalness,
    counts: {
      words: after.readability.counts.words - before.readability.counts.words,
      sentences: after.readability.counts.sentences - before.readability.counts.sentences,
      characters: after.readability.counts.characters - before.readability.counts.characters,
    },
  };
}

/**
 * Full result payload for one paraphrase: both metric snapshots, the delta,
 * the word diff and the rule trace grouped for display.
 */
export function buildResult({ original, paraphrased, engineResult }) {
  const before = measure(original);
  const after = measure(paraphrased);
  const segments = diffWords(original, paraphrased);

  return {
    original,
    paraphrased,
    metrics: { before, after, delta: delta(before, after) },
    diff: { segments, stats: diffStats(segments) },
    trace: engineResult.trace,
    traceSummary: summarizeTrace(engineResult.trace),
    structuralNote: summarizeStructure(engineResult.trace),
    plan: engineResult.plan,
    passes: engineResult.passes,
    engine: engineResult.engine,
    seed: engineResult.seed,
  };
}

/** Count edits per rule so the UI can show "why" at a glance. */
export function summarizeTrace(trace = []) {
  const byRule = new Map();
  for (const entry of trace) {
    const current = byRule.get(entry.rule) || { rule: entry.rule, count: 0, examples: [] };
    current.count++;
    if (current.examples.length < 3 && entry.from) {
      current.examples.push({ from: entry.from, to: entry.to, reason: entry.reason });
    }
    byRule.set(entry.rule, current);
  }
  return [...byRule.values()].sort((a, b) => b.count - a.count);
}

// Rules that change how the sentence is built -- voice, order, clause
// grouping -- as opposed to which words fill it. An editor asked "what
// structurally changed" is asking about this set, not the vocabulary swaps
// already itemized in the trace.
const STRUCTURAL_RULES = new Set(['voice', 'split', 'join', 'discourse']);

/**
 * A short editorial-style note on structural changes only: voice, sentence
 * splitting/joining, clause order. Vocabulary swaps (synonym, phrase,
 * register, contraction, intensifier, hedge) are deliberately excluded --
 * those are itemized in full in the trace, and mixing the two would bury the
 * structural signal under a much longer list of word substitutions.
 */
export function summarizeStructure(trace = []) {
  const counts = { voice: 0, split: 0, join: 0, discourse: 0 };
  for (const entry of trace) {
    if (STRUCTURAL_RULES.has(entry.rule)) counts[entry.rule]++;
  }

  const parts = [];
  if (counts.voice) {
    parts.push(`${counts.voice} passive ${plural(counts.voice, 'clause')} rewritten as active voice`);
  }
  if (counts.split) {
    parts.push(`${counts.split} long ${plural(counts.split, 'sentence')} split into two`);
  }
  if (counts.join) {
    parts.push(`${counts.join} short ${plural(counts.join, 'sentence')} merged with its neighbor`);
  }
  if (counts.discourse) {
    parts.push(`${counts.discourse} connecting ${plural(counts.discourse, 'word', 'words')} swapped for register`);
  }

  if (!parts.length) return 'No structural changes -- edits were vocabulary-level only.';
  const sentence = `${parts.join('; ')}.`;
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

function plural(n, singular, irregularPlural) {
  if (n === 1) return singular;
  return irregularPlural || `${singular}s`;
}

function round(n) {
  return Math.round((n + Number.EPSILON) * 10) / 10;
}
