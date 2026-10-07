import mongoose, { Schema, Types, type Document } from 'mongoose';
import { GraphQLError } from 'graphql';
import { appFormat } from '@utils/app-time';
import { HostModel } from '@modules/venues/host/host.model';
import { VenueModel } from '@modules/venues/venue/venue.model';

/** The cap that applies until an admin sets one. */
export const DEFAULT_MONTHLY_PARTNER_REQUESTS = 10;

export type QuotaOwner = 'VENUE' | 'HOST';

interface IPartnerRequestQuota extends Document {
  owner_kind: QuotaOwner;
  owner_id: Types.ObjectId;
  /** 'yyyy-MM' in the app's time zone. */
  month: string;
  count: number;
}

const quotaSchema = new Schema<IPartnerRequestQuota>(
  {
    owner_kind: { type: String, enum: ['VENUE', 'HOST'], required: true },
    owner_id: { type: Schema.Types.ObjectId, required: true },
    month: { type: String, required: true },
    count: { type: Number, default: 0 },
  },
  { timestamps: false }
);
quotaSchema.index({ owner_kind: 1, owner_id: 1, month: 1 }, { unique: true, name: 'one_per_owner_month' });

export const PartnerRequestQuotaModel =
  (mongoose.models.PartnerRequestQuota as mongoose.Model<IPartnerRequestQuota>) ||
  mongoose.model<IPartnerRequestQuota>('PartnerRequestQuota', quotaSchema);

const currentMonth = () => appFormat(new Date(), 'yyyy-MM');
const DUPLICATE_KEY = 11000;

/**
 * The cap that applies: the admin-set limit when there is one, else the
 * default. Partners cannot change it. VENUE quotas count per venue
 * (`ownerId` = the venue id); HOST quotas per host user.
 */
export async function monthlyLimit(kind: QuotaOwner, ownerId: string): Promise<number> {
  if (kind === 'VENUE') {
    const venue = await VenueModel.findById(ownerId)
      .select('host_requests_limit_override')
      .lean<{ host_requests_limit_override?: number | null }>();
    return venue?.host_requests_limit_override ?? DEFAULT_MONTHLY_PARTNER_REQUESTS;
  }
  const host = await HostModel.findOne({ user_id: new Types.ObjectId(ownerId) })
    .select('venue_requests_limit_override')
    .lean<{ venue_requests_limit_override?: number | null }>();
  return host?.venue_requests_limit_override ?? DEFAULT_MONTHLY_PARTNER_REQUESTS;
}

/** This month's {limit, used, remaining}, for the search screens. */
export async function quotaStatus(kind: QuotaOwner, ownerId: string) {
  const [limit, row] = await Promise.all([
    monthlyLimit(kind, ownerId),
    PartnerRequestQuotaModel.findOne({ owner_kind: kind, owner_id: new Types.ObjectId(ownerId), month: currentMonth() })
      .select('count')
      .lean(),
  ]);
  const used = row?.count ?? 0;
  return { limit, used, remaining: Math.max(0, limit - used) };
}

/**
 * Takes one request from this month's allowance, atomically: the increment
 * only matches while `count < limit`, and once the row is at the cap the
 * upsert collides with the unique index instead — so two concurrent sends can
 * never both take the last one. Returns a release for when the send fails.
 */
export async function reserveMonthlyRequest(kind: QuotaOwner, ownerId: string): Promise<() => Promise<void>> {
  const limit = await monthlyLimit(kind, ownerId);
  const refused = () =>
    new GraphQLError(`You have used all ${limit} requests for this month.`, {
      extensions: { code: 'LIMIT_REACHED', limit },
    });
  if (limit <= 0) throw refused();
  const key = { owner_kind: kind, owner_id: new Types.ObjectId(ownerId), month: currentMonth() };
  try {
    await PartnerRequestQuotaModel.findOneAndUpdate(
      { ...key, count: { $lt: limit } },
      { $inc: { count: 1 } },
      { upsert: true, new: true }
    );
  } catch (err) {
    if ((err as { code?: number }).code === DUPLICATE_KEY) throw refused();
    throw err;
  }
  return async () => {
    await PartnerRequestQuotaModel.updateOne({ ...key, count: { $gt: 0 } }, { $inc: { count: -1 } });
  };
}
