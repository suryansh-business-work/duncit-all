import { GraphQLError } from 'graphql';
import { Types, type ClientSession, type UpdateQuery } from 'mongoose';
import { logs } from '@observability/log';
import { withTransaction } from '@utils/mongoTransaction';
import { PodChallengeModel, type PodChallengeDoc } from './podChallenge.model';
import { ChallengeAuditLogModel } from './challengeLedger.model';
import { emitChallengeChanged } from './challenge.socket';
import type { ChallengeStatus } from './challenge.lifecycle';

/**
 * The one way a pod challenge changes: a guarded, atomic update that bumps
 * the revision, then an audit row, then the live signal — in that order, so
 * nothing is ever broadcast that is not already persisted.
 *
 * `guard` is the compare-and-set condition (allowed statuses, plus any extra
 * filter such as "this vote is open"): when another request moved the
 * challenge on between our read and our write, the update matches nothing and
 * the caller gets a CONFLICT instead of a write against a state it never saw.
 */

export interface CommitAudit {
  actorId: string | null;
  action: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
}

export interface CommitGuard {
  statuses: readonly ChallengeStatus[];
  filter?: Record<string, unknown>;
  arrayFilters?: Record<string, unknown>[];
}

/** A live-change signal kind, for writes that are not audited (ballots). */
type Signal = { signal: string };

export function conflict(): never {
  throw new GraphQLError('This challenge changed in the meantime — refresh and try again', {
    extensions: { code: 'CONFLICT' },
  });
}

export async function loadChallenge(id: string): Promise<PodChallengeDoc> {
  if (!Types.ObjectId.isValid(id)) {
    throw new GraphQLError('Invalid challenge id', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const doc = await PodChallengeModel.findById(id).lean<PodChallengeDoc>();
  if (!doc) throw new GraphQLError('Challenge not found', { extensions: { code: 'NOT_FOUND' } });
  return doc;
}

async function recordAudit(challenge: Pick<PodChallengeDoc, '_id' | 'pod_id'>, audit: CommitAudit) {
  try {
    await ChallengeAuditLogModel.create({
      challenge_id: challenge._id,
      pod_id: challenge.pod_id,
      actor_id: audit.actorId,
      action: audit.action,
      old_value: audit.oldValue ?? null,
      new_value: audit.newValue ?? null,
      reason: audit.reason ?? '',
    });
  } catch (error) {
    // The change itself is already persisted; a lost audit row is reported, not rethrown.
    logs.server.error('challenge', 'audit', { error, msg: 'audit write failed', challenge_id: String(challenge._id) });
  }
}

async function guardedUpdate(
  id: Types.ObjectId,
  guard: CommitGuard,
  update: UpdateQuery<PodChallengeDoc>,
  session?: ClientSession
) {
  const next = await PodChallengeModel.findOneAndUpdate(
    { _id: id, status: { $in: guard.statuses }, ...(guard.filter ?? {}) },
    { ...update, $inc: { ...(update.$inc ?? {}), revision: 1 } },
    { new: true, session, ...(guard.arrayFilters ? { arrayFilters: guard.arrayFilters } : {}) }
  ).lean<PodChallengeDoc>();
  if (!next) conflict();
  return next;
}

async function announce(next: PodChallengeDoc, audit: CommitAudit | Signal) {
  if ('action' in audit) await recordAudit(next, audit);
  emitChallengeChanged(next._id.toString(), next.revision, 'action' in audit ? audit.action : audit.signal);
}

export async function commit(
  challenge: Pick<PodChallengeDoc, '_id'>,
  guard: CommitGuard,
  update: UpdateQuery<PodChallengeDoc>,
  audit: CommitAudit
): Promise<PodChallengeDoc> {
  const next = await guardedUpdate(challenge._id, guard, update);
  await announce(next, audit);
  return next;
}

/**
 * A ledger write (score event, ballot) and the guarded revision bump in ONE
 * transaction: if the challenge stopped being live in between, the ledger
 * write is rolled back with it, so nothing is ever scored after the whistle.
 */
export async function ledgerCommit(
  challenge: Pick<PodChallengeDoc, '_id'>,
  guard: CommitGuard,
  write: (session: ClientSession | undefined) => Promise<unknown>,
  audit: CommitAudit | Signal
): Promise<PodChallengeDoc> {
  const next = await withTransaction(async (session) => {
    await write(session);
    return guardedUpdate(challenge._id, guard, {}, session);
  });
  await announce(next, audit);
  return next;
}
