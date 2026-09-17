import { GraphQLError } from 'graphql';
import { isObjectIdOrHexString } from 'mongoose';
import type { AuthUser } from '@context';
import { hasRole } from '@middleware/rbac';
import { requestIdentity } from '@observability/requestIdentity';
import { BULK_DELETE_TARGETS } from './bulkDelete.targets';
import { bulkDeleteOperations, captureScope } from './bulkDelete.operations';
import { findInScope, resumeBackgroundJobs, scheduleJob, scopeFilter } from './bulkDelete.runner';
import {
  BackgroundJobModel,
  type BackgroundJobFields,
  type BulkDeleteMode,
  type JobActor,
} from './backgroundJob.model';

/** A table page holds at most 100 rows; this leaves room without inviting abuse. */
const MAX_SELECTED = 500;
/** How many of a person's jobs the header drawer lists. */
const DRAWER_LIMIT = 50;

export interface StartBulkDeleteInput {
  table: string;
  mode: BulkDeleteMode;
  /** The table query's variables, as JSON text — the schema has no JSON scalar. */
  variables: string;
  ids?: string[] | null;
  label?: string | null;
  url?: string | null;
}

const badInput = (msg: string) => new GraphQLError(msg, { extensions: { code: 'BAD_USER_INPUT' } });
const forbidden = () => new GraphQLError('Access Denied', { extensions: { code: 'FORBIDDEN' } });

function parseVariables(text: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw badInput('The table query could not be read.');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw badInput('The table query could not be read.');
  }
  return parsed as Record<string, unknown>;
}

/** SELECTED must name rows; an empty list deletes nothing, never "everything". */
function selectedIds(mode: BulkDeleteMode, ids: readonly string[] | null | undefined): string[] {
  if (mode === 'ALL') return [];
  const unique = [...new Set((ids ?? []).map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) throw badInput('Select at least one row to delete.');
  if (unique.length > MAX_SELECTED) throw badInput(`Select at most ${MAX_SELECTED} rows at a time.`);
  // Every registered table is keyed by a Mongo _id; anything else names no row.
  if (!unique.every((id) => isObjectIdOrHexString(id))) throw badInput('The selected rows could not be identified.');
  return unique;
}

function actorOf(user: AuthUser): JobActor {
  return { id: user.id, email: user.email ?? '', roles: [...user.roles] };
}

/** The job as the drawer reads it. */
function toJob(doc: BackgroundJobFields & { _id: unknown }) {
  return {
    id: String(doc._id),
    table: doc.table,
    label: doc.label,
    url: doc.url,
    mode: doc.mode,
    status: doc.status,
    total: doc.total,
    succeeded: doc.succeeded,
    failed: doc.failed,
    failures: doc.failures.map((failure) => ({ id: failure.id, message: failure.message })),
    error_message: doc.error_message,
    created_at: doc.created_at.toISOString(),
    finished_at: doc.finished_at?.toISOString() ?? null,
  };
}

export const backgroundJobService = {
  /** The tables this person is offered bulk delete on. */
  deletableTables(user: AuthUser): string[] {
    return Object.keys(BULK_DELETE_TARGETS).filter(
      (table) => hasRole(user, BULK_DELETE_TARGETS[table].roles) && bulkDeleteOperations(table) !== null
    );
  },

  /**
   * Check the request, size the scope and hand the job to the runner.
   *
   * The scope is captured here, inside the request, so a person who may not
   * read the table is refused before anything is written — and the count they
   * see in the drawer is the table's own.
   */
  async startBulkDelete(user: AuthUser, input: StartBulkDeleteInput) {
    const ops = bulkDeleteOperations(input.table);
    if (!ops) throw badInput('This table does not support bulk delete.');
    if (!hasRole(user, ops.roles)) throw forbidden();
    const ids = selectedIds(input.mode, input.ids);
    const variables = parseVariables(input.variables);
    const actor = actorOf(user);
    const identity = requestIdentity.current() ?? { user: actor };
    const scope = await captureScope(ops, variables, actor, identity);
    const filter = scopeFilter(scope, { mode: input.mode, ids, cursor: null, max_id: null });
    const [total, newest] = await Promise.all([
      findInScope(scope, filter).countDocuments(),
      findInScope(scope, filter).sort({ _id: -1 }).limit(1).select('_id').lean(),
    ]);
    if (total === 0) throw badInput('No rows match — there is nothing to delete.');
    const job = await BackgroundJobModel.create({
      table: input.table,
      label: (input.label ?? '').slice(0, 200),
      url: (input.url ?? '').slice(0, 2000),
      mode: input.mode,
      variables,
      ids,
      total,
      max_id: newest[0]?._id ?? null,
      actor,
      identity,
    });
    scheduleJob(String(job._id));
    return toJob(job);
  },

  async mine(user: AuthUser) {
    const docs = await BackgroundJobModel.find({ 'actor.id': user.id, dismissed_at: null })
      .sort({ created_at: -1 })
      .limit(DRAWER_LIMIT)
      .lean<Array<BackgroundJobFields & { _id: unknown }>>();
    return docs.map(toJob);
  },

  /** Stop after the batch in hand. Rows already deleted stay deleted. */
  async cancel(user: AuthUser, id: string) {
    const doc = await BackgroundJobModel.findOneAndUpdate(
      { _id: id, 'actor.id': user.id, status: 'RUNNING' },
      { $set: { status: 'CANCELLED', finished_at: new Date(), lease_until: null } },
      { new: true }
    ).lean<BackgroundJobFields & { _id: unknown }>();
    if (!doc) throw badInput('That job is no longer running.');
    return toJob(doc);
  },

  /** Hide a finished job from the drawer. A running one has to be cancelled first. */
  async dismiss(user: AuthUser, id: string): Promise<boolean> {
    const res = await BackgroundJobModel.updateOne(
      { _id: id, 'actor.id': user.id, status: { $ne: 'RUNNING' }, dismissed_at: null },
      { $set: { dismissed_at: new Date() } }
    );
    return res.modifiedCount > 0;
  },

  /** Hide every finished job; returns how many. */
  async clearFinished(user: AuthUser): Promise<number> {
    const res = await BackgroundJobModel.updateMany(
      { 'actor.id': user.id, status: { $ne: 'RUNNING' }, dismissed_at: null },
      { $set: { dismissed_at: new Date() } }
    );
    return res.modifiedCount;
  },

  resume: resumeBackgroundJobs,
};
