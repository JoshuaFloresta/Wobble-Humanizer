/**
 * Wobble mark — the standalone logo, no wordmark.
 *
 * Ink strokes use currentColor, so it inherits from its parent. The marker
 * stroke stays red in every context — it's the one fixed colour in the mark.
 */

export function WobbleMark({ size = 32, title = 'Wobble', ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M74 22C44 24 20 44 21 66C22 90 44 100 62 99C84 98 100 82 99 58C98 36 82 22 60 21C44 20 34 26 30 32"
        stroke="currentColor"
        strokeWidth={7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M40 60C47 49 51 71 59 60C67 49 71 71 81 58"
        stroke="var(--marker, #ff4d4d)"
        strokeWidth={7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Mark plus wordmark. */
export function WobbleLockup({ size = 32 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.35 }}>
      <WobbleMark size={size} title="Wobble" />
      <span
        style={{
          fontFamily: 'Kalam, cursive',
          fontWeight: 700,
          fontSize: size * 0.95,
          lineHeight: 1,
          letterSpacing: '-0.01em',
        }}
      >
        Wobble
      </span>
    </span>
  );
}
