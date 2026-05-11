import { Schema, model, type Document, Types } from 'mongoose';

export type AppEventType = 'PAGE_VIEW' | 'IMPRESSION' | 'CLICK' | 'TOUCH';

export interface IAppEvent extends Document {
  user_id: Types.ObjectId;
  device_id: string;
  event_type: AppEventType;
  client_event_id: string;
  path: string;
  route: string;
  title: string;
  target_tag: string;
  target_text: string;
  target_label: string;
  target_role: string;
  target_href: string;
  super_category_slug: string | null;
  pod_id: Types.ObjectId | null;
  checkout_url: string;
  metadata: Record<string, unknown>;
  occurred_at: Date;
  created_at: Date;
  updated_at: Date;
}

const appEventSchema = new Schema<IAppEvent>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    device_id: { type: String, required: true, trim: true, index: true },
    event_type: { type: String, enum: ['PAGE_VIEW', 'IMPRESSION', 'CLICK', 'TOUCH'], required: true, index: true },
    client_event_id: { type: String, default: '', trim: true, index: true },
    path: { type: String, default: '', trim: true, index: true },
    route: { type: String, default: '', trim: true },
    title: { type: String, default: '', trim: true },
    target_tag: { type: String, default: '', trim: true },
    target_text: { type: String, default: '', trim: true },
    target_label: { type: String, default: '', trim: true },
    target_role: { type: String, default: '', trim: true },
    target_href: { type: String, default: '', trim: true },
    super_category_slug: { type: String, default: null, lowercase: true, trim: true, index: true },
    pod_id: { type: Schema.Types.ObjectId, ref: 'Pod', default: null, index: true },
    checkout_url: { type: String, default: '', trim: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    occurred_at: { type: Date, default: Date.now, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

appEventSchema.index({ user_id: 1, occurred_at: -1 });
appEventSchema.index({ user_id: 1, path: 1, occurred_at: -1 });
appEventSchema.index({ device_id: 1, client_event_id: 1 });

export const AppEventModel = model<IAppEvent>('AppEvent', appEventSchema);