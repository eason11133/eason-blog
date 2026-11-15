/**
 * Three deterministic cloudiness states shared by every visitor:
 * sparse 25%, normal 50%, many 25%. Boundaries change every 3–8 min.
 * Individual clouds persist across weather changes for smooth transitions.
 *
 * All scheduling uses absolute UTC timestamps: no page-open restarts.
 * Each accepted cloud gets a small, pre-rendered canvas and CSS movement.
 */
const WEATHER_SLOT_MS = 330_000; // 5.5 min
const WEATHER_JITTER_MS = 75_000; // 3–8 min between boundaries
const CLOUD_SLOT_MS = 12_000;
const CLOUD_JITTER_MS = 2_000;

function sample(slot: number, salt: number): number {
  let v = (slot ^ salt) >>> 0;
  v = Math.imul(v ^ (v >>> 16), 0x7feb352d);
  v = Math.imul(v ^ (v >>> 15), 0x846ca68b);
  v = (v ^ (v >>> 16)) >>> 0;
  return v / 0x1_0000_0000;
}

export type CloudWeatherMode = 'sparse' | 'normal' | 'many';

export interface CloudWeather {
  id: number;
  startsAt: number;
  mode: CloudWeatherMode;
  preferredBand: 'high' | 'low';
}

export function cloudWeatherForSlot(slot: number): CloudWeather {
  const startsAt = slot * WEATHER_SLOT_MS
    + Math.round((sample(slot, 0x4127) * 2 - 1) * WEATHER_JITTER_MS);
  const roll = sample(slot, 0x92ac);
  const mode: CloudWeatherMode = roll < .25 ? 'sparse'
    : roll < .75 ? 'normal' : 'many';
  return {
    id: slot,
    startsAt,
    mode,
    preferredBand: sample(slot, 0x28b1) < .5 ? 'high' : 'low',
  };
}

export function getCloudWeather(nowMs: number = Date.now()): CloudWeather {
  const slot = Math.floor(nowMs / WEATHER_SLOT_MS);
  // A jittered weather interval may start before its nominal slot boundary.
  // Check the next slot first so early transitions aren't delayed.
  const upcoming = cloudWeatherForSlot(slot + 1);
  if (upcoming.startsAt <= nowMs) return upcoming;
  const current = cloudWeatherForSlot(slot);
  return current.startsAt <= nowMs ? current : cloudWeatherForSlot(slot - 1);
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

/** A candidate slot may be skipped based on the cloudiness at its start. */
export function cloudEventForSlot(slot: number): CloudEvent | null {
  const startsAt = slot * CLOUD_SLOT_MS
    + Math.round((sample(slot, 0x2bc3) * 2 - 1) * CLOUD_JITTER_MS);
  const weather = getCloudWeather(startsAt);
  const frequency = weather.mode === 'sparse' ? .28
    : weather.mode === 'normal' ? .51 : .75;
  if (sample(slot, 0x728d) >= frequency) return null;
  const durationMs = 140_000 + Math.round(sample(slot, 0x5a74) * 25_000);
  const cirrusProbability = weather.mode === 'many'
    ? (weather.preferredBand === 'high' ? .76 : .42)
    : .66;
  const isCirrus = sample(slot, 0x1c35) < cirrusProbability;
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
    opacity: .40 + sample(slot, 0x713d) * .22,
  };
}

export function getCloudState(nowMs: number = Date.now()): {
  active: CloudEvent[];
  next: CloudEvent;
} {
  const slot = Math.floor(nowMs / CLOUD_SLOT_MS);
  const active: CloudEvent[] = [];
  let next: CloudEvent | null = null;

  // Every cloud still aloft started in the last 165 seconds. Candidate
  // slots are 12 seconds apart with ±2s jitter; check 16 past slots.
  for (let offset = -16; offset <= 40; offset++) {
    const event = cloudEventForSlot(slot + offset);
    if (!event) continue;
    if (event.startsAt <= nowMs && nowMs < event.endsAt) active.push(event);
    if (event.startsAt > nowMs && (!next || event.startsAt < next.startsAt)) {
      next = event;
    }
  }
  // Highly unlikely, but the timetable must never fail after a long empty run.
  if (!next) {
    for (let offset = 41; offset <= 512; offset++) {
      const event = cloudEventForSlot(slot + offset);
      if (event && event.startsAt > nowMs) {
        next = event;
        break;
      }
    }
  }
  if (!next) throw new Error('Expected a future cloud event');
  active.sort((a, b) => a.startsAt - b.startsAt);
  return { active, next };
}
