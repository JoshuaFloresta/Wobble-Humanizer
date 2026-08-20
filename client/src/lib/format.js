/** Display helpers shared across components. */

export const signed = (n) => {
  if (n === null || n === undefined || Number.isNaN(n)) return '0';
  const rounded = Math.round(n * 10) / 10;
  return rounded > 0 ? `+${rounded}` : String(rounded);
};

/**
 * Direction of a change for coloring. `betterWhen` says which direction is an
 * improvement, because a lower grade is good while a higher ease score is.
 */
export const trend = (value, betterWhen = 'lower') => {
  if (!value) return 'flat';
  const improving = betterWhen === 'lower' ? value < 0 : value > 0;
  return improving ? 'up' : 'down';
};

export const formatDuration = (seconds) => {
  if (!seconds && seconds !== 0) return '';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
};

export const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export const pluralize = (n, singular, plural = `${singular}s`) => (
  `${n} ${n === 1 ? singular : plural}`
);
