import { useCallback, useEffect, useMemo, useState } from 'react';
import api, { ApiError } from './lib/api.js';
import localHistory from './lib/localHistory.js';
import { paraphraseLocally, analyzeLocally, localPresets } from './lib/engine.js';
import { toMarkdown, toPlainText, toJson, buildResult, summarizeStructure } from '@humaninzer/engine';
import { watchConnectivity } from './lib/registerSW.js';
import { Squiggle } from './components/Sketch.jsx';
import InputArea from './components/InputArea.jsx';
import { WobbleLockup } from './components/WobbleMark.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import Controls from './components/Controls.jsx';
import OutputCard from './components/OutputCard.jsx';
import HistoryPanel from './components/HistoryPanel.jsx';

const SAMPLE = `It should be noted that the implementation of the new onboarding process was carried out by the operations team over the course of the last quarter. Due to the fact that a large number of stakeholders were involved, it was determined that a comprehensive review would be facilitated in order to ascertain whether the objectives had been accomplished.

The end result is that we utilized approximately forty hours of engineering time, and the feedback was reviewed by the steering committee.`;

const DEFAULT_OPTIONS = {
  mode: 'rewrite',
  summaryLength: 'standard',
  tone: 'neutral',
  readabilityTarget: 'auto',
  intensity: 'balanced',
  preserveText: '',
};

const OPTIONS_KEY = 'humaninzer.options.v1';

// What the app assumes when the server cannot be reached: everything still
// works, but runs can only be stored in this browser.
const OFFLINE_HEALTH = {
  status: 'offline',
  persistence: { available: false, mode: 'none', error: 'Server unreachable' },
  engine: { default: 'rules', available: ['rules'] },
};

