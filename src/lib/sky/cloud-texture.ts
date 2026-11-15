/**
 * Low-resolution procedural night clouds: generate pixels once per preset,
 * then let the browser's compositor move the canvas across the sky.
 *
 * No SVG outlines, continuous canvas rendering, WebGL context, or dependencies.
 * Shape/texture are deterministic so every visitor sees the same clouds.
 */
export const CLOUD_TEXTURE_WIDTH = 336;
export const CLOUD_TEXTURE_HEIGHT = 118;

const smoothstep = (a: number, b: number, value: number): number => {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const hash = (x: number, y: number, seed: number): number => {
  let v = Math.imul(x + seed * 37, 374761393) ^ Math.imul(y + seed * 23, 668265263);
  v = Math.imul(v ^ (v >>> 13), 1274126177);
  return ((v ^ (v >>> 16)) >>> 0) / 0x1_0000_0000;
};

export function buildCloudPixels(
  variant: number,
  isCirrus: boolean,
  width = CLOUD_TEXTURE_WIDTH,
  height = CLOUD_TEXTURE_HEIGHT,
): Uint8ClampedArray {
  const seed = ((Math.trunc(variant) % 16) + 16) % 16;
  // A small precomputed lattice means there are no costly hashes per pixel.
  const gridSize = 96;
  const noiseGrid = new Float32Array(gridSize * gridSize);
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      noiseGrid[y * gridSize + x] = hash(x, y, seed);
    }
  }

  const noise = (x: number, y: number): number => {
    const left = Math.floor(x);
    const top = Math.floor(y);
    const fx = smoothstep(0, 1, x - left);
    const fy = smoothstep(0, 1, y - top);
    const x0 = ((left % gridSize) + gridSize) % gridSize;
    const y0 = ((top % gridSize) + gridSize) % gridSize;
    const x1 = (x0 + 1) % gridSize;
    const y1 = (y0 + 1) % gridSize;
    const a = noiseGrid[y0 * gridSize + x0];
    const b = noiseGrid[y0 * gridSize + x1];
    const c = noiseGrid[y1 * gridSize + x0];
    const d = noiseGrid[y1 * gridSize + x1];
    return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
  };

  const pixels = new Uint8ClampedArray(width * height * 4);
  const colorBase = isCirrus ? [86, 114, 137] : [79, 109, 132];

  for (let y = 0; y < height; y++) {
    const v = y / (height - 1);
    for (let x = 0; x < width; x++) {
      const u = x / (width - 1);

      // Layered smooth noise gives broken wisps rather than repeating arcs.
      const main = noise(u * 5.2 + seed * .48 + 3.4, v * 5.1 + 9.7);
      const medium = noise(u * 11.4 + seed * 1.17 + 8.3, v * 13.6 + 15.1);
      const fine = noise(u * 26.8 + seed * .31 + 20.2, v * 24.6 + 6.8);
      const low = noise(u * 2.6 + seed + 1.2, v * 3.5 + 2.1);

      const center = .52 + .06 * Math.sin(u * 7 + seed * 1.2)
        + .08 * (noise(u * 4.7 + 2.1, 1.2 + seed * .15) - .5);
      const thickness = (isCirrus ? .17 : .29) + .07 * main;
      const dist = Math.abs((v - center + (low - .5) * .24) / thickness);

      const feather = 1 - smoothstep(.43, 1.35, dist);
      const density = main * .55 + medium * .31 + fine * .14;
      const body = smoothstep(.34, .62, density) * feather;
      const sideFade = smoothstep(0, .17, u) * (1 - smoothstep(.84, 1, u));
      const alpha = body * sideFade * (isCirrus ? .72 : .65);

      const i = (y * width + x) * 4;
      const shade = (main - .5) * 27 + (medium - .5) * 10;
      pixels[i] = colorBase[0] + shade;
      pixels[i + 1] = colorBase[1] + shade;
      pixels[i + 2] = colorBase[2] + shade;
      pixels[i + 3] = alpha * 200;
    }
  }
  return pixels;
}
