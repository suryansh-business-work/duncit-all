import mongoose, { Schema, type Types } from 'mongoose';
import type { GrowthInputs } from './growthCalculation.rules';

/** Who a record is attributed to, as they were when they acted. */
export interface IGrowthActor {
  user_id: Types.ObjectId;
  name: string;
  email: string | null;
  roles: string[];
}

/** A money figure as stored: Decimal128, so it is exact and sorts numerically. */
type Money = Types.Decimal128;

export interface IGrowthCalculation {
  _id: Types.ObjectId;
  title: string;
  description: string;
  inputs: GrowthInputs;
  per_pod: { pod_value: Money; earnings_per_pod: Money };
  per_city: {
    venues: number;
    hosts: number;
    monthly_pods: number;
    monthly_gmv: Money;
    monthly_earnings: Money;
    host_leads: number;
    venue_leads: number;
  };
  totals: {
    cities: number;
    venues: number;
    hosts: number;
    monthly_pods: number;
    host_leads: number;
    venue_leads: number;
    total_leads: number;
    monthly_gmv: Money;
    monthly_earnings: Money;
    annual_gmv: Money;
    annual_earnings: Money;
  };
  /** Which version of growthCalculation.rules produced the outputs. */
  formula_version: number;
  /** Bumped by every edit; an edit names the revision it was made against. */
  revision: number;
  calculated_by: IGrowthActor;
  last_edited_by: IGrowthActor | null;
  last_edited_at: Date | null;
  /** The record this one was copied from, when it was made with Duplicate. */
  duplicated_from: Types.ObjectId | null;
  /** The browser's id for one press of Save — a repeated press returns the first record. */
  client_request_id: string | null;
  deleted_at: Date | null;
  deleted_by: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const actorSchema = new Schema<IGrowthActor>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, default: '' },
    email: { type: String, default: null },
    roles: { type: [String], default: [] },
  },
  { _id: false }
);

const num = { type: Number, required: true };
const money = { type: Schema.Types.Decimal128, required: true };

const inputsSchema = new Schema<GrowthInputs>(
  {
    pax_per_pod: num,
    price_per_pax: num,
    profit_margin_pct: num,
    hosts_per_venue: num,
    pods_per_host_per_month: num,
    venues_per_city: num,
    target_cities: num,
    host_conversion_pct: num,
    venue_conversion_pct: num,
  },
  { _id: false }
);

/**
 * One saved Growth Calculator run on the Targets console: the nine inputs and
 * every output they produced, as a complete snapshot. Each Save is its own
 * record — nothing here is ever overwritten by another calculation, an edit
 * recalculates the record it belongs to, and Delete only stamps `deleted_at`,
 * so the history a target was set against stays readable.
 */
const growthCalculationSchema = new Schema<IGrowthCalculation>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    inputs: { type: inputsSchema, required: true },
    per_pod: {
      pod_value: money,
      earnings_per_pod: money,
    },
    per_city: {
      venues: num,
      hosts: num,
      monthly_pods: num,
      monthly_gmv: money,
      monthly_earnings: money,
      host_leads: num,
      venue_leads: num,
    },
    totals: {
      cities: num,
      venues: num,
      hosts: num,
      monthly_pods: num,
      host_leads: num,
      venue_leads: num,
      total_leads: num,
      monthly_gmv: money,
      monthly_earnings: money,
      annual_gmv: money,
      annual_earnings: money,
    },
    formula_version: { type: Number, required: true },
    revision: { type: Number, default: 0 },
    calculated_by: { type: actorSchema, required: true },
    last_edited_by: { type: actorSchema, default: null },
    last_edited_at: { type: Date, default: null },
    duplicated_from: { type: Schema.Types.ObjectId, ref: 'GrowthCalculation', default: null },
    client_request_id: { type: String, default: null },
    deleted_at: { type: Date, default: null },
    deleted_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'growth_calculations' }
);

// The listing: live rows, newest first.
growthCalculationSchema.index({ deleted_at: 1, created_at: -1 });
// A second press of the same Save finds the first record instead of writing a
// twin. Partial, so records saved without a request id never collide.
growthCalculationSchema.index(
  { 'calculated_by.user_id': 1, client_request_id: 1 },
  { unique: true, partialFilterExpression: { client_request_id: { $type: 'string' } } }
);

export const GrowthCalculationModel =
  (mongoose.models.GrowthCalculation as mongoose.Model<IGrowthCalculation>) ||
  mongoose.model<IGrowthCalculation>('GrowthCalculation', growthCalculationSchema);
