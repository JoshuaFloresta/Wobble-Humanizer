import { useMemo } from 'react';

/**
 * Word-level diff of the original against the rewrite.
 *
 * The palette has no green, so additions are ballpoint blue and removals are
 * marker red -- like a page marked up by hand. Strikethrough and underline
 * carry the same information, so the diff still reads without colour.
 */
export default function DiffView({ segments, stats }) {
  const nodes = useMemo(() => (segments || []).map((segment, index) => {
    if (segment.type === 'equal') return <span key={index}>{segment.text}</span>;

    const removed = segment.type === 'remove';
    return (
      <span
        key={index}
        className={removed ? 'sketch-struck' : 'sketch-inserted'}
        style={removed ? undefined : { background: '#2d5da114' }}
      >
        {segment.text}
      </span>
    );
  }), [segments]);

  if (!segments?.length) {
    return <p style={{ color: 'var(--ink-muted)' }}>No changes to show.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {stats && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-base" style={{ color: 'var(--ink-muted)' }}>
          <Legend color="var(--marker)" label={`${stats.removed} struck out`} struck />
          <Legend color="var(--ballpoint)" label={`${stats.added} written in`} />
          <span>{stats.unchanged} untouched</span>
          <span>{Math.round(stats.changeRatio * 100)}% of words marked up</span>
        </div>
      )}
      <p className="whitespace-pre-wrap text-xl leading-loose">{nodes}</p>
    </div>
  );
}

function Legend({ color, label, struck = false }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className="inline-block h-0.5 w-5"
        style={{ background: color, textDecoration: struck ? 'line-through' : 'none' }}
      />
      {label}
    </span>
  );
}
