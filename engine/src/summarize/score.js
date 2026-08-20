/**
 * Sentence scoring for extractive summarisation.
 *
 * The summariser keeps sentences rather than writing new ones, which is the
 * only honest option for an engine with no language model: an abstractive
 * summary would have to invent phrasing, and inventing is exactly what this
 * tool refuses to do elsewhere. Extraction also stays explainable -- every
 * sentence carries the reason it was kept or dropped.
 *
 * Four signals, weighted:
 *   content   how much of the document's vocabulary the sentence carries
 *   position  openers and closers state theses and conclusions
 *   names     sentences naming entities and numbers tend to be substantive
 *   length    very short and very long sentences make poor summary lines
 */

import { tokenizeWords } from '../nlp/tokenize.js';
import { STOPWORDS } from '../data/stopwords.js';

/** Quantities written as words still count as figures. */
const NUMBER_WORDS = new Set([
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
  'eighteen', 'nineteen', 'twenty', 'thirty', 'forty', 'fifty', 'sixty',
  'seventy', 'eighty', 'ninety', 'hundred', 'thousand', 'million', 'billion',
  'percent', 'half', 'quarter', 'double', 'triple', 'first', 'second', 'third',
]);

const WEIGHTS = {
  content: 0.55,
  position: 0.20,
  names: 0.15,
  length: 0.10,
};

/** Content words of a sentence, lowercased and de-stopworded. */
export function contentWords(sentence) {
  return tokenizeWords(sentence)
    .map((token) => token.lower)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word) && !/^\d+$/.test(word));
}

/**
 * Document-level term frequencies, used as the vocabulary weight.
 * @returns {Map<string, number>} word -> frequency, normalised to 0..1
 */
export function termFrequencies(sentences) {
  const counts = new Map();
  for (const sentence of sentences) {
    for (const word of contentWords(sentence)) {
      counts.set(word, (counts.get(word) || 0) + 1);
    }
  }
  let max = 0;
  for (const count of counts.values()) max = Math.max(max, count);
  if (!max) return counts;
  for (const [word, count] of counts) counts.set(word, count / max);
  return counts;
}

/**
 * Score every sentence.
 *
 * @param {{text:string, paragraph:number, indexInParagraph:number, paragraphLength:number}[]} sentences
 * @returns {{index:number, score:number, parts:object, words:string[]}[]}
 */
export function scoreSentences(sentences) {
  const frequencies = termFrequencies(sentences.map((s) => s.text));

  return sentences.map((sentence, index) => {
    const words = contentWords(sentence.text);
    const wordCount = tokenizeWords(sentence.text).length;

    // Content: mean vocabulary weight, so a long sentence does not win purely
    // by containing more words.
    const contentScore = words.length
      ? words.reduce((sum, word) => sum + (frequencies.get(word) || 0), 0) / words.length
      : 0;

    const positionScore = positionWeight(sentence);

    // Capitalised words after the first token, plus figures. Quantities are
    // as often written out as they are in digits ("eighteen percent"), and a
    // sentence carrying one is usually carrying evidence.
    const tokens = tokenizeWords(sentence.text);
    const names = tokens.filter((token, i) => i > 0 && /^[A-Z]/.test(token.text)).length
      + (/[0-9]/.test(sentence.text) ? 1 : 0)
      + tokens.filter((token) => NUMBER_WORDS.has(token.lower)).length;
    const nameScore = Math.min(1, names / 3);

    const lengthScore = lengthWeight(wordCount);

    const score = WEIGHTS.content * contentScore
      + WEIGHTS.position * positionScore
      + WEIGHTS.names * nameScore
      + WEIGHTS.length * lengthScore;

    return {
      index,
      score: round(score),
      words,
      wordCount,
      parts: {
        content: round(contentScore),
        position: round(positionScore),
        names: round(nameScore),
        length: round(lengthScore),
      },
    };
  });
}

/** Openers carry the thesis; closers carry the conclusion. */
function positionWeight(sentence) {
  const { indexInParagraph, paragraphLength } = sentence;
  if (indexInParagraph === 0) return 1;
  if (indexInParagraph === paragraphLength - 1 && paragraphLength > 2) return 0.6;
  if (indexInParagraph === 1) return 0.5;
  return 0.25;
}

/** A summary line wants to be substantial but not a paragraph in itself. */
function lengthWeight(wordCount) {
  if (wordCount < 6) return 0.1;
  if (wordCount <= 12) return 0.7;
  if (wordCount <= 28) return 1;
  if (wordCount <= 40) return 0.6;
  return 0.3;
}

/** Overlap of content words, used to drop near-duplicates. */
export function overlap(wordsA, wordsB) {
  if (!wordsA.length || !wordsB.length) return 0;
  const setB = new Set(wordsB);
  const shared = wordsA.filter((word) => setB.has(word)).length;
  return shared / Math.min(wordsA.length, wordsB.length);
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}

export { WEIGHTS };
