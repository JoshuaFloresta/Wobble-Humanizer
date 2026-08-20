/**
 * Naturalness signals.
 *
 * None of the readability or tone metrics say anything about whether text
 * *reads* as human-written. These four do: how much sentence length varies
 * (generated text tends toward a narrow band), how varied the vocabulary is
 * across the passage, how often the load-bearing filler phrases of generated
 * text show up, and how concentrated the sentence openers are. Each is a
 * normalized 0-100 score with the evidence that produced it, in the same
 * shape analyzeTone uses, plus one composite for the at-a-glance number.
 */

import { segmentSentences, tokenizeWords } from './tokenize.js';

const clamp01 = (n) => Math.min(1, Math.max(0, n));
const pct = (n) => Math.round(clamp01(n) * 100);
const round = (n, places = 2) => {
  const f = 10 ** places;
  return Math.round((n + Number.EPSILON) * f) / f;
};

// Phrases and words that show up disproportionately often in generated text
// relative to human-written prose of the same register. Kept short and
// unambiguous on purpose: each one reads as filler in nearly every context
// it appears in, so false positives on legitimate technical writing stay rare.
const AI_TELLS = [
  'it is important to note', 'it is worth noting', "it's important to note",
  'delve into', 'delving into', 'delves into',
  "in today's fast-paced world", 'in the fast-paced world',
  'navigate the complexities', 'navigate the landscape', 'unlock the potential',
  'unlock the full potential', 'testament to', 'plays a crucial role',
  'plays a vital role', 'in conclusion,', 'in summary,', 'overall,',
  'moreover,', 'furthermore,', 'a wide range of', 'a myriad of',
  'the world of', 'in the realm of', 'when it comes to', 'at the end of the day',
  'seamless', 'seamlessly', 'robust', 'cutting-edge', 'game-changer',
  'game changer', 'leverage', 'leveraging', 'holistic', 'synergy',
  'ecosystem', 'landscape', 'underscore', 'underscores', 'underscoring',
  'boasts', 'foster', 'fostering', 'tapestry', 'multifaceted',
];

/**
 * @param {string} text
 * @returns {object} naturalness metrics with supporting evidence
 */
