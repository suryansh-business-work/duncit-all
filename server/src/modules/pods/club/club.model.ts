import { Schema, model, Types, type Document } from 'mongoose';

export interface IMedia {
  url: string;
  type: 'IMAGE' | 'VIDEO';
}

export interface IClubFaq {
  question: string;
  answer: string;
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
  /** Admin-authored Club Detail page content, each shown as bullets. */
  who_we_are: string[];
  what_we_do: string[];
  perks: string[];
  values: string[];
  faqs: IClubFaq[];
  meetup_venues_id: string[];
  /** Hosts explicitly linked to this club by an admin (Bug 5). When empty the
   *  Club Detail page falls back to the hosts of the club's pods. */
  host_ids: Types.ObjectId[];
  category_id: Types.ObjectId | null;
  super_category_id: Types.ObjectId | null;
  /** Admin-set verified badge for official clubs (explore item 15). */
  is_verified: boolean;
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

const faqSchema = new Schema<IClubFaq>(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
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
    who_we_are: { type: [String], default: [] },
    what_we_do: { type: [String], default: [] },
    perks: { type: [String], default: [] },
    values: { type: [String], default: [] },
    faqs: { type: [faqSchema], default: [] },
    meetup_venues_id: { type: [String], default: [] },
    host_ids: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
    category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    super_category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    is_verified: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const ClubModel = model<IClub>('Club', clubSchema);
