import { Schema, model, Types, type Document } from 'mongoose';

export type FeedbackStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED';

export interface IFeedbackReport extends Document {
  /** Permanent, human-readable id (DUN-RPT-000001) — never reused. */
  report_no: string;
  user_id: Types.ObjectId;
  user_name: string;
  user_email: string;
  /** One of the configured category chips, stored as the label it was sent as. */
  category: string;
  message: string;
  /** Screenshots the reporter attached. A picture of the broken screen is the
   * whole point of "report a problem", so they travel with the row. */
  media_urls: string[];
  /**
   * Who reported it, AS THEY WERE at the moment they reported it.
   *
   * A snapshot, not a join. Support reads these reports days later, by which
   * time the reporter may have changed their phone, moved city or lost a role —
   * and "what did their account look like when this broke?" is the question the
   * log has to answer. `user_id` is still stored, so the live profile is one
   * click away when the current state is what matters instead.
   */
  reporter_phone: string;
  reporter_city: string;
  reporter_locale: string;
  reporter_roles: string[];
  /** 'web' | 'ios' | 'android' — labelling only. */
  platform: string;
  app_version: string;
  /** What they were running it on. A bug report without the device is a bug
   * report that cannot be reproduced. */
  device_os: string;
  device_model: string;
  /** The screen they were on when they opened the form. */
  source_screen: string;
  status: FeedbackStatus;
  /**
   * What happened to the Slack announcement. Slack is a NOTIFICATION, not the
   * store of record — the row below is. Recording the outcome here is what lets
   * Support tell "nobody looked at it" from "it never got announced", which is
   * invisible when a failed post simply throws the submission away.
   */
  slack_ts: string | null;
  slack_error: string | null;
  created_at: Date;
  updated_at: Date;
}

const feedbackReportSchema = new Schema<IFeedbackReport>(
  {
    report_no: { type: String, required: true, unique: true, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    user_name: { type: String, default: '' },
    user_email: { type: String, default: '', index: true },
    category: { type: String, required: true, trim: true, index: true },
    message: { type: String, required: true, trim: true },
    media_urls: { type: [String], default: [] },
    reporter_phone: { type: String, default: '' },
    reporter_city: { type: String, default: '' },
    reporter_locale: { type: String, default: '' },
    reporter_roles: { type: [String], default: [] },
    platform: { type: String, default: 'app' },
    app_version: { type: String, default: '' },
    device_os: { type: String, default: '' },
    device_model: { type: String, default: '' },
    source_screen: { type: String, default: '' },
    status: {
      type: String,
      enum: ['OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED'],
      default: 'OPEN',
      index: true,
    },
    slack_ts: { type: String, default: null },
    slack_error: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// The list is read newest-first and filtered by status, which is the one index
// the table actually leans on.
feedbackReportSchema.index({ created_at: -1 });

export const FeedbackReportModel = model<IFeedbackReport>('FeedbackReport', feedbackReportSchema);

// Atomic sequential counter for report ids (same pattern as BackoutRequestCounter).
interface IFeedbackCounter extends Document {
  singleton_key: string;
  seq: number;
}

const feedbackCounterSchema = new Schema<IFeedbackCounter>({
  singleton_key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

export const FeedbackCounterModel = model<IFeedbackCounter>(
  'FeedbackReportCounter',
  feedbackCounterSchema
);

/** Next globally unique report id, e.g. `DUN-RPT-000001` — never reused. */
export async function nextReportNo(): Promise<string> {
  const doc = await FeedbackCounterModel.findOneAndUpdate(
    { singleton_key: 'feedback_report' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return `DUN-RPT-${String(doc.seq).padStart(6, '0')}`;
}

export interface IReportProblemCategory {
  /** Stable key stored on the report, so renaming a label never orphans rows. */
  key: string;
  label: string;
  is_active: boolean;
  sort_order: number;
}

export interface IReportProblemConfig extends Document {
  singleton_key: string;
  /** The chips the app renders. Admin-editable — the app used to hardcode them,
   * which is why adding one meant a release. */
  categories: IReportProblemCategory[];
  /** Copy for the free-text field, so the prompt can be reworded without a build. */
  message_label: string;
  message_hint: string;
  message_min_length: number;
  /** Screenshots allowed, and how many. */
  allow_media: boolean;
  max_media: number;
  updated_at: Date;
}

const reportProblemConfigSchema = new Schema<IReportProblemConfig>(
  {
    singleton_key: { type: String, required: true, unique: true, default: 'report_problem' },
    categories: {
      type: [
        new Schema<IReportProblemCategory>(
          {
            key: { type: String, required: true, trim: true },
            label: { type: String, required: true, trim: true },
            is_active: { type: Boolean, default: true },
            sort_order: { type: Number, default: 0 },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    message_label: { type: String, default: "What's going on?" },
    message_hint: { type: String, default: 'At least 10 characters.' },
    message_min_length: { type: Number, default: 10 },
    allow_media: { type: Boolean, default: true },
    max_media: { type: Number, default: 5 },
  },
  { timestamps: { createdAt: false, updatedAt: 'updated_at' } }
);

export const ReportProblemConfigModel = model<IReportProblemConfig>(
  'ReportProblemConfig',
  reportProblemConfigSchema
);

/** What the app showed before any of this was configurable — seeded on first
 * read so a fresh install renders the same four chips it always did. */
export const DEFAULT_CATEGORIES: IReportProblemCategory[] = [
  { key: 'BUG', label: 'Bug', is_active: true, sort_order: 0 },
  { key: 'IDEA', label: 'Idea', is_active: true, sort_order: 1 },
  { key: 'QUESTION', label: 'Question', is_active: true, sort_order: 2 },
  { key: 'OTHER', label: 'Other', is_active: true, sort_order: 3 },
];
