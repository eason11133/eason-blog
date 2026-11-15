import { describe, expect, it } from 'vitest';
import { getPlaneState, planeEventForSlot } from './plane-schedule';

describe('five clock-synced airplane streams', () => {
  it('gives five different reproducible flight times', () => {
    const flights = Array.from({ length: 5 }, (_, stream) => planeEventForSlot(18_000_000, stream));
    expect(new Set(flights.map(event => event.id)).size).toBe(5);
    expect(new Set(flights.map(event => event.startsAt)).size).toBe(5);
    expect(flights).toEqual(Array.from({ length: 5 }, (_, stream) => planeEventForSlot(18_000_000, stream)));
    for (const flight of flights) {
      expect(flight.durationMs).toBeGreaterThanOrEqual(24_000);
      expect(flight.durationMs).toBeLessThanOrEqual(39_000);
    }
  });
  it('allows overlap but never draws more than three simultaneous planes', () => {
    let hasTwo = false;
    for (let i = 0; i < 5000; i++) {
      const state = getPlaneState(2_610_000_000_000 + i * 17_000);
      expect(state.active.length).toBeLessThanOrEqual(3);
      hasTwo = hasTwo || state.active.length >= 2;
    }
    expect(hasTwo).toBe(true);
  });
  it('joins an ongoing flight mid-way without restarting it', () => {
    const flight = planeEventForSlot(18_000_000, 4);
    const now = flight.startsAt + 1_000;
    expect(getPlaneState(now).active.some(event => event.id === flight.id)).toBe(true);
    expect(getPlaneState(now)).toEqual(getPlaneState(now));
  });
  it('always provides the next future plane for the footer countdown', () => {
    const now = 2_610_000_000_000;
    const next = getPlaneState(now).next;
    expect(next.startsAt).toBeGreaterThan(now);
    expect(getPlaneState(next.startsAt + 100).next.startsAt).toBeGreaterThan(next.startsAt);
  });
});
