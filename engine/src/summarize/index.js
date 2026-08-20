/**
 * Extractive summarisation.
 *
 * Sentences are scored, the best are kept, and they are emitted in their
 * original order so the summary still reads as prose. Near-duplicates are
 * dropped so a summary does not spend two of its lines saying one thing.
 *
 * Optionally the extracted summary is then run through the rewrite pipeline,
 * so a summary can also be made concise, formal or plain. Both phases record
 * their reasoning into one trace.
 */

import { segmentSentences } from '../nlp/tokenize.js';
import { getSummaryLength } from '../data/stopwords.js';
import { paraphrase } from '../engines/index.js';
import { scoreSentences, overlap } from './score.js';

const REDUNDANCY_LIMIT = 0.6;

/**
 * @param {string} text
 * @param {object} [options]
 * @param {string} [options.summaryLength] brief | standard | detailed
 * @param {number} [options.sentences] explicit sentence count, overrides length
 * @param {boolean} [options.rewrite] also run the tone/readability pipeline
 * @returns {{output:string, trace:object[], plan:object, passes:object[], engine:string, seed:number, kept:number, total:number}}
 */
export function summarize(text, options = {}) {
  const input = String(text || '');
  if (!input.trim()) {
    return { output: '', trace: [], plan: null, passes: [], engine: 'summarize', seed: 0, kept: 0, total: 0 };
  }

  const paragraphs = input.split(/\n[ \t]*\n/);
  const sentences = [];

  paragraphs.forEach((paragraph, paragraphIndex) => {
    const parts = segmentSentences(paragraph);
    parts.forEach((part, indexInParagraph) => {
      sentences.push({
        text: part.text,
        paragraph: paragraphIndex,
        indexInParagraph,
        paragraphLength: parts.length,
      });
    });
  });

  const total = sentences.length;
  const target = targetCount(total, options);

  // One sentence in, one sentence out: there is nothing to summarise.
  if (total <= 1 || target >= total) {
    const passthrough = sentences.map((s) => s.text).join(' ');
    return finish(input, passthrough, [{
      rule: 'keep-all',
      reason: `Only ${total} sentence${total === 1 ? '' : 's'}; nothing to cut`,
      from: passthrough,
      to: passthrough,
    }], options, { kept: total, total });
  }

  const scored = scoreSentences(sentences);
  const ranked = [...scored].sort((a, b) => (b.score - a.score) || (a.index - b.index));

  const selected = [];
  const trace = [];

  for (const candidate of ranked) {
    if (selected.length >= target) break;

    const duplicateOf = selected.find((chosen) => overlap(candidate.words, chosen.words) > REDUNDANCY_LIMIT);
    if (duplicateOf) {
      trace.push({
        rule: 'drop',
        reason: `Repeats sentence ${duplicateOf.index + 1}`,
        from: sentences[candidate.index].text,
        to: '',
        score: candidate.score,
      });
      continue;
    }

    selected.push(candidate);
  }

  const keptIndexes = new Set(selected.map((s) => s.index));

  // Trace in document order, so the explanation reads alongside the text.
  for (const item of scored) {
    if (!keptIndexes.has(item.index)) {
      if (!trace.some((entry) => entry.from === sentences[item.index].text)) {
        trace.push({
          rule: 'drop',
          reason: `Scored ${item.score}, below the cut for this length (${weakestPart(item.parts)})`,
          from: sentences[item.index].text,
          to: '',
          score: item.score,
        });
      }
      continue;
    }
    trace.push({
      rule: 'keep',
      reason: `Scored ${item.score}, ${strongestPart(item.parts)}`,
      from: sentences[item.index].text,
      to: sentences[item.index].text,
      score: item.score,
    });
  }

  trace.sort((a, b) => documentOrder(sentences, a) - documentOrder(sentences, b));

  // Reassemble in original order, preserving paragraph breaks.
  const byParagraph = new Map();
  for (const item of selected.sort((a, b) => a.index - b.index)) {
    const sentence = sentences[item.index];
    const bucket = byParagraph.get(sentence.paragraph) || [];
    bucket.push(sentence.text);
    byParagraph.set(sentence.paragraph, bucket);
  }

  const summary = [...byParagraph.keys()]
    .sort((a, b) => a - b)
    .map((key) => byParagraph.get(key).join(' '))
    .join('\n\n');

  return finish(input, summary, trace, options, { kept: selected.length, total });
}

/** Run the rewrite pipeline over the extract, when asked. */
function finish(original, summary, trace, options, counts) {
  const shouldRewrite = options.rewrite !== false;
  if (!shouldRewrite || !summary.trim()) {
    return {
      output: summary,
      trace,
      plan: { mode: 'summarize', ...counts },
      passes: [],
      engine: 'summarize',
      seed: 0,
      ...counts,
    };
  }

  const rewritten = paraphrase(summary, options);
  return {
    output: rewritten.output,
    // Selection first, then the edits made to what survived.
    trace: [...trace, ...rewritten.trace],
    plan: { mode: 'summarize', ...counts, ...(rewritten.plan || {}) },
    passes: rewritten.passes,
    engine: 'summarize',
    seed: rewritten.seed,
    ...counts,
  };
}

function targetCount(total, options) {
  if (Number.isInteger(options.sentences) && options.sentences > 0) {
    return Math.min(options.sentences, total);
  }
  const { ratio } = getSummaryLength(options.summaryLength);
  return Math.max(1, Math.min(total, Math.round(total * ratio)));
}

function documentOrder(sentences, entry) {
  const index = sentences.findIndex((s) => s.text === entry.from);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function strongestPart(parts) {
  const [name] = Object.entries(parts).sort((a, b) => b[1] - a[1])[0];
  return `strongest on ${PART_LABELS[name]}`;
}

function weakestPart(parts) {
  const [name] = Object.entries(parts).sort((a, b) => a[1] - b[1])[0];
  return `weak on ${PART_LABELS[name]}`;
}

const PART_LABELS = {
  content: 'shared vocabulary',
  position: 'position in the paragraph',
  names: 'names and figures',
  length: 'sentence length',
};
