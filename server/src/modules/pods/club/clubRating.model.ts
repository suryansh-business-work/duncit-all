import { Schema, model, Types, type Document } from 'mongoose';

export interface IClubRating extends Document {
  club_id: Types.ObjectId;
  user_id: Types.ObjectId;
  stars: number;
  comment?: string;
  created_at: Date;
  updated_at: Date;
}

const clubRatingSchema = new Schema<IClubRating>(
  {
    club_id: { type: Schema.Types.ObjectId, required: true },
    user_id: { type: Schema.Types.ObjectId, required: true },
    stars: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// One rating per user per club (upsert on re-rate)
clubRatingSchema.index({ club_id: 1, user_id: 1 }, { unique: true });

export const ClubRatingModel = model<IClubRating>('ClubRating', clubRatingSchema);
