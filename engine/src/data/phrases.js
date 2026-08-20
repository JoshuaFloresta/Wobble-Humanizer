/**
 * Multi-word rewrite rules.
 *
 * Each rule is a phrase-level substitution tagged with the goals it serves.
 * The engine only fires a rule when the active tone/readability plan requests
 * one of its goals, and every firing is recorded in the trace with `reason`.
 *
 * goals:
 *   concise   - removes words without changing meaning
 *   simplify  - lowers reading grade
 *   formal    - raises register
 *   casual    - lowers register
 *   direct    - removes hedging / passive throat-clearing
 */

export const PHRASE_RULES = [
  // --- Wordy connectives -------------------------------------------------
  { from: 'in order to', to: 'to', goals: ['concise', 'simplify'], reason: 'Wordy infinitive' },
  { from: 'in order for', to: 'for', goals: ['concise'], reason: 'Wordy connective' },
  { from: 'due to the fact that', to: 'because', goals: ['concise', 'simplify'], reason: 'Wordy causal' },
  { from: 'owing to the fact that', to: 'because', goals: ['concise', 'simplify'], reason: 'Wordy causal' },
  { from: 'in view of the fact that', to: 'because', goals: ['concise', 'simplify'], reason: 'Wordy causal' },
  { from: 'for the reason that', to: 'because', goals: ['concise', 'simplify'], reason: 'Wordy causal' },
  { from: 'on account of the fact that', to: 'because', goals: ['concise', 'simplify'], reason: 'Wordy causal' },
  { from: 'in spite of the fact that', to: 'although', goals: ['concise', 'simplify'], reason: 'Wordy concessive' },
  { from: 'despite the fact that', to: 'although', goals: ['concise', 'simplify'], reason: 'Wordy concessive' },
  { from: 'regardless of the fact that', to: 'although', goals: ['concise'], reason: 'Wordy concessive' },
  { from: 'in the event that', to: 'if', goals: ['concise', 'simplify'], reason: 'Wordy conditional' },
  { from: 'in the event of', to: 'if', goals: ['concise', 'simplify'], reason: 'Wordy conditional' },
  { from: 'under circumstances in which', to: 'when', goals: ['concise', 'simplify'], reason: 'Wordy temporal' },
  { from: 'at the present time', to: 'now', goals: ['concise', 'simplify'], reason: 'Wordy temporal' },
  { from: 'at this point in time', to: 'now', goals: ['concise', 'simplify'], reason: 'Wordy temporal' },
  { from: 'at that point in time', to: 'then', goals: ['concise', 'simplify'], reason: 'Wordy temporal' },
  { from: 'during the course of', to: 'during', goals: ['concise'], reason: 'Wordy temporal' },
  { from: 'in the course of', to: 'during', goals: ['concise'], reason: 'Wordy temporal' },
  { from: 'prior to', to: 'before', goals: ['simplify', 'casual'], reason: 'Latinate preposition' },
  { from: 'subsequent to', to: 'after', goals: ['simplify', 'casual'], reason: 'Latinate preposition' },
  { from: 'in advance of', to: 'before', goals: ['concise', 'simplify'], reason: 'Wordy preposition' },
  { from: 'with regard to', to: 'about', goals: ['concise', 'simplify'], reason: 'Wordy preposition' },
  { from: 'with respect to', to: 'about', goals: ['concise', 'simplify'], reason: 'Wordy preposition' },
  { from: 'in relation to', to: 'about', goals: ['concise', 'simplify'], reason: 'Wordy preposition' },
  { from: 'in reference to', to: 'about', goals: ['concise', 'simplify'], reason: 'Wordy preposition' },
  { from: 'in connection with', to: 'about', goals: ['concise'], reason: 'Wordy preposition' },
  { from: 'in terms of', to: 'for', goals: ['concise'], reason: 'Vague preposition' },
  { from: 'as a consequence of', to: 'because of', goals: ['concise', 'simplify'], reason: 'Wordy causal' },
  { from: 'as a result of', to: 'because of', goals: ['simplify'], reason: 'Wordy causal' },
  { from: 'for the purpose of', to: 'to', goals: ['concise', 'simplify'], reason: 'Wordy purpose' },
  { from: 'with the exception of', to: 'except', goals: ['concise', 'simplify'], reason: 'Wordy exception' },
  { from: 'in the majority of cases', to: 'usually', goals: ['concise', 'simplify'], reason: 'Wordy frequency' },
  { from: 'in many cases', to: 'often', goals: ['concise', 'simplify'], reason: 'Wordy frequency' },
  { from: 'on a regular basis', to: 'regularly', goals: ['concise'], reason: 'Wordy frequency' },
  { from: 'on a daily basis', to: 'daily', goals: ['concise'], reason: 'Wordy frequency' },
  { from: 'in close proximity to', to: 'near', goals: ['concise', 'simplify'], reason: 'Wordy locative' },
  { from: 'in the vicinity of', to: 'near', goals: ['concise', 'simplify'], reason: 'Wordy locative' },
  { from: 'a large number of', to: 'many', goals: ['concise', 'simplify'], reason: 'Wordy quantifier' },
  { from: 'a small number of', to: 'a few', goals: ['concise', 'simplify'], reason: 'Wordy quantifier' },
  { from: 'a majority of', to: 'most', goals: ['concise', 'simplify'], reason: 'Wordy quantifier' },
  { from: 'the vast majority of', to: 'most', goals: ['concise', 'simplify'], reason: 'Wordy quantifier' },
  { from: 'a sufficient number of', to: 'enough', goals: ['concise', 'simplify'], reason: 'Wordy quantifier' },
  { from: 'an adequate amount of', to: 'enough', goals: ['concise', 'simplify'], reason: 'Wordy quantifier' },
];

