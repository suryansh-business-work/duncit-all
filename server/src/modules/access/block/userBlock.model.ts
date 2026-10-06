import mongoose, { Schema, Types, type Document } from 'mongoose';

/**
 * One member blocking another.
 *
 * A row is never deleted: unblocking stamps `unblocked_at`, and blocking again
 * clears it. Legal reads this collection as the record of who blocked whom and
 * when (UGC Monitoring > Blocked accounts), and a row that vanished on unblock
 * would erase exactly the history a harassment complaint is decided on.
 */
export interface IUserBlock extends Document {
  blocker_id: Types.ObjectId;
  blocked_id: Types.ObjectId;
  /** Null while the block is in force. */
  unblocked_at: Date | null;
  /** When it was last put in force — a re-block moves it. */
  blocked_at: Date;
  created_at: Date;
  updated_at: Date;
}

const userBlockSchema = new Schema<IUserBlock>(
  {
    blocker_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    blocked_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    unblocked_at: { type: Date, default: null },
    blocked_at: { type: Date, required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// One row per pair: a double tap or a re-block updates it instead of stacking.
userBlockSchema.index({ blocker_id: 1, blocked_id: 1 }, { unique: true });
// Legal's table, newest first.
userBlockSchema.index({ blocked_at: -1 });

export const UserBlockModel =
  (mongoose.models.UserBlock as mongoose.Model<IUserBlock>) ||
  mongoose.model<IUserBlock>('UserBlock', userBlockSchema);

/**
 * Is either of these two accounts blocking the other right now?
 *
 * Both directions on purpose: a block cuts the relationship for both people —
 * the blocked member cannot follow back in, and the blocker does not keep
 * seeing someone they chose to shut out. Lives beside the model, with no
 * service imports, so the follow code can ask it without an import cycle.
 */
export async function isBlockedEitherWay(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b || a === b || !Types.ObjectId.isValid(a) || !Types.ObjectId.isValid(b)) return false;
  const x = new Types.ObjectId(a);
  const y = new Types.ObjectId(b);
  const hit = await UserBlockModel.exists({
    unblocked_at: null,
    $or: [
      { blocker_id: x, blocked_id: y },
      { blocker_id: y, blocked_id: x },
    ],
  });
  return !!hit;
}

/** Has `blockerId` blocked `blockedId` (one direction only)? */
export async function hasBlocked(blockerId: string | null | undefined, blockedId: string) {
  if (!blockerId || !Types.ObjectId.isValid(blockerId) || !Types.ObjectId.isValid(blockedId)) return false;
  const hit = await UserBlockModel.exists({
    blocker_id: new Types.ObjectId(blockerId),
    blocked_id: new Types.ObjectId(blockedId),
    unblocked_at: null,
  });
  return !!hit;
}
