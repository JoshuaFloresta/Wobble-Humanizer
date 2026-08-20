/**
 * The rewriting engine, running in the browser.
 *
 * This is the same package the server uses, not a reimplementation, so a
 * rewrite computed here is byte-identical to the same rewrite computed on the
 * server. That is what makes offline mode honest: nothing is degraded when
 * the network is gone, and a run computed offline can be handed to the server
 * for storage later without recomputing it.
 */

export { MAX_INPUT_CHARS } from '@humaninzer/engine';

import {
  paraphrase as engineParaphrase,
  summarize as engineSummarize,
  SUMMARY_LENGTHS,
  buildResult,
  measure,
  TONE_PRESETS,
  READABILITY_TARGETS,
  DEFAULT_ENGINE,
  ENGINE_VERSION,
  MAX_INPUT_CHARS,
} from '@humaninzer/engine';

/**
 * Presets, generated locally from the same tables the server serves. Building
 * them here means the UI renders its controls with no network call at all.
 */
export function localPresets() {
  return {
    tones: TONE_PRESETS.map(({ id, label, description, register, sentenceTarget }) => ({
      id, label, description, register, sentenceTarget,
    })),
    readabilityTargets: READABILITY_TARGETS,
    summaryLengths: SUMMARY_LENGTHS,
    modes: [
      { id: 'rewrite', label: 'Rewrite', description: 'Reword the whole text in the chosen tone.' },
      { id: 'summarize', label: 'Summarize', description: 'Keep the sentences that carry the most, then apply the tone.' },
    ],
    intensities: [
      { id: 'light', label: 'Light', description: 'Only high-confidence edits.' },
      { id: 'balanced', label: 'Balanced', description: 'Recommended default.' },
      { id: 'strong', label: 'Strong', description: 'Rewrites more aggressively.' },
    ],
    engines: [{ id: DEFAULT_ENGINE, label: 'Deterministic rules', deterministic: true }],
    defaults: {
      mode: 'rewrite',
      summaryLength: 'standard',
      tone: 'neutral',
      readabilityTarget: 'auto',
      intensity: 'balanced',
      engine: DEFAULT_ENGINE,
    },
    limits: { maxInputChars: MAX_INPUT_CHARS },
    source: 'local',
  };
}

/**
 * Rewrite text in the browser.
 * @returns {object} the same payload shape the API returns
 */
export function paraphraseLocally(text, options = {}) {
  const started = performance.now();
  const engineResult = options.mode === 'summarize'
    ? engineSummarize(text, options)
    : engineParaphrase(text, options);
  const elapsed = performance.now() - started;

  const result = buildResult({
    original: text,
    paraphrased: engineResult.output,
    engineResult,
  });

  return {
    ...result,
    options: { ...normalizeOptions(options), seed: engineResult.seed },
    timing: { engineMs: Math.round(elapsed * 100) / 100 },
    computedLocally: true,
    summary: engineResult.kept === undefined
      ? null
      : { kept: engineResult.kept, total: engineResult.total },
    engineVersion: ENGINE_VERSION,
    id: null,
    persisted: false,
  };
}

/** Metrics only, for the live counters while typing. */
export function analyzeLocally(text) {
  return measure(text);
}

function normalizeOptions(options) {
  return {
    tone: options.tone || 'neutral',
    readabilityTarget: options.readabilityTarget || 'auto',
    intensity: options.intensity || 'balanced',
    mode: options.mode || 'rewrite',
    summaryLength: options.summaryLength || 'standard',
    engine: options.engine || DEFAULT_ENGINE,
    preserve: options.preserve || [],
  };
}
