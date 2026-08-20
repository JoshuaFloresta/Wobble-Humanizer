/**
 * Run history: list, read, update, delete, export, and re-run as a new
 * version.
 *
 * Every route checks the database first and answers 503 with a clear reason
 * when persistence is unavailable, so the client can fall back to its local
 * history instead of showing an error.
 */

import { Router } from 'express';
import { Run } from '../models/Run.js';
import { isConnected, state as dbState } from '../db/connect.js';
import { listQuerySchema, updateRunSchema, idSchema, storeRunSchema } from '../schemas/run.js';
import { saveRun } from '../services/runStore.js';
import { toMarkdown, toPlainText, toJson, slugify, escapeRe } from '@humaninzer/engine';

const router = Router();

/** Reject early when there is no database to talk to. */
function requireDb(_req, res, next) {
  if (isConnected()) return next();
  return res.status(503).json({
    error: 'Persistence unavailable',
    detail: dbState.error || 'No database connection',
    mode: dbState.mode,
  });
}

/**
 * POST /api/runs
 * Store a run that was computed elsewhere -- the browser engine sends its
 * result here rather than asking the server to redo work it already did.
 */
router.post('/runs', requireDb, async (req, res, next) => {
  try {
    const { title, parentId, ...result } = storeRunSchema.parse(req.body);
    const saved = await saveRun(result, { title, parentId });
    res.status(201).json({ id: String(saved._id), run: saved.toJSON() });
  } catch (error) {
    next(error);
  }
});

/** GET /api/runs - newest first, with optional search and favorites filter. */
router.get('/runs', requireDb, async (req, res, next) => {
  try {
    const { limit, skip, favorite, search } = listQuerySchema.parse(req.query);

    const filter = {};
    if (favorite === 'true') filter.favorite = true;
    if (favorite === 'false') filter.favorite = false;
    if (search) {
      const safe = escapeRe(search);
      const re = new RegExp(safe, 'i');
      filter.$or = [{ title: re }, { contentOriginal: re }, { contentParaphrased: re }];
    }

    const [items, total] = await Promise.all([
      Run.find(filter, Run.listProjection).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Run.countDocuments(filter),
    ]);

    res.json({
      items: items.map(withId),
      total,
      limit,
      skip,
      hasMore: skip + items.length < total,
    });
  } catch (error) {
    next(error);
  }
});

/** GET /api/runs/:id - one run in full, plus its version chain. */
router.get('/runs/:id', requireDb, async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const run = await Run.findById(id).lean();
    if (!run) return res.status(404).json({ error: 'Run not found' });

    const rootId = run.parentId || run._id;
    const versions = await Run.find(
      { $or: [{ _id: rootId }, { parentId: rootId }] },
      { version: 1, createdAt: 1, title: 1, 'options.tone': 1 },
    ).sort({ version: 1 }).lean();

    res.json({ run: withId(run), versions: versions.map(withId) });
  } catch (error) {
    next(error);
  }
});

/** PATCH /api/runs/:id - rename or (un)favorite. */
router.patch('/runs/:id', requireDb, async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const update = updateRunSchema.parse(req.body);
    const run = await Run.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!run) return res.status(404).json({ error: 'Run not found' });
    res.json({ run: withId(run) });
  } catch (error) {
    next(error);
  }
});

/** DELETE /api/runs/:id - removes the run and any versions derived from it. */
router.delete('/runs/:id', requireDb, async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const run = await Run.findById(id).select('_id').lean();
    if (!run) return res.status(404).json({ error: 'Run not found' });

    const result = await Run.deleteMany({ $or: [{ _id: id }, { parentId: id }] });
    res.json({ deleted: result.deletedCount });
  } catch (error) {
    next(error);
  }
});

/** GET /api/runs/:id/export?format=json|md|txt */
router.get('/runs/:id/export', requireDb, async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const run = await Run.findById(id).lean();
    if (!run) return res.status(404).json({ error: 'Run not found' });

    const format = String(req.query.format || 'json').toLowerCase();
    const name = slugify(run.title);
    const doc = withId(run);

    if (format === 'md' || format === 'markdown') {
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${name}.md"`);
      return res.send(toMarkdown(doc));
    }
    if (format === 'txt' || format === 'text') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${name}.txt"`);
      return res.send(toPlainText(doc));
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${name}.json"`);
    return res.send(JSON.stringify(toJson(doc), null, 2));
  } catch (error) {
    next(error);
  }
});

function withId(doc) {
  if (!doc) return doc;
  const { _id, __v, ...rest } = doc;
  return { id: String(_id), ...rest };
}

export default router;
