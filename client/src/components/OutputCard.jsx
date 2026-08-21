import { useEffect, useRef, useState } from 'react';
import { ArrowRightLeft, FileDown, RotateCcw } from 'lucide-react';
import CopyButton from './CopyButton.jsx';
import DiffView from './DiffView.jsx';
import TracePanel from './TracePanel.jsx';
import MetricsDisplay from './MetricsDisplay.jsx';
import Loader from './Loader.jsx';
import { Thumbtack } from './Sketch.jsx';
import { sketchCard, sketchPill } from '../lib/sketch.js';

// How long to wait after the last keystroke before re-deriving metrics and
// the diff against the edited text. Short enough to feel live, long enough
// that typing a whole sentence does not re-run readability/tone/naturalness
// analysis on every character.
const EDIT_COMMIT_DELAY = 350;

const TABS = [
  { id: 'output', label: 'Output' },
  { id: 'diff', label: 'Changes' },
  { id: 'why', label: 'Why' },
  { id: 'metrics', label: 'Metrics' },
];

/**
 * The result sheet: output text, the diff, the rule trace, and metrics.
 *
 * Tabs are a real tablist with roving focus so the panel is navigable by
 * keyboard, and the output text is always the default view.
 */
export default function OutputCard({ result, onExport, onEditResult, onUseAlternative, busy }) {
  const [tab, setTab] = useState('output');

  // Identifies "this is a new run" without relying on result.id, which starts
  // out null and only arrives later once a server save completes -- keying
  // off it would wipe an in-progress edit the moment persistence finishes.
  const runKey = result ? `${result.seed}::${result.original}` : null;
  const [draft, setDraft] = useState(result?.paraphrased ?? '');
  const pristineRef = useRef(result?.paraphrased ?? '');
  const commitTimer = useRef(null);
  const lastRunKey = useRef(runKey);

  useEffect(() => {
    if (runKey !== lastRunKey.current) {
      lastRunKey.current = runKey;
      setDraft(result?.paraphrased ?? '');
      pristineRef.current = result?.paraphrased ?? '';
    }
  }, [runKey, result?.paraphrased]);

  useEffect(() => () => clearTimeout(commitTimer.current), []);

  const edited = draft !== pristineRef.current;

  const handleEdit = (value) => {
    setDraft(value);
    clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => onEditResult?.(value), EDIT_COMMIT_DELAY);
  };

  const revert = () => {
    clearTimeout(commitTimer.current);
    setDraft(pristineRef.current);
    onEditResult?.(pristineRef.current);
  };

  if (!result && !busy) {
    return (
      <section
        className="sketch-panel flex min-h-64 flex-col items-center justify-center gap-3 p-10 text-center"
        style={{ borderStyle: 'dashed', boxShadow: 'none' }}
      >
        <h2>Nothing here yet</h2>
        <p className="max-w-md" style={{ color: 'var(--ink-muted)' }}>
          Write something on the left, pick a tone, then rewrite or summarize it. Every edit
          gets listed with the rule that made it.
        </p>
      </section>
    );
  }

  if (busy && !result) {
    return (
      <section
        className="sketch-panel flex min-h-64 flex-col items-center justify-center gap-4 p-10 text-center"
        style={{ borderStyle: 'dashed', boxShadow: 'none' }}
      >
        <Loader />
        <p style={{ color: 'var(--ink-muted)' }}>Rephrasing your text...</p>
      </section>
    );
  }

  const onKeyDown = (event) => {
    const index = TABS.findIndex((t) => t.id === tab);
    if (event.key === 'ArrowRight') setTab(TABS[(index + 1) % TABS.length].id);
    if (event.key === 'ArrowLeft') setTab(TABS[(index - 1 + TABS.length) % TABS.length].id);
  };

  return (
    <section className="sketch-panel relative">
      <Thumbtack />

      <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-6 pb-3">
        <div role="tablist" aria-label="Result views" onKeyDown={onKeyDown} className="flex flex-wrap gap-2">
          {TABS.map((item, index) => {
            const active = item.id === tab;
            return (
              <button
                key={item.id}
                role="tab"
                id={`tab-${item.id}`}
                aria-selected={active}
                aria-controls={`panel-${item.id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => setTab(item.id)}
                className={`sketch-btn sketch-btn--sm ${active ? 'sketch-btn--active' : 'sketch-btn--secondary'}`}
                style={sketchPill(index)}
              >
                {item.label}
                {item.id === 'why' && result.trace?.length ? ` (${result.trace.length})` : ''}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {edited && (
            <>
              <span className="sketch-tag" style={{ '--rot': 'rotate(-1deg)' }}>Edited</span>
              <button
                type="button"
                onClick={revert}
                className="sketch-btn sketch-btn--sm sketch-btn--secondary"
                title="Revert to the engine's original rewrite"
              >
                <RotateCcw size={16} strokeWidth={2.5} aria-hidden="true" />
                Revert
              </button>
            </>
          )}
          <CopyButton text={draft} />
          <ExportMenu onExport={onExport} />
        </div>
      </header>

      <hr className="sketch-divider mx-5" />

      <div className="px-5 py-5">
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .result-content {
            animation: fadeIn 300ms ease-in;
          }
        `}</style>
        {tab === 'output' && (
          <div role="tabpanel" id="panel-output" aria-labelledby="tab-output" className="result-content flex flex-col gap-3" key={runKey}>
            <div className="flex items-start gap-3">
              {busy && <Loader />}
              <label className="sr-only" htmlFor="output-editor">Rewritten text - editable</label>
              <textarea
                id="output-editor"
                value={draft}
                onChange={(event) => handleEdit(event.target.value)}
                rows={8}
                spellCheck="true"
                className="sketch-input resize-y flex-1 text-xl leading-loose"
                style={{ minHeight: '10rem' }}
              />
            </div>
            <p className="text-base" style={{ color: 'var(--ink-muted)' }}>
              {draft.length.toLocaleString()} characters - click in to edit or add your own text
            </p>

            {!edited && result.structuralNote && (
              <p className="sketch-card p-3 text-base" style={sketchCard(0)}>
                <strong style={{ fontFamily: 'Kalam, cursive' }}>Structural changes: </strong>
                {result.structuralNote}
              </p>
            )}

            {!edited && result.alternative && (
              <div className="sketch-card flex flex-col gap-2 p-4" style={sketchCard(1)}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong style={{ fontFamily: 'Kalam, cursive' }}>Alternative phrasing</strong>
                  <button
                    type="button"
                    onClick={onUseAlternative}
                    className="sketch-btn sketch-btn--sm sketch-btn--secondary"
                    title="Swap this in as the main rewrite"
                  >
                    <ArrowRightLeft size={16} strokeWidth={2.5} aria-hidden="true" />
                    Use this instead
                  </button>
                </div>
                <p className="whitespace-pre-wrap text-lg leading-relaxed">{result.alternative.paraphrased}</p>
                {result.alternative.structuralNote && (
                  <p className="text-base" style={{ color: 'var(--ink-muted)' }}>
                    {result.alternative.structuralNote}
                  </p>
                )}
              </div>
            )}

            <hr className="sketch-divider" />
            <MetricsDisplay
              before={result.metrics.before}
              after={result.metrics.after}
              delta={result.metrics.delta}
              compact
            />
          </div>
        )}
        {tab === 'diff' && (
          <div role="tabpanel" id="panel-diff" className="result-content" key={result.id}>
            <DiffView segments={result.diff.segments} stats={result.diff.stats} />
          </div>
        )}
        {tab === 'why' && (
          <div role="tabpanel" id="panel-why" className="result-content" key={result.id}>
            <TracePanel
              trace={result.trace}
              traceSummary={result.traceSummary}
              plan={result.plan}
              passes={result.passes}
              seed={result.seed}
            />
          </div>
        )}
        {tab === 'metrics' && (
          <div role="tabpanel" id="panel-metrics" className="result-content" key={result.id}>
            <MetricsDisplay
              before={result.metrics.before}
              after={result.metrics.after}
              delta={result.metrics.delta}
            />
          </div>
        )}
      </div>

      <footer className="px-5 pb-4 text-base" style={{ color: 'var(--ink-muted)' }}>
        {result.summary && (
          <>kept {result.summary.kept} of {result.summary.total} sentences{' - '}</>
        )}
        {result.computedLocally ? 'written in this browser' : `${result.engine} engine`}
        {' - seed '}{result.seed}{' - '}{result.timing?.engineMs ?? 0} ms
        {result.persisted ? ' - filed on the server' : ' - kept in this browser'}
      </footer>
    </section>
  );
}

function ExportMenu({ onExport }) {
  return (
    <div className="flex items-center gap-1.5">
      {[['md', 'Markdown'], ['json', 'JSON'], ['txt', 'Text']].map(([format, label], index) => (
        <button
          key={format}
          type="button"
          onClick={() => onExport(format)}
          className="sketch-btn sketch-btn--sm sketch-btn--secondary"
          style={sketchPill(index + 2)}
          title={`Download as ${label}`}
        >
          {index === 0 && <FileDown size={16} strokeWidth={2.5} aria-hidden="true" />}
          {format.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
