/**
 * Function words, excluded when scoring a sentence's content.
 *
 * Summary scoring rests on which words repeat across a document. Without this
 * list "the" and "of" dominate every count and every sentence scores the
 * same, so the ranking collapses to sentence length.
 */

export const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below',
  'between', 'both', 'but', 'by', 'can', 'cannot', 'could', 'did', 'do', 'does',
  'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had',
  'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him',
  'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself',
  'just', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'now', 'of',
  'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours',
  'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some',
  'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves',
  'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where',
  'which', 'while', 'who', 'whom', 'why', 'will', 'with', 'would', 'you',
  'your', 'yours', 'yourself', 'yourselves', 'also', 'may', 'might', 'must',
  'shall', 'upon', 'thus', 'therefore', 'however', 'moreover', 'furthermore',
]);

/**
 * Summary lengths, expressed as a share of the source sentences.
 *
 * A share rather than a fixed count, because "three sentences" means
 * something very different for a paragraph than for a report.
 */
export const SUMMARY_LENGTHS = [
  { id: 'brief', label: 'Brief', ratio: 0.2, description: 'About a fifth of the sentences.' },
  { id: 'standard', label: 'Standard', ratio: 0.33, description: 'About a third. A good default.' },
  { id: 'detailed', label: 'Detailed', ratio: 0.5, description: 'About half; keeps more supporting detail.' },
];

export const SUMMARY_LENGTH_IDS = SUMMARY_LENGTHS.map((l) => l.id);
export const DEFAULT_SUMMARY_LENGTH = 'standard';

export function getSummaryLength(id) {
  return SUMMARY_LENGTHS.find((l) => l.id === id) || SUMMARY_LENGTHS[1];
}
