import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { sketchPill } from '../lib/sketch.js';

/**
 * The tone picker, as a single scrolling row.
 *
 * Seven tones wrapped onto four lines and cost more vertical space than they
 * were worth, so the row scrolls sideways instead. It stays a real radio
 * group: arrow keys still move the selection, and the browser scrolls the
 * focused option into view on its own.
 *
 * The nudge buttons only appear when the row actually overflows -- on a wide
 * screen where everything fits, they would be furniture. They are hidden from
 * assistive tech because they move the viewport, not the selection, which the
 * keyboard already handles.
 */
export default function ToneStrip({ tones, value, onChange, name }) {
  const scroller = useRef(null);
  const [overflow, setOverflow] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const element = scroller.current;
    if (!element) return;
    const { scrollLeft, scrollWidth, clientWidth } = element;
    setOverflow({
      start: scrollLeft > 4,
      end: scrollLeft + clientWidth < scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    measure();
    const element = scroller.current;
    if (!element) return undefined;

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    element.addEventListener('scroll', measure, { passive: true });
    return () => {
      observer.disconnect();
      element.removeEventListener('scroll', measure);
    };
  }, [measure, tones.length]);

  const nudge = (direction) => {
    const element = scroller.current;
    if (!element) return;
    element.scrollBy({ left: direction * Math.max(160, element.clientWidth * 0.7), behavior: 'smooth' });
  };

  return (
    <div className="sketch-strip-frame">
      <div
        ref={scroller}
        className="sketch-scroll sketch-strip"
        style={{
          paddingLeft: overflow.start ? '2.4rem' : undefined,
          paddingRight: overflow.end ? '2.4rem' : undefined,
        }}
      >
        {tones.map((preset, index) => {
          const active = preset.id === value;
          return (
            <label
              key={preset.id}
              className={`sketch-btn sketch-btn--sm cursor-pointer ${active ? 'sketch-btn--active' : ''}`}
              style={sketchPill(index)}
              title={preset.description}
            >
              <input
                type="radio"
                name={name}
                value={preset.id}
                checked={active}
                onChange={() => onChange(preset.id)}
                className="sr-only"
              />
              {preset.label}
            </label>
          );
        })}
      </div>

      {overflow.start && <Nudge direction={-1} onClick={() => nudge(-1)} side="left" />}
      {overflow.end && <Nudge direction={1} onClick={() => nudge(1)} side="right" />}
    </div>
  );
}

function Nudge({ onClick, side }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={-1}
      aria-hidden="true"
      className="sketch-icon-circle absolute top-1/2 hidden h-8 w-8 -translate-y-1/2 md:flex"
      style={{
        [side]: '0.1rem',
        background: 'var(--surface)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <Icon size={16} strokeWidth={2.5} />
    </button>
  );
}
