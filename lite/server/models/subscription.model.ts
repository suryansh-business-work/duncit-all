import { Schema, model, type InferSchemaType } from 'mongoose';

/** A person following a calendar: they are emailed when it publishes an event. */
const subscriptionSchema = new Schema(
  {
    calendar_id: { type: Schema.Types.ObjectId, ref: 'LiteCalendar', required: true, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'LiteUser', required: true, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

subscriptionSchema.index({ calendar_id: 1, user_id: 1 }, { unique: true });

export type LiteSubscription = InferSchemaType<typeof subscriptionSchema>;
export const LiteSubscriptionModel = model('LiteSubscription', subscriptionSchema, 'lite_calendar_subscriptions');
