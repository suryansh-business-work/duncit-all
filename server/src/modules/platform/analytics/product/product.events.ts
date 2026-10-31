import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { AppEventModel, type IAppEvent } from '../appEvent.model';
import { eventMatch, type ProductScope } from './product.filter';
import { countBy } from './product.series';
import type { ProductCount } from './product.counts';

/**
 * Analytics > Product > Events — every stored event, searchable and filterable
 * by name, member, device, session and screen, and the names the period holds.
 */

const EVENT_TABLE: TableEntityConfig = {
  searchFields: ['event_name', 'screen_name', 'target_label', 'element_id', 'session_id'],
  sortFields: {
    occurred_at: 'occurred_at',
    event_name: 'event_name',
    screen_name: 'screen_name',
    platform: 'platform',
  },
  filterFields: {
    event_name: { type: 'string' },
    user_id: { type: 'string' },
    device_id: { type: 'string' },
    session_id: { type: 'string' },
    screen_name: { type: 'string' },
    element_id: { type: 'string' },
    platform: { type: 'enum' },
    app_version: { type: 'string' },
    occurred_at: { type: 'date' },
  },
  defaultSort: { occurred_at: -1 },
};

type EventDoc = Pick<
  IAppEvent,
  | '_id'
  | 'event_name'
  | 'event_type'
  | 'occurred_at'
  | 'user_id'
  | 'device_id'
  | 'session_id'
  | 'platform'
  | 'app_version'
  | 'screen_name'
  | 'previous_screen'
  | 'element_id'
  | 'element_type'
  | 'target_label'
  | 'target_text'
  | 'duration_ms'
  | 'path'
  | 'route'
  | 'metadata'
>;

/** Rows from before the taxonomy carry only their coarse type; they read as the names it maps to. */
const LEGACY_NAMES: Readonly<Record<string, string>> = {
  PAGE_VIEW: 'screen_view',
  CLICK: 'element_click',
  IMPRESSION: 'element_impression',
  TOUCH: 'touch',
};

export function toProductEvent(doc: EventDoc) {
  return {
    id: String(doc._id),
    event_name: doc.event_name || LEGACY_NAMES[doc.event_type] || 'event',
    occurred_at: doc.occurred_at.toISOString(),
    user_id: doc.user_id ? String(doc.user_id) : null,
    device_id: doc.device_id,
    session_id: doc.session_id ?? '',
    platform: doc.platform ?? '',
    app_version: doc.app_version ?? '',
    screen_name: doc.screen_name || doc.route || doc.path || '',
    previous_screen: doc.previous_screen ?? '',
    element_id: doc.element_id ?? '',
    element_type: doc.element_type ?? '',
    element_name: doc.target_label ?? '',
    element_text: doc.target_text ?? '',
    duration_ms: doc.duration_ms ?? null,
    path: doc.path ?? '',
    properties_json: JSON.stringify(doc.metadata ?? {}),
  };
}

export async function eventsTable(scope: ProductScope, query: TableQueryInput | null | undefined) {
  const page = await runTableQuery<EventDoc>(AppEventModel, eventMatch(scope), query, EVENT_TABLE, {
    projection: { client_event_id: 0, checkout_url: 0, target_href: 0 },
  });
  return { rows: page.docs.map(toProductEvent), total: page.total, page: page.page, page_size: page.page_size };
}

/** The event names stored in the period, with how often each happened — the explorer's and funnel builder's choices. */
export const eventNames = (scope: ProductScope): Promise<ProductCount[]> =>
  countBy({ ...eventMatch(scope), event_name: { $ne: '' } }, '$event_name', 200);

/** The screens viewed in the period, most viewed first — the funnel builder's screen choices. */
export const screenNames = (scope: ProductScope): Promise<ProductCount[]> =>
  countBy({ ...eventMatch(scope), event_name: 'screen_view', screen_name: { $ne: '' } }, '$screen_name', 300);
