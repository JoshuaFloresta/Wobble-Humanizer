/**
 * Word-level diff.
 *
 * The output card shows what changed, so the client needs a token-aligned
 * diff rather than a character one: a synonym swap should read as one
 * replaced word, not a run of scattered character edits.
 */

/** Split into words and the whitespace between them, keeping both. */
function tokenize(text) {
  return String(text).match(/\S+|\s+/g) || [];
}

/**
 * Longest common subsequence table, then a backtrack into edit segments.
 * @returns {{type:'equal'|'insert'|'remove', text:string}[]}
 */
export function diffWords(before, after) {
  const a = tokenize(before);
  const b = tokenize(after);

  // Guard against pathological inputs: the table is O(n*m).
  if (a.length * b.length > 4_000_000) {
    return [{ type: 'remove', text: before }, { type: 'insert', text: after }];
  }

  const table = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] = a[i] === b[j]
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const segments = [];
  const push = (type, text) => {
    const last = segments[segments.length - 1];
    if (last && last.type === type) last.text += text;
    else segments.push({ type, text });
  };

  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { push('equal', a[i]); i++; j++; }
    else if (table[i + 1][j] >= table[i][j + 1]) { push('remove', a[i]); i++; }
    else { push('insert', b[j]); j++; }
  }
  while (i < a.length) { push('remove', a[i]); i++; }
  while (j < b.length) { push('insert', b[j]); j++; }

  return segments;
}

/** Summary counts for the metrics strip. */
export function diffStats(segments) {
  let added = 0;
  let removed = 0;
  let unchanged = 0;
  for (const seg of segments) {
    const words = (seg.text.match(/\S+/g) || []).length;
    if (seg.type === 'insert') added += words;
    else if (seg.type === 'remove') removed += words;
    else unchanged += words;
  }
  const total = added + removed + unchanged;
  return {
    added,
    removed,
    unchanged,
    changeRatio: total ? Math.round(((added + removed) / total) * 100) / 100 : 0,
  };
}
