/**
 * Tone presets.
 *
 * A preset is a declarative plan, not code: it states the register to aim
 * for, which rule goals are active, and the policies for contractions,
 * hedging, person and sentence length. The engine reads this plan and the
 * requested reading grade, then decides which rules may fire. Keeping tone
 * declarative is what makes the output explainable and reproducible.
 *
 * register:        -2 slang .. +2 academic (target for synonym selection)
 * contractions:    'expand' | 'contract' | 'keep'
 * hedges:          'strip' | 'keep' | 'add'
 * intensifiers:    'strip' | 'collapse' | 'keep'
 * voice:           'active' | 'passive' | 'keep'
 * sentenceTarget:  preferred words per sentence
 */

export const TONE_PRESETS = [
  {
    id: 'neutral',
    label: 'Neutral',
    description: 'Cleans up wordiness without shifting register.',
    register: 0,
    goals: ['concise'],
    contractions: 'keep',
    hedges: 'keep',
    intensifiers: 'collapse',
    voice: 'keep',
    sentenceTarget: 18,
    gradeBias: 0,
  },
  {
    id: 'formal',
    label: 'Formal',
    description: 'Professional register: no contractions, precise word choice, measured connectives.',
    register: 1,
    goals: ['formal', 'concise'],
    contractions: 'expand',
    hedges: 'keep',
    intensifiers: 'strip',
    voice: 'keep',
    sentenceTarget: 22,
    gradeBias: 2,
  },
  {
    id: 'casual',
    label: 'Casual',
    description: 'Conversational: contractions, everyday words, shorter sentences.',
    register: -1,
    goals: ['casual', 'simplify', 'concise'],
    contractions: 'contract',
    hedges: 'keep',
    intensifiers: 'keep',
    voice: 'active',
    sentenceTarget: 14,
    gradeBias: -3,
  },
  {
    id: 'concise',
    label: 'Concise',
    description: 'Cuts filler, hedging and empty openers; keeps meaning, drops words.',
    register: 0,
    goals: ['concise', 'direct'],
    contractions: 'keep',
    hedges: 'strip',
    intensifiers: 'strip',
    voice: 'active',
    sentenceTarget: 15,
    gradeBias: 0,
  },
  {
    id: 'persuasive',
    label: 'Persuasive',
    description: 'Direct and confident: active voice, strong verbs, hedging removed.',
    register: 0,
    goals: ['direct', 'concise'],
    contractions: 'keep',
    hedges: 'strip',
    intensifiers: 'collapse',
    voice: 'active',
    sentenceTarget: 16,
    gradeBias: -1,
  },
  {
    id: 'academic',
    label: 'Academic',
    description: 'Scholarly register: expanded forms, formal connectives, hedged claims.',
    register: 2,
    goals: ['formal'],
    contractions: 'expand',
    hedges: 'add',
    intensifiers: 'strip',
    voice: 'keep',
    sentenceTarget: 25,
    gradeBias: 4,
  },
  {
    id: 'friendly',
    label: 'Friendly',
    description: 'Warm and approachable: plain words, contractions, direct address.',
    register: -1,
    goals: ['casual', 'simplify', 'direct', 'concise'],
    contractions: 'contract',
    hedges: 'keep',
    intensifiers: 'keep',
    voice: 'active',
    sentenceTarget: 15,
    gradeBias: -2,
  },
  {
    id: 'fluency',
    label: 'Fluency',
    description: 'Smooths the prose without changing register: active voice, natural contractions, hedging cleared, wordiness cut.',
    register: 0,
    goals: ['concise', 'direct'],
    contractions: 'contract',
    hedges: 'strip',
    intensifiers: 'collapse',
    voice: 'active',
    sentenceTarget: 16,
    gradeBias: -1,
  },
];

export const TONE_IDS = TONE_PRESETS.map((t) => t.id);
export const DEFAULT_TONE = 'neutral';

export function getTone(id) {
  return TONE_PRESETS.find((t) => t.id === id) || TONE_PRESETS[0];
}

/**
 * Reading-grade targets. `null` means "leave the grade alone and let the
 * tone preset decide", which is the default so tone and readability stay
 * independently controllable.
 */
export const READABILITY_TARGETS = [
  { id: 'auto', label: 'Match tone', grade: null, description: 'Let the tone preset set the level.' },
  { id: 'simple', label: 'Simple (grade 5-6)', grade: 6, description: 'Broad public, plain language.' },
  { id: 'standard', label: 'Standard (grade 8-9)', grade: 9, description: 'General adult reading level.' },
  { id: 'professional', label: 'Professional (grade 11-12)', grade: 12, description: 'Workplace and trade press.' },
  { id: 'advanced', label: 'Advanced (grade 14+)', grade: 15, description: 'Academic and specialist readers.' },
];

export const READABILITY_TARGET_IDS = READABILITY_TARGETS.map((t) => t.id);
export const DEFAULT_READABILITY_TARGET = 'auto';

export function getReadabilityTarget(id) {
  return READABILITY_TARGETS.find((t) => t.id === id) || READABILITY_TARGETS[0];
}
