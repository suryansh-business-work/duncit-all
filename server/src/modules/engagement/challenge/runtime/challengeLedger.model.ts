import { Schema, model, InferSchemaType, Types } from 'mongoose';

/**
 * The challenge ledgers. Scores are never edited in place: every change is an
 * appended event, a correction VOIDs an earlier event, and standings are a
 * pure function of what is left. That keeps live scoring idempotent (the
 * client's event id is unique), auditable, and replayable after a crash.
 */

const scoreEventSchema = new Schema(
  {
    challenge_id: { type: Schema.Types.ObjectId, ref: 'PodChallenge', required: true },
    tool_instance_id: { type: String, required: true },
    competitor_id: { type: String, required: true },
    /** INCREMENT adds `value`; SET records a measurement/time/rank. */
    event_type: { type: String, enum: ['INCREMENT', 'SET'], required: true },
    value: { type: Number, required: true },
    round: { type: Number, default: 1 },
    /** Checklist/Checkpoint: the task this SET ticks (1) or unticks (0). */
    item_key: { type: String, default: '' },
    voided: { type: Boolean, default: false },
    voided_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    void_reason: { type: String, default: '' },
    performed_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    client_event_id: { type: String, required: true },
    revision: { type: Number, required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

// A retried or double-tapped score lands once.
scoreEventSchema.index({ challenge_id: 1, client_event_id: 1 }, { unique: true });
scoreEventSchema.index({ challenge_id: 1, voided: 1, created_at: 1 });

export type ChallengeScoreEventDoc = InferSchemaType<typeof scoreEventSchema> & { _id: Types.ObjectId };
export const ChallengeScoreEventModel = model('ChallengeScoreEvent', scoreEventSchema);

const voteSchema = new Schema(
  {
    challenge_id: { type: Schema.Types.ObjectId, ref: 'PodChallenge', required: true },
    tool_instance_id: { type: String, required: true },
    round: { type: Number, default: 1 },
    voter_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    kind: { type: String, enum: ['VOTE', 'RATING', 'JUDGE', 'POLL', 'ANSWER', 'BUZZ'], required: true },
    candidate_id: { type: String, required: true },
    value: { type: Number, default: 1 },
    criteria: {
      type: [new Schema({ key: String, value: Number }, { _id: false })],
      default: [],
    },
    /**
     * What makes a ballot "the same ballot": '' for a VOTE or POLL (one per
     * voter per round), the candidate for ratings/judging, the question for a
     * quiz ANSWER, the buzz round for a BUZZ.
     */
    scope_key: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// One ballot per voter per scope: a second vote replaces the first, never adds.
voteSchema.index(
  { challenge_id: 1, tool_instance_id: 1, round: 1, voter_id: 1, kind: 1, scope_key: 1 },
  { unique: true }
);
voteSchema.index({ challenge_id: 1, tool_instance_id: 1 });

export type ChallengeVoteDoc = InferSchemaType<typeof voteSchema> & { _id: Types.ObjectId };
export const ChallengeVoteModel = model('ChallengeVote', voteSchema);

/** One competitor's submitted piece for a Submission tool (one per competitor per tool). */
const submissionSchema = new Schema(
  {
    challenge_id: { type: Schema.Types.ObjectId, ref: 'PodChallenge', required: true },
    tool_instance_id: { type: String, required: true },
    competitor_id: { type: String, required: true },
    submitted_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    media_url: { type: String, required: true },
    media_type: { type: String, enum: ['IMAGE', 'VIDEO', 'AUDIO'], required: true },
    caption: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Resubmitting replaces the entry; a competitor never has two in one tool.
submissionSchema.index({ challenge_id: 1, tool_instance_id: 1, competitor_id: 1 }, { unique: true });

export const ChallengeSubmissionModel = model('ChallengeSubmission', submissionSchema);

const standingSchema = new Schema(
  {
    competitor_id: String,
    name: String,
    rank: Number,
    total: Number,
    metrics: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false, minimize: false }
);

/** A published, immutable result. A correction publishes the next version. */
const resultSchema = new Schema(
  {
    challenge_id: { type: Schema.Types.ObjectId, ref: 'PodChallenge', required: true },
    pod_id: { type: Schema.Types.ObjectId, ref: 'Pod', required: true },
    version: { type: Number, required: true },
    is_current: { type: Boolean, default: true },
    standings: { type: [standingSchema], default: [] },
    winner_ids: { type: [String], default: [] },
    tools: { type: Schema.Types.Mixed, default: [] },
    published_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    published_at: { type: Date, required: true },
    reason: { type: String, default: '' },
  },
  { timestamps: false, minimize: false }
);

resultSchema.index({ challenge_id: 1, version: 1 }, { unique: true });
resultSchema.index({ challenge_id: 1 }, { unique: true, partialFilterExpression: { is_current: true } });

export type ChallengeResultDoc = InferSchemaType<typeof resultSchema> & { _id: Types.ObjectId };
export const ChallengeResultModel = model('ChallengeResult', resultSchema);

const auditSchema = new Schema(
  {
    challenge_id: { type: Schema.Types.ObjectId, ref: 'PodChallenge', required: true, index: true },
    pod_id: { type: Schema.Types.ObjectId, ref: 'Pod', required: true },
    actor_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    action: { type: String, required: true },
    old_value: { type: Schema.Types.Mixed, default: null },
    new_value: { type: Schema.Types.Mixed, default: null },
    reason: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

export const ChallengeAuditLogModel = model('ChallengeAuditLog', auditSchema);
