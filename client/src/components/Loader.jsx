export default function Loader() {
  return (
    <div
      style={{
        display: 'inline-block',
        width: '1.2em',
        height: '1.2em',
        borderRadius: '50%',
        border: '2px solid var(--ink-faint)',
        borderTopColor: 'var(--ink)',
        animation: 'spin 0.8s linear infinite',
      }}
    >
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
