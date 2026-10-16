import { Schema, model, type Types } from 'mongoose';

/** How often a recurring pod repeats. */
export type PodSeriesFrequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY';
export const POD_SERIES_FREQUENCIES: readonly PodSeriesFrequency[] = ['DAILY', 'WEEKLY', 'BIWEEKLY'];

/** A date the host asked for that did not become a pod, and why. */
export interface IPodSeriesSkip {
  date: Date;
  reason: 'NO_SLOT' | 'HOLIDAY' | 'TAKEN' | 'REMOVED_BY_HOST' | 'FAILED';
  detail?: string | null;
}

/**
 * A recurring pod: one host's "the same pod, every week until December".
 *
 * The series only REMEMBERS the plan. Every date it produced is a complete pod
 * of its own (with `series_id` pointing here), so tickets, attendance, refunds,
 * cancellations and settlement work on each date exactly as on a one-time pod,
 * and a date that does not happen affects no other date.
 */
export interface IPodSeries {
  _id: Types.ObjectId;
  host_user_id: Types.ObjectId;
  club_id: Types.ObjectId;
  venue_id: Types.ObjectId | null;
  pod_mode: 'PHYSICAL' | 'VIRTUAL';
  pod_title: string;
  frequency: PodSeriesFrequency;
  /** The first date's start, and the last day a date may fall on. */
  starts_at: Date;
  ends_on: Date;
  pod_ids: Types.ObjectId[];
  skipped: IPodSeriesSkip[];
  created_at: Date;
  updated_at: Date;
}

const skipSchema = new Schema<IPodSeriesSkip>(
  {
    date: { type: Date, required: true },
    reason: {
      type: String,
      enum: ['NO_SLOT', 'HOLIDAY', 'TAKEN', 'REMOVED_BY_HOST', 'FAILED'],
      required: true,
    },
    detail: { type: String, default: null },
  },
  { _id: false }
);

const podSeriesSchema = new Schema<IPodSeries>(
  {
    host_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    club_id: { type: Schema.Types.ObjectId, ref: 'Club', required: true },
    venue_id: { type: Schema.Types.ObjectId, ref: 'Venue', default: null, index: true },
    pod_mode: { type: String, enum: ['PHYSICAL', 'VIRTUAL'], required: true },
    pod_title: { type: String, required: true, trim: true },
    frequency: { type: String, enum: POD_SERIES_FREQUENCIES, required: true },
    starts_at: { type: Date, required: true },
    ends_on: { type: Date, required: true },
    pod_ids: { type: [{ type: Schema.Types.ObjectId, ref: 'Pod' }], default: [] },
    skipped: { type: [skipSchema], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const PodSeriesModel = model<IPodSeries>('PodSeries', podSeriesSchema);
