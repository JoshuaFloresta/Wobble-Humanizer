/**
 * Tone and style analysis.
 *
 * Produces the metrics shown next to the output: formality, sentiment,
 * confidence, subjectivity, personal voice and passive-voice share. Every
 * metric is a normalized 0-100 score derived from counted markers, and each
 * one reports the evidence that produced it so the UI can justify the number.
 */

import { segmentSentences } from './tokenize.js';
import { tagSentence, AUXILIARIES } from './pos.js';
import {
  HEDGES, HEDGE_MODALS, BOOSTERS, INTENSIFIERS, CONTRACTIONS,
  INFORMAL_WORDS, FORMAL_WORDS, SENTIMENT_LEXICON, NEGATORS,
  FIRST_PERSON, SECOND_PERSON, PASSIVE_AUX,
} from '../data/markers.js';

const CONTRACTION_SET = new Set(CONTRACTIONS.map(([short]) => short.toLowerCase()));
const HEDGE_SINGLE = new Set(HEDGES.filter((h) => !h.includes(' ')));
const HEDGE_MULTI = HEDGES.filter((h) => h.includes(' '));
const BOOSTER_SINGLE = new Set(BOOSTERS.filter((b) => !b.includes(' ')));
const INTENSIFIER_SET = new Set(INTENSIFIERS);
const INFORMAL_SINGLE = new Set(Object.keys(INFORMAL_WORDS).filter((w) => !w.includes(' ')));
const FORMAL_SINGLE = new Set(Object.keys(FORMAL_WORDS));
const NEGATOR_SET = new Set(NEGATORS);
const FIRST_SET = new Set(FIRST_PERSON);
const SECOND_SET = new Set(SECOND_PERSON);
const PASSIVE_AUX_SET = new Set(PASSIVE_AUX);

const clamp01 = (n) => Math.min(1, Math.max(0, n));
const pct = (n) => Math.round(clamp01(n) * 100);

/**
 * @param {string} text
 * @returns {object} tone metrics with supporting evidence
 */
