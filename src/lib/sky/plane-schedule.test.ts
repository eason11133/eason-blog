import { describe, expect, it } from 'vitest';
import { getPlaneState, planeEventForSlot } from './plane-schedule';

describe('shared clock-based random airplane flights', () => {
  it('spaces flights randomly-looking between 10 seconds and 3 minutes', () => {
    let hasQuickOverlap = false;
    for (let id = 18_000_000; id < 18_010_000; id++) {
      const event = planeEventForSlot(id);
      const next = planeEventForSlot(id + 1);
      const gap = next.startsAt - event.startsAt;
      expect(gap).toBeGreaterThanOrEqual(10_000);
      expect(gap).toBeLessThanOrEqual(180_000);
      expect(event.durationMs).toBeGreaterThanOrEqual(15_000);
      expect(event.durationMs).toBeLessThanOrEqual(30_000);
      if (gap < event.durationMs) hasQuickOverlap = true;
    }
    expect(hasQuickOverlap).toBe(true);
  });

  it('shows simultaneous planes and advances even when the site was closed', () => {
    let overlap = 18_000_000;
    while (planeEventForSlot(overlap + 1).startsAt >= planeEventForSlot(overlap).endsAt) overlap++;
    const start = planeEventForSlot(overlap + 1).startsAt;
    const state = getPlaneState(start + 10);
    expect(state.active.some((event) => event.id === overlap)).toBe(true);
    expect(state.active.some((event) => event.id === overlap + 1)).toBe(true);
    expect(getPlaneState(start + 10)).toEqual(state);
  });

  it('shows a plane halfway through its scheduled crossing', () => {
    const event = planeEventForSlot(18_000_000);
    expect(getPlaneState(event.startsAt + 5_000).active.some((plane) => plane.id === event.id)).toBe(true);
    expect(getPlaneState(event.endsAt).active.some((plane) => plane.id === event.id)).toBe(false);
  });
});
