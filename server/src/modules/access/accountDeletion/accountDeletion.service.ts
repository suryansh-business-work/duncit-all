import { Types, type Model } from 'mongoose';
import { GraphQLError } from 'graphql';
import crypto from 'node:crypto';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { UserModel } from '@modules/access/user/user.model';
import { userService } from '@modules/access/user/user.service';
import {
  AccountDeletionRequestModel,
  type DeletionRequestSurface,
  type IAccountDeletionRequest,
} from './accountDeletion.model';
import { userTrace } from './accountDeletion.trace';
import { purgeKind, purgeReference } from './accountDeletion.purge';

const TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['request_id', 'snapshot_name', 'snapshot_email', 'snapshot_phone', 'reason'],
  sortFields: {
    request_id: 'request_id',
    snapshot_name: 'snapshot_name',
    snapshot_email: 'snapshot_email',
    status: 'status',
    surface: 'surface',
    requested_at: 'requested_at',
    reviewed_at: 'reviewed_at',
  },
  filterFields: {
    status: { type: 'enum' },
    surface: { type: 'enum' },
    requested_at: { type: 'date' },
    snapshot_email: { type: 'string' },
  },
  // Oldest open request first: the queue is a waiting line, not a news feed.
  defaultSort: { requested_at: 1 },
};

