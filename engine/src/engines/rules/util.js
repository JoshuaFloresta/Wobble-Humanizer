/**
 * Shared helpers for rewrite rules.
 *
 * Rules work on one sentence at a time and return the new sentence text plus
 * a list of operations. Operations carry the literal before/after strings
 * rather than global offsets: offsets go stale the moment an earlier rule
 * edits the sentence, whereas string pairs stay meaningful in the trace and
 * are what the UI actually renders.
 */

import { matchCase } from '../../nlp/morphology.js';

/** Escape a literal string for use inside a RegExp. */
export function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const patternCache = new Map();

/**
 * Case-insensitive whole-phrase matcher. Cached because the same few hundred
 * phrases are matched against every sentence of every request.
 */
export function phrasePattern(phrase) {
  let re = patternCache.get(phrase);
  if (!re) {
    const escaped = escapeRe(phrase);
    // \b fails next to punctuation-initial phrases, so guard with lookarounds.
    re = new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, 'gi');
    patternCache.set(phrase, re);
  }
  re.lastIndex = 0;
  return re;
}

/** A single recorded edit. */
export function op(rule, reason, from, to, extra = {}) {
  return { rule, reason, from, to, ...extra };
}

/**
 * Apply a list of {from,to,reason} phrase rules to a sentence.
 *
 * @param {string} text sentence text
 * @param {Array} rules  rules already filtered by goal
 * @param {string} ruleId id recorded in the trace
 * @param {object} [options]
 * @param {number} [options.limit] max substitutions
 * @returns {{text:string, ops:object[]}}
 */
export function applyPhraseRules(text, rules, ruleId, options = {}) {
  const limit = options.limit ?? Infinity;
  let out = text;
  const ops = [];

  for (const rule of rules) {
    if (ops.length >= limit) break;
    const pattern = phrasePattern(rule.from);
    if (!pattern.test(out)) continue;
    pattern.lastIndex = 0;

    out = out.replace(pattern, (match) => {
      if (ops.length >= limit) return match;
      const replacement = rule.to ? matchCase(match, rule.to) : '';
      ops.push(op(ruleId, rule.reason || 'Phrase rewrite', match, replacement));
      return replacement;
    });
  }

  return { text: ops.length ? tidy(out) : out, ops };
}

/**
 * Repair the whitespace, punctuation and capitalization damage left behind
 * when a rule deletes a phrase.
 */
export function tidy(text) {
  return text
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([(\[])\s+/g, '$1')
    .replace(/\s+([)\]])/g, '$1')
    .replace(/,\s*,/g, ',')
    .replace(/^\s*,\s*/, '')
    .replace(/\s+$/g, '')
    .replace(/^\s+/, '')
    .replace(/^([a-z])/, (m) => m.toUpperCase());
}

/**
 * Deterministic PRNG (mulberry32). Variation in output must be reproducible:
 * the same text and options always produce the same seed, and an explicit
 * seed lets the user ask for a different-but-stable alternative.
 */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a hash, used to derive a default seed from the request. */
export function hashSeed(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Split a sentence into its body and trailing terminal punctuation. */
export function splitTerminal(sentence) {
  const m = sentence.match(/^([\s\S]*?)([.!?]+["'\u201d\u2019)]*)?$/);
  return { body: (m && m[1]) || sentence, terminal: (m && m[2]) || '' };
}
