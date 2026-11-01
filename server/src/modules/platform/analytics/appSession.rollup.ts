import { Types } from 'mongoose';
import { AppSessionModel } from './appSession.model';
import type { AppEventPlatform } from './appEvent.model';

/** The fields of a stored event the session rollup reads. */
export interface RollupEvent {
  session_id: string;
  device_id: string;
  user_id: Types.ObjectId | null;
  event_name: string;
  platform: AppEventPlatform;
  app_version: string;
  os_version: string;
  device_type: string;
  screen_name: string;
  occurred_at: Date;
}

interface ScreenAt {
  screen: string;
  at: Date;
}

/** What one batch adds to one session. */
export interface SessionDelta {
  session_id: string;
  device_id: string;
  user_id: Types.ObjectId | null;
  platform: AppEventPlatform;
  app_version: string;
  os_version: string;
  device_type: string;
  first: Date;
  last: Date;
  events: number;
  screen_views: number;
  clicks: number;
  /** The batch's earliest and latest screen views — the session's entry and exit unless it already has earlier/later ones. */
  entry: ScreenAt | null;
  exit: ScreenAt | null;
}

const SCREEN_VIEW = 'screen_view';
const ELEMENT_CLICK = 'element_click';

function emptyDelta(event: RollupEvent): SessionDelta {
  return {
    session_id: event.session_id,
    device_id: event.device_id,
    user_id: null,
    platform: '',
    app_version: '',
    os_version: '',
    device_type: '',
    first: event.occurred_at,
    last: event.occurred_at,
    events: 0,
    screen_views: 0,
    clicks: 0,
    entry: null,
    exit: null,
  };
}

function addScreen(delta: SessionDelta, event: RollupEvent): void {
  delta.screen_views += 1;
  const at = { screen: event.screen_name, at: event.occurred_at };
  if (!delta.entry || event.occurred_at < delta.entry.at) delta.entry = at;
  if (!delta.exit || event.occurred_at >= delta.exit.at) delta.exit = at;
}

function addEvent(delta: SessionDelta, event: RollupEvent): void {
  delta.events += 1;
  if (event.occurred_at < delta.first) delta.first = event.occurred_at;
  if (event.occurred_at > delta.last) delta.last = event.occurred_at;
  // The latest non-empty value wins: a member who signs in mid-session owns it from then on.
  delta.user_id = event.user_id ?? delta.user_id;
  delta.platform = event.platform || delta.platform;
  delta.app_version = event.app_version || delta.app_version;
  delta.os_version = event.os_version || delta.os_version;
  delta.device_type = event.device_type || delta.device_type;
  if (event.event_name === SCREEN_VIEW && event.screen_name) addScreen(delta, event);
  if (event.event_name === ELEMENT_CLICK) delta.clicks += 1;
}

/** Groups a batch's newly stored events by session. Events with no session id belong to none. */
export function sessionDeltas(events: readonly RollupEvent[]): SessionDelta[] {
  const bySession = new Map<string, SessionDelta>();
  for (const event of events) {
    if (!event.session_id) continue;
    const delta = bySession.get(event.session_id) ?? emptyDelta(event);
    addEvent(delta, event);
    bySession.set(event.session_id, delta);
  }
  return [...bySession.values()];
}

/** A client value, never read as a field path or an operator inside the update pipeline. */
const lit = (value: unknown) => ({ $literal: value });
const orKeep = (value: string, field: string) => (value ? lit(value) : { $ifNull: [`$${field}`, ''] });
const isUnset = (field: string) => ({ $eq: [{ $ifNull: [`$${field}`, null] }, null] });
const added = (field: string, by: number) => ({ $add: [{ $ifNull: [`$${field}`, 0] }, by] });

function screenFields(at: ScreenAt | null, kind: 'entry' | 'exit') {
  const screen = `${kind}_screen`;
  const time = `${kind}_at`;
  if (!at) return { [screen]: { $ifNull: [`$${screen}`, ''] }, [time]: { $ifNull: [`$${time}`, null] } };
  const beats = kind === 'entry' ? { $lt: [lit(at.at), `$${time}`] } : { $gte: [lit(at.at), `$${time}`] };
  const wins = { $or: [isUnset(time), beats] };
  return {
    [screen]: { $cond: [wins, lit(at.screen), `$${screen}`] },
    [time]: { $cond: [wins, lit(at.at), `$${time}`] },
  };
}

/** The update pipeline that folds one delta into its session — an upsert, so the first batch creates it. */
export function sessionUpdate(delta: SessionDelta) {
  return [
    {
      $set: {
        device_id: { $ifNull: ['$device_id', lit(delta.device_id)] },
        user_id: delta.user_id ? lit(delta.user_id) : { $ifNull: ['$user_id', null] },
        platform: orKeep(delta.platform, 'platform'),
        app_version: orKeep(delta.app_version, 'app_version'),
        os_version: orKeep(delta.os_version, 'os_version'),
        device_type: orKeep(delta.device_type, 'device_type'),
        started_at: { $min: [{ $ifNull: ['$started_at', lit(delta.first)] }, lit(delta.first)] },
        ended_at: { $max: [{ $ifNull: ['$ended_at', lit(delta.last)] }, lit(delta.last)] },
        events: added('events', delta.events),
        screen_views: added('screen_views', delta.screen_views),
        clicks: added('clicks', delta.clicks),
        ...screenFields(delta.entry, 'entry'),
        ...screenFields(delta.exit, 'exit'),
        created_at: { $ifNull: ['$created_at', '$$NOW'] },
        updated_at: '$$NOW',
      },
    },
    { $set: { duration_ms: { $subtract: ['$ended_at', '$started_at'] } } },
  ];
}

/** Folds a batch's newly stored events into their sessions. */
export async function rollUpSessions(events: readonly RollupEvent[]): Promise<void> {
  const deltas = sessionDeltas(events);
  if (deltas.length === 0) return;
  await AppSessionModel.bulkWrite(
    // The pipeline stamps created_at / updated_at itself; mongoose's own stamping is for plain updates.
    deltas.map((delta) => ({
      updateOne: {
        filter: { session_id: delta.session_id },
        update: sessionUpdate(delta),
        upsert: true,
        timestamps: false,
      },
    })),
    { ordered: false }
  );
}
