/**
 * Export formats.
 *
 * A run is only useful if it can leave the app, and the export has to carry
 * the reasoning with it: the Markdown export includes the metrics table and
 * the rule trace, not just the rewritten text.
 */

const fmt = (n) => (n > 0 ? `+${n}` : String(n));

/** Accept either a stored Run or an in-flight result payload. */
function normalize(run) {
  return {
    ...run,
    contentOriginal: run.contentOriginal ?? run.original ?? '',
    contentParaphrased: run.contentParaphrased ?? run.paraphrased ?? '',
    options: run.options || {},
  };
}

/** Render a run as Markdown. */
export function toMarkdown(input) {
  const run = normalize(input);
  const before = run.metrics?.before?.readability;
  const after = run.metrics?.after?.readability;
  const toneAfter = run.metrics?.after?.tone;
  const delta = run.metrics?.delta;

  const lines = [
    `# ${run.title || 'HumanInzer run'}`,
    '',
    `*${new Date(run.createdAt || Date.now()).toLocaleString()} - tone: ${run.options?.tone}, `
      + `target: ${run.options?.readabilityTarget}, intensity: ${run.options?.intensity}, `
      + `engine: ${run.options?.engine} (seed ${run.options?.seed})*`,
    '',
    '## Output',
    '',
    run.contentParaphrased,
    '',
    '## Original',
    '',
    run.contentOriginal,
    '',
  ];

  if (before?.scores && after?.scores && after?.summary && !before.empty && !after.empty) {
    lines.push(
      '## Readability',
      '',
      '| Metric | Before | After | Change |',
      '| --- | ---: | ---: | ---: |',
      ...Object.keys(after.scores).map((key) => {
        const name = after.scores[key].name;
        const b = before.scores[key].value;
        const a = after.scores[key].value;
        return `| ${name} | ${b} | ${a} | ${fmt(Math.round((a - b) * 10) / 10)} |`;
      }),
      `| Consensus grade | ${before.summary.consensusGrade} | ${after.summary.consensusGrade} | ${fmt(delta?.readability?.consensusGrade ?? 0)} |`,
      ...(before.counts && after.counts
        ? [`| Words | ${before.counts.words} | ${after.counts.words} | ${fmt(delta?.counts?.words ?? 0)} |`]
        : []),
      '',
    );
  }

  if (toneAfter?.metrics && !toneAfter.empty) {
    lines.push(
      '## Tone',
      '',
      `Dominant tone: **${toneAfter.dominant?.label}**`,
      '',
      '| Signal | Score | Reading |',
      '| --- | ---: | --- |',
      ...Object.values(toneAfter.metrics).map((m) => `| ${m.name} | ${m.value} | ${m.label} |`),
      '',
    );
  }

  if (run.traceSummary?.length) {
    lines.push('## What changed and why', '');
    for (const group of run.traceSummary) {
      lines.push(`- **${group.rule}** - ${group.count} edit${group.count === 1 ? '' : 's'}`);
      for (const example of group.examples || []) {
        lines.push(`  - "${example.from}" -> "${example.to || '(removed)'}" (${example.reason})`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

/** Render a run as plain text: just the output. */
export function toPlainText(input) {
  return normalize(input).contentParaphrased;
}

/** A stable, self-describing JSON export. */
export function toJson(run) {
  return {
    format: 'humaninzer.run',
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    run: normalize(run),
  };
}

/** Filename-safe slug for downloads. */
export function slugify(title, fallback = 'humaninzer-run') {
  const slug = String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || fallback;
}
