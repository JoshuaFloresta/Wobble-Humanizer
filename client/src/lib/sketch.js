/**
 * Deterministic hand-drawn irregularity.
 *
 * Irregularity that repeats stops being irregular, so repeated items cycle
 * through several radii and rotations instead of sharing one. The cycle is
 * driven by the item's index rather than Math.random(), so a card looks the
 * same on every render and across a reload -- randomising in render would
 * make elements twitch on every state change.
 *
 * The cycle lengths are coprime (5 radii, 7 rotations), so a grid has to run
 * to 35 items before a pair repeats exactly.
 */

const CARD_RADII = [
  '22px 8px 26px 10px / 10px 26px 8px 22px',
  '10px 24px 8px 22px / 24px 10px 22px 8px',
  '26px 10px 18px 12px / 12px 20px 10px 26px',
  '8px 22px 12px 26px / 20px 8px 26px 12px',
  '18px 12px 24px 8px / 26px 12px 18px 10px',
];

const PILL_RADII = [
  '255px 15px 225px 15px / 15px 225px 15px 255px',
  '15px 225px 15px 255px / 255px 15px 225px 15px',
  '225px 15px 255px 15px / 15px 255px 15px 225px',
];

const ROTATIONS = [-1.5, 1, -0.75, 1.75, -2, 0.5, -1.25];
const HOVER_ROTATIONS = [1, -1.5, 1.25, -1, 1.5, -0.75, 1];

const pick = (list, index) => list[Math.abs(index) % list.length];

/**
 * Style object for a card-like element.
 *
 * @param {number} index position in the repeated set
 * @param {object} [options]
 * @param {number} [options.tilt] multiplier for the rotation; pass a smaller
 *   value on mobile, where a full tilt costs more horizontal room than it is
 *   worth
 * @returns {object} inline style with the wobbly radius and rotation tokens
 */
export function sketchCard(index, options = {}) {
  const tilt = options.tilt ?? 1;
  return {
    borderRadius: pick(CARD_RADII, index),
    '--rot': `rotate(${round(pick(ROTATIONS, index) * tilt)}deg)`,
    '--rot-hover': `rotate(${round(pick(HOVER_ROTATIONS, index) * tilt)}deg)`,
  };
}

/** Style object for a pill: buttons, tabs and tags. */
export function sketchPill(index) {
  return {
    borderRadius: pick(PILL_RADII, index),
    '--rot': `rotate(${round(pick(ROTATIONS, index) * 0.6)}deg)`,
  };
}

/** Rotation only, for elements whose radius is set elsewhere. */
export function sketchTilt(index, tilt = 1) {
  return { '--rot': `rotate(${round(pick(ROTATIONS, index) * tilt)}deg)` };
}

function round(n) {
  return Math.round(n * 100) / 100;
}

export { CARD_RADII, PILL_RADII, ROTATIONS };
