import mongoose, { Schema, Types, type Document } from 'mongoose';
import { nextEntityNo } from '@modules/venues/entityIdCounter';

/**
 * What was reported.
 *
 * A story is the only surface that raises one today, but the whole point of a
 * `target_type` is that the next surface — a post, a pod, a club page, a
 * profile — files into the SAME record and the SAME Legal queue. A second
 * "reports" collection per surface is exactly the drift rule 40 exists to stop.
 */
export type ReportTargetType = 'STORY' | 'POST' | 'POD' | 'CLUB' | 'PROFILE' | 'PRODUCT';
export const REPORT_TARGET_TYPES: ReportTargetType[] = [
  'STORY',
  'POST',
  'POD',
  'CLUB',
  'PROFILE',
  'PRODUCT',
];

/** Where the Legal team has taken it. */
export type ReportStatus = 'RECEIVED' | 'IN_REVIEW' | 'ACTIONED' | 'DISMISSED';
export const REPORT_STATUSES: ReportStatus[] = ['RECEIVED', 'IN_REVIEW', 'ACTIONED', 'DISMISSED'];

/**
 * Something a reviewer did to a report, in the order it happened.
 *
 * TAKEN_DOWN and LOOKS_GOOD are the two verdicts; the MAIL pair records that
 * somebody was written to (and what was said), because "did we tell them?" is
 * the first question asked when a take-down is disputed.
 */
export type ReportActionType =
  | 'TAKEN_DOWN'
  | 'LOOKS_GOOD'
  | 'MAIL_REPORTER'
  | 'MAIL_OWNER'
  | 'STATUS_CHANGED';
export const REPORT_ACTION_TYPES: ReportActionType[] = [
  'TAKEN_DOWN',
  'LOOKS_GOOD',
  'MAIL_REPORTER',
  'MAIL_OWNER',
  'STATUS_CHANGED',
];

export interface IReportAction {
  _id: Types.ObjectId;
  action: ReportActionType;
  by: Types.ObjectId;
  at: Date;
  /** The reviewer's note, or the message that was mailed. */
  note: string;
}

export interface IContentReport extends Document {
  /** The permanent handle: RPT-000001. Minted on insert, never reused. */
  report_no: string | null;
  target_type: ReportTargetType;
  target_id: Types.ObjectId;
  /** Who owns the reported thing — the author of the story, the host of the pod. */
  target_owner_id: Types.ObjectId | null;
  /** Set when the target belongs to a club, so Legal can see which one. */
  club_id: Types.ObjectId | null;
  /**
   * What the reporter was looking at, copied at report time.
   *
   * A story is gone in 24 hours and a post can be deleted the moment it is
   * reported — which is precisely what someone reported for nudity would do.
   * Without a snapshot the Legal queue fills with rows pointing at nothing,
   * and there is no way to tell a real report from a malicious one.
   */
  target_preview_url: string;
  target_caption: string;
  /**
   * The `key` of the report category the reporter picked.
   *
   * A string, not an enum: the categories are data Legal manages (see
   * `reportCategory.model`), so a new one must not need a schema change.
   */
  reason: string;
  /** The reporter's own words. Required when the category says so. */
  details: string;
  reporter_id: Types.ObjectId;
  status: ReportStatus;
  /** What Legal did about it. Staff-only. */
  resolution: string;
  handled_by: Types.ObjectId | null;
  resolved_at: Date | null;
  /** Stamped when Legal took the reported content down. */
  target_removed_at: Date | null;
  /** Everything reviewers did to this report, oldest first. Staff-only. */
  history: IReportAction[];
  created_at: Date;
  updated_at: Date;
}

const contentReportSchema = new Schema<IContentReport>(
  {
    report_no: { type: String, default: null, unique: true, sparse: true, index: true },
    target_type: { type: String, enum: REPORT_TARGET_TYPES, required: true, index: true },
    target_id: { type: Schema.Types.ObjectId, required: true, index: true },
    target_owner_id: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    club_id: { type: Schema.Types.ObjectId, ref: 'Club', default: null, index: true },
    target_preview_url: { type: String, default: '', trim: true, maxlength: 2000 },
    target_caption: { type: String, default: '', trim: true, maxlength: 2000 },
    reason: { type: String, required: true, trim: true, uppercase: true, index: true },
    details: { type: String, default: '', trim: true, maxlength: 2000 },
    reporter_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: REPORT_STATUSES, default: 'RECEIVED', index: true },
    resolution: { type: String, default: '', trim: true, maxlength: 5000 },
    handled_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    resolved_at: { type: Date, default: null },
    target_removed_at: { type: Date, default: null },
    history: {
      type: [
        {
          action: { type: String, enum: REPORT_ACTION_TYPES, required: true },
          by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
          at: { type: Date, required: true },
          note: { type: String, default: '', trim: true, maxlength: 5000 },
        },
      ],
      default: [],
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// The queue view: open reports, oldest first — the clock runs on the oldest.
contentReportSchema.index({ status: 1, created_at: 1 });

/**
 * One report per person per thing.
 *
 * Without it the Report button is a mass-flagging tool: tapping it twenty times
 * files twenty rows and makes one annoyed user look like a pile-on. A repeat
 * report updates the reason instead of adding a row (see the service).
 */
contentReportSchema.index({ reporter_id: 1, target_type: 1, target_id: 1 }, { unique: true });

// Minted on insert only, so the handle never changes once anyone has quoted it.
contentReportSchema.pre('save', async function (next) {
  if (this.isNew && !this.report_no) {
    this.report_no = await nextEntityNo('RPT', 'content_report');
  }
  next();
});

export const ContentReportModel =
  (mongoose.models.ContentReport as mongoose.Model<IContentReport>) ||
  mongoose.model<IContentReport>('ContentReport', contentReportSchema);
