import { describe, expect, it } from 'vitest';
import { cloudEventForSlot, getCloudState } from './cloud-schedule';

describe('wall-clock cloud schedule', () => {
  it('creates repeatable cloud events 25–45s apart with 140–165s crossings', () => {
    for (let slot = 51_000_000; slot < 51_010_000; slot++) {
      const a = cloudEventForSlot(slot);
      const b = cloudEventForSlot(slot + 1);
      expect(b.startsAt - a.startsAt).toBeGreaterThanOrEqual(25_000);
      expect(b.startsAt - a.startsAt).toBeLessThanOrEqual(45_000);
      expect(a.durationMs).toBeGreaterThanOrEqual(140_000);
      expect(a.durationMs).toBeLessThanOrEqual(165_000);
    }
  });

  it('calculates the same live clouds for visitors who open at the same time', () => {
    const start = cloudEventForSlot(51_000_000).startsAt;
    const time = start + 65_000;
    expect(getCloudState(time)).toEqual(getCloudState(time));
    expect(getCloudState(time).active.some((cloud) => cloud.id === 51_000_000)).toBe(true);
  });

  it('always keeps cloud events in flight, independent of page-open time', () => {
    for (let slot = 51_000_000; slot < 51_002_000; slot++) {
      const event = cloudEventForSlot(slot);
      for (let offset = 0; offset <= 32_000; offset += 8_000) {
        const state = getCloudState(event.startsAt + offset);
        expect(state.active.length).toBeGreaterThanOrEqual(2);
        expect(state.next.startsAt).toBeGreaterThan(event.startsAt + offset);
      }
    }
  });
});
