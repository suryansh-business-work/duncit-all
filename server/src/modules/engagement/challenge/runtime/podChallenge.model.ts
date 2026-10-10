import { Schema, model, InferSchemaType, Types } from 'mongoose';
import { CHALLENGE_STATUSES } from './challenge.lifecycle';

/**
 * A challenge running on one pod. Everything the engine needs is SNAPSHOTTED
 * here at creation (tool instances with their configs and versions, winner
 * rules), so later edits to tools, presets, templates or category mappings
 * never change a challenge in progress or a published result.
 *
 * `revision` is bumped atomically by every write; clients compare it to the
 * revision they rendered and refetch when it moved (latest-state sync).
 */

const snapshotInstanceSchema = new Schema(
  {
    instance_id: { type: String, required: true },
    tool_id: { type: Schema.Types.ObjectId, ref: 'ChallengeTool', required: true },
    tool_type: { type: String, required: true },
    tool_version: { type: Number, default: 1 },
    label: { type: String, required: true },
    config: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false, minimize: false }
);

const competitorSchema = new Schema(
  {
    competitor_id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: false }
);

const playerSchema = new Schema(
  {
    player_id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    team_id: { type: String, required: true },
  },
  { _id: false }
);

/** Live state of one tool instance (clock, open voting). */
const toolStateSchema = new Schema(
  {
    instance_id: { type: String, required: true },
    clock_running: { type: Boolean, default: false },
    clock_started_at: { type: Date, default: null },
    clock_elapsed_ms: { type: Number, default: 0 },
    voting_open: { type: Boolean, default: false },
    /** Quiz: the question currently open ('' when none). */
    active_item: { type: String, default: '' },
    /** Buzzer: which arming this is; presses are ordered within one round. */
    buzz_round: { type: Number, default: 0 },
    /** Random Picker: competitor ids picked so far, in order. */
    picked: { type: [String], default: [] },
  },
  { _id: false }
);

const podChallengeSchema = new Schema(
  {
    pod_id: { type: Schema.Types.ObjectId, ref: 'Pod', required: true },
    template_id: { type: Schema.Types.ObjectId, ref: 'Challenge', required: true },
    name: { type: String, required: true, trim: true },
    participant_mode: { type: String, enum: ['INDIVIDUAL', 'TEAM'], default: 'INDIVIDUAL' },
    tools: { type: [snapshotInstanceSchema], default: [] },
    winner_rules: { type: Schema.Types.Mixed, required: true },
    /** Who is ranked: players in INDIVIDUAL mode, teams in TEAM mode. */
    competitors: { type: [competitorSchema], default: [] },
    /** Team rosters (TEAM mode only), shown under each team. */
    players: { type: [playerSchema], default: [] },
    judge_user_ids: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
    tool_state: { type: [toolStateSchema], default: [] },
    current_round: { type: Number, default: 1, min: 1 },
    status: { type: String, enum: CHALLENGE_STATUSES, default: 'DRAFT' },
    enabled: { type: Boolean, default: true },
    show_on_pod_details: { type: Boolean, default: true },
    audience_interaction_enabled: { type: Boolean, default: false },
    auto_whatsapp: { type: Boolean, default: true },
    auto_email: { type: Boolean, default: true },
    scheduled_for: { type: Date, default: null },
    started_at: { type: Date, default: null },
    completed_at: { type: Date, default: null },
    result_version: { type: Number, default: 0 },
    revision: { type: Number, default: 1 },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, minimize: false }
);

podChallengeSchema.index({ pod_id: 1, created_at: 1 });
podChallengeSchema.index({ status: 1, updated_at: -1 });

export type PodChallengeDoc = InferSchemaType<typeof podChallengeSchema> & { _id: Types.ObjectId };
export const PodChallengeModel = model('PodChallenge', podChallengeSchema);
