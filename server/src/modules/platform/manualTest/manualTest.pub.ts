import { GraphQLError } from 'graphql';
import { isValidObjectId, type Types } from 'mongoose';
import { displayFrom, userDisplayMap, type UserDisplay } from '@modules/access/user/user.display';
import type { IManualTestCase, IManualTestColumn, IManualTestComment } from './manualTest.model';

/*
 * Errors, and the shapes the API answers with. Every read builds its people
 * (assignee, reporter, author) from ONE batched user lookup per response —
 * never a lookup per card.
 */

export const notFound = (what: string) =>
  new GraphQLError(`${what} not found`, { extensions: { code: 'NOT_FOUND' } });
export const badInput = (message: string) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
export const forbidden = (message: string) =>
  new GraphQLError(message, { extensions: { code: 'FORBIDDEN' } });
/** Someone else changed the record first; the client rolls back and reloads. */
export const conflict = (message: string) =>
  new GraphQLError(message, { extensions: { code: 'CONFLICT' } });

/** An id that cannot exist reads as "not found", never as a cast error. */
export function requireId(id: string | null | undefined, what: string): string {
  if (!id || !isValidObjectId(id)) throw notFound(what);
  return id;
}

export const iso = (value: Date | null | undefined): string | null => (value ? value.toISOString() : null);
/** A due date is a calendar day, stored at UTC midnight. */
export const dayOnly = (value: Date | null | undefined): string | null =>
  value ? value.toISOString().slice(0, 10) : null;

type Id = Types.ObjectId | string | null | undefined;

export interface PersonPub {
  id: string;
  name: string;
  photo: string;
}

/** Everyone a set of records names, in one query. */
export const peopleOf = (ids: Iterable<Id>): Promise<Map<string, UserDisplay>> =>
  userDisplayMap([...ids].filter((id): id is Types.ObjectId | string => Boolean(id)).map(String));

export function personPub(people: Map<string, UserDisplay>, id: Id): PersonPub | null {
  if (!id) return null;
  return { id: String(id), ...displayFrom(people, id) };
}

type ColumnRecord = Pick<IManualTestColumn, 'name' | 'order' | 'category' | 'wip_limit'> & { _id: Types.ObjectId };

export interface ColumnPub {
  id: string;
  name: string;
  order: number;
  category: IManualTestColumn['category'];
  wip_limit: number | null;
  case_count: number | null;
}

export const columnPub = (doc: ColumnRecord, caseCount: number | null = null): ColumnPub => ({
  id: String(doc._id),
  name: doc.name,
  order: doc.order,
  category: doc.category,
  wip_limit: doc.wip_limit ?? null,
  case_count: caseCount,
});

/** The fields a board card or a table row reads — never the rich-text sections. */
export const CARD_PROJECTION =
  'number key title type priority column_id rank assignee_id labels surface environment due_date created_at updated_at';

export type CardRecord = Pick<
  IManualTestCase,
  'key' | 'title' | 'type' | 'priority' | 'rank' | 'labels' | 'surface' | 'environment' | 'due_date'
> & {
  _id: Types.ObjectId;
  column_id: Types.ObjectId;
  assignee_id: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
};

export function cardPub(doc: CardRecord, people: Map<string, UserDisplay>, columns?: Map<string, ColumnPub>) {
  return {
    id: String(doc._id),
    key: doc.key,
    title: doc.title,
    type: doc.type,
    priority: doc.priority,
    column_id: String(doc.column_id),
    column: columns?.get(String(doc.column_id)) ?? null,
    rank: doc.rank,
    assignee: personPub(people, doc.assignee_id),
    labels: doc.labels ?? [],
    surface: doc.surface ?? '',
    environment: doc.environment,
    due_date: dayOnly(doc.due_date),
    created_at: iso(doc.created_at),
    updated_at: iso(doc.updated_at),
  };
}

export interface LinkedFlow {
  flow: { id: string; name: string } | null;
  sub_flow: { id: string; name: string } | null;
}

export type CaseRecord = CardRecord &
  Pick<
    IManualTestCase,
    | 'number'
    | 'description'
    | 'preconditions'
    | 'expected_result'
    | 'actual_result'
    | 'steps'
    | 'estimate_minutes'
    | 'executed_at'
  > & {
    reporter_id: Types.ObjectId | null;
    e2e_flow_id: Types.ObjectId | null;
    e2e_sub_flow_id: Types.ObjectId | null;
  };

export function casePub(
  doc: CaseRecord,
  people: Map<string, UserDisplay>,
  column: ColumnPub | null,
  linked: LinkedFlow
) {
  return {
    ...cardPub(doc, people),
    column,
    number: doc.number,
    assignee_id: doc.assignee_id ? String(doc.assignee_id) : null,
    reporter: personPub(people, doc.reporter_id),
    reporter_id: doc.reporter_id ? String(doc.reporter_id) : null,
    description: doc.description ?? '',
    preconditions: doc.preconditions ?? '',
    expected_result: doc.expected_result ?? '',
    actual_result: doc.actual_result ?? '',
    steps: (doc.steps ?? []).map((step) => ({ action: step.action, expected: step.expected ?? '' })),
    e2e_flow: linked.flow,
    e2e_sub_flow: linked.sub_flow,
    estimate_minutes: doc.estimate_minutes ?? null,
    executed_at: iso(doc.executed_at),
  };
}

type CommentRecord = Pick<IManualTestComment, 'body' | 'edited_at' | 'created_at'> & {
  _id: Types.ObjectId;
  case_id: Types.ObjectId;
  author_id: Types.ObjectId | null;
};

/** A comment, with what the person reading it may do to it. */
export function commentPub(
  doc: CommentRecord,
  people: Map<string, UserDisplay>,
  viewer: { id: string; isSuperAdmin: boolean }
) {
  const own = Boolean(doc.author_id) && String(doc.author_id) === viewer.id;
  return {
    id: String(doc._id),
    case_id: String(doc.case_id),
    author: personPub(people, doc.author_id),
    body: doc.body,
    edited_at: iso(doc.edited_at),
    created_at: iso(doc.created_at),
    can_edit: own,
    can_delete: own || viewer.isSuperAdmin,
  };
}

/** What the editor writes for an empty document. */
export const normalizedRichText = (html: string | null | undefined): string => {
  const value = (html ?? '').trim();
  return value === '<p></p>' ? '' : value;
};
