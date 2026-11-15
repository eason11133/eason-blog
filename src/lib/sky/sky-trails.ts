/**
 * Pre-rendered procedural light trails. Both buffers are small and only
 * generated when an effect appears; CSS handles all subsequent movement.
 */
export const METEOR_WIDTH = 256;
export const METEOR_HEIGHT = 32;
export const CONTRAIL_WIDTH = 192;
export const CONTRAIL_HEIGHT = 28;

const hash = (index: number, seed: number): number => {
  let v = Math.imul(index ^ Math.imul(seed, 0x45d9f3b), 0x27d4eb2d);
  v = Math.imul(v ^ (v >>> 15), 0x85ebca6b);
  return ((v ^ (v >>> 13)) >>> 0) / 0x1_0000_0000;
};

const smoothNoise = (x: number, seed: number): number => {
  const a = Math.floor(x);
  const u = x - a;
  const smooth = u * u * (3 - 2 * u);
  return hash(a, seed) * (1 - smooth) + hash(a + 1, seed) * smooth;
};

const gaussian = (distance: number, radius: number): number => {
  const normalized = distance / Math.max(radius, .01);
  return Math.exp(-.5 * normalized * normalized);
};

/** White-blue bright head at x=0, uneven faint haze fading to transparent. */
export function buildMeteorTrailPixels(seed: number): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(METEOR_WIDTH * METEOR_HEIGHT * 4);
  const mid = (METEOR_HEIGHT - 1) / 2;
  for (let x = 0; x < METEOR_WIDTH; x++) {
    const u = x / (METEOR_WIDTH - 1);
    const taper = Math.pow(1 - u, 1.52);
    const grain = .79 + .21 * smoothNoise(u * 28 + 2.3, seed);
    const sway = (smoothNoise(u * 9 + 7, seed + 9) - .5) * u * 1.9;
    const coreRadius = .3 + (1 - u) * 1.24;
    const haloRadius = .9 + (1 - u) * 4.5;
    for (let y = 0; y < METEOR_HEIGHT; y++) {
      const d = y - mid - sway;
      const core = gaussian(d, coreRadius);
      const halo = gaussian(d, haloRadius);
      const alpha = Math.min(1, taper * grain * (.79 * core + .18 * halo));
      const i = (y * METEOR_WIDTH + x) * 4;
      pixels[i] = Math.round(207 + (1 - u) * 31);
      pixels[i + 1] = Math.round(226 + (1 - u) * 22);
      pixels[i + 2] = 255;
      pixels[i + 3] = Math.round(235 * alpha);
    }
  }
  return pixels;
}

/** Nearly invisible at the far end, two soft broken wisps near the fuselage. */
export function buildContrailPixels(seed: number): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(CONTRAIL_WIDTH * CONTRAIL_HEIGHT * 4);
  const mid = (CONTRAIL_HEIGHT - 1) / 2;
  for (let x = 0; x < CONTRAIL_WIDTH; x++) {
    const u = x / (CONTRAIL_WIDTH - 1);
    const entrance = Math.min(1, Math.max(0, (u - .025) / .48));
    const fade = entrance * entrance * (3 - 2 * entrance);
    const patch = .41 + .59 * smoothNoise(u * 17 + 4, seed);
    const offset = (smoothNoise(u * 9 + 6, seed + 7) - .5) * 2.8;
    const radius = 1.55 + (1 - u) * 1.7;
    for (let y = 0; y < CONTRAIL_HEIGHT; y++) {
      const d = y - mid - offset;
      const upper = gaussian(d - 1.8, radius);
      const lower = gaussian(d + 1.7, radius * .88);
      const mist = gaussian(d, radius * 2.0);
      const alpha = Math.min(.46, (.22 * upper + .18 * lower + .08 * mist) * fade * patch);
      const i = (y * CONTRAIL_WIDTH + x) * 4;
      pixels[i] = 166;
      pixels[i + 1] = 193;
      pixels[i + 2] = 213;
      pixels[i + 3] = Math.round(225 * alpha);
    }
  }
  return pixels;
}