// --- Empty openers and filler -------------------------------------------
export const PHRASE_RULES_EXTRA = [
  { from: 'it should be noted that', to: '', goals: ['concise', 'direct'], reason: 'Empty opener' },
  { from: 'it is important to note that', to: '', goals: ['concise', 'direct'], reason: 'Empty opener' },
  { from: 'it is worth noting that', to: '', goals: ['concise', 'direct'], reason: 'Empty opener' },
  { from: 'it must be emphasized that', to: '', goals: ['concise', 'direct'], reason: 'Empty opener' },
  { from: 'needless to say', to: '', goals: ['concise', 'direct'], reason: 'Empty opener' },
  { from: 'as a matter of fact', to: '', goals: ['concise'], reason: 'Filler' },
  { from: 'for all intents and purposes', to: '', goals: ['concise'], reason: 'Filler' },
  { from: 'when all is said and done', to: '', goals: ['concise'], reason: 'Filler' },
  { from: 'it is my opinion that', to: 'I think', goals: ['concise', 'direct'], reason: 'Wordy stance' },
  { from: 'it is possible that', to: 'perhaps', goals: ['concise'], reason: 'Wordy modality' },
  { from: 'there is a possibility that', to: 'perhaps', goals: ['concise'], reason: 'Wordy modality' },
  { from: 'has the ability to', to: 'can', goals: ['concise', 'simplify'], reason: 'Wordy modality' },
  { from: 'have the ability to', to: 'can', goals: ['concise', 'simplify'], reason: 'Wordy modality' },
  { from: 'is able to', to: 'can', goals: ['concise', 'simplify'], reason: 'Wordy modality' },
  { from: 'are able to', to: 'can', goals: ['concise', 'simplify'], reason: 'Wordy modality' },
  { from: 'is capable of', to: 'can', goals: ['concise', 'simplify'], reason: 'Wordy modality' },
  { from: 'in the near future', to: 'soon', goals: ['concise', 'simplify'], reason: 'Wordy temporal' },
  { from: 'until such time as', to: 'until', goals: ['concise', 'simplify'], reason: 'Wordy temporal' },
  { from: 'first and foremost', to: 'first', goals: ['concise'], reason: 'Redundant pair' },
  { from: 'each and every', to: 'every', goals: ['concise'], reason: 'Redundant pair' },
  { from: 'various different', to: 'various', goals: ['concise'], reason: 'Redundant pair' },
  { from: 'end result', to: 'result', goals: ['concise'], reason: 'Redundant pair' },
  { from: 'final outcome', to: 'outcome', goals: ['concise'], reason: 'Redundant pair' },
  { from: 'future plans', to: 'plans', goals: ['concise'], reason: 'Redundant pair' },
  { from: 'past history', to: 'history', goals: ['concise'], reason: 'Redundant pair' },
  { from: 'advance planning', to: 'planning', goals: ['concise'], reason: 'Redundant pair' },
  { from: 'absolutely essential', to: 'essential', goals: ['concise'], reason: 'Redundant pair' },
  { from: 'joint collaboration', to: 'collaboration', goals: ['concise'], reason: 'Redundant pair' },
  { from: 'new innovation', to: 'innovation', goals: ['concise'], reason: 'Redundant pair' },
];

// --- Light-verb constructions (nominalizations) --------------------------
export const NOMINALIZATION_RULES = [
  { from: 'make a decision', to: 'decide', goals: ['concise', 'direct'], reason: 'Nominalization' },
  { from: 'makes a decision', to: 'decides', goals: ['concise', 'direct'], reason: 'Nominalization' },
  { from: 'made a decision', to: 'decided', goals: ['concise', 'direct'], reason: 'Nominalization' },
  { from: 'take into consideration', to: 'consider', goals: ['concise', 'direct'], reason: 'Nominalization' },
  { from: 'give consideration to', to: 'consider', goals: ['concise', 'direct'], reason: 'Nominalization' },
  { from: 'conduct an investigation', to: 'investigate', goals: ['concise', 'direct'], reason: 'Nominalization' },
  { from: 'carry out an analysis', to: 'analyze', goals: ['concise', 'direct'], reason: 'Nominalization' },
  { from: 'perform an analysis', to: 'analyze', goals: ['concise', 'direct'], reason: 'Nominalization' },
  { from: 'provide assistance to', to: 'help', goals: ['concise', 'simplify'], reason: 'Nominalization' },
  { from: 'provide an explanation', to: 'explain', goals: ['concise', 'direct'], reason: 'Nominalization' },
  { from: 'make an assumption', to: 'assume', goals: ['concise', 'direct'], reason: 'Nominalization' },
  { from: 'reach a conclusion', to: 'conclude', goals: ['concise', 'direct'], reason: 'Nominalization' },
  { from: 'come to an agreement', to: 'agree', goals: ['concise', 'direct'], reason: 'Nominalization' },
  { from: 'have an effect on', to: 'affect', goals: ['concise', 'direct'], reason: 'Nominalization' },
  { from: 'has an impact on', to: 'affects', goals: ['concise', 'direct'], reason: 'Nominalization' },
  { from: 'is indicative of', to: 'indicates', goals: ['concise', 'direct'], reason: 'Nominalization' },
  { from: 'is representative of', to: 'represents', goals: ['concise', 'direct'], reason: 'Nominalization' },
  { from: 'put an end to', to: 'end', goals: ['concise', 'direct'], reason: 'Nominalization' },
];

/** Every phrase rule, flattened. Longest phrases match first. */
export const ALL_PHRASE_RULES = [
  ...PHRASE_RULES,
  ...PHRASE_RULES_EXTRA,
  ...NOMINALIZATION_RULES,
].sort((a, b) => b.from.length - a.from.length);
