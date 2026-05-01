import { Schema, model, Types, type Document } from 'mongoose';

export interface IMedia {
  url: string;
  type: 'IMAGE' | 'VIDEO';
}

export interface IClub extends Document {
  club_id: string;
  club_name: string;
  club_description?: string;
  club_feature_images_and_videos: IMedia[];
  club_whats_app_community_link?: string;
  club_whats_app_announcement_link?: string;
  club_whats_app_group_link?: string;
  club_moments: IMedia[];
  meetup_venues_id: string[];
  category_id: Types.ObjectId | null;
  super_category_id: Types.ObjectId | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const mediaSchema = new Schema<IMedia>(
  {
    url: { type: String, required: true },
    type: { type: String, enum: ['IMAGE', 'VIDEO'], default: 'IMAGE' },
  },
  { _id: false }
);

const clubSchema = new Schema<IClub>(
  {
    club_id: { type: String, required: true, unique: true, lowercase: true, trim: true },
    club_name: { type: String, required: true, trim: true },
    club_description: { type: String, default: '' },
    club_feature_images_and_videos: { type: [mediaSchema], default: [] },
    club_whats_app_community_link: { type: String, default: '' },
    club_whats_app_announcement_link: { type: String, default: '' },
    club_whats_app_group_link: { type: String, default: '' },
    club_moments: { type: [mediaSchema], default: [] },
    meetup_venues_id: { type: [String], default: [] },
    category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    super_category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const ClubModel = model<IClub>('Club', clubSchema);
