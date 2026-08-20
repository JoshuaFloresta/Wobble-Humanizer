/**
 * Readability metrics.
 *
 * All six formulas run off one shared pass over the text so the counts are
 * guaranteed consistent with each other. Each score is returned with the
 * inputs that produced it, so the UI can explain *why* a score moved.
 */

import { segmentSentences, tokenizeWords, countParagraphs } from './tokenize.js';
import { countSyllables, isComplexWord, isPolysyllabic } from './syllables.js';

const round = (n, places = 1) => {
  const f = 10 ** places;
  return Math.round((n + Number.EPSILON) * f) / f;
};

/** Raw counts shared by every formula. */
export function computeCounts(text) {
  const sentences = segmentSentences(text);
  const words = [];
  let syllables = 0;
  let complexWords = 0;
  let polysyllables = 0;
  let longWords = 0;
  let characters = 0;

  for (const sentence of sentences) {
    for (const token of tokenizeWords(sentence.text)) {
      words.push(token.text);
      const syl = countSyllables(token.text);
      syllables += syl;
      characters += token.text.length;
      if (isComplexWord(token.text)) complexWords++;
      if (isPolysyllabic(token.text)) polysyllables++;
      if (token.text.length > 6) longWords++;
    }
  }

  return {
    sentences: sentences.length,
    words: words.length,
    syllables,
    characters,
    complexWords,
    polysyllables,
    longWords,
    paragraphs: countParagraphs(text),
    wordList: words,
    sentenceList: sentences,
  };
}

/**
 * Compute every readability formula.
 * @param {string} text
 * @param {object} [precomputed] counts from computeCounts, to avoid re-scanning
 */
export function computeReadability(text, precomputed) {
  const c = precomputed || computeCounts(text);
  const { words, sentences, syllables, characters, complexWords, polysyllables } = c;

  if (!words || !sentences) {
    return { empty: true, counts: publicCounts(c), scores: {}, summary: null };
  }

  const wordsPerSentence = words / sentences;
  const syllablesPerWord = syllables / words;
  const charsPerWord = characters / words;

  // Flesch Reading Ease: 0-100, higher is easier.
  const fleschReadingEase = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;

  // Flesch-Kincaid Grade Level (US school grade).
  const fleschKincaidGrade = 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59;

  // Gunning Fog Index.
  const gunningFog = 0.4 * (wordsPerSentence + 100 * (complexWords / words));

  // SMOG: designed for 30+ sentences; normalized so short texts still scale.
  const smog = 1.0430 * Math.sqrt(polysyllables * (30 / sentences)) + 3.1291;

  // Coleman-Liau Index.
  const colemanLiau = 0.0588 * (charsPerWord * 100) - 0.296 * ((sentences / words) * 100) - 15.8;

  // Automated Readability Index.
  const automatedReadability = 4.71 * charsPerWord + 0.5 * wordsPerSentence - 21.43;

  const grades = [fleschKincaidGrade, gunningFog, smog, colemanLiau, automatedReadability]
    .map((g) => clamp(g, 0, 20));
  const consensusGrade = round(grades.reduce((a, b) => a + b, 0) / grades.length);

  return {
    empty: false,
    counts: publicCounts(c),
    averages: {
      wordsPerSentence: round(wordsPerSentence),
      syllablesPerWord: round(syllablesPerWord, 2),
      charactersPerWord: round(charsPerWord, 2),
      complexWordRatio: round(complexWords / words, 3),
    },
    scores: {
      fleschReadingEase: {
        value: round(clamp(fleschReadingEase, 0, 121)),
        label: fleschEaseLabel(fleschReadingEase),
        scale: 'ease',
        name: 'Flesch Reading Ease',
        hint: '0-100; higher is easier to read.',
      },
      fleschKincaidGrade: grade('Flesch-Kincaid Grade', fleschKincaidGrade, 'US school grade level.'),
      gunningFog: grade('Gunning Fog', gunningFog, 'Years of formal education needed.'),
      smog: grade('SMOG', smog, 'Grade level; tuned for health and safety copy.'),
      colemanLiau: grade('Coleman-Liau', colemanLiau, 'Grade level from character counts.'),
      automatedReadability: grade('Automated Readability', automatedReadability, 'Grade level from characters per word.'),
    },
    summary: {
      consensusGrade,
      audience: audienceFor(consensusGrade),
      readingTimeSeconds: Math.round((words / 238) * 60),
      speakingTimeSeconds: Math.round((words / 150) * 60),
    },
  };
}

function publicCounts(c) {
  return {
    sentences: c.sentences,
    words: c.words,
    syllables: c.syllables,
    characters: c.characters,
    complexWords: c.complexWords,
    polysyllables: c.polysyllables,
    longWords: c.longWords,
    paragraphs: c.paragraphs,
  };
}

function grade(name, value, hint) {
  const v = round(clamp(value, 0, 20));
  return { value: v, label: gradeLabel(v), scale: 'grade', name, hint };
}

function clamp(n, lo, hi) {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function fleschEaseLabel(score) {
  if (score >= 90) return 'Very easy';
  if (score >= 80) return 'Easy';
  if (score >= 70) return 'Fairly easy';
  if (score >= 60) return 'Plain English';
  if (score >= 50) return 'Fairly difficult';
  if (score >= 30) return 'Difficult';
  return 'Very difficult';
}

function gradeLabel(g) {
  if (g <= 6) return 'Grade 6 and below';
  if (g <= 8) return 'Grade 7-8';
  if (g <= 10) return 'Grade 9-10';
  if (g <= 12) return 'Grade 11-12';
  if (g <= 15) return 'Undergraduate';
  return 'Postgraduate';
}

function audienceFor(g) {
  if (g <= 6) return 'Broad public, including younger readers';
  if (g <= 9) return 'General adult audience';
  if (g <= 12) return 'Educated general audience';
  if (g <= 15) return 'Professional or undergraduate readers';
  return 'Specialist or academic readers';
}

export { round };
