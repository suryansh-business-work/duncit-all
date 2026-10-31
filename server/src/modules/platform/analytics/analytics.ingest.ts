import { Types } from 'mongoose';
import { AppEventModel, type AppEventPlatform, type AppEventType } from './appEvent.model';
import { rollUpSessions } from './appSession.rollup';
import { redactText, safeProperties } from './analytics.privacy';
import type { ProductEventDTO } from './analytics.validator';

/**
 * Stores a batch of product-analytics events from mWeb or the native app.
 *
 * Every event carries a client-made id, and a batch is stored with one upsert
 * per (device, client id): a batch resent after a dropped answer stores nothing
 * twice, and only the events that were actually new reach the session rollup.
 */

const MINUTE_MS = 60_000;
/** A device clock a few minutes ahead is normal; further ahead, the event is stamped now. */
const MAX_CLOCK_AHEAD_MS = 5 * MINUTE_MS;
/** A queue held offline is flushed when the app comes back; past a week it is a replay, not a backlog. */
const MAX_EVENT_AGE_MS = 7 * 24 * 60 * MINUTE_MS;
/** Foreground time past six hours on one screen is a clock jump, not a reading. */
const MAX_DURATION_MS = 6 * 60 * MINUTE_MS;

const EVENT_TYPE_OF: Readonly<Record<string, AppEventType>> = {
  screen_view: 'PAGE_VIEW',
  element_click: 'CLICK',
  element_impression: 'IMPRESSION',
};

export interface IngestArgs {
  events: readonly ProductEventDTO[];
  user_id: string | null;
  device_id: string | null;
  now?: Date;
}

/** When the event happened, by the device's clock within reason; null when it is too old to store. */
export function eventTime(sent: string, now: Date): Date | null {
  const at = new Date(sent);
  if (Number.isNaN(at.getTime()) || at.getTime() > now.getTime() + MAX_CLOCK_AHEAD_MS) return now;
  return now.getTime() - at.getTime() > MAX_EVENT_AGE_MS ? null : at;
}

const durationOf = (ms: number | null | undefined) =>
  typeof ms === 'number' && ms >= 0 && ms <= MAX_DURATION_MS ? Math.round(ms) : null;

const objectIdOrNull = (id: string | null | undefined) =>
  id && Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null;

/** The stored document for one event — redacted, clamped and stamped with the caller's identity. */
export function eventDocument(event: ProductEventDTO, identity: { device_id: string; user_id: Types.ObjectId | null }, at: Date) {
  return {
    user_id: identity.user_id,
    device_id: identity.device_id,
    event_type: EVENT_TYPE_OF[event.event_name] ?? 'EVENT',
    event_name: event.event_name,
    client_event_id: event.client_event_id,
    session_id: event.session_id,
    platform: (event.platform ?? '') as AppEventPlatform,
    app_version: event.app_version ?? '',
    os_version: event.os_version ?? '',
    device_type: event.device_type ?? '',
    screen_name: event.screen_name ?? '',
    previous_screen: event.previous_screen ?? '',
    path: event.path ?? '',
    route: event.path ?? '',
    title: redactText(event.title, 180),
    element_id: event.element_id ?? '',
    element_type: event.element_type ?? '',
    target_label: redactText(event.element_name, 180),
    target_text: redactText(event.element_text, 240),
    target_href: event.target_href ?? '',
    duration_ms: durationOf(event.duration_ms),
    super_category_slug: event.super_category_slug ? event.super_category_slug.toLowerCase() : null,
    pod_id: objectIdOrNull(event.pod_id),
    metadata: safeProperties(event.properties_json),
    occurred_at: at,
  };
}

type EventDocument = ReturnType<typeof eventDocument>;

/** The documents worth storing, each with its time checked; stale ones are dropped. */
function documentsOf(args: IngestArgs, identity: { device_id: string; user_id: Types.ObjectId | null }): EventDocument[] {
  const now = args.now ?? new Date();
  return args.events.flatMap((event) => {
    const at = eventTime(event.occurred_at, now);
    return at ? [eventDocument(event, identity, at)] : [];
  });
}

/** Stores the batch; answers how many of its events were new. */
export async function ingestProductEvents(args: IngestArgs): Promise<{ stored: number; latest: EventDocument | null }> {
  const userId = objectIdOrNull(args.user_id);
  const deviceId = (args.device_id || (userId ? `user:${String(userId)}` : '')).trim().slice(0, 100);
  if (!deviceId) return { stored: 0, latest: null };
  const docs = documentsOf(args, { device_id: deviceId, user_id: userId });
  if (docs.length === 0) return { stored: 0, latest: null };

  const result = await AppEventModel.bulkWrite(
    docs.map((doc) => ({
      updateOne: {
        filter: { device_id: doc.device_id, client_event_id: doc.client_event_id },
        update: { $setOnInsert: doc },
        upsert: true,
      },
    })),
    { ordered: false }
  );
  const fresh = Object.keys(result.upsertedIds ?? {}).map((index) => docs[Number(index)]);
  await rollUpSessions(fresh);
  const latest = docs.reduce((last, doc) => (doc.occurred_at >= last.occurred_at ? doc : last), docs[0]);
  return { stored: fresh.length, latest };
}
