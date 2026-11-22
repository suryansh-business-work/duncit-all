/**
 * How a lead's activity_log entries reach GraphQL, and how a manual log's
 * @mentions are read out of its HTML. Pure — no database, no models — so
 * crm.service's `pub()` and the manual-log service can both use it.
 */

/** The audit entries a manual log leaves behind, one per change, beside the log itself. */
export const NOTE_AUDIT_TYPES = {
  CREATED: 'NOTE_CREATED',
  UPDATED: 'NOTE_UPDATED',
  DELETED: 'NOTE_DELETED',
} as const;

/** Id a NOTE written before logs had ids is addressed by: its position, which never shifts (entries are never removed). */
export const LEGACY_PREFIX = 'legacy-';

export interface StoredActivity {
  type: string;
  log_id?: string | null;
  summary?: string | null;
  status?: string | null;
  target?: string | null;
  body_html?: string | null;
  body_text?: string | null;
  mention_user_ids?: string[] | null;
  created_by?: string | null;
  created_at?: Date | string | null;
  updated_by?: string | null;
  updated_at?: Date | string | null;
  deleted_by?: string | null;
  deleted_at?: Date | string | null;
}

const iso = (value: Date | string | null | undefined) =>
  value instanceof Date ? value.toISOString() : (value ?? null);

/**
 * Who may edit or delete a manual log: its author, or a SUPER_ADMIN — never
 * anyone once it is deleted. One rule for the mutations and for `can_change`.
 */
export function canChangeLog(
  activity: Pick<StoredActivity, 'type' | 'created_by' | 'deleted_at'> & { is_deleted?: boolean },
  actor: { id: string; roles: readonly string[] } | null | undefined
): boolean {
  if (!actor || activity.type !== 'NOTE' || activity.deleted_at || activity.is_deleted) return false;
  return actor.roles.includes('SUPER_ADMIN') || (Boolean(activity.created_by) && activity.created_by === actor.id);
}

/** The id a log is edited / deleted by: its own, or its position for a legacy NOTE. */
export function activityId(activity: StoredActivity, index?: number): string | null {
  if (activity.log_id) return activity.log_id;
  if (activity.type === 'NOTE' && typeof index === 'number') return `${LEGACY_PREFIX}${index}`;
  return null;
}

/**
 * One activity as GraphQL returns it. A deleted log keeps its place, author and
 * times but never its words — the "This log was deleted" row the portal shows.
 * (The words stay in the database for the audit trail; they are not served.)
 */
export function toActivity(activity: StoredActivity, index?: number) {
  const deleted = Boolean(activity.deleted_at);
  return {
    id: activityId(activity, index),
    type: activity.type,
    summary: deleted ? '' : (activity.summary ?? ''),
    status: activity.status ?? '',
    target: activity.target ?? '',
    body_html: deleted ? '' : (activity.body_html ?? ''),
    body_text: deleted ? '' : (activity.body_text ?? ''),
    mention_user_ids: deleted ? [] : (activity.mention_user_ids ?? []),
    created_by: activity.created_by ?? null,
    created_at: iso(activity.created_at),
    updated_by: activity.updated_by ?? null,
    updated_at: iso(activity.updated_at),
    deleted_by: activity.deleted_by ?? null,
    deleted_at: iso(activity.deleted_at),
    is_deleted: deleted,
  };
}

// A mention node as the rich-text editor writes it: <span data-type="mention" data-id="…">.
// Opening span tags are matched first (one linear scan), then checked for the marker.
const SPAN_TAG = /<span\b[^>]*>/gi;
const DATA_ID = /\bdata-id="([a-f\d]{24})"/i;

/** The user ids a log's HTML @mentions, unique, in the order they appear. */
export function mentionIdsIn(html: string | null | undefined): string[] {
  const ids = new Set<string>();
  for (const tag of (html ?? '').match(SPAN_TAG) ?? []) {
    if (!tag.includes('data-type="mention"')) continue;
    const id = DATA_ID.exec(tag)?.[1];
    if (id) ids.add(id.toLowerCase());
  }
  return [...ids];
}