export function analyzeNaturalness(text) {
  const sentences = segmentSentences(text).map((s) => s.text).filter(Boolean);
  if (sentences.length < 2) return emptyNaturalness();

  const lengths = sentences.map((s) => tokenizeWords(s).length);
  const words = lengths.reduce((a, b) => a + b, 0);
  if (!words) return emptyNaturalness();

  // --- Burstiness: coefficient of variation in sentence length. Human
  // writing swings between short and long; generated text tends to hover in
  // a narrow band. CV is unitless, so it stays comparable across texts of
  // any length. ---
  const mean = words / sentences.length;
  const variance = lengths.reduce((sum, n) => sum + (n - mean) ** 2, 0) / sentences.length;
  const stdev = Math.sqrt(variance);
  const cv = mean ? stdev / mean : 0;
  // A CV around 0.55 is typical of varied human prose; below ~0.25 reads
  // as noticeably uniform.
  const burstinessScore = pct(cv / 0.55);

  // --- Vocabulary variety: mean segmental type-token ratio. Plain TTR falls
  // as text gets longer no matter how varied the words actually are, so this
  // averages the TTR of fixed-size word chunks instead, which stays roughly
  // length-invariant. ---
  const allWords = sentences.flatMap((s) => tokenizeWords(s).map((t) => t.text.toLowerCase()));
  const diversityScore = pct(meanSegmentalTTR(allWords, 30) / 0.72);

  // --- Generated-text tells: hits per 1,000 words, inverted so the score
  // reads like the others -- higher is more natural, i.e. fewer tells. ---
  const lower = text.toLowerCase();
  const tellHits = [];
  for (const phrase of AI_TELLS) {
    let idx = lower.indexOf(phrase);
    while (idx !== -1) {
      tellHits.push(phrase);
      idx = lower.indexOf(phrase, idx + phrase.length);
    }
  }
  const tellsPer1000 = (tellHits.length / words) * 1000;
  const tellScore = pct(1 - tellsPer1000 / 6);

  // --- Opener variety: how concentrated the sentence-initial words are. A
  // couple of sentences starting with "The" is normal; a passage where half
  // of them do reads as templated. ---
  const openers = sentences.map((s) => (tokenizeWords(s)[0]?.text || '').toLowerCase());
  const openerCounts = new Map();
  for (const w of openers) {
    if (!w) continue;
    openerCounts.set(w, (openerCounts.get(w) || 0) + 1);
  }
  const topOpenerCount = openerCounts.size ? Math.max(...openerCounts.values()) : 0;
  const maxOpenerShare = openers.length ? topOpenerCount / openers.length : 0;
  // A little repetition is expected as the group gets small; only the excess
  // over one-in-six sentences counts against the score.
  const openerScore = pct(1 - Math.max(0, maxOpenerShare - 1 / 6) * 2.4);

  const composite = Math.round(
    burstinessScore * 0.35 + diversityScore * 0.30 + tellScore * 0.20 + openerScore * 0.15,
  );

  return {
    empty: false,
    composite,
    metrics: {
      burstiness: metric('Sentence rhythm', burstinessScore, burstinessLabel(cv), [
        `${sentences.length} sentences, ${round(mean, 1)} words avg`,
        `length varies ±${round(stdev, 1)} words`,
      ], round(cv)),
      diversity: metric('Vocabulary variety', diversityScore, diversityLabel(diversityScore), [
        `${new Set(allWords).size} unique of ${allWords.length} words`,
      ]),
      aiTells: metric('Generated-text tells', tellScore, tellLabel(tellHits.length), (
        dedupe(tellHits).slice(0, 6)
      ), tellHits.length),
      openerVariety: metric('Opener variety', openerScore, openerLabel(maxOpenerShare), [
        `most-repeated opener used ${topOpenerCount}× of ${sentences.length}`,
      ]),
    },
    counts: { sentences: sentences.length, words },
  };
}

/** Mean type-token ratio across fixed-size word chunks. */
function meanSegmentalTTR(words, segmentSize) {
  if (!words.length) return 0;
  if (words.length <= segmentSize) return new Set(words).size / words.length;

  const ratios = [];
  for (let i = 0; i < words.length; i += segmentSize) {
    const chunk = words.slice(i, i + segmentSize);
    if (chunk.length < segmentSize * 0.5) continue; // drop a short trailing chunk
    ratios.push(new Set(chunk).size / chunk.length);
  }
  return ratios.length
    ? ratios.reduce((a, b) => a + b, 0) / ratios.length
    : new Set(words).size / words.length;
}

function metric(name, value, label, evidence, raw) {
  return { name, value, label, evidence, raw };
}

function dedupe(list) {
  return [...new Set(list.map((s) => s.toLowerCase()))];
}

function burstinessLabel(cv) {
  if (cv >= 0.6) return 'Highly varied';
  if (cv >= 0.4) return 'Varied';
  if (cv >= 0.25) return 'Somewhat uniform';
  return 'Uniform';
}

function diversityLabel(score) {
  if (score >= 75) return 'Rich';
  if (score >= 55) return 'Varied';
  if (score >= 35) return 'Repetitive';
  return 'Very repetitive';
}

function tellLabel(count) {
  if (count === 0) return 'None found';
  if (count <= 2) return 'A few';
  if (count <= 5) return 'Several';
  return 'Frequent';
}

function openerLabel(share) {
  if (share <= 0.25) return 'Varied openers';
  if (share <= 0.4) return 'Some repetition';
  return 'Repetitive openers';
}

function emptyNaturalness() {
  return { empty: true, composite: null, metrics: {}, counts: {} };
}
