import { meteorExitDistance } from './meteor-geometry';

/**
 * Meteor routes share the selected wallpaper's actual photo-space skyline.
 * Keep these points aligned with the corresponding SVG mountain masks.
 */
const LANDSCAPE = {
  width: 1672, height: 941,
  ridge: [[0,706],[80,699],[160,702],[240,703],[315,694],[390,711],[470,708],[530,725],[630,725],[710,740],[800,733],[880,736],[980,734],[1060,719],[1140,709],[1240,719],[1320,716],[1410,705],[1480,691],[1540,691],[1620,698],[1672,703]],
};
const PORTRAIT = {
  width: 941, height: 1672,
  ridge: [[0,1443],[75,1436],[145,1452],[220,1466],[310,1472],[410,1472],[480,1464],[545,1460],[610,1449],[690,1454],[760,1452],[820,1436],[880,1429],[941,1437]],
};

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

/** Photo and mask both use right bottom / cover. */
export function mountainHorizonAt(x: number, width: number, height: number): number {
  const photo = height >= width ? PORTRAIT : LANDSCAPE;
  const scale = Math.max(width / photo.width, height / photo.height);
  const pictureWidth = photo.width * scale;
  const pictureTop = height - photo.height * scale;
  const pictureLeft = width - pictureWidth; // CSS background-position: right bottom
  const imageX = clamp((x - pictureLeft) / scale, 0, photo.width);
  const ridge = photo.ridge;
  let index = 0;
  while (index < ridge.length - 2 && imageX > ridge[index + 1][0]) index++;
  const [x1, y1] = ridge[index];
  const [x2, y2] = ridge[index + 1];
  const fraction = clamp((imageX - x1) / (x2 - x1), 0, 1);
  return pictureTop + interpolate(y1, y2, fraction) * scale;
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
