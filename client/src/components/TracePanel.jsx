import { sketchCard, sketchPill } from '../lib/sketch.js';

/**
 * The explanation panel: every rule that fired, why, and what it changed.
 *
 * This is the feature that makes the output trustworthy rather than magical,
 * so it shows the plan the engine followed and each individual edit rather
 * than a summary count. Each edit is its own index card, tilted by position
 * so a long list reads as a stack of notes rather than a table.
 */
export default function TracePanel({ trace = [], traceSummary = [], plan, passes = [], seed }) {
  if (!trace.length) {
    return (
      <p style={{ color: 'var(--ink-muted)' }}>
        No rules fired. The text already matched the requested tone and reading level.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {plan && (
        <section>
          <h3 className="mb-2">The plan it followed</h3>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-3">
            <Fact label="Tone" value={plan.toneLabel} />
            <Fact label="Target grade" value={plan.targetGrade} />
            <Fact label="Sentence target" value={`${plan.sentenceTarget} words`} />
            <Fact label="Register" value={registerLabel(plan.targetRegister)} />
            <Fact label="Goals" value={(plan.goals || []).join(', ') || 'none'} />
            <Fact label="Seed" value={seed} />
          </dl>
          {passes.length > 1 && (
            <p className="mt-3 text-base" style={{ color: 'var(--ink-muted)' }}>
              {passes.length} passes: {passes.map((p) => `grade ${p.grade} after ${p.edits} edits`).join('; ')}.
            </p>
          )}
        </section>
      )}

      <section>
        <h3 className="mb-3">
          {trace.length} edit{trace.length === 1 ? '' : 's'} across {traceSummary.length} rule{traceSummary.length === 1 ? '' : 's'}
        </h3>
        <ul className="flex flex-col gap-4">
          {trace.map((entry, index) => (
            <li key={index} className="sketch-card p-3.5" style={sketchCard(index, { tilt: 0.6 })}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="sketch-tag" style={sketchPill(index)}>{entry.rule}</span>
                <span className="text-base" style={{ color: 'var(--ink-muted)' }}>{entry.reason}</span>
              </div>
              <p className="mt-2 break-words text-lg">
                <span className="sketch-struck">{entry.from}</span>
                <span aria-hidden="true" style={{ color: 'var(--ink-muted)' }}> {'\u2192'} </span>
                <span className="sr-only"> becomes </span>
                <span style={{ color: 'var(--ballpoint)' }}>{entry.to || '(rubbed out)'}</span>
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Fact({ label, value }) {
  return (
    <div>
      <dt className="text-base" style={{ color: 'var(--ink-muted)' }}>{label}</dt>
      <dd className="text-lg" style={{ fontFamily: 'Kalam, cursive', fontWeight: 700 }}>{String(value ?? '-')}</dd>
    </div>
  );
}

function registerLabel(register) {
  const labels = { '-2': 'Slang', '-1': 'Casual', 0: 'Neutral', 1: 'Formal', 2: 'Academic' };
  return labels[String(register)] ?? String(register);
}
