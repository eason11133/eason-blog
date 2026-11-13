import { describe, expect, it } from 'vitest';
import { auroraEventForSlot, getAuroraState } from './aurora-schedule';

describe('shared wall-clock aurora schedule', () => {
  it('always creates 20–40 second events approximately 5–12 minutes apart', () => {
    for (let slot = 3_500_000; slot < 3_501_000; slot++) {
      const a = auroraEventForSlot(slot);
      const b = auroraEventForSlot(slot + 1);
      expect(a.durationMs).toBeGreaterThanOrEqual(20_000);
      expect(a.durationMs).toBeLessThanOrEqual(40_000);
      expect(a.strength).toBeGreaterThanOrEqual(.18);
      expect(a.strength).toBeLessThanOrEqual(.60);
      expect(b.startsAt - a.startsAt).toBeGreaterThanOrEqual(5 * 60_000);
      expect(b.startsAt - a.startsAt).toBeLessThanOrEqual(12 * 60_000);
    }
  });

  it('agrees across independent viewers and catches an already-started event', () => {
    const event = auroraEventForSlot(3_500_000);
    const when = event.startsAt + 10_000;
    expect(getAuroraState(when)).toEqual(getAuroraState(when));
    expect(getAuroraState(when).active?.id).toBe(event.id);
    expect(getAuroraState(event.endsAt).active).toBeNull();
  });

  it('finds the next event without depending on when the webpage was opened', () => {
    const event = auroraEventForSlot(3_500_000);
    const before = getAuroraState(event.startsAt - 30_000);
    expect(before.next.id).toBe(event.id);
    const after = getAuroraState(event.endsAt + 1000);
    expect(after.next.id).toBe(event.id + 1);
  });
});