/** `DUN-ADR-4F2A19` — the id shape the rest of the product already uses. */
function nextRequestId(): string {
  return `DUN-ADR-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function requireObjectId(value: string, label: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) {
    throw new GraphQLError(`Invalid ${label}`, { extensions: { code: 'BAD_USER_INPUT' } });
  }
  return new Types.ObjectId(value);
}

/** The GraphQL shape. `user_id` stays a string so the console can still link
 * out to a member whose account has not been removed yet. */
function toPublic(doc: IAccountDeletionRequest | null) {
  if (!doc) return null;
  return {
    id: String(doc._id),
    request_id: doc.request_id,
    user_id: String(doc.user_id),
    name: doc.snapshot_name,
    email: doc.snapshot_email,
    phone: doc.snapshot_phone,
    reason: doc.reason,
    surface: doc.surface,
    status: doc.status,
    requested_at: doc.requested_at.toISOString(),
    reviewed_at: doc.reviewed_at ? doc.reviewed_at.toISOString() : null,
    reviewed_by: doc.reviewed_by ? String(doc.reviewed_by) : null,
    note: doc.note,
    purge_log: doc.purge_log.map((entry) => ({
      model_name: entry.model_name,
      collection_name: entry.collection_name,
      field_path: entry.field_path,
      removed: entry.removed,
      purged_at: entry.purged_at.toISOString(),
    })),
  };
}

async function findRequest(requestDocId: string): Promise<IAccountDeletionRequest> {
  const doc = await AccountDeletionRequestModel.findById(requireObjectId(requestDocId, 'request'));
  if (!doc) {
    throw new GraphQLError('Deletion request not found', { extensions: { code: 'NOT_FOUND' } });
  }
  return doc;
}

/** A request already carried out or called off cannot be acted on again — the
 * rows it named are gone, and the account it named may be too. */
function assertActionable(doc: IAccountDeletionRequest) {
  if (doc.status !== 'PENDING') {
    throw new GraphQLError(`This request is already ${doc.status.toLowerCase()}`, {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
}

export const accountDeletionService = {
  /**
   * File a request. Confirmed with the same emailed code the instant deletion
   * used to consume: the proof required has not changed, only what happens
   * once it checks out.
   */
  async submitRequest(
    user_id: string,
    input: { otp: string; reason?: string | null; surface?: DeletionRequestSurface | null }
  ) {
    const user = await userService.consumeAccountDeletionOtp(user_id, input.otp);
    // Asking twice is not an error — it is somebody who did not see the first
    // one land. Hand back the request they already have.
    const existing = await AccountDeletionRequestModel.findOne({
      user_id: user._id,
      status: 'PENDING',
    });
    if (existing) return toPublic(existing);

    const phone = user.auth?.phone;
    const doc = await AccountDeletionRequestModel.create({
      request_id: nextRequestId(),
      user_id: user._id,
      snapshot_name: [user.profile?.first_name, user.profile?.last_name]
        .filter(Boolean)
        .join(' ')
        .trim(),
      snapshot_email: user.auth?.email ?? '',
      snapshot_phone: phone?.number ? `${phone.extension ?? ''}${phone.number}` : '',
      reason: (input.reason ?? '').trim(),
      surface: input.surface ?? 'UNKNOWN',
      status: 'PENDING',
      requested_at: new Date(),
    });
    return toPublic(doc);
  },

  /** The member's own open request, or null — what the apps read to show the
   * "deletion requested" banner in place of the delete button. */
  async myRequest(user_id: string) {
    const doc = await AccountDeletionRequestModel.findOne({
      user_id: requireObjectId(user_id, 'user'),
      status: 'PENDING',
    });
    return toPublic(doc);
  },

  /** Withdraw it. Only their own, and only while it is still open. */
  async cancelMyRequest(user_id: string) {
    const doc = await AccountDeletionRequestModel.findOne({
      user_id: requireObjectId(user_id, 'user'),
      status: 'PENDING',
    });
    if (!doc) {
      throw new GraphQLError('You have no open deletion request', {
        extensions: { code: 'NOT_FOUND' },
      });
    }
    doc.status = 'CANCELLED';
    doc.reviewed_at = new Date();
    await doc.save();
    return toPublic(doc);
  },

  async table(input: TableQueryInput | null | undefined) {
    const { docs, total, page, page_size } = await runTableQuery<IAccountDeletionRequest>(
      AccountDeletionRequestModel,
      {},
      input,
      TABLE_CONFIG
    );
    return { rows: docs.map(toPublic), total, page, page_size };
  },

  /** One request, plus where that member still appears — counted live, so the
   * console never offers to delete something already gone. */
  async detail(request_doc_id: string) {
    const doc = await findRequest(request_doc_id);
    const trace = await userTrace(String(doc.user_id));
    const account = await UserModel.exists({ _id: doc.user_id });
    return {
      request: toPublic(doc),
      account_exists: !!account,
      trace: trace.map((group) => ({
        model_name: group.model_name,
        collection_name: group.collection_name,
        field_path: group.field_path,
        id_kind: group.id_kind,
        count: group.count,
        // Whether clearing this removes the documents or only the member's
        // entry inside them. The console says which before it asks.
        purge_kind: purgeKind(group.model_name, group.field_path),
      })),
    };
  },

  /** Clear this member's rows behind ONE reference — the one-at-a-time door. */
  async purgeGroup(
    request_doc_id: string,
    input: { model_name: string; field_path: string },
    actor_id: string
  ) {
    const doc = await findRequest(request_doc_id);
    assertActionable(doc);
    // Re-counted rather than trusted from the client: the page may have been
    // open for an hour, and a stale field path must not become a blind delete.
    const trace = await userTrace(String(doc.user_id));
    const group = trace.find(
      (g) => g.model_name === input.model_name && g.field_path === input.field_path
    );
    if (!group) {
      throw new GraphQLError('That trace is already clear', { extensions: { code: 'NOT_FOUND' } });
    }
    const removed = await purgeReference(group, String(doc.user_id));
    doc.purge_log.push({
      model_name: group.model_name,
      collection_name: group.collection_name,
      field_path: group.field_path,
      removed,
      purged_at: new Date(),
      purged_by: requireObjectId(actor_id, 'actor'),
    });
    await doc.save();
    return accountDeletionService.detail(request_doc_id);
  },

  /**
   * Carry the whole request out: every trace, then the account itself.
   *
   * The account document goes LAST on purpose. If the run dies halfway the
   * request is still open and still names a user whose remaining rows the next
   * attempt can find — remove the account first and the scan has nothing left
   * to search by.
   */
  async purgeAll(request_doc_id: string, actor_id: string) {
    const doc = await findRequest(request_doc_id);
    assertActionable(doc);
    const userId = String(doc.user_id);
    const actor = requireObjectId(actor_id, 'actor');
    const trace = await userTrace(userId);
    const now = new Date();
    // Sequential, not parallel: ~150 concurrent deleteMany calls on one
    // connection is a burst that competes with live traffic, and this is a
    // one-off somebody is sitting and watching.
    for (const group of trace) {
      const removed = await purgeReference(group, userId);
      doc.purge_log.push({
        model_name: group.model_name,
        collection_name: group.collection_name,
        field_path: group.field_path,
        removed,
        purged_at: now,
        purged_by: actor,
      });
    }
    await UserModel.deleteOne({ _id: doc.user_id });
    doc.status = 'COMPLETED';
    doc.reviewed_by = actor;
    doc.reviewed_at = now;
    await doc.save();
    return accountDeletionService.detail(request_doc_id);
  },

  /** Turn it down, with a reason the member can be told. */
  async reject(request_doc_id: string, note: string, actor_id: string) {
    const doc = await findRequest(request_doc_id);
    assertActionable(doc);
    doc.status = 'REJECTED';
    doc.note = (note ?? '').trim();
    doc.reviewed_by = requireObjectId(actor_id, 'actor');
    doc.reviewed_at = new Date();
    await doc.save();
    return accountDeletionService.detail(request_doc_id);
  },
};
