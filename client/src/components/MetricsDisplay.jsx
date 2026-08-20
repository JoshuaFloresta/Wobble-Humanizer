import { signed } from '../lib/format.js';
import { sketchCard } from '../lib/sketch.js';

/**
 * Readability and tone metrics with before/after deltas.
 *
 * Every number is paired with the plain-language reading that goes with it,
 * because a bare "11.4" tells the user nothing on its own. Colour is never
 * the only signal: each delta also carries a sign and an arrow glyph, which
 * matters more here than usual since the palette has no green -- an
 * improvement reads as ballpoint blue, a regression as marker red.
 */
export default function MetricsDisplay({ before, after, delta, compact = false }) {
  if (!after || after.empty) {
    return (
      <p style={{ color: 'var(--ink-muted)' }}>
        Metrics appear once there is text to measure.
      </p>
    );
  }

  const readability = after.readability;
  const tone = after.tone;
  const naturalness = after.naturalness;
  const hasNaturalness = naturalness && !naturalness.empty;
  const beforeNaturalness = before?.naturalness;

  return (
    <div className="flex flex-col gap-7">
      <section aria-labelledby="metrics-summary-heading">
        <h3 id="metrics-summary-heading" className="mb-3">Summary</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat
            index={0}
            label="Reading grade"
            value={readability.summary.consensusGrade}
            delta={delta?.readability?.consensusGrade}
            betterWhen="lower"
            hint={readability.summary.audience}
          />
          <Stat
            index={1}
            label="Words"
            value={readability.counts.words}
            delta={delta?.counts?.words}
            betterWhen="lower"
            hint={`${readability.counts.sentences} sentences`}
          />
          <Stat
            index={2}
            label="Reading ease"
            value={readability.scores.fleschReadingEase.value}
            delta={delta?.readability?.fleschReadingEase}
            betterWhen="higher"
            hint={readability.scores.fleschReadingEase.label}
          />
          {hasNaturalness ? (
            <Stat
              index={3}
              label="Naturalness"
              value={naturalness.composite}
              delta={delta?.naturalness?.composite}
              betterWhen="higher"
              hint="How human the rhythm and word choice read"
            />
          ) : (
            <Stat
              index={3}
              label="Tone"
              value={tone.dominant?.label || '-'}
              hint={`${readability.summary.readingTimeSeconds}s read`}
              textual
            />
          )}
        </div>
      </section>

      {!compact && (
        <section aria-labelledby="metrics-readability-heading">
          <h3 id="metrics-readability-heading" className="mb-3">Readability formulas</h3>
          <ul className="flex flex-col gap-3">
            {Object.entries(readability.scores).map(([key, score]) => (
              <MetricRow
                key={key}
                name={score.name}
                hint={score.hint}
                value={score.value}
                label={score.label}
                delta={delta?.readability?.[key]}
                betterWhen={score.scale === 'ease' ? 'higher' : 'lower'}
                max={score.scale === 'ease' ? 100 : 20}
                beforeValue={before?.readability?.scores?.[key]?.value}
              />
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="metrics-tone-heading">
        <h3 id="metrics-tone-heading" className="mb-3">Tone signals</h3>
        <ul className="flex flex-col gap-3">
          {Object.entries(tone.metrics).map(([key, metric]) => (
            <MetricRow
              key={key}
              name={metric.name}
              hint={(metric.evidence || []).join(', ')}
              value={metric.value}
              label={metric.label}
              delta={delta?.tone?.[key]}
              betterWhen="neutral"
              max={100}
              beforeValue={before?.tone?.metrics?.[key]?.value}
            />
          ))}
        </ul>
      </section>

      {!compact && hasNaturalness && (
        <section aria-labelledby="metrics-naturalness-heading">
          <h3 id="metrics-naturalness-heading" className="mb-3">Naturalness signals</h3>
          <ul className="flex flex-col gap-3">
            {Object.entries(naturalness.metrics).map(([key, metric]) => (
              <MetricRow
                key={key}
                name={metric.name}
                hint={(metric.evidence || []).join(', ')}
                value={metric.value}
                label={metric.label}
                delta={delta?.naturalness?.[key]}
                betterWhen="higher"
                max={100}
                beforeValue={beforeNaturalness?.metrics?.[key]?.value}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ index, label, value, delta, betterWhen, hint, textual = false }) {
  return (
    <div className="sketch-card p-3" style={sketchCard(index)}>
      <div className="text-base" style={{ color: 'var(--ink-muted)' }}>{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span
          className={textual ? 'text-xl' : 'text-3xl'}
          style={{ fontFamily: 'Kalam, cursive', fontWeight: 700 }}
        >
          {value}
        </span>
        {delta !== undefined && delta !== null && delta !== 0 && (
          <Delta value={delta} betterWhen={betterWhen} />
        )}
      </div>
      {hint && <div className="mt-0.5 text-base leading-tight" style={{ color: 'var(--ink-muted)' }}>{hint}</div>}
    </div>
  );
}

function MetricRow({ name, hint, value, label, delta, betterWhen, max, beforeValue }) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  const beforePercent = beforeValue === undefined ? null : Math.max(0, Math.min(100, (beforeValue / max) * 100));

  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-lg">{name}</span>
        <span className="flex items-baseline gap-1.5 text-lg">
          {value}
          {delta !== undefined && delta !== null && delta !== 0 && (
            <Delta value={delta} betterWhen={betterWhen} />
          )}
        </span>
      </div>
      <div
        className="sketch-meter"
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${name}: ${label}`}
      >
        {beforePercent !== null && (
          <div className="before-mark" style={{ left: `${beforePercent}%` }} aria-hidden="true" />
        )}
        <div className="fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="flex justify-between gap-2 text-base" style={{ color: 'var(--ink-muted)' }}>
        <span>{label}</span>
        {hint && <span className="truncate text-right">{hint}</span>}
      </div>
    </li>
  );
}

function Delta({ value, betterWhen }) {
  const improving = betterWhen === 'neutral'
    ? null
    : (betterWhen === 'lower' ? value < 0 : value > 0);
  const color = improving === null
    ? 'var(--ink-muted)'
    : improving ? 'var(--ballpoint)' : 'var(--marker)';
  return (
    <span className="text-xl" style={{ color, fontFamily: 'Kalam, cursive', fontWeight: 700 }}>
      {value > 0 ? '\u2191' : '\u2193'}{signed(value)}
    </span>
  );
}
