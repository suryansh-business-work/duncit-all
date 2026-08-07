import mongoose, { Schema, type Document } from 'mongoose';

/**
 * A record of every call placed between coworkers.
 *
 * The media never touches this server — the browsers connect to each other —
 * so without this row a call would leave no trace at all. What is kept is the
 * shape of it: who called whom, when, for how long and how it ended.
 */

export const CALL_KINDS = ['AUDIO', 'VIDEO'] as const;
export type CallKind = (typeof CALL_KINDS)[number];

export const CALL_OUTCOMES = [
  /** Picked up. */
  'ANSWERED',
  /** Rang out without an answer. */
  'MISSED',
  /** The other side said no. */
  'DECLINED',
  /** The caller hung up before it was answered. */
  'CANCELLED',
] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];

export interface IStaffCall extends Document {
  thread_key: string;
  from_user_id: string;
  to_user_id: string;
  kind: CallKind;
  outcome: CallOutcome;
  /** Talk time in seconds; zero for anything that was never answered. */
  duration_seconds: number;
  started_at: Date;
  ended_at: Date | null;
  /**
   * The mp4 this call was recorded to, once FFmpeg has produced it.
   *
   * On the CALL rather than on a message, because a recording is a property of
   * the call — the thread should be able to say "we spoke for eleven minutes,
   * here it is" without depending on somebody having chosen to post the link.
   */
  recording_url: string | null;
  created_at: Date;
  updated_at: Date;
}

const staffCallSchema = new Schema<IStaffCall>(
  {
    thread_key: { type: String, required: true, index: true },
    from_user_id: { type: String, required: true, index: true },
    to_user_id: { type: String, required: true, index: true },
    kind: { type: String, enum: CALL_KINDS, required: true },
    outcome: { type: String, enum: CALL_OUTCOMES, required: true },
    duration_seconds: { type: Number, default: 0 },
    started_at: { type: Date, required: true },
    ended_at: { type: Date, default: null },
    recording_url: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// "What happened on this line, newest first" — the call history in the panel,
// and the export.
staffCallSchema.index({ thread_key: 1, started_at: -1 });

export const StaffCallModel =
  (mongoose.models.StaffCall as mongoose.Model<IStaffCall>) ||
  mongoose.model<IStaffCall>('StaffCall', staffCallSchema);
