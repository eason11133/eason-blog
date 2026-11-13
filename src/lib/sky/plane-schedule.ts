/**
 * A shared, seeded (random-looking) wall-clock flight timetable.
 * 95-second slots with +/-42.5s jitter guarantee gaps of 10–180 seconds.
 * Events continue when no browser tab is open, just like the aurora timetable.
 */
const SLOT_MS = 95_000;
const JITTER_MS = 42_500;

export function planeSample(slot: number, salt: number): number {
  let value = (slot ^ salt) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  value = (value ^ (value >>> 16)) >>> 0;
  return value / 0x1_0000_0000;
}

export interface PlaneEvent {
  id: number;
  startsAt: number;
  endsAt: number;
  durationMs: number;
  fromLeft: boolean;
  yFraction: number;
  dyFraction: number;
  sizeFactor: number;
  opacity: number;
  trailFactor: number;
  trailOpacity: number;
  blinkSeconds: number;
}

export function planeEventForSlot(slot: number): PlaneEvent {
  const startsAt = slot * SLOT_MS + Math.round((planeSample(slot, 0x4271) * 2 - 1) * JITTER_MS);
  const durationMs = 15_000 + Math.round(planeSample(slot, 0x38ac) * 15_000);
  return {
    id: slot,
    startsAt,
    endsAt: startsAt + durationMs,
    durationMs,
    fromLeft: planeSample(slot, 0x51bd) < .5,
    yFraction: .14 + planeSample(slot, 0x67d1) * .43,
    dyFraction: (planeSample(slot, 0x7ac5) * 2 - 1) * .07,
    sizeFactor: planeSample(slot, 0x2b16),
    opacity: .58 + planeSample(slot, 0x5e44) * .30,
    trailFactor: planeSample(slot, 0x6cc2),
    trailOpacity: .25 + planeSample(slot, 0x19af) * .20,
    blinkSeconds: .85 + planeSample(slot, 0x3813) * 1.35,
  };
}

export function getPlaneState(nowMs: number = Date.now()): {
  active: PlaneEvent[];
  next: PlaneEvent;
} {
  const slot = Math.floor(nowMs / SLOT_MS);
  const events = [-2, -1, 0, 1, 2].map((offset) => planeEventForSlot(slot + offset));
  const active = events.filter((event) => event.startsAt <= nowMs && nowMs < event.endsAt);
  const next = events.find((event) => event.startsAt > nowMs);
  if (!next) throw new Error('Expected an upcoming airplane flight');
  return { active, next };
}
