import { useState } from 'react';
import { FileDown } from 'lucide-react';
import CopyButton from './CopyButton.jsx';
import DiffView from './DiffView.jsx';
import TracePanel from './TracePanel.jsx';
import MetricsDisplay from './MetricsDisplay.jsx';
import Loader from './Loader.jsx';
import { Thumbtack } from './Sketch.jsx';
import { sketchPill } from '../lib/sketch.js';

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
export default function OutputCard({ result, onExport, busy }) {
  const [tab, setTab] = useState('output');

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
          <CopyButton text={result.paraphrased} />
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
          <div role="tabpanel" id="panel-output" aria-labelledby="tab-output" className="result-content flex flex-col gap-6" key={result.id}>
            <div className="flex items-start gap-3">
              {busy && <Loader />}
              <p className="whitespace-pre-wrap text-xl leading-loose flex-1">{result.paraphrased}</p>
            </div>
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
