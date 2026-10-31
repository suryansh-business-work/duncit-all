import { Types } from 'mongoose';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { AppSessionModel, type IAppSession } from '../appSession.model';
import { AppEventModel } from '../appEvent.model';
import { userNames } from '../entity/lookups';
import { sessionMatch, type ProductScope } from './product.filter';
import { toProductEvent } from './product.events';

/**
 * Analytics > Product > Sessions — every app session that began in the period,
 * and one session's events in order.
 *
 * A session is cut on the device after 30 minutes without activity (the
 * `@duncit/user-core` session clock), so its length runs from its first event
 * to its last; a session of one event lasts 0.
 */

const SESSION_TABLE: TableEntityConfig = {
  searchFields: ['session_id', 'entry_screen', 'exit_screen', 'app_version'],
  sortFields: {
    started_at: 'started_at',
    duration_ms: 'duration_ms',
    events: 'events',
    screen_views: 'screen_views',
    clicks: 'clicks',
    platform: 'platform',
    app_version: 'app_version',
  },
  filterFields: {
    user_id: { type: 'string' },
    device_id: { type: 'string' },
    platform: { type: 'enum' },
    app_version: { type: 'string' },
    entry_screen: { type: 'string' },
    exit_screen: { type: 'string' },
    started_at: { type: 'date' },
    duration_ms: { type: 'number' },
    screen_views: { type: 'number' },
  },
  defaultSort: { started_at: -1 },
};

/** At most this many of a session's events come back; a longer session is a robot or a stuck loop. */
const SESSION_EVENT_LIMIT = 1000;

type SessionDoc = Pick<
  IAppSession,
  | 'session_id'
  | 'device_id'
  | 'user_id'
  | 'platform'
  | 'app_version'
  | 'os_version'
  | 'device_type'
  | 'started_at'
  | 'ended_at'
  | 'duration_ms'
  | 'events'
  | 'screen_views'
  | 'clicks'
  | 'entry_screen'
  | 'exit_screen'
>;

function toSession(doc: SessionDoc, names: ReadonlyMap<string, string>) {
  const userId = doc.user_id ? String(doc.user_id) : null;
  return {
    session_id: doc.session_id,
    user_id: userId,
    user_name: userId ? (names.get(userId) ?? null) : null,
    device_id: doc.device_id,
    platform: doc.platform ?? '',
    app_version: doc.app_version ?? '',
    os_version: doc.os_version ?? '',
    device_type: doc.device_type ?? '',
    started_at: doc.started_at.toISOString(),
    ended_at: doc.ended_at.toISOString(),
    duration_ms: doc.duration_ms ?? 0,
    events: doc.events ?? 0,
    screen_views: doc.screen_views ?? 0,
    clicks: doc.clicks ?? 0,
    entry_screen: doc.entry_screen ?? '',
    exit_screen: doc.exit_screen ?? '',
  };
}

const namesOf = (docs: readonly SessionDoc[]) => userNames(docs.flatMap((doc) => (doc.user_id ? [String(doc.user_id)] : [])));

export async function sessionsTable(scope: ProductScope, query: TableQueryInput | null | undefined) {
  const page = await runTableQuery<SessionDoc>(AppSessionModel, sessionMatch(scope), query, SESSION_TABLE);
  const names = await namesOf(page.docs);
  return { rows: page.docs.map((doc) => toSession(doc, names)), total: page.total, page: page.page, page_size: page.page_size };
}

/** One session and its events, oldest first; null when no session has that id. */
export async function sessionDetail(sessionId: string) {
  const doc = await AppSessionModel.findOne({ session_id: sessionId }).lean<SessionDoc>();
  if (!doc) return null;
  const [names, events] = await Promise.all([
    namesOf([doc]),
    AppEventModel.find({ session_id: sessionId }).sort({ occurred_at: 1 }).limit(SESSION_EVENT_LIMIT).lean(),
  ]);
  return { session: toSession(doc, names), events: events.map(toProductEvent) };
}

/** A member's sessions count — the user profile's figure. */
export const sessionCountOf = (userId: Types.ObjectId) => AppSessionModel.countDocuments({ user_id: userId });
