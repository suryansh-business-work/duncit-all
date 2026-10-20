/**
 * Mongoose shape of `Venue.pricing` and of a booking's frozen price
 * (`VenueSlot.price_snapshot`). Kept beside the calculation so the stored
 * fields and the math that reads them move together.
 */
import { Schema } from 'mongoose';
import {
  PRICE_RULE_MODES,
  PRICE_RULE_TYPES,
  VENUE_PRICING_MODELS,
  type VenuePriceBreakdown,
  type VenuePricing,
} from './venuePricing.types';

const MAX_RUPEES = 1_000_000;

const pricingSlotSchema = new Schema(
  {
    start_time: { type: String, required: true },
    end_time: { type: String, required: true },
    price: { type: Number, required: true, min: 0, max: MAX_RUPEES },
    days_of_week: { type: [Number], default: [] },
  },
  { _id: false }
);

const dayHoursSchema = new Schema(
  {
    day: { type: Number, required: true, min: 0, max: 6 },
    open: { type: String, required: true },
    close: { type: String, required: true },
  },
  { _id: false }
);

const priceRuleSchema = new Schema(
  {
    type: { type: String, enum: PRICE_RULE_TYPES, required: true },
    label: { type: String, default: '', trim: true, maxlength: 80 },
    days: { type: [Number], default: [] },
    dates: { type: [String], default: [] },
    from: { type: String, default: null },
    to: { type: String, default: null },
    mode: { type: String, enum: PRICE_RULE_MODES, required: true },
    value: { type: Number, required: true, min: -MAX_RUPEES, max: MAX_RUPEES },
  },
  { _id: false }
);

export const venuePricingSchema = new Schema<VenuePricing>(
  {
    // null = the venue has not set its pricing up yet and cannot be booked.
    model: { type: String, enum: [...VENUE_PRICING_MODELS, null], default: null },
    base_rate: { type: Number, default: 0, min: 0, max: MAX_RUPEES },
    min_pax: { type: Number, default: 0, min: 0, max: 100_000 },
    max_pax: { type: Number, default: 0, min: 0, max: 100_000 },
    min_hours: { type: Number, default: 0, min: 0, max: 24 },
    max_hours: { type: Number, default: 0, min: 0, max: 24 },
    booking_increment_minutes: { type: Number, default: 60, min: 0, max: 1440 },
    min_spend: { type: Number, default: 0, min: 0, max: MAX_RUPEES },
    slots: { type: [pricingSlotSchema], default: [] },
    operating_hours: { type: [dayHoursSchema], default: [] },
    price_rules: { type: [priceRuleSchema], default: [] },
    deposit: { type: Number, default: 0, min: 0, max: MAX_RUPEES },
    cleaning_fee: { type: Number, default: 0, min: 0, max: MAX_RUPEES },
    pet_fee: { type: Number, default: 0, min: 0, max: MAX_RUPEES },
    gst_enabled: { type: Boolean, default: false },
    blocked_dates: { type: [String], default: [] },
  },
  { _id: false }
);

const appliedRuleSchema = new Schema(
  {
    type: { type: String, required: true },
    label: { type: String, default: '' },
    mode: { type: String, required: true },
    value: { type: Number, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

/** A booking's price, frozen when it was confirmed. Later rate edits never touch it. */
export const priceSnapshotSchema = new Schema<VenuePriceBreakdown & { confirmed_at: Date }>(
  {
    model: { type: String, enum: VENUE_PRICING_MODELS, required: true },
    rate: { type: Number, required: true },
    pax: { type: Number, default: 0 },
    hours: { type: Number, default: 0 },
    date: { type: String, required: true },
    base: { type: Number, required: true },
    rules: { type: [appliedRuleSchema], default: [] },
    rules_total: { type: Number, default: 0 },
    min_spend_top_up: { type: Number, default: 0 },
    cleaning_fee: { type: Number, default: 0 },
    pet_fee: { type: Number, default: 0 },
    venue_price: { type: Number, required: true },
    gst_pct: { type: Number, default: 0 },
    taxes: { type: Number, default: 0 },
    venue_payout: { type: Number, required: true },
    platform_fee_pct: { type: Number, default: 0 },
    platform_fee: { type: Number, default: 0 },
    total: { type: Number, required: true },
    deposit: { type: Number, default: 0 },
    confirmed_at: { type: Date, required: true },
  },
  { _id: false }
);
