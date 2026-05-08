import { Schema, model, Document } from 'mongoose';

export interface IPodPlan extends Document {
  key: string;
  name: string;
  description: string;
  image_url: string;
  features: string[];
  price_label: string;
  is_coming_soon: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const podPlanSchema = new Schema<IPodPlan>(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    image_url: { type: String, default: '' },
    features: { type: [String], default: [] },
    price_label: { type: String, default: '' },
    is_coming_soon: { type: Boolean, default: false },
    sort_order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

podPlanSchema.index({ sort_order: 1, name: 1 });

export const PodPlanModel = model<IPodPlan>('PodPlan', podPlanSchema);
