import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

/**
 * Copy-to-clipboard with a confirmation state.
 *
 * Falls back to a hidden textarea + execCommand when the async clipboard API
 * is unavailable (non-HTTPS origins, older browsers). The status is announced
 * politely so screen-reader users get the same confirmation sighted users do.
 */
export default function CopyButton({ text, label = 'Copy', copiedLabel = 'Copied!', className = '' }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(async () => {
    clearTimeout(timer.current);
    let ok = false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        ok = true;
      } else {
        ok = legacyCopy(text);
      }
    } catch {
      ok = legacyCopy(text);
    }

    setCopied(ok);
    setFailed(!ok);
    timer.current = setTimeout(() => {
      setCopied(false);
      setFailed(false);
    }, 2000);
  }, [text]);

  return (
    <>
      <button
        type="button"
        onClick={copy}
        disabled={!text}
        className={`sketch-btn sketch-btn--sm ${className}`}
        style={copied ? { background: 'var(--postit)' } : undefined}
      >
        {copied
          ? <Check size={18} strokeWidth={2.5} aria-hidden="true" />
          : <Copy size={18} strokeWidth={2.5} aria-hidden="true" />}
        {failed ? 'Press Ctrl+C' : copied ? copiedLabel : label}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? 'Copied to clipboard' : ''}
      </span>
    </>
  );
}

function legacyCopy(text) {
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
