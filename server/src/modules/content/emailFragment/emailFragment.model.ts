import mongoose, { Schema, Document } from 'mongoose';
import { EMAIL_CATEGORIES } from '@services/email/email.provider';

/**
 * The header and footer that wrap a template's body, one pair per email
 * category. A billing email and a marketing blast need different footers —
 * one carries a tax line, the other an unsubscribe — and that difference
 * belongs in one editable place, not copied into every template.
 *
 * Nine ship with the product, one per email category, and those nine cannot be
 * deleted: a template that lost its header mid-flight would send bare, and the
 * category list is closed in code so a replacement could never be seeded back.
 * Beyond those, an admin can add as many of their own as they like — a seasonal
 * banner, a footer for one campaign — and delete them again.
 *
 * Identity is `key`, not `category`: a custom fragment belongs to no category,
 * and a template names the fragment it wants by key.
 */
export interface IEmailFragment extends Document {
  fragment_id: string;
  /** Stable, immutable identity. A template stores this. */
  key: string;
  /**
   * One of EMAIL_CATEGORIES for the nine that ship; null for one an admin
   * added. A category has at most one fragment.
   */
  category: string | null;
  /** True for the nine. They can be edited and switched off, never deleted. */
  is_system: boolean;
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
    key: { type: String, required: true, unique: true, index: true, trim: true },
    // No `index: true` here — the partial unique index below is the only one.
    category: { type: String, default: null, enum: [...EMAIL_CATEGORIES, null] },
    is_system: { type: Boolean, default: false },
    name: { type: String, required: true },
    description: String,
    header_mjml: { type: String, default: '' },
    footer_mjml: { type: String, default: '' },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

/**
 * At most one fragment per category — but only among the ones that HAVE a
 * category. A `sparse` unique index is the obvious answer and the wrong one:
 * sparse skips documents where the field is ABSENT, and every custom fragment
 * stores an explicit `null`, so the second one collides with the first. A
 * partial index on "is a string" is what actually means "ignore the nulls".
 */
EmailFragmentSchema.index(
  { category: 1 },
  { unique: true, partialFilterExpression: { category: { $type: 'string' } } }
);

export const EmailFragmentModel =
  (mongoose.models.EmailFragment as mongoose.Model<IEmailFragment>) ||
  mongoose.model<IEmailFragment>('EmailFragment', EmailFragmentSchema);
