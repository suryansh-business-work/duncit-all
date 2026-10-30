import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import type { ITutorial, ITutorialTopic } from './tutorial.model';

const iso = (value: Date | string | null | undefined) =>
  value instanceof Date ? value.toISOString() : String(value ?? '');

export interface ViewerFlags {
  liked: ReadonlySet<string>;
  watched: ReadonlySet<string>;
}

const NO_FLAGS: ViewerFlags = { liked: new Set(), watched: new Set() };

/** A tutorial as GraphQL returns it. The per-viewer flags default to false
 * (the Support table has no viewer). */
export const toTutorialPub = (doc: ITutorial, flags: ViewerFlags = NO_FLAGS) => {
  const id = String(doc._id);
  return {
    id,
    title: doc.title,
    description: doc.description ?? '',
    topic: doc.topic,
    language: doc.language,
    video_url: doc.video_url,
    thumbnail_url: doc.thumbnail_url ?? '',
    duration_sec: doc.duration_sec ?? 0,
    status: doc.status,
    sort_order: doc.sort_order ?? 0,
    like_count: Math.max(0, doc.like_count ?? 0),
    comment_count: Math.max(0, doc.comment_count ?? 0),
    view_count: Math.max(0, doc.view_count ?? 0),
    liked_by_me: flags.liked.has(id),
    watched_by_me: flags.watched.has(id),
    created_at: iso(doc.created_at),
    updated_at: iso(doc.updated_at),
  };
};

export const toTopicPub = (doc: ITutorialTopic) => ({
  id: String(doc._id),
  key: doc.key,
  label: doc.label,
  sort_order: doc.sort_order ?? 0,
  is_active: doc.is_active !== false,
  created_at: iso(doc.created_at),
  updated_at: iso(doc.updated_at),
});

/** A client-supplied id as an ObjectId, or a BAD_USER_INPUT error naming it. */
export function toObjectId(id: string, what: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) {
    throw new GraphQLError(`Invalid ${what}`, { extensions: { code: 'BAD_USER_INPUT' } });
  }
  return new Types.ObjectId(id);
}

export const notFound = (what: string) => new GraphQLError(`${what} not found`, { extensions: { code: 'NOT_FOUND' } });

/** Mongo's duplicate-key error — the unique index won a race. */
export const isDuplicateKey = (error: unknown) =>
  typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 11000;

/** page ≥ 1, 1 ≤ page_size ≤ max (default `fallback`). */
export function clampPaging(page: number | null | undefined, pageSize: number | null | undefined, fallback: number, max: number) {
  const safePage = Math.max(1, Math.floor(page ?? 1));
  const safeSize = Math.min(max, Math.max(1, Math.floor(pageSize ?? fallback)));
  return { page: safePage, pageSize: safeSize, skip: (safePage - 1) * safeSize };
}
