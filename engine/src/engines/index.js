/**
 * Engine registry.
 *
 * The paraphraser is addressed through this adapter rather than imported
 * directly, so a second backend (a local ONNX seq2seq model, say) can be
 * added later without touching the routes: implement the same contract,
 * register it here, and select it with PARAPHRASE_ENGINE.
 *
 * Contract:
 *   paraphrase(text, options) -> {
 *     output: string,
 *     trace:  Array<{rule, reason, from, to, sentence, pass}>,
 *     plan:   object | null,
 *     passes: Array<{pass, edits, grade}>,
 *     engine: string,
 *     seed:   number
 *   }
 */

import { paraphrase as rulesParaphrase } from './rules/index.js';

const ENGINES = new Map([
  ['rules', {
    id: 'rules',
    label: 'Deterministic rules',
    description: 'Offline rule pipeline: phrase rewrites, register-aware synonym selection, voice and sentence-structure edits. Same input and options always produce the same output.',
    deterministic: true,
    paraphrase: rulesParaphrase,
  }],
]);

export const DEFAULT_ENGINE = 'rules';

export function getEngine(id = DEFAULT_ENGINE) {
  return ENGINES.get(id) || ENGINES.get(DEFAULT_ENGINE);
}

export function listEngines() {
  return [...ENGINES.values()].map(({ paraphrase, ...meta }) => meta);
}

/** Register an additional backend at startup. */
export function registerEngine(engine) {
  if (!engine || !engine.id || typeof engine.paraphrase !== 'function') {
    throw new Error('An engine needs an id and a paraphrase(text, options) function');
  }
  ENGINES.set(engine.id, engine);
  return engine;
}

export function paraphrase(text, options = {}) {
  return getEngine(options.engine).paraphrase(text, options);
}
