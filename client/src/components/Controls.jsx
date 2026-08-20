import { useId } from 'react';
import { ScissorsLineDashed, Wand2 } from 'lucide-react';
import { sketchPill } from '../lib/sketch.js';
import { Arrow } from './Sketch.jsx';
import ToneStrip from './ToneStrip.jsx';

/**
 * Tone, reading level and intensity controls.
 *
 * Tone is a radio group rather than a select: the options are few, mutually
 * exclusive, and worth seeing at a glance. Arrow keys move between them for
 * free because they are real radio inputs, hidden behind post-it labels.
 */
export default function Controls({ presets, options, onChange, onSubmit, busy, canSubmit }) {
  const id = useId();
  if (!presets) return <ControlsSkeleton />;

  const tone = presets.tones.find((t) => t.id === options.tone);
  const summarizing = options.mode === 'summarize';

  return (
    <section className="sketch-panel relative flex min-w-0 flex-col gap-5 p-5" aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className="text-2xl">Settings</h2>

      <fieldset>
        <legend className="mb-2 text-lg" style={{ fontFamily: 'Kalam, cursive', fontWeight: 700 }}>
          What to do
        </legend>
        <div className="flex gap-2">
          {(presets.modes || []).map((item, index) => {
            const active = item.id === options.mode;
            return (
              <label
                key={item.id}
                className={`sketch-btn sketch-btn--sm flex-1 cursor-pointer ${active ? 'sketch-btn--active' : ''}`}
                style={sketchPill(index + 4)}
                title={item.description}
              >
                <input
                  type="radio"
                  name={`${id}-mode`}
                  value={item.id}
                  checked={active}
                  onChange={() => onChange({ ...options, mode: item.id })}
                  className="sr-only"
                />
                {item.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      {summarizing && (
        <Field
          label="How short"
          htmlFor={`${id}-summary`}
          hint={presets.summaryLengths?.find((l) => l.id === options.summaryLength)?.description}
        >
          <select
            id={`${id}-summary`}
            value={options.summaryLength}
            onChange={(event) => onChange({ ...options, summaryLength: event.target.value })}
            className="sketch-input"
          >
            {(presets.summaryLengths || []).map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </Field>
      )}

      <fieldset>
        <legend className="mb-2 text-lg" style={{ fontFamily: 'Kalam, cursive', fontWeight: 700 }}>
          Tone
        </legend>
        <ToneStrip
          tones={presets.tones}
          value={options.tone}
          onChange={(tone) => onChange({ ...options, tone })}
          name={`${id}-tone`}
        />
        {tone && (
          <p className="mt-1 text-base leading-snug" style={{ color: 'var(--ink-muted)' }}>
            {tone.description}
          </p>
        )}
      </fieldset>

      <Field label="Reading level" htmlFor={`${id}-grade`} hint={presets.readabilityTargets.find((t) => t.id === options.readabilityTarget)?.description}>
        <select
          id={`${id}-grade`}
          value={options.readabilityTarget}
          onChange={(event) => onChange({ ...options, readabilityTarget: event.target.value })}
          className="sketch-input"
        >
          {presets.readabilityTargets.map((target) => (
            <option key={target.id} value={target.id}>{target.label}</option>
          ))}
        </select>
      </Field>

      <Field label="Intensity" htmlFor={`${id}-intensity`} hint={presets.intensities.find((i) => i.id === options.intensity)?.description}>
        <select
          id={`${id}-intensity`}
          value={options.intensity}
          onChange={(event) => onChange({ ...options, intensity: event.target.value })}
          className="sketch-input"
        >
          {presets.intensities.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      </Field>

      <Field
        label="Keep these words"
        htmlFor={`${id}-preserve`}
        hint="Comma-separated. Product names and jargon you do not want swapped."
      >
        <input
          id={`${id}-preserve`}
          type="text"
          value={options.preserveText}
          onChange={(event) => onChange({ ...options, preserveText: event.target.value })}
          placeholder="e.g. Kubernetes, onboarding"
          className="sketch-input"
        />
      </Field>

      <div className="relative">
        <Arrow className="absolute -left-14 -top-2 rotate-[8deg]" />
        <button
          type="button"
          onClick={() => onSubmit()}
          disabled={busy || !canSubmit}
          className="sketch-btn w-full text-xl"
        >
          {summarizing
            ? <ScissorsLineDashed size={20} strokeWidth={2.5} aria-hidden="true" />
            : <Wand2 size={20} strokeWidth={2.5} aria-hidden="true" />}
          {busy
            ? (summarizing ? 'Summarizing...' : 'Rewriting...')
            : (summarizing ? 'Summarize' : 'Rewrite')}
        </button>
      </div>
      <p className="-mt-3 text-center text-base" style={{ color: 'var(--ink-muted)' }}>
        or press Ctrl+Enter
      </p>
    </section>
  );
}

function Field({ label, htmlFor, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-lg" style={{ fontFamily: 'Kalam, cursive', fontWeight: 700 }}>
        {label}
      </label>
      {children}
      {hint && <p className="text-base leading-snug" style={{ color: 'var(--ink-muted)' }}>{hint}</p>}
    </div>
  );
}

function ControlsSkeleton() {
  return (
    <div className="sketch-panel p-5">
      <p style={{ color: 'var(--ink-muted)' }}>Sharpening pencils...</p>
    </div>
  );
}
