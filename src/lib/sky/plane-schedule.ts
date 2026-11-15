/** Five independent, seeded, wall-clock airplane streams.
 * They may overlap but render at most three aircraft simultaneously.
 * Dates and appearances never depend on when a visitor opens the page.
 */
const SLOT_MS = 145_000;
const JITTER_MS = 40_000;
const STREAM_COUNT = 5;
const MAX_VISIBLE = 3;

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

export function planeEventForSlot(slot: number, stream = 0): PlaneEvent {
  if (!Number.isInteger(stream) || stream < 0 || stream >= STREAM_COUNT) {
    throw new RangeError('Invalid airplane stream');
  }
  const roll = (salt: number) => planeSample(
    slot + Math.imul(stream + 1, 0x76543), salt + stream * 0x2f5a,
  );
  const startsAt = slot * SLOT_MS + stream * (SLOT_MS / STREAM_COUNT)
    + Math.round((roll(0x4271) * 2 - 1) * JITTER_MS);
  const durationMs = 24_000 + Math.round(roll(0x38ac) * 15_000);
  return {
    id: slot * STREAM_COUNT + stream,
    startsAt,
    endsAt: startsAt + durationMs,
    durationMs,
    fromLeft: roll(0x51bd) < .5,
    yFraction: .14 + roll(0x67d1) * .43,
    dyFraction: (roll(0x7ac5) * 2 - 1) * .07,
    sizeFactor: roll(0x2b16),
    opacity: .58 + roll(0x5e44) * .30,
    trailFactor: roll(0x6cc2),
    trailOpacity: .25 + roll(0x19af) * .20,
    blinkSeconds: .85 + roll(0x3813) * 1.35,
  };
}

export function getPlaneState(nowMs: number = Date.now()): {
  active: PlaneEvent[];
  next: PlaneEvent;
} {
  const slot = Math.floor(nowMs / SLOT_MS);
  const events: PlaneEvent[] = [];
  for (let offset = -2; offset <= 2; offset++) {
    for (let stream = 0; stream < STREAM_COUNT; stream++) {
      events.push(planeEventForSlot(slot + offset, stream));
    }
  }
  const active = events
    .filter(event => event.startsAt <= nowMs && nowMs < event.endsAt)
    .sort((a, b) => a.startsAt - b.startsAt || a.id - b.id)
    .slice(0, MAX_VISIBLE);
  const next = events
    .filter(event => event.startsAt > nowMs)
    .sort((a, b) => a.startsAt - b.startsAt || a.id - b.id)[0];
  if (!next) throw new Error('Expected an upcoming airplane flight');
  return { active, next };
}
