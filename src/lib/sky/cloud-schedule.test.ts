import { describe, expect, it } from 'vitest';
import {
  cloudEventForSlot, cloudWeatherForSlot, getCloudState, getCloudWeather,
} from './cloud-schedule';

describe('random-looking but synchronized night cloudiness', () => {
  it('switches weather about every 3–8 minutes and yields all three states', () => {
    const counts = { sparse: 0, normal: 0, many: 0 };
    for (let slot = 900_000; slot < 902_000; slot++) {
      const a = cloudWeatherForSlot(slot);
      const b = cloudWeatherForSlot(slot + 1);
      expect(b.startsAt - a.startsAt).toBeGreaterThanOrEqual(180_000);
      expect(b.startsAt - a.startsAt).toBeLessThanOrEqual(480_000);
      counts[a.mode]++;
      expect(getCloudWeather(a.startsAt).id).toBe(a.id);
      expect(getCloudWeather(b.startsAt - 1).id).toBe(a.id);
    }
    for (const count of Object.values(counts)) expect(count).toBeGreaterThan(350);
  });

  it('keeps cloud trajectories deterministic across page loads', () => {
    for (let slot = 19_000_000; slot < 19_001_000; slot++) {
      const event = cloudEventForSlot(slot);
      expect(event).toEqual(cloudEventForSlot(slot));
      if (!event) continue;
      expect(event.durationMs).toBeGreaterThanOrEqual(140_000);
      expect(event.durationMs).toBeLessThanOrEqual(165_000);
      const now = event.startsAt + 8_000;
      expect(getCloudState(now).active.some(cloud => cloud.id === slot)).toBe(true);
    }
  });

  it('produces sparse, normal and many-cloud periods in the right order', () => {
    const total = { sparse: 0, normal: 0, many: 0 };
    const accepted = { sparse: 0, normal: 0, many: 0 };
    for (let slot = 19_000_000; slot < 19_100_000; slot++) {
      const weather = getCloudWeather(slot * 12_000);
      total[weather.mode]++;
      if (cloudEventForSlot(slot)) accepted[weather.mode]++;
    }
    const sparseRate = accepted.sparse / total.sparse;
    const normalRate = accepted.normal / total.normal;
    const manyRate = accepted.many / total.many;
    expect(sparseRate).toBeLessThan(normalRate);
    expect(normalRate).toBeLessThan(manyRate);
    expect(sparseRate).toBeGreaterThan(.2);
    expect(manyRate).toBeGreaterThan(.65);
  });

  it('always provides a future event, even during sparse weather', () => {
    for (let i = 0; i < 2_000; i++) {
      const now = 1_950_000_000_000 + i * 65_000;
      const state = getCloudState(now);
      expect(state.next.startsAt).toBeGreaterThan(now);
      expect(state.active.every(cloud => cloud.startsAt <= now && now < cloud.endsAt)).toBe(true);
      expect(state).toEqual(getCloudState(now));
    }
  });
});