export default function App() {
  const [presets] = useState(localPresets);
  const [health, setHealth] = useState(null);
  const [text, setText] = useState('');
  const [options, setOptions] = useState(loadOptions);
  const [result, setResult] = useState(null);
  const [liveMetrics, setLiveMetrics] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [historySource, setHistorySource] = useState('local');
  const [historyError, setHistoryError] = useState(null);
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  useEffect(() => watchConnectivity(setOnline), []);

  // Presets come from the bundled engine (see the initializer above), so the
  // controls need no network at all. The server is consulted only to learn
  // whether history can be stored.
  // One-time import of history from the older localStorage format.
  useEffect(() => {
    localHistory.migrateLegacy().catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.health()
      .then((data) => { if (!cancelled) setHealth(data); })
      .catch(() => { if (!cancelled) setHealth(OFFLINE_HEALTH); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    localStorage.setItem(OPTIONS_KEY, JSON.stringify(options));
  }, [options]);

  const refreshHistory = useCallback(async () => {
    if (health?.persistence?.available) {
      try {
        const data = await api.listRuns({ limit: 50 });
        setHistory(data.items);
        setHistorySource('server');
        setHistoryError(null);
        return;
      } catch (err) {
        setHistoryError(err.message);
      }
    }
    setHistory(await localHistory.list());
    setHistorySource('local');
  }, [health]);

  useEffect(() => { if (health) refreshHistory(); }, [health, refreshHistory]);

  // Live metrics as the user types. The engine runs in this tab, so this is
  // a debounced local call rather than a request; nothing to abort, and it
  // keeps working with the network down.
  useEffect(() => {
    if (!text.trim()) { setLiveMetrics(null); return undefined; }
    const timer = setTimeout(() => setLiveMetrics(analyzeLocally(text)), 250);
    return () => clearTimeout(timer);
  }, [text]);

  const maxChars = presets?.limits?.maxInputChars ?? 20000;
  const canSubmit = Boolean(text.trim()) && text.length <= maxChars;

  const run = useCallback(async (overrides = {}) => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);

    try {
      const engineOptions = {
        mode: options.mode,
        summaryLength: options.summaryLength,
        tone: options.tone,
        readabilityTarget: options.readabilityTarget,
        intensity: options.intensity,
        preserve: options.preserveText.split(',').map((w) => w.trim()).filter(Boolean),
        seed: overrides.seed ?? Math.floor(Math.random() * 4294967295),
        ...overrides,
      };

      // Add delay for visual feedback (simulates processing)
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Compute here: instant, and unaffected by the network.
      const result = paraphraseLocally(text, engineOptions);

      // A second pass with a different seed, offered as a genuine alternative
      // for comparison -- same options, same meaning, a different construction
      // where the rules had more than one equally good way to say it. The full
      // trace/plan/passes are kept, not just the text, so promoting it later
      // (useAlternative) carries its own "Why" and structural note rather than
      // inheriting the primary result's.
      //
      // Not every input has a genuine second option: the seed only moves the
      // pick among near-tied candidates (see SWAP_EPSILON in the engine), and
      // plenty of sentences have none. Attaching an "alternative" that reads
      // identically to the primary would be worse than showing nothing, so
      // it's only kept when it actually differs -- trying a few seeds first
      // rather than settling for a same-text "alternative".
      let alternative = null;
      for (let attempt = 1; attempt <= 4 && !alternative; attempt++) {
        const altSeed = (engineOptions.seed + attempt * 104729) >>> 0; // large prime steps, kept clear of the primary seed
        const candidate = paraphraseLocally(text, { ...engineOptions, seed: altSeed });
        if (candidate.paraphrased !== result.paraphrased) {
          alternative = {
            paraphrased: candidate.paraphrased,
            structuralNote: candidate.structuralNote,
            trace: candidate.trace,
            plan: candidate.plan,
            passes: candidate.passes,
            engine: candidate.engine,
            seed: altSeed,
          };
        }
      }
      result.alternative = alternative;

      setResult(result);

      // Stored locally first, so an interrupted request cannot lose the run.
      // If the server then accepts it, this entry is replaced by one keyed on
      // the server id rather than left behind as a duplicate.
      const localEntry = await localHistory.add(result);

      // Then try to store it. A failure here costs the server copy, not the
      // rewrite, so it downgrades the history source rather than surfacing
      // as an error over the result.
      if (health?.persistence?.available) {
        try {
          const saved = await api.storeRun({
            title: titleFor(result),
            original: result.original,
            paraphrased: result.paraphrased,
            options: result.options,
            metrics: result.metrics,
            trace: result.trace,
            traceSummary: result.traceSummary,
            plan: result.plan,
            passes: result.passes,
            ...(overrides.parentId ? { parentId: overrides.parentId } : {}),
          });
          setResult((current) => (current === result ? { ...current, id: saved.id, persisted: true } : current));
          await localHistory.remove(localEntry.id);
          await localHistory.add({ ...result, id: saved.id });
        } catch (storeError) {
          setHistoryError(`Not saved to the server: ${storeError.message}`);
        }
      }

      await refreshHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }, [canSubmit, text, options, health, refreshHistory]);


  // Lets the user edit or add to the rewritten text by hand. Re-derives
  // metrics and the diff against the edited text, so Changes/Metrics and
  // Copy/Export all reflect what is actually in the box -- only the trace
  // and plan stay put, since those explain the engine's original rewrite,
  // not a manual edit made after the fact.
  const updateResultText = useCallback((newText) => {
    setResult((prev) => {
      if (!prev) return prev;
      const rebuilt = buildResult({ original: prev.original, paraphrased: newText, engineResult: prev });
      return { ...prev, ...rebuilt };
    });
  }, []);

  // Promotes the alternative phrasing to the main result -- unlike a manual
  // edit, this carries its own trace and structural note along with it,
  // since it came from the engine rather than from typing. The alternative
  // slot is cleared rather than refilled: a fresh one comes from the next
  // Rewrite/Summarize click, which already re-derives a new seed each time.
  const useAlternative = useCallback(() => {
    setResult((prev) => {
      if (!prev?.alternative) return prev;
      const rebuilt = buildResult({ original: prev.original, paraphrased: prev.alternative.paraphrased, engineResult: prev.alternative });
      return { ...prev, ...rebuilt, alternative: null };
    });
  }, []);

  const exportResult = useCallback((format) => {
    if (!result) return;
    const run = { ...result, title: titleFor(result), createdAt: new Date().toISOString() };
    const name = slug(run.title);

    const [body, type, extension] = format === 'md'
      ? [toMarkdown(run), 'text/markdown', 'md']
      : format === 'txt'
        ? [toPlainText(run), 'text/plain', 'txt']
        : [JSON.stringify(toJson(run), null, 2), 'application/json', 'json'];

    downloadBlob(new Blob([body], { type: `${type};charset=utf-8` }), `${name}.${extension}`);
  }, [result]);

  const selectHistoryItem = useCallback(async (item) => {
    if (historySource === 'server' && !item.local) {
      try {
        const data = await api.getRun(item.id);
        setText(data.run.contentOriginal);
        setResult(toResultShape(data.run));
        return;
      } catch (err) {
        setHistoryError(err.message);
      }
    }

    // Local entries carry the whole run, so this restores the result itself,
    // not just the input text.
    const stored = await localHistory.get(item.id);
    setText((stored || item).contentOriginal);
    setResult(stored ? toResultShape(stored) : null);
  }, [historySource]);

  const deleteHistoryItem = useCallback(async (item) => {
    if (historySource === 'server' && !item.local) {
      try { await api.deleteRun(item.id); } catch (err) { setHistoryError(err.message); }
    }
    await localHistory.remove(item.id);
    await refreshHistory();
  }, [historySource, refreshHistory]);

  const clearHistory = useCallback(async () => {
    if (historySource === 'server') {
      await Promise.all(history.map((item) => api.deleteRun(item.id).catch(() => {})));
    }
    await localHistory.clear();
    await refreshHistory();
  }, [history, historySource, refreshHistory]);

  const headerNote = useMemo(() => {
    if (!online) return 'Offline - everything runs in this browser';
    if (!health) return 'Runs in this browser';
    return health.persistence.available
      ? `Runs in this browser - history also saved on the server (${health.persistence.mode})`
      : 'Try it now!';
  }, [health, online]);

  return (
    <div className="min-h-full">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:sketch-btn"
      >
        Skip to content
      </a>

      <ThemeToggle />
      <header className="mx-auto w-full max-w-5xl px-6 pt-12 pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="relative inline-block">
              <WobbleLockup size={48} />
              <Squiggle className="absolute -bottom-3 left-0 w-full" style={{ marginTop: '0.5rem' }} />
            </div>
            <p className="mt-3 text-lg" style={{ color: 'var(--ink-muted)' }}>
             Humanize text flow, instantly summarize notes, and draw ideas naturally.
            </p>
          </div>
          <p className="sketch-tag" style={{ '--rot': 'rotate(1.5deg)' }}>{headerNote}</p>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-5xl px-6 pb-20">
        <div className="flex flex-col gap-8">
          {error && (
            <div
              role="alert"
              className="sketch-card p-4 text-lg"
              style={{ borderColor: 'var(--marker)', borderWidth: 'var(--stroke-thick)', color: 'var(--ink)', '--rot': 'rotate(-0.5deg)' }}
            >
              {error}
            </div>
          )}

          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
            <div className="flex flex-col gap-4">
              <InputArea
                value={text}
                onChange={setText}
                onSubmit={run}
                onClear={() => { setText(''); setResult(null); }}
                onSample={() => setText(SAMPLE)}
                busy={busy}
                maxChars={maxChars}
                liveMetrics={liveMetrics}
              />
              <div
                style={{
                  maxHeight: '280px',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <HistoryPanel
                  items={history}
                  source={historySource}
                  onSelect={selectHistoryItem}
                  onDelete={deleteHistoryItem}
                  onClear={clearHistory}
                  activeId={result?.id ?? null}
                  error={historyError}
                />
              </div>
            </div>
            <Controls
              presets={presets}
              options={options}
              onChange={setOptions}
              onSubmit={run}
              busy={busy}
              canSubmit={canSubmit}
            />
          </div>

          <OutputCard
            result={result}
            onExport={exportResult}
            onEditResult={updateResultText}
            onUseAlternative={useAlternative}
            busy={busy}
          />
        </div>
      </main>
    </div>
  );
}

function loadOptions() {
  try {
    return { ...DEFAULT_OPTIONS, ...JSON.parse(localStorage.getItem(OPTIONS_KEY) || '{}') };
  } catch {
    return DEFAULT_OPTIONS;
  }
}

/** A stored Run renders through the same component as a fresh result. */
function toResultShape(run) {
  return {
    id: run.id,
    original: run.contentOriginal,
    paraphrased: run.contentParaphrased,
    metrics: run.metrics,
    diff: run.diff || { segments: [], stats: null },
    trace: run.trace || [],
    traceSummary: run.traceSummary || [],
    // Runs stored before this feature existed have no structuralNote of their
    // own; derive it from the trace they already have rather than showing
    // nothing.
    structuralNote: run.structuralNote || summarizeStructure(run.trace || []),
    plan: run.plan,
    passes: run.passes || [],
    engine: run.engine || run.options?.engine,
    seed: run.seed ?? run.options?.seed,
    persisted: !run.local,
    computedLocally: true,
    summary: run.summary || summaryCountsFromTrace(run.trace),
    title: run.title,
  };
}

/** Recover "kept N of M" from a stored summarisation trace. */
function summaryCountsFromTrace(trace) {
  if (!Array.isArray(trace)) return null;
  const kept = trace.filter((entry) => entry.rule === 'keep').length;
  const dropped = trace.filter((entry) => entry.rule === 'drop').length;
  return kept + dropped > 0 ? { kept, total: kept + dropped } : null;
}

function titleFor(result) {
  if (result.title) return result.title;
  const first = (result.original || '').trim().split('\n')[0].trim();
  return first.length > 60 ? `${first.slice(0, 57)}...` : first || 'humaninzer-run';
}

function slug(title) {
  return String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
    || 'humaninzer-run';
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
