/**
 * Service worker registration.
 *
 * Registered only in a production build: in development Vite serves modules
 * individually and a cache would just get in the way.
 */

export function registerServiceWorker() {
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      // Offline support is an enhancement; failing to register is not fatal.
      console.warn('Service worker registration failed:', error.message);
    });
  });
}

/**
 * Subscribe to connectivity changes.
 * @param {(online: boolean) => void} onChange
 * @returns {() => void} unsubscribe
 */
export function watchConnectivity(onChange) {
  const update = () => onChange(navigator.onLine);
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
  return () => {
    window.removeEventListener('online', update);
    window.removeEventListener('offline', update);
  };
}
