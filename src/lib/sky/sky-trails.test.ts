import { describe, expect, it } from 'vitest';
import {
  buildContrailPixels,
  buildMeteorTrailPixels,
  METEOR_WIDTH,
  METEOR_HEIGHT,
  CONTRAIL_WIDTH,
  CONTRAIL_HEIGHT,
} from './sky-trails';

describe('procedural night-sky trails', () => {
  it('generates deterministic, bounded meteor textures', () => {
    const a = buildMeteorTrailPixels(7);
    expect(a.length).toBe(METEOR_WIDTH * METEOR_HEIGHT * 4);
    expect(a).toEqual(buildMeteorTrailPixels(7));
    expect(a).not.toEqual(buildMeteorTrailPixels(8));

    const center = Math.floor(METEOR_HEIGHT / 2) * METEOR_WIDTH;
    const alpha = (x: number) => a[(center + x) * 4 + 3];
    expect(alpha(0)).toBeGreaterThan(alpha(60));
    expect(alpha(60)).toBeGreaterThan(alpha(220));
    expect(alpha(METEOR_WIDTH - 1)).toBe(0);
  });

  it('renders wispy contrail texture with a transparent far end', () => {
    const a = buildContrailPixels(2);
    expect(a.length).toBe(CONTRAIL_WIDTH * CONTRAIL_HEIGHT * 4);
    expect(a).toEqual(buildContrailPixels(2));
    expect(a).not.toEqual(buildContrailPixels(3));

    const center = Math.floor(CONTRAIL_HEIGHT / 2) * CONTRAIL_WIDTH;
    const alpha = (x: number) => a[(center + x) * 4 + 3];
    expect(alpha(0)).toBe(0);
    expect(alpha(CONTRAIL_WIDTH - 9)).toBeGreaterThan(0);
    expect(alpha(CONTRAIL_WIDTH - 9)).toBeLessThan(120);
  });
});
