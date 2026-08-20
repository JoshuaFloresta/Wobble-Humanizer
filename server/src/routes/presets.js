/**
 * Everything the client needs to render its controls, served from the same
 * tables the engine uses. The UI never hardcodes a tone list.
 */

import { Router } from 'express';
import {
  TONE_PRESETS, READABILITY_TARGETS, SUMMARY_LENGTHS,
  listEngines, DEFAULT_ENGINE,
} from '@humaninzer/engine';
import config from '../config/env.js';

const router = Router();

router.get('/presets', (_req, res) => {
  res.json({
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
    engines: listEngines(),
    defaults: {
      mode: 'rewrite',
      summaryLength: 'standard',
      tone: 'neutral',
      readabilityTarget: 'auto',
      intensity: 'balanced',
      engine: DEFAULT_ENGINE,
    },
    limits: { maxInputChars: config.maxInputChars },
  });
});

export default router;
