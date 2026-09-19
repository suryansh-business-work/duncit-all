import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

/** A host's public page: their events, and the people who follow it. */
const calendarSchema = new Schema(
  {
    owner_id: { type: Schema.Types.ObjectId, ref: 'LiteUser', required: true, index: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    avatar_url: { type: String, default: '' },
    cover_url: { type: String, default: '' },
    city_slug: { type: String, default: '', index: true },
    featured: { type: Boolean, default: false, index: true },
    subscriber_count: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

export type LiteCalendar = InferSchemaType<typeof calendarSchema>;
export type LiteCalendarDoc = HydratedDocument<LiteCalendar>;
export const LiteCalendarModel = model('LiteCalendar', calendarSchema, 'lite_calendars');
