import { createMeteorRoute, type MeteorRoute } from './meteor-path';

/** Same UTC-based timetable for every visitor. Primary meteors 6–18s apart.
 * 13% of slots also have a nearby second meteor on desktop.
 * Reloading or changing page doesn't restart the event or route.
 */
const SLOT_MS = 12_000;
const JITTER_MS = 3_000;

export function meteorSample(slot: number, salt: number): number {
  let v = (slot ^ salt) >>> 0;
  v = Math.imul(v ^ (v >>> 16), 0x7feb352d);
  v = Math.imul(v ^ (v >>> 15), 0x846ca68b);
  return ((v ^ (v >>> 16)) >>> 0) / 0x1_0000_0000;
}

export function meteorSlotHasBurst(slot: number): boolean {
  return meteorSample(slot, 0x6f4c) < .13;
}

export interface MeteorEvent {
  id: number;
  startsAt: number;
  endsAt: number;
  durationMs: number;
  route: MeteorRoute;
  brightness: number;
  height: number;
  textureVariant: number;
  burst: boolean;
}

export function meteorEventForSlot(
  slot: number, width: number, height: number, desktop: boolean, burst = false,
): MeteorEvent | null {
  if (burst && (!desktop || !meteorSlotHasBurst(slot))) return null;
  const primaryStart = slot * SLOT_MS
    + Math.round((meteorSample(slot, 0x4271) * 2 - 1) * JITTER_MS);
  const startsAt = primaryStart + (burst
    ? 400 + Math.round(meteorSample(slot, 0x14ab) * 600) : 0);
  const id = slot * 2 + (burst ? 1 : 0);
  let seed = (Math.imul(slot, 0x9e3779b1) ^ (burst ? 0x6a09e667 : 0x3c6ef372)) >>> 0;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x1_0000_0000;
  };
  const route = createMeteorRoute(width, height, desktop, random);
  if (!route) return null;
  const brightnessRoll = random();
  const brightness = brightnessRoll < .45 ? .18 + random() * .24
    : brightnessRoll < .85 ? .43 + random() * .29 : .73 + random() * .25;
  const durationMs = Math.round(route.travel / route.speed * 1000);
  return {
    id, startsAt, endsAt: startsAt + durationMs, durationMs, route,
    brightness, height: 11.5 + random() * 5.5,
    textureVariant: Math.floor(random() * 16), burst,
  };
}

/** Guaranteed deterministic capacity: no event appears halfway through just
 * because an earlier overlapping meteor happened to finish.
 */
export function getMeteorState(
  nowMs: number, width: number, height: number, desktop: boolean,
): { active: MeteorEvent[]; next: MeteorEvent } {
  const slot = Math.floor(nowMs / SLOT_MS);
  const capacity = desktop ? 2 : 1;
  const events: MeteorEvent[] = [];
  for (let offset = -10; offset <= 10; offset++) {
    const s = slot + offset;
    const first = meteorEventForSlot(s, width, height, desktop);
    if (first) events.push(first);
    if (desktop) {
      const second = meteorEventForSlot(s, width, height, true, true);
      if (second) events.push(second);
    }
  }
  events.sort((a, b) => a.startsAt - b.startsAt || a.id - b.id);

  const accepted: MeteorEvent[] = [];
  for (const event of events) {
    let occupied = 0;
    for (let i = accepted.length - 1; i >= 0; i--) {
      const previous = accepted[i];
      if (previous.startsAt <= event.startsAt && previous.endsAt > event.startsAt) {
        occupied++;
      }
      if (occupied >= capacity) break;
    }
    if (occupied < capacity) accepted.push(event);
  }

  const active = accepted.filter(event => event.startsAt <= nowMs && nowMs < event.endsAt);
  const next = accepted.find(event => event.startsAt > nowMs);
  if (!next) throw new Error('Expected an upcoming scheduled meteor');
  return { active, next };
}
