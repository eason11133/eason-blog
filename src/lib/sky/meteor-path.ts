import { meteorExitDistance } from './meteor-geometry';

/**
 * Choose a whole on-screen meteor route before creating an element.
 * No DOM reads, collision timers or per-frame JavaScript.
 *
 * Image-space ridge data is sampled from eason-night.svg. Update alongside
 * public/background/eason-mountain-mask.svg if the background art changes.
 */
export const SKY_IMAGE_WIDTH = 1024;
export const SKY_IMAGE_HEIGHT = 1536;
export const RIDGE_STEP = 32;
export const RIDGE_Y = [1353,1351,1348,1350,1357,1360,1364,1368,1372,1370,1371,1375,1376,1375,1376,1378,1381,1381,1377,1374,1373,1367,1355,1361,1363,1360,1354,1346,1338,1333,1333,1339,1344] as const;

export interface MeteorRoute {
  x: number;
  y: number;
  angle: number;
  goesLeft: boolean;
  length: number;
  dx: number;
  dy: number;
  travel: number;
  visibleTravel: number;
  speed: number;
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const interpolate = (a: number, b: number, t: number) => a + (b - a) * t;

/** Foreground silhouette height in viewport pixels using background-size: cover. */
export function mountainHorizonAt(x: number, width: number, height: number): number {
  const scale = Math.max(width / SKY_IMAGE_WIDTH, height / SKY_IMAGE_HEIGHT);
  const pictureWidth = SKY_IMAGE_WIDTH * scale;
  const pictureTop = height - SKY_IMAGE_HEIGHT * scale;
  const pictureLeft = (width - pictureWidth) / 2;
  const imageX = clamp((x - pictureLeft) / scale, 0, SKY_IMAGE_WIDTH);
  const index = Math.min(RIDGE_Y.length - 2, Math.floor(imageX / RIDGE_STEP));
  const fraction = clamp((imageX - index * RIDGE_STEP) / RIDGE_STEP, 0, 1);
  return pictureTop + interpolate(RIDGE_Y[index], RIDGE_Y[index + 1], fraction) * scale;
}

/** First distance where the moving head meets the mountain skyline. */
export function firstMountainContact(
  start: {x: number; y: number},
  direction: {x: number; y: number},
  distance: number,
  width: number,
  height: number,
): number | null {
  const samples = 64; // only at spawn; no work during animation
  let previous = 0;
  for (let i = 1; i <= samples; i++) {
    const d = distance * i / samples;
    const x = start.x + direction.x * d;
    const y = start.y + direction.y * d;
    if (x < 0 || x > width) { previous = d; continue; }
    if (y >= mountainHorizonAt(x, width, height)) {
      // Binary-refine once to avoid treating a small path step as a huge jump.
      let low = previous, high = d;
      for (let j = 0; j < 6; j++) {
        const mid = (low + high) / 2;
        const xx = start.x + direction.x * mid;
        const yy = start.y + direction.y * mid;
        if (yy >= mountainHorizonAt(xx, width, height)) high = mid;
        else low = mid;
      }
      return high;
    }
    previous = d;
  }
  return null;
}

export function createMeteorRoute(
  width: number,
  height: number,
  desktop: boolean,
  random: () => number = Math.random,
): MeteorRoute | null {
  if (width < 250 || height < 300) return null;
  const sample = (min: number, max: number) => min + (max - min) * random();
  for (let attempt = 0; attempt < 12; attempt++) {
    const goesLeft = random() < .74;
    const angle = sample(desktop ? 28 : 24, desktop ? 52 : 46);
    const rad = angle * Math.PI / 180;
    const direction = {x: (goesLeft ? -1 : 1) * Math.cos(rad), y: Math.sin(rad)};
    const length = desktop
      ? clamp(sample(215, 375), 100, width * .34)
      : clamp(sample(105, 175), 72, width * .46);
    const fromTop = random() < .59;
    const start = fromTop
      ? {x: sample(width * .24, width * .76), y: -sample(20, 38)}
      : {x: goesLeft ? width + sample(18, 32) : -sample(18, 32),
         y: sample(height * .085, height * .30)};

    const total = meteorExitDistance(start, direction, length, width, height);
    const entry = fromTop
      ? -start.y / direction.y
      : (goesLeft ? start.x - width : -start.x) / Math.abs(direction.x);
    if (entry >= total || entry < 0) continue;

    const contact = firstMountainContact(start, direction, total, width, height);
    const visible = Math.min(total, contact ?? total) - entry;
    if (visible < (desktop ? Math.min(270, width * .24) : Math.min(125, width * .33))) continue;

    return {
      x: start.x, y: start.y, angle, goesLeft, length,
      dx: direction.x * total, dy: direction.y * total,
      travel: total, visibleTravel: visible,
      speed: sample(desktop ? 220 : 160, desktop ? 285 : 210),
    };
  }
  return null; // Skip an unsuitable random combination rather than forcing it.
}
