/**
 * Persisting runs.
 *
 * A run can be computed on the server or in the browser -- the engine is the
 * same code and is deterministic, so both produce identical results. This is
 * the single place that turns a computed result into a stored document, so
 * both paths save exactly the same shape.
 */

import { Run } from '../models/Run.js';

/**
 * @param {object} result a computed result (from the engine or the client)
 * @param {object} [meta] {title, parentId}
 * @returns {Promise<object>} the saved document
 */
export async function saveRun(result, meta = {}) {
  const parentId = meta.parentId || null;
  const version = parentId
    ? ((await Run.findById(parentId).select('version').lean())?.version || 0) + 1
    : 1;

  return Run.create({
    title: meta.title || deriveTitle(result.original),
    contentOriginal: result.original,
    contentParaphrased: result.paraphrased,
    options: result.options,
    metrics: result.metrics,
    // Long inputs can produce very long traces; the summary always survives.
    trace: (result.trace || []).slice(0, 500),
    traceSummary: result.traceSummary || [],
    plan: result.plan || null,
    passes: result.passes || [],
    parentId,
    version,
  });
}

/** First line, trimmed, used when the caller did not name the run. */
export function deriveTitle(text = '') {
  const firstLine = String(text).trim().split(/\n/)[0].trim();
  const clipped = firstLine.length > 60 ? `${firstLine.slice(0, 57).trimEnd()}...` : firstLine;
  return clipped || 'Untitled run';
}
