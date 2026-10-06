import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import {
  escapedSearchRegex,
  runTableQuery,
  type TableEntityConfig,
  type TableQueryInput,
} from '@utils/table-query';
import { UserModel } from '@modules/access/user/user.model';
import { userService } from '@modules/access/user/user.service';
import { userDisplayMap } from '@modules/access/user/user.display';
import { UserBlockModel, type IUserBlock } from './userBlock.model';
import { notifyBlockConfirmed } from './block.notify';

function fail(code: string, msg: string): never {
  throw new GraphQLError(msg, { extensions: { code } });
}

/** Legal's table (userBlocksTable — DUNCIT TABLE CONTRACT v1). Names live on the
 * accounts, not the rows, so there is nothing on a row to search by. */
const BLOCK_TABLE_CONFIG: TableEntityConfig = {
  searchFields: [],
  sortFields: { blocked_at: 'blocked_at', unblocked_at: 'unblocked_at' },
  filterFields: { blocked_at: { type: 'date' }, unblocked_at: { type: 'date' } },
  defaultSort: { blocked_at: -1 },
};

async function requireTarget(blockerId: string, targetId: string) {
  if (!Types.ObjectId.isValid(targetId)) fail('BAD_USER_INPUT', 'Invalid user');
  if (blockerId === targetId) fail('BAD_USER_INPUT', 'You cannot block yourself');
  const exists = await UserModel.exists({ _id: new Types.ObjectId(targetId) });
  if (!exists) fail('NOT_FOUND', 'User not found');
}

/** How many matching accounts a search narrows the table to — a staff search, not a directory. */
const SEARCH_MEMBER_CAP = 200;

/** Blocks where either side's name or @handle matches the search. */
async function involvingMembersMatching(search: string) {
  const rx = escapedSearchRegex(search);
  const users = await UserModel.find({
    $or: [{ 'profile.first_name': rx }, { 'profile.last_name': rx }, { 'profile.username': rx }],
  })
    .select('_id')
    .limit(SEARCH_MEMBER_CAP)
    .lean<{ _id: Types.ObjectId }[]>();
  const ids = users.map((u) => u._id);
  return { $or: [{ blocker_id: { $in: ids } }, { blocked_id: { $in: ids } }] };
}

/**
 * Cut every follow tie between the two, both ways: the edges (with their
 * counters) and any open request. Each call is idempotent, so a block on a
 * pair that was never connected costs four cheap no-ops.
 */
async function severTies(a: string, b: string) {
  await Promise.all([
    userService.unfollowUser(a, b),
    userService.unfollowUser(b, a),
    userService.cancelFollowRequest(a, b),
    userService.cancelFollowRequest(b, a),
  ]);
}

export const blockService = {
  /**
   * Block an account. Idempotent: blocking someone already blocked changes
   * nothing and sends nothing. The block is written first and the ties cut
   * second — a half-finished run leaves a block with a stray follow, which the
   * block itself already hides, never a cut tie with no block behind it.
   */
  async block(blockerId: string, targetId: string) {
    await requireTarget(blockerId, targetId);
    const now = new Date();
    const pair = { blocker_id: new Types.ObjectId(blockerId), blocked_id: new Types.ObjectId(targetId) };
    const prior = await UserBlockModel.findOne(pair).select('unblocked_at').lean<Pick<IUserBlock, 'unblocked_at'>>();
    // No row yet, or a lifted one: this call is the one that puts the block in force.
    let fresh = prior?.unblocked_at !== null;
    if (fresh) {
      try {
        await UserBlockModel.updateOne(pair, { $set: { blocked_at: now, unblocked_at: null } }, { upsert: true });
      } catch (e: unknown) {
        // A concurrent identical tap won the insert: the block is in force and
        // that call sends the confirmation, so this one stays quiet.
        if ((e as { code?: number } | null)?.code !== 11000) throw e;
        fresh = false;
      }
    }
    await severTies(blockerId, targetId);
    if (fresh) {
      logs.server.info('block.service', 'block', { blockerId, targetId });
      // Never rejects (it logs its own failures); not awaited so the mail and
      // WhatsApp round trips do not hold up the block.
      notifyBlockConfirmed(blockerId, targetId, now).catch((error: unknown) => {
        logs.server.error('block.service', 'notify-failed', { error, blockerId });
      });
    }
    return true;
  },

  /** Lift a block. Idempotent; the row stays as the record that it happened. */
  async unblock(blockerId: string, targetId: string) {
    if (!Types.ObjectId.isValid(targetId)) fail('BAD_USER_INPUT', 'Invalid user');
    const res = await UserBlockModel.updateOne(
      {
        blocker_id: new Types.ObjectId(blockerId),
        blocked_id: new Types.ObjectId(targetId),
        unblocked_at: null,
      },
      { $set: { unblocked_at: new Date() } }
    );
    if (res.modifiedCount) logs.server.info('block.service', 'unblock', { blockerId, targetId });
    return true;
  },

  /**
   * Legal-only: every block ever made, names resolved in one query per page.
   * The search box matches either member's name or @handle: those live on the
   * accounts, so it is answered as a set of user ids first.
   */
  async table(input?: TableQueryInput) {
    const search = input?.search?.trim();
    const base = search ? await involvingMembersMatching(search) : {};
    const { docs, total, page, page_size } = await runTableQuery<IUserBlock>(
      UserBlockModel,
      base,
      { ...input, search: undefined },
      BLOCK_TABLE_CONFIG
    );
    const names = await userDisplayMap(docs.flatMap((d) => [d.blocker_id.toHexString(), d.blocked_id.toHexString()]));
    const rows = docs.map((d) => {
      const blockerId = d.blocker_id.toHexString();
      const blockedId = d.blocked_id.toHexString();
      return {
        id: (d._id as Types.ObjectId).toHexString(),
        blocker_id: blockerId,
        blocker_name: names.get(blockerId)?.name ?? '',
        blocked_id: blockedId,
        blocked_name: names.get(blockedId)?.name ?? '',
        active: d.unblocked_at === null,
        blocked_at: d.blocked_at.toISOString(),
        unblocked_at: d.unblocked_at ? d.unblocked_at.toISOString() : null,
      };
    });
    return { rows, total, page, page_size };
  },
};
