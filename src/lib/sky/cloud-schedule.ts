/**
 * Cloud events follow one shared wall-clock timeline, just like flights and
 * auroras. Opening a tab late joins an event at its current animation offset.
 *
 * Fixed 35s slots with independently seeded ±5s offsets: every 25–45s.
 * Each cloud drifts for 140–165s, so the sky remains gently populated.
 */
const SLOT_MS = 35_000;
const JITTER_MS = 5_000;

function sample(slot: number, salt: number): number {
  let v = (slot ^ salt) >>> 0;
  v = Math.imul(v ^ (v >>> 16), 0x7feb352d);
  v = Math.imul(v ^ (v >>> 15), 0x846ca68b);
  v = (v ^ (v >>> 16)) >>> 0;
  return v / 0x1_0000_0000;
}

export interface CloudEvent {
  id: number;
  startsAt: number;
  endsAt: number;
  durationMs: number;
  fromLeft: boolean;
  isCirrus: boolean;
  widthFactor: number;
  yFraction: number;
  dyFraction: number;
  opacity: number;
}

export function cloudEventForSlot(slot: number): CloudEvent {
  const startsAt = slot * SLOT_MS + Math.round((sample(slot, 0x2bc3) * 2 - 1) * JITTER_MS);
  const durationMs = 140_000 + Math.round(sample(slot, 0x5a74) * 25_000);
  const isCirrus = sample(slot, 0x1c35) < .66;
  const yFraction = isCirrus
    ? .16 + sample(slot, 0x349f) * .38
    : .52 + sample(slot, 0x349f) * .21;

  return {
    id: slot,
    startsAt,
    endsAt: startsAt + durationMs,
    durationMs,
    fromLeft: sample(slot, 0x615b) < .5,
    isCirrus,
    widthFactor: sample(slot, 0x85df),
    yFraction,
    dyFraction: (sample(slot, 0x1739) * 2 - 1) * .025,
    opacity: .42 + sample(slot, 0x713d) * .22,
  };
}

export function getCloudState(nowMs: number = Date.now()): {
  active: CloudEvent[];
  next: CloudEvent;
} {
  const slot = Math.floor(nowMs / SLOT_MS);
  // Enough past slots to find every cloud still crossing the viewport.
  const events = Array.from({ length: 10 }, (_, i) => cloudEventForSlot(slot - 6 + i));
  const active = events.filter((event) => event.startsAt <= nowMs && nowMs < event.endsAt);
  const next = events.find((event) => event.startsAt > nowMs);
  if (!next) throw new Error('Expected a future cloud event');
  return { active, next };
}