export function analyzeTone(text) {
  const lower = text.toLowerCase();
  const sentences = segmentSentences(text);

  const evidence = {
    hedges: [], boosters: [], intensifiers: [], contractions: [],
    informal: [], formal: [], positive: [], negative: [], passive: [],
  };

  let words = 0;
  let firstPerson = 0;
  let secondPerson = 0;
  let sentimentSum = 0;
  let sentimentHits = 0;
  let passiveSentences = 0;
  let questions = 0;
  let exclamations = 0;
  let longWordCount = 0;

  for (const sentence of sentences) {
    const tokens = tagSentence(sentence.text);
    words += tokens.length;
    if (/\?$/.test(sentence.text)) questions++;
    if (/!$/.test(sentence.text)) exclamations++;

    let sentenceIsPassive = false;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const w = token.lower;
      if (w.length > 8) longWordCount++;

      if (HEDGE_SINGLE.has(w)) evidence.hedges.push(token.text);
      if (HEDGE_MODALS.includes(w)) evidence.hedges.push(token.text);
      if (BOOSTER_SINGLE.has(w)) evidence.boosters.push(token.text);
      if (INTENSIFIER_SET.has(w)) evidence.intensifiers.push(token.text);
      if (CONTRACTION_SET.has(w)) evidence.contractions.push(token.text);
      if (hasStemmed(INFORMAL_SINGLE, w)) evidence.informal.push(token.text);
      if (hasStemmed(FORMAL_SINGLE, w)) evidence.formal.push(token.text);
      if (FIRST_SET.has(w)) firstPerson++;
      if (SECOND_SET.has(w)) secondPerson++;

      const valence = sentimentOf(w);
      if (valence !== 0) {
        const negated = isNegated(tokens, i);
        const score = negated ? -valence * 0.75 : valence;
        sentimentSum += score;
        sentimentHits++;
        (score > 0 ? evidence.positive : evidence.negative).push(token.text);
      }

      // Passive: aux + past participle, not followed by a direct object marker.
      if (PASSIVE_AUX_SET.has(w) && tokens[i + 1]) {
        const next = tokens[i + 1];
        const candidate = next.pos === 'adv' ? tokens[i + 2] : next;
        if (candidate && /(?:ed|en)$/.test(candidate.lower) && candidate.pos === 'verb') {
          sentenceIsPassive = true;
          evidence.passive.push(`${token.text} ${candidate.text}`);
        }
      }
    }

    if (sentenceIsPassive) passiveSentences++;
  }

  for (const phrase of HEDGE_MULTI) {
    let idx = lower.indexOf(phrase);
    while (idx !== -1) {
      evidence.hedges.push(phrase);
      idx = lower.indexOf(phrase, idx + phrase.length);
    }
  }

  if (!words) return emptyTone();

  const per100 = (n) => (n / words) * 100;

  // Marker rates are squashed through tanh rather than added linearly: a
  // single contraction in a 12-word sentence should read as "conversational",
  // not peg the scale at zero. Squashing keeps short and long inputs
  // comparable, which matters because the UI shows before/after deltas.
  const squash = (z) => 0.5 + 0.5 * Math.tanh(z / 2);

  // Formality: formal vocabulary and long words raise it; contractions,
  // informal vocabulary, second person and exclamations lower it.
  const formalityZ =
    per100(evidence.formal.length) * 0.10
    + per100(longWordCount) * 0.030
    - per100(evidence.contractions.length) * 0.12
    - per100(evidence.informal.length) * 0.12
    - per100(secondPerson) * 0.04
    - per100(exclamations) * 0.06;
  const formalityRaw = squash(formalityZ);

  // Confidence: boosters up, hedges down.
  const confidenceZ =
    per100(evidence.boosters.length) * 0.10
    - per100(evidence.hedges.length) * 0.06;
  const confidenceRaw = squash(confidenceZ);

  // Smoothed toward neutral so one charged word in a long passage does not
  // swing the whole reading.
  const sentimentAvg = sentimentHits ? sentimentSum / (sentimentHits + 2) : 0;

  const subjectivityZ =
    per100(evidence.intensifiers.length) * 0.12
    + per100(firstPerson) * 0.06
    + per100(sentimentHits) * 0.05
    - 0.8;
  const subjectivityRaw = squash(subjectivityZ);
  const passiveRatio = sentences.length ? passiveSentences / sentences.length : 0;

  return {
    empty: false,
    metrics: {
      formality: metric('Formality', pct(formalityRaw), formalityLabel(formalityRaw), [
        `${evidence.formal.length} formal words`,
        `${evidence.contractions.length} contractions`,
        `${evidence.informal.length} informal words`,
      ]),
      confidence: metric('Confidence', pct(confidenceRaw), confidenceLabel(confidenceRaw), [
        `${evidence.boosters.length} boosters`,
        `${evidence.hedges.length} hedges`,
      ]),
      sentiment: metric('Sentiment', pct((sentimentAvg + 3) / 6), sentimentLabel(sentimentAvg), [
        `${evidence.positive.length} positive`,
        `${evidence.negative.length} negative`,
      ], Math.round(sentimentAvg * 100) / 100),
      subjectivity: metric('Subjectivity', pct(subjectivityRaw), subjectivityLabel(subjectivityRaw), [
        `${evidence.intensifiers.length} intensifiers`,
        `${firstPerson} first-person words`,
      ]),
      personalVoice: metric('Personal voice', pct((firstPerson + secondPerson) / words * 8), personLabel(firstPerson, secondPerson), [
        `${firstPerson} first-person`,
        `${secondPerson} second-person`,
      ]),
      passiveVoice: metric('Passive voice', pct(passiveRatio), passiveLabel(passiveRatio), [
        `${passiveSentences} of ${sentences.length} sentences`,
      ]),
    },
    counts: {
      words,
      sentences: sentences.length,
      questions,
      exclamations,
      firstPerson,
      secondPerson,
      hedges: evidence.hedges.length,
      boosters: evidence.boosters.length,
      intensifiers: evidence.intensifiers.length,
      contractions: evidence.contractions.length,
      passiveSentences,
    },
    evidence: Object.fromEntries(
      Object.entries(evidence).map(([k, v]) => [k, dedupe(v).slice(0, 12)]),
    ),
    dominant: dominantTone(formalityRaw, confidenceRaw, sentimentAvg, per100(firstPerson + secondPerson)),
  };
}

