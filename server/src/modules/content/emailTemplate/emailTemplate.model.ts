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
