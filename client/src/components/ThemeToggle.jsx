import React from 'react';
import { Moon, Sun } from 'lucide-react';

/**
 * Toggle between light and dark modes.
 *
 * The button sets data-theme on the root element. If unset, the browser uses
 * the system preference via prefers-color-scheme.
 *
 * Only rendered on the client, so it can safely access DOM APIs.
 */
export default function ThemeToggle() {
  const [mounted, setMounted] = React.useState(false);
  const [theme, setTheme] = React.useState('light');

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('wobble-theme', next);
  };

  React.useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('wobble-theme');
    if (stored) {
      setTheme(stored);
      document.documentElement.setAttribute('data-theme', stored);
    } else {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) {
        setTheme('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    }
  }, []);

  if (!mounted) return null;

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="sketch-btn sketch-btn--sm"
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 50,
      }}
    >
      {theme === 'dark' ? (
        <Sun size={18} strokeWidth={2.5} aria-hidden="true" />
      ) : (
        <Moon size={18} strokeWidth={2.5} aria-hidden="true" />
      )}
    </button>
  );
}
