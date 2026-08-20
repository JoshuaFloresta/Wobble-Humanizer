import { useId } from 'react';
import { Eraser, FileText } from 'lucide-react';
import { pluralize } from '../lib/format.js';
import { Tape } from './Sketch.jsx';

/**
 * The input sheet plus its live counters.
 *
 * Ctrl/Cmd+Enter runs the rewrite, which is the shortcut people expect in a
 * text tool and keeps the whole flow reachable from the keyboard.
 */
export default function InputArea({
  value,
  onChange,
  onSubmit,
  onClear,
  onSample,
  busy,
  maxChars,
  liveMetrics,
}) {
  const id = useId();
  const over = value.length > maxChars;

  const handleKeyDown = (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      if (!busy && value.trim() && !over) onSubmit();
    }
  };

  return (
    <section className="sketch-panel relative flex flex-col" aria-labelledby={`${id}-heading`}>
      <Tape className="-top-3 left-8" index={0} />

      <header className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5 pb-3">
        <h2 id={`${id}-heading`} className="text-2xl">Your text</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onSample} className="sketch-btn sketch-btn--sm sketch-btn--secondary">
            <FileText size={16} strokeWidth={2.5} aria-hidden="true" />
            Sample
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={!value}
            className="sketch-btn sketch-btn--sm sketch-btn--secondary"
          >
            <Eraser size={16} strokeWidth={2.5} aria-hidden="true" />
            Clear
          </button>
        </div>
      </header>

      <hr className="sketch-divider mx-5" />

      <div className="p-5">
        <label className="sr-only" htmlFor={`${id}-input`}>Text to rewrite</label>
        <textarea
          id={`${id}-input`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={12}
          spellCheck="true"
          aria-describedby={`${id}-counter`}
          aria-invalid={over || undefined}
          placeholder="Paste or type the text you want to rewrite, then press Rewrite (or Ctrl+Enter)."
          className="sketch-input resize-y leading-relaxed"
          style={{ minHeight: '15rem', borderColor: over ? 'var(--marker)' : undefined }}
        />
      </div>

      <footer
        id={`${id}-counter`}
        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 pb-5 text-base"
        style={{ color: 'var(--ink-muted)' }}
      >
        <span>
          {value.length.toLocaleString()} / {maxChars.toLocaleString()} characters
          {over && (
            <strong style={{ color: 'var(--ink)', fontFamily: 'Kalam, cursive' }}> - too long to rewrite</strong>
          )}
        </span>
        {liveMetrics && !liveMetrics.empty && (
          <span className="flex flex-wrap gap-x-3 gap-y-1">
            <span>{pluralize(liveMetrics.readability.counts.words, 'word')}</span>
            <span>{pluralize(liveMetrics.readability.counts.sentences, 'sentence')}</span>
            <span>grade {liveMetrics.readability.summary.consensusGrade}</span>
            <span>{liveMetrics.tone.dominant?.label}</span>
          </span>
        )}
      </footer>
    </section>
  );
}
