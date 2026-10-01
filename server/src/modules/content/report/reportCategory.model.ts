import mongoose, { Schema, type Document } from 'mongoose';

/**
 * A reason a person can pick when they report somebody's content.
 *
 * These used to be a fixed enum compiled into the server, both apps and the
 * Legal portal, so adding "Copyright" meant three releases. They are data now:
 * Legal > UGC Monitoring > Settings owns the list, and the report dialog on
 * mWeb and the native app renders whatever is active here.
 *
 * `key` is what a report stores, and it never changes once minted — a rename
 * edits `label` only, so every report already filed keeps pointing at the same
 * category and simply reads with its new name.
 */
export interface IReportCategory extends Document {
  /** Immutable handle stored on each report, e.g. COPYRIGHT. */
  key: string;
  /** What the reporter reads in the dialog. */
  label: string;
  /** Optional line under the label that says what belongs in this category. */
  description: string;
  /** True when the label says nothing on its own and the words are required. */
  requires_details: boolean;
  sort_order: number;
  /** Off hides it from the dialog; reports already filed under it keep it. */
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const reportCategorySchema = new Schema<IReportCategory>(
  {
    key: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 60 },
    label: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: '', trim: true, maxlength: 200 },
    requires_details: { type: Boolean, default: false },
    sort_order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// The dialog's read: active ones, in the order Legal arranged them.
reportCategorySchema.index({ is_active: 1, sort_order: 1 });

export const ReportCategoryModel =
  (mongoose.models.ReportCategory as mongoose.Model<IReportCategory>) ||
  mongoose.model<IReportCategory>('ReportCategory', reportCategorySchema);

type SeedCategory = Pick<IReportCategory, 'key' | 'label' | 'description' | 'requires_details'>;

/**
 * What a fresh database starts with.
 *
 * The first seven keys and OTHER are the enum members reports were filed under
 * before categories became data, so every existing report still resolves to a
 * label without a migration. COPYRIGHT is the one Legal asked for that the enum
 * never had. Ordered by how often a real report turns out to be one of them;
 * the catch-all is last because it is the one that costs the reporter typing.
 */
export const DEFAULT_REPORT_CATEGORIES: readonly SeedCategory[] = [
  { key: 'SPAM', label: 'Spam or misleading', description: '', requires_details: false },
  { key: 'NUDITY', label: 'Nudity or sexual content', description: '', requires_details: false },
  { key: 'HARASSMENT', label: 'Harassment or bullying', description: '', requires_details: false },
  { key: 'HATE', label: 'Hate speech or symbols', description: '', requires_details: false },
  { key: 'VIOLENCE', label: 'Violence or dangerous acts', description: '', requires_details: false },
  { key: 'MISINFORMATION', label: 'False information', description: '', requires_details: false },
  { key: 'SCAM', label: 'Scam or fraud', description: '', requires_details: false },
  {
    key: 'COPYRIGHT',
    label: 'Copyright or trademark issue',
    description: 'It uses work or a brand that belongs to someone else.',
    requires_details: true,
  },
  { key: 'OTHER', label: 'Something else', description: '', requires_details: true },
];
