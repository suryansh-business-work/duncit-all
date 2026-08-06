import mongoose, { Schema, Document } from 'mongoose';
import { EMAIL_CATEGORIES } from '@services/email/email.provider';

/**
 * The header and footer that wrap a template's body, one pair per email
 * category. A billing email and a marketing blast need different footers —
 * one carries a tax line, the other an unsubscribe — and that difference
 * belongs in one editable place, not copied into every template.
 *
 * There are exactly nine, one per category, and there is no way to add or
 * remove one: the categories are a closed set in the code, so a tenth fragment
 * would never be reached and a missing one would leave sends unwrapped. The
 * service seeds all nine on boot and exposes only an update.
 */
export interface IEmailFragment extends Document {
  fragment_id: string;
  /** One of EMAIL_CATEGORIES. Unique — a category has exactly one fragment. */
  category: string;
  name: string;
  description?: string;
  /** MJML injected at the TOP of the template's `<mj-body>`. */
  header_mjml: string;
  /** MJML injected at the BOTTOM of the template's `<mj-body>`. */
  footer_mjml: string;
  /** Off means templates in this category render without the wrap. */
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const EmailFragmentSchema = new Schema<IEmailFragment>(
  {
    fragment_id: { type: String, required: true, unique: true, index: true },
    category: { type: String, required: true, unique: true, index: true, enum: EMAIL_CATEGORIES },
    name: { type: String, required: true },
    description: String,
    header_mjml: { type: String, default: '' },
    footer_mjml: { type: String, default: '' },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const EmailFragmentModel =
  (mongoose.models.EmailFragment as mongoose.Model<IEmailFragment>) ||
  mongoose.model<IEmailFragment>('EmailFragment', EmailFragmentSchema);
