/**
 * One deterministic UTC-based aurora timetable, shared by every visitor.
 * No server, storage or continuously open tab is needed; Date.now() selects
 * the same event for everyone, including visitors arriving halfway through.
 *
 * Events are approximately 5–12 minutes apart:
 * 8.5-minute slots with ±1.5-minute independently seeded offsets.
 */
const SLOT_MS = 8.5 * 60_000;
const JITTER_MS = 90_000;

// Fast deterministic 32-bit integer hash (not a random-number source).
function sample(slot: number, salt: number): number {
  let value = (slot ^ salt) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  value = (value ^ (value >>> 16)) >>> 0;
  return value / 0x1_0000_0000;
}

export interface AuroraEvent {
  id: number;
  startsAt: number;
  endsAt: number;
  durationMs: number;
  strength: number;
}

export function auroraEventForSlot(slot: number): AuroraEvent {
  const startsAt = slot * SLOT_MS + Math.round((sample(slot, 0x1f38) * 2 - 1) * JITTER_MS);
  const durationMs = 20_000 + Math.round(sample(slot, 0x6a47) * 20_000);
  const brightnessRoll = sample(slot, 0x13bf);
  const brightnessSeed = sample(slot, 0x7b91);
  // Gentle through clearly visible, excluding the strongest reference range.
  const strength = brightnessRoll < .15
    ? .18 + brightnessSeed * .10
    : brightnessRoll < .85
      ? .29 + brightnessSeed * .18
      : .47 + brightnessSeed * .13;

  return { id: slot, startsAt, endsAt: startsAt + durationMs, durationMs, strength };
}

export function getAuroraState(nowMs: number = Date.now()): {
  active: AuroraEvent | null;
  next: AuroraEvent;
} {
  const slot = Math.floor(nowMs / SLOT_MS);
  // Include the previous slot for entries during an active event near a boundary.
  const events = [
    auroraEventForSlot(slot - 1),
    auroraEventForSlot(slot),
    auroraEventForSlot(slot + 1),
    auroraEventForSlot(slot + 2),
  ];
  const active = events.find((event) => event.startsAt <= nowMs && nowMs < event.endsAt) ?? null;
  const next = events.find((event) => event.startsAt > nowMs);
  if (!next) throw new Error('Expected an upcoming aurora slot');
  return { active, next };
}
