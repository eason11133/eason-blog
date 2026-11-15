import { describe, expect, it } from 'vitest';
import { getMeteorState, meteorEventForSlot, meteorSlotHasBurst } from './meteor-schedule';

describe('synchronized meteor flights', () => {
  it('has seeded 6–18 second primary slots', () => {
    let checked = 0;
    for (let s = 146_000_000; s < 146_000_300; s++) {
      const a = meteorEventForSlot(s, 1440, 810, true);
      const b = meteorEventForSlot(s + 1, 1440, 810, true);
      if (!a || !b) continue;
      checked++;
      expect(b.startsAt - a.startsAt).toBeGreaterThanOrEqual(6_000);
      expect(b.startsAt - a.startsAt).toBeLessThanOrEqual(18_000);
      expect(a).toEqual(meteorEventForSlot(s, 1440, 810, true));
    }
    expect(checked).toBeGreaterThan(245);
  });

  it('has deterministic occasional desktop double flashes', () => {
    let pairs = 0;
    for (let s = 146_000_000; s < 146_001_000; s++) {
      if (!meteorSlotHasBurst(s)) continue;
      const a = meteorEventForSlot(s, 1440, 810, true);
      const b = meteorEventForSlot(s, 1440, 810, true, true);
      if (!a || !b) continue;
      pairs++;
      expect(b.startsAt - a.startsAt).toBeGreaterThanOrEqual(400);
      expect(b.startsAt - a.startsAt).toBeLessThanOrEqual(1000);
      expect(meteorEventForSlot(s, 390, 844, false, true)).toBeNull();
    }
    expect(pairs).toBeGreaterThan(65);
    expect(pairs).toBeLessThan(190);
  });

  it('restores exactly the same moment for independent visitors', () => {
    for (const [w, h, desktop] of [
      [1440, 810, true], [390, 844, false], [1920, 1080, true],
    ] as const) {
      for (let i = 0; i < 100; i++) {
        const now = 1_790_000_000_000 + i * 7300;
        const state = getMeteorState(now, w, h, desktop);
        expect(state).toEqual(getMeteorState(now, w, h, desktop));
        expect(state.active.length).toBeLessThanOrEqual(desktop ? 2 : 1);
        expect(state.next.startsAt).toBeGreaterThan(now);
        for (const event of state.active) {
          expect(event.startsAt).toBeLessThanOrEqual(now);
          expect(event.endsAt).toBeGreaterThan(now);
        }
      }
    }
  });

  it('keeps existing flight ids and paths when a visitor joins mid-flight', () => {
    for (let i = 0; i < 100; i++) {
      const now = 1_790_000_000_000 + i * 11_000;
      const state = getMeteorState(now, 1440, 810, true);
      if (!state.active.length) continue;
      const event = state.active[0];
      const later = Math.min(event.endsAt - 1, now + 100);
      expect(getMeteorState(later, 1440, 810, true).active
        .some(x => x.id === event.id)).toBe(true);
      return;
    }
    throw new Error('Could not find an active test meteor');
  });
});
