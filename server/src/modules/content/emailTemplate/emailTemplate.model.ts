import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailTemplate extends Document {
  template_id: string;
  /** Stable identifier referenced from code, e.g. "welcome", "payment-receipt". */
  slug: string;
  name: string;
  description?: string;
  subject: string;
  /** MJML source. Rendered to HTML at send time. */
  mjml: string;
  /**
   * Which header/footer fragment wraps this template's body. Null means none —
   * and null is the DEFAULT, because every template that shipped before
   * fragments existed already draws its own header and footer, and turning
   * them all on at once would double every logo.
   */
  fragment_category?: string | null;
  /** Declared variables for documentation / autocompletion. */
  variables: { key: string; description?: string; sample?: string }[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const VariableSchema = new Schema(
  {
    key: { type: String, required: true },
    description: String,
    sample: String,
  },
  { _id: false }
);

const EmailTemplateSchema = new Schema<IEmailTemplate>(
  {
    template_id: { type: String, required: true, unique: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: String,
    subject: { type: String, required: true },
    mjml: { type: String, required: true },
    variables: { type: [VariableSchema], default: [] },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const EmailTemplateModel =
  (mongoose.models.EmailTemplate as mongoose.Model<IEmailTemplate>) ||
  mongoose.model<IEmailTemplate>('EmailTemplate', EmailTemplateSchema);
