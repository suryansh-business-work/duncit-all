import mongoose, { Schema, type Document } from 'mongoose';

export interface IContentReportReasonSettings extends Document {
  singleton_key: string;
  options: { id: string; label: string }[];
}

const reasonSettingsSchema = new Schema<IContentReportReasonSettings>(
  {
    singleton_key: { type: String, required: true, unique: true, default: 'ugc' },
    options: {
      type: [{ id: { type: String, required: true }, label: { type: String, required: true } }],
      default: [],
    },
  },
  { timestamps: true },
);

export const ContentReportReasonSettingsModel =
  (mongoose.models.ContentReportReasonSettings as mongoose.Model<IContentReportReasonSettings>) ||
  mongoose.model<IContentReportReasonSettings>('ContentReportReasonSettings', reasonSettingsSchema);
