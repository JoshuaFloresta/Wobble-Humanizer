/**
 * Public surface of the rewriting engine.
 *
 * Everything here is pure JavaScript with no Node or browser APIs, which is
 * what lets the server and the client share one implementation: a rewrite
 * computed in the browser is byte-identical to the same rewrite computed on
 * the server, so the two can be used interchangeably.
 */

// Engines
export { paraphrase, getEngine, listEngines, registerEngine, DEFAULT_ENGINE } from './engines/index.js';

// Summarisation
export { summarize } from './summarize/index.js';
export { scoreSentences, contentWords } from './summarize/score.js';
export {
  SUMMARY_LENGTHS, SUMMARY_LENGTH_IDS, DEFAULT_SUMMARY_LENGTH, getSummaryLength,
} from './data/stopwords.js';

// Metrics and result assembly
export { measure, delta, buildResult, summarizeTrace, summarizeStructure } from './lib/metrics.js';
export { diffWords, diffStats } from './lib/diff.js';

// Individual analyzers, for callers that want one number rather than a run
export { computeReadability, computeCounts } from './nlp/readability.js';
export { analyzeTone } from './nlp/tone.js';
export { analyzeNaturalness } from './nlp/naturalness.js';
export { segmentSentences, tokenizeWords, countWords, countParagraphs } from './nlp/tokenize.js';
export { countSyllables, isComplexWord, isPolysyllabic } from './nlp/syllables.js';

// Presets, so the client can render controls without a round trip
export {
  TONE_PRESETS, TONE_IDS, DEFAULT_TONE, getTone,
  READABILITY_TARGETS, READABILITY_TARGET_IDS, DEFAULT_READABILITY_TARGET, getReadabilityTarget,
} from './data/tones.js';

// Exporters
export { toMarkdown, toPlainText, toJson, slugify } from './lib/exporters.js';

// Shared helper the API reuses for safe search patterns
export { escapeRe } from './engines/rules/util.js';

export const ENGINE_VERSION = '1.0.0';

/**
 * Largest input the engine accepts, in characters.
 *
 * Shared rather than defined twice: the client enforces it in the textarea and
 * the server enforces it at the schema, and the two disagreeing would let a
 * user type something the API then rejects.
 */
export const MAX_INPUT_CHARS = 20000;
