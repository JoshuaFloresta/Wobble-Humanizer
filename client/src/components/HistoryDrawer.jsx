import React from 'react';
import { X } from 'lucide-react';
import HistoryPanel from './HistoryPanel.jsx';

/**
 * History as a slide-in drawer on the right edge.
 *
 * Stays fixed in the viewport so the main content area never shifts. The drawer
 * itself clips overflow, and the history list scrolls inside if needed.
 */
export default function HistoryDrawer(props) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open history drawer"
        className="sketch-btn sketch-btn--sm fixed bottom-6 right-6 z-40"
        style={{ zIndex: 40 }}
      >
        📚 History
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/30"
          onClick={() => setOpen(false)}
          aria-hidden="true"
          style={{ zIndex: 39 }}
        />
      )}

      <aside
        className="fixed top-0 right-0 h-screen w-80 overflow-hidden"
        style={{
          zIndex: 40,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 200ms ease-out',
          boxShadow: open ? 'var(--shadow-lg)' : 'none',
        }}
      >
        <div className="flex h-full flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b-2 border-[var(--ink)] px-5 py-4">
            <h2 style={{ fontFamily: 'Kalam, cursive', fontWeight: 700, fontSize: '1.5rem' }}>
              History
            </h2>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close history"
              className="sketch-btn sketch-btn--sm p-1"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <HistoryPanel {...props} />
          </div>
        </div>
      </aside>
    </>
  );
}