function metric(name, value, label, evidence, raw) {
  return { name, value, label, evidence, raw };
}

/** Membership test that also tries a light stem ("demonstrated" -> "demonstrate"). */
function hasStemmed(set, word) {
  if (set.has(word)) return true;
  for (const suffix of ['s', 'es', 'ed', 'd', 'ing', 'ly']) {
    if (word.endsWith(suffix)) {
      const stem = word.slice(0, -suffix.length);
      if (set.has(stem) || set.has(stem + 'e')) return true;
    }
  }
  return false;
}

function sentimentOf(word) {
  if (SENTIMENT_LEXICON[word] !== undefined) return SENTIMENT_LEXICON[word];
  // Try a light stem so "improved"/"improving" score like "improve".
  const stem = word.replace(/(?:s|es|ed|ing|ly)$/, '');
  if (stem && SENTIMENT_LEXICON[stem] !== undefined) return SENTIMENT_LEXICON[stem];
  return 0;
}

function isNegated(tokens, index) {
  for (let i = Math.max(0, index - 3); i < index; i++) {
    if (NEGATOR_SET.has(tokens[i].lower)) return true;
    if (tokens[i].lower.endsWith("n't")) return true;
  }
  return false;
}

function dedupe(list) {
  return [...new Set(list.map((s) => s.toLowerCase()))];
}

function formalityLabel(v) {
  if (v >= 0.75) return 'Highly formal';
  if (v >= 0.58) return 'Formal';
  if (v >= 0.42) return 'Neutral';
  if (v >= 0.25) return 'Conversational';
  return 'Very casual';
}

function confidenceLabel(v) {
  if (v >= 0.7) return 'Assertive';
  if (v >= 0.55) return 'Confident';
  if (v >= 0.45) return 'Balanced';
  if (v >= 0.3) return 'Tentative';
  return 'Heavily hedged';
}

function sentimentLabel(avg) {
  if (avg >= 1.5) return 'Very positive';
  if (avg >= 0.5) return 'Positive';
  if (avg > -0.5) return 'Neutral';
  if (avg > -1.5) return 'Negative';
  return 'Very negative';
}

function subjectivityLabel(v) {
  if (v >= 0.6) return 'Opinionated';
  if (v >= 0.35) return 'Mixed';
  return 'Objective';
}

function personLabel(first, second) {
  if (!first && !second) return 'Impersonal';
  if (second > first) return 'Reader-directed';
  if (first > second * 2) return 'Writer-centered';
  return 'Personal';
}

function passiveLabel(ratio) {
  if (ratio >= 0.5) return 'Mostly passive';
  if (ratio >= 0.25) return 'Some passive';
  if (ratio > 0) return 'Mostly active';
  return 'Active';
}

/** The one-word summary shown as a chip in the UI. */
function dominantTone(formality, confidence, sentiment, personRate) {
  if (formality >= 0.68) return { id: 'academic', label: 'Academic' };
  if (formality >= 0.56) return { id: 'formal', label: 'Formal' };
  if (formality <= 0.32) return { id: 'casual', label: 'Casual' };
  if (confidence >= 0.65 && sentiment >= 0) return { id: 'persuasive', label: 'Persuasive' };
  if (confidence <= 0.35) return { id: 'tentative', label: 'Tentative' };
  if (personRate >= 6) return { id: 'friendly', label: 'Friendly' };
  return { id: 'neutral', label: 'Neutral' };
}

function emptyTone() {
  return { empty: true, metrics: {}, counts: {}, evidence: {}, dominant: null };
}
