import { Schema, model, Document, Types } from 'mongoose';

/**
 * A host's in-progress "Create Pod" stepper, autosaved server-side so an
 * unfinished pod can be resumed later from Host Management. Drafts live in
 * their own collection (never the live `pods` collection) so they can never
 * leak into public feeds. The full stepper state is stored as an opaque JSON
 * `payload` string (the clients own the typed shape); `pod_title`/`pod_mode`/
 * `step` are denormalised for the drafts list UI.
 */
export interface IPodDraft extends Document {
  user_id: Types.ObjectId;
  payload: string;
  pod_title: string;
  pod_mode: string;
  step: number;
  created_at: Date;
  updated_at: Date;
}

const podDraftSchema = new Schema<IPodDraft>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    payload: { type: String, default: '' },
    pod_title: { type: String, default: '' },
    pod_mode: { type: String, default: 'PHYSICAL' },
    step: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

podDraftSchema.index({ user_id: 1, updated_at: -1 });

export const PodDraftModel = model<IPodDraft>('PodDraft', podDraftSchema);
