/**
 * Paraphrase and analysis endpoints.
 */

import { Router } from 'express';
import { parseParaphraseRequest, analyzeSchema } from '../schemas/run.js';
import { saveRun, deriveTitle } from '../services/runStore.js';
import { isConnected } from '../db/connect.js';
import {
  paraphrase, summarize, buildResult, measure,
  toMarkdown, toPlainText, toJson, slugify,
} from '@humaninzer/engine';

const router = Router();

/**
 * POST /api/paraphrase
 * Rewrite text and return the output with full before/after metrics, the
 * word diff and the rule trace. Persists the run when a database is
 * available and `persist` is not false.
 */
async function paraphraseHandler(req, res, next) {
  try {
    const { text, title, persist, parentId, options } = parseParaphraseRequest(req.body);

    const started = process.hrtime.bigint();
    const engineResult = options.mode === 'summarize'
      ? summarize(text, options)
      : paraphrase(text, options);
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

    const result = buildResult({
      original: text,
      paraphrased: engineResult.output,
      engineResult,
    });

    result.timing = { engineMs: Math.round(elapsedMs * 100) / 100 };
    result.options = { ...options, seed: engineResult.seed };

    let saved = null;
    if (persist && isConnected()) {
      saved = await saveRun(result, { title, parentId });
    }

    res.json({
      ...result,
      id: saved ? String(saved._id) : null,
      persisted: Boolean(saved),
      persistenceAvailable: isConnected(),
    });
  } catch (error) {
    next(error);
  }
}

router.post('/paraphrase', paraphraseHandler);

/**
 * POST /api/summarize
 * Shorthand for /paraphrase with mode=summarize. Same request and response
 * shapes; the trace records which sentences were kept and why.
 */
router.post('/summarize', (req, res, next) => {
  req.body = { ...req.body, mode: 'summarize' };
  next();
}, (req, res, next) => paraphraseHandler(req, res, next));

/**
 * POST /api/analyze
 * Metrics only, with no rewriting. Used by the live metrics panel as the
 * user types.
 */
router.post('/analyze', (req, res, next) => {
  try {
    const { text } = analyzeSchema.parse(req.body);
    res.json({ text, metrics: measure(text) });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/export
 * Format a result that has not been saved (or does not need to be) using the
 * same exporters the stored-run download uses, so both paths always produce
 * identical documents.
 */
router.post('/export', (req, res, next) => {
  try {
    const { format = 'md', run } = req.body || {};
    if (!run || typeof run !== 'object') {
      return res.status(400).json({ error: 'A run payload is required' });
    }

    const name = slugify(run.title || deriveTitle(run.original || run.contentOriginal || ''));
    const normalized = String(format).toLowerCase();

    if (normalized === 'md' || normalized === 'markdown') {
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${name}.md"`);
      return res.send(toMarkdown(run));
    }
    if (normalized === 'txt' || normalized === 'text') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${name}.txt"`);
      return res.send(toPlainText(run));
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${name}.json"`);
    return res.send(JSON.stringify(toJson(run), null, 2));
  } catch (error) {
    return next(error);
  }
});

export default router;
