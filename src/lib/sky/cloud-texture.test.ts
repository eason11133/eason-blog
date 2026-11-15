import { describe, expect, it } from 'vitest';
import { buildCloudPixels, CLOUD_TEXTURE_HEIGHT, CLOUD_TEXTURE_WIDTH } from './cloud-texture';

describe('procedural cloud textures', () => {
  it('is deterministic for a cloud seed and shape type', () => {
    const a = buildCloudPixels(7, true);
    const b = buildCloudPixels(7, true);
    expect(a.length).toBe(CLOUD_TEXTURE_WIDTH * CLOUD_TEXTURE_HEIGHT * 4);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('generates distinct wispy and scattered clouds without a hard rectangular edge', () => {
    const cirrus = buildCloudPixels(2, true, 96, 48);
    const scattered = buildCloudPixels(2, false, 96, 48);
    expect(Array.from(cirrus)).not.toEqual(Array.from(scattered));
    const alphas: number[] = [];
    for (let y = 0; y < 48; y++) {
      for (let x = 0; x < 96; x++) {
        const a = cirrus[(y * 96 + x) * 4 + 3];
        alphas.push(a);
        if (x === 0 || x === 95) expect(a).toBe(0);
      }
    }
    expect(Math.max(...alphas)).toBeGreaterThan(30);
    expect(new Set(alphas).size).toBeGreaterThan(30);
  });
});
