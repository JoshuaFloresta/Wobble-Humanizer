/**
 * Request validation.
 *
 * Zod is the single source of truth for what the API accepts: the option
 * enums are derived from the tone and readability tables, so adding a preset
 * makes it valid input automatically rather than requiring a second edit.
 */

import { z } from 'zod';
import {
  TONE_IDS, DEFAULT_TONE,
  READABILITY_TARGET_IDS, DEFAULT_READABILITY_TARGET,
  SUMMARY_LENGTH_IDS, DEFAULT_SUMMARY_LENGTH,
} from '@humaninzer/engine';
import config from '../config/env.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const optionsSchema = z.object({
  tone: z.enum(TONE_IDS).default(DEFAULT_TONE),
  readabilityTarget: z.enum(READABILITY_TARGET_IDS).default(DEFAULT_READABILITY_TARGET),
  intensity: z.enum(['light', 'balanced', 'strong']).default('balanced'),
  mode: z.enum(['rewrite', 'summarize']).default('rewrite'),
  summaryLength: z.enum(SUMMARY_LENGTH_IDS).default(DEFAULT_SUMMARY_LENGTH),
  engine: z.string().min(1).max(40).default(config.engine),
  seed: z.number().int().min(0).max(4294967295).optional(),
  preserve: z.array(z.string().min(1).max(60)).max(50).default([]),
});

export const textSchema = z
  .string()
  .min(1, 'Text is required')
  .max(config.maxInputChars, `Text must be ${config.maxInputChars} characters or fewer`);

export const analyzeSchema = z.object({ text: textSchema });

export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  skip: z.coerce.number().int().min(0).default(0),
  favorite: z.enum(['true', 'false']).optional(),
  search: z.string().max(200).optional(),
});

export const updateRunSchema = z.object({
  title: z.string().max(200).optional(),
  favorite: z.boolean().optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });

export const idSchema = objectId;

const requestSchema = z.object({
  text: textSchema,
  title: z.string().max(200).optional(),
  persist: z.boolean().default(true),
  parentId: objectId.optional(),
});

/**
 * Parse a paraphrase request into text, metadata and engine options.
 * @throws {z.ZodError} on invalid input
 */
export function parseParaphraseRequest(body = {}) {
  const base = requestSchema.parse(body);
  const options = optionsSchema.parse({
    tone: body.tone,
    readabilityTarget: body.readabilityTarget,
    intensity: body.intensity,
    mode: body.mode,
    summaryLength: body.summaryLength,
    engine: body.engine,
    seed: body.seed,
    preserve: body.preserve,
  });
  return { ...base, options };
}

/**
 * A run computed elsewhere (in the browser) and sent here only to be stored.
 *
 * The metrics, trace and plan are accepted as-is: they were produced by the
 * same engine version this server runs, and re-validating their internals
 * would duplicate the engine's own contract without catching anything real.
 */
export const storeRunSchema = z.object({
  title: z.string().max(200).optional(),
  original: textSchema,
  paraphrased: z.string().max(config.maxInputChars * 2),
  options: optionsSchema,
  metrics: z.object({}).passthrough(),
  trace: z.array(z.object({}).passthrough()).max(2000).default([]),
  traceSummary: z.array(z.object({}).passthrough()).default([]),
  plan: z.object({}).passthrough().nullable().default(null),
  passes: z.array(z.object({}).passthrough()).default([]),
  parentId: objectId.optional(),
});
