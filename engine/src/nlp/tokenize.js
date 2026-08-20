/**
 * Deterministic tokenization utilities.
 *
 * Every token carries its absolute character offset in the source string so
 * that any edit the engine makes can be reported back to the UI as a
 * (start, end, from, to) span. That traceability is the whole point of the
 * rule-based design: nothing changes without an addressable reason.
 */

// Abbreviations that end in a period but do not end a sentence.
const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'mt', 'rev', 'hon',
  'gen', 'col', 'lt', 'sgt', 'capt', 'cmdr', 'adm', 'gov', 'sen', 'rep',
  'inc', 'ltd', 'co', 'corp', 'dept', 'univ', 'assn', 'bros', 'est',
  'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec',
  'mon', 'tue', 'tues', 'wed', 'thu', 'thur', 'thurs', 'fri', 'sat', 'sun',
  'e.g', 'i.e', 'etc', 'vs', 'approx', 'fig', 'no', 'vol', 'pp', 'ed',
  'al', 'cf', 'ca', 'circa', 'p.m', 'a.m',
]);

// Abbreviations that end a sentence about as often as not; for these we fall
// back to the 'next token is capitalized' test rather than always joining.
const TERMINAL_AMBIGUOUS = new Set(['p.m', 'a.m', 'etc', 'al', 'no', 'vol', 'pp', 'est', 'inc', 'ltd', 'co']);

const SENTENCE_ENDERS = new Set(['.', '!', '?']);
const CLOSERS = new Set(['"', "'", ')', ']', '}', '\u201d', '\u2019']);

/**
 * Split text into sentences, preserving exact offsets and trailing whitespace.
 * @param {string} text
 * @returns {{text:string,start:number,end:number,trailing:string}[]}
 */
export function segmentSentences(text) {
  const sentences = [];
  let cursor = 0;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (SENTENCE_ENDERS.has(ch)) {
      // Consume runs of terminators and any closing quotes/brackets.
      let end = i + 1;
      while (end < text.length && (SENTENCE_ENDERS.has(text[end]) || CLOSERS.has(text[end]))) end++;

      if (isSentenceBoundary(text, i, end)) {
        let trailingEnd = end;
        while (trailingEnd < text.length && /\s/.test(text[trailingEnd])) trailingEnd++;
        const raw = text.slice(cursor, end);
        if (raw.trim()) {
          sentences.push({
            text: raw.trim(),
            start: cursor + (raw.length - raw.trimStart().length),
            end,
            trailing: text.slice(end, trailingEnd),
          });
        }
        cursor = trailingEnd;
        i = trailingEnd;
        continue;
      }
    }

    // A blank line is a hard boundary even without punctuation.
    if (ch === '\n' && /\n[ \t]*\n/.test(text.slice(i, i + 3))) {
      const raw = text.slice(cursor, i);
      if (raw.trim()) {
        sentences.push({
          text: raw.trim(),
          start: cursor + (raw.length - raw.trimStart().length),
          end: i,
          trailing: '\n\n',
        });
      }
      let j = i;
      while (j < text.length && /\s/.test(text[j])) j++;
      cursor = j;
      i = j;
      continue;
    }

    i++;
  }

  const tail = text.slice(cursor);
  if (tail.trim()) {
    sentences.push({
      text: tail.trim(),
      start: cursor + (tail.length - tail.trimStart().length),
      end: text.length,
      trailing: '',
    });
  }

  return sentences;
}

function isSentenceBoundary(text, periodIndex, afterIndex) {
  if (text[periodIndex] !== '.') return true; // ! and ? are unambiguous enough
  const before = text.slice(Math.max(0, periodIndex - 12), periodIndex);
  const word = (before.match(/([A-Za-z.]+)$/) || [])[1];

  if (word) {
    const lower = word.toLowerCase().replace(/\.$/, '');
    if (ABBREVIATIONS.has(lower)) {
      if (!TERMINAL_AMBIGUOUS.has(lower)) return false;
      // Ambiguous: only a following capitalized word opens a new sentence.
      if (!/^\s+["'“‘(]?[A-Z]/.test(text.slice(afterIndex))) return false;
    }
    // Single initial such as "J." in "J. Smith".
    if (/^[A-Za-z]$/.test(word)) return false;
  }

  // A decimal point: digit '.' digit
  if (/\d$/.test(before) && /^\d/.test(text.slice(afterIndex))) return false;

  const rest = text.slice(afterIndex);
  if (rest.trim() === '') return true;
  // Must be followed by whitespace then something capitalized, a digit or a quote.
  return /^\s+["'\u201c\u2018(]?[A-Z0-9]/.test(rest);
}

const WORD_RE = /[A-Za-z]+(?:['\u2019][A-Za-z]+)*|\d+(?:[.,]\d+)*/g;

/**
 * Tokenize a string into words with offsets relative to that string.
 * @param {string} text
 * @returns {{text:string,start:number,end:number,lower:string}[]}
 */
export function tokenizeWords(text) {
  const tokens = [];
  let m;
  WORD_RE.lastIndex = 0;
  while ((m = WORD_RE.exec(text)) !== null) {
    tokens.push({
      text: m[0],
      start: m.index,
      end: m.index + m[0].length,
      lower: m[0].toLowerCase().replace(/\u2019/g, "'"),
    });
  }
  return tokens;
}

/** Count words without allocating token objects. */
export function countWords(text) {
  const m = text.match(WORD_RE);
  return m ? m.length : 0;
}

/** Split a sentence into clause-ish chunks on commas, semicolons and dashes. */
export function splitClauses(sentence) {
  return sentence
    .split(/\s*[;:]\s*|\s+\u2014\s+|\s+--\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Number of paragraphs (blank-line separated). */
export function countParagraphs(text) {
  return text.split(/\n[ \t]*\n/).map((p) => p.trim()).filter(Boolean).length;
}
