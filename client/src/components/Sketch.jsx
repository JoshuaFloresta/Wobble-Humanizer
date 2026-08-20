import { sketchTilt } from '../lib/sketch.js';

/**
 * Decorative paper marks.
 *
 * All of it is aria-hidden: a thumbtack conveys nothing to a screen reader,
 * and the tape is not a landmark. Purely decorative pieces hide below md,
 * where the horizontal room is worth more than the flourish.
 */

/** A strip of tape, pinned over the top edge of a panel. */
export function Tape({ className = '', index = 0 }) {
  return (
    <span
      aria-hidden="true"
      className={`sketch-tape hidden md:block ${className}`}
      style={sketchTilt(index, 1.6)}
    />
  );
}

/** A thumbtack, centred on the top edge. */
export function Thumbtack({ className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`sketch-tack left-1/2 -translate-x-1/2 -top-2 ${className}`}
    />
  );
}

/** A hand-drawn underline, for the page title. */
export function Squiggle({ className = '', width = 180 }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={width}
      height="10"
      viewBox="0 0 180 10"
      fill="none"
      preserveAspectRatio="none"
    >
      <path
        d="M2 6c14-4 28 2 43-1s26-5 41-1 30 5 45 2 24-4 47-2"
        stroke="var(--marker)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A short arrow, for pointing at things in the margin. */
export function Arrow({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      className={`hidden md:block ${className}`}
      width="56"
      height="34"
      viewBox="0 0 56 34"
      fill="none"
    >
      <path
        d="M3 27C12 10 28 3 50 6"
        stroke="var(--ink)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M40 3l11 3-6 9"
        stroke="var(--ink)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** An icon in a rough circle. */
export function IconCircle({ children, className = '' }) {
  return <span className={`sketch-icon-circle ${className}`}>{children}</span>;
}
