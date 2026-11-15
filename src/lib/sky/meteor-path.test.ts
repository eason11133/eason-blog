import { describe, expect, it } from 'vitest';
import { createMeteorRoute, firstMountainContact, mountainHorizonAt } from './meteor-path';

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

describe('stable meteor flight generation', () => {
  it('projects the mountain skyline to wide and tall viewports', () => {
    for (const [w, h] of [[1440, 810], [390, 844], [1920, 1080]]) {
      const horizon = mountainHorizonAt(w / 2, w, h);
      expect(horizon).toBeGreaterThan(h * .30);
      expect(horizon).toBeLessThan(h);
    }
  });

  it('rejects trajectories that disappear immediately behind the mountain', () => {
    for (const [width, height, desktop] of [
      [1440, 810, true], [390, 844, false], [1000, 720, true],
    ] as const) {
      const rng = seeded(2026);
      let accepted = 0;
      for (let i = 0; i < 500; i++) {
        const route = createMeteorRoute(width, height, desktop, rng);
        if (!route) continue;
        accepted++;
        const direction = {x: route.dx / route.travel, y: route.dy / route.travel};
        const hit = firstMountainContact({x: route.x, y: route.y},
          direction, route.travel, width, height);
        expect(route.visibleTravel).toBeGreaterThanOrEqual(
          desktop ? Math.min(270, width * .24) : Math.min(125, width * .33),
        );
        expect(route.travel).toBeGreaterThan(0);
        expect(route.speed).toBeGreaterThanOrEqual(desktop ? 220 : 160);
        expect(route.speed).toBeLessThanOrEqual(desktop ? 285 : 210);
        if (hit !== null) expect(hit).toBeGreaterThan(0);
      }
      expect(accepted).toBeGreaterThan(350);
    }
  });

  it('uses no page title, tag or scroll geometry', () => {
    const a = createMeteorRoute(1440, 810, true, seeded(44));
    const b = createMeteorRoute(1440, 810, true, seeded(44));
    expect(a).toEqual(b);
  });
});
