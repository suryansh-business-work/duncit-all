import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Page views of one event on one day (in the event's own zone), for the
 * host's Insights tab. One counter row per event per day — never a row per
 * visit, and nothing about who the visitor was.
 */
const eventViewSchema = new Schema(
  {
    event_id: { type: Schema.Types.ObjectId, ref: 'LiteEvent', required: true },
    /** yyyy-MM-dd in the event's time zone. */
    day: { type: String, required: true },
    views: { type: Number, default: 0, min: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

eventViewSchema.index({ event_id: 1, day: 1 }, { unique: true });
// Ninety days is all Insights ever shows.
eventViewSchema.index({ updated_at: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export type LiteEventView = InferSchemaType<typeof eventViewSchema>;
export const LiteEventViewModel = model('LiteEventView', eventViewSchema, 'lite_event_views');
