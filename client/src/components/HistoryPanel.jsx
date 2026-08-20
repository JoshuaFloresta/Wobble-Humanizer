import { Trash2 } from 'lucide-react';
import { formatDate, signed } from '../lib/format.js';
import { sketchCard } from '../lib/sketch.js';
import { Tape } from './Sketch.jsx';

/**
 * Run history, as a stack of notes pinned to the page.
 *
 * Shows server history when a database is reachable and the browser's own
 * store otherwise, with an explicit note about which one is in use so the
 * user is never guessing where their work lives.
 */
export default function HistoryPanel({ items, source, onSelect, onDelete, onClear, activeId, error }) {
  return (
    <section className="sketch-panel relative" aria-labelledby="history-heading">
      <Tape className="-top-3 right-8" index={3} />

      <header className="flex items-center justify-between gap-2 px-5 pt-5 pb-2">
        <h2 id="history-heading" className="text-2xl">History</h2>
        {items.length > 0 && (
          <button type="button" onClick={onClear} className="sketch-btn sketch-btn--sm sketch-btn--secondary">
            Clear
          </button>
        )}
      </header>

      <p className="px-5 pb-3 text-base" style={{ color: 'var(--ink-muted)' }}>
        {source === 'server'
          ? 'Filed on the server.'
          : 'Kept in this browser, in full - reopening one brings back its metrics and trace.'}
        {error && <span style={{ color: 'var(--ink)' }}> {error}</span>}
      </p>

      <hr className="sketch-divider mx-5" />

      {items.length === 0 ? (
        <p className="px-5 py-8 text-center" style={{ color: 'var(--ink-muted)' }}>
          Runs you make get pinned here.
        </p>
      ) : (
        <ul className="sketch-scroll flex max-h-[26rem] flex-col gap-3 overflow-y-auto p-4">
          {items.map((item, index) => {
            const active = item.id === activeId;
            const gradeDelta = item.metrics?.delta?.readability?.consensusGrade;
            return (
              <li
                key={item.id}
                className={active ? 'sketch-note' : 'sketch-card'}
                style={sketchCard(index, { tilt: 0.7 })}
              >
                <div className="flex items-start gap-1 p-3">
                  <button type="button" onClick={() => onSelect(item)} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-lg" style={{ fontFamily: 'Kalam, cursive', fontWeight: 700 }}>
                      {item.title || 'Untitled run'}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-base" style={{ color: 'var(--ink-muted)' }}>
                      <span>{formatDate(item.createdAt)}</span>
                      <span>{item.options?.tone}</span>
                      {item.metrics?.after?.tone?.dominant?.label && (
                        <span>{item.metrics.after.tone.dominant.label}</span>
                      )}
                      {gradeDelta !== undefined && gradeDelta !== null && (
                        <span>grade {signed(gradeDelta)}</span>
                      )}
                      {item.version > 1 && <span>v{item.version}</span>}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(item)}
                    aria-label={`Delete ${item.title || 'run'}`}
                    className="shrink-0 p-2"
                    style={{ color: 'var(--ink-muted)' }}
                  >
                    <Trash2 size={18} strokeWidth={2.5} aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
