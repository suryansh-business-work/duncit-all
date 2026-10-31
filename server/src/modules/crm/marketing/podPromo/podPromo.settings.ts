import { z } from 'zod';
import { GraphQLError } from 'graphql';
import { isValidObjectId } from 'mongoose';
import { getAppTimeZone } from '@utils/app-time';
import { URL_SLUG } from '@utils/regex';
import { UserModel } from '@modules/access/user/user.model';
import { SocialAccountModel } from '../social/social.model';
import { PodPromoSettingsModel, type PodPromoSettingsDoc } from './podPromo.model';
import { BANNER_SIZES, PRICE_FILTERS, SETTINGS_LIMITS } from './podPromo.types';

export type PodPromoSettingsInput = z.infer<typeof inputSchema>;

const L = SETTINGS_LIMITS;
const ids = z.array(z.string().trim().refine(isValidObjectId, 'is not a valid id')).max(L.filter_ids.max);
const whole = (bounds: { min: number; max: number }) => z.number().int().min(bounds.min).max(bounds.max);

const inputSchema = z
  .object({
    enabled: z.boolean(),
    days_before: whole(L.days_before),
    post_hour: whole(L.post_hour),
    account_ids: ids.max(L.account_ids.max),
    needs_approval: z.boolean(),
    city_ids: ids,
    club_ids: ids,
    category_ids: ids,
    price_filter: z.enum(PRICE_FILTERS),
    min_days_until_start: whole(L.min_days_until_start),
    banner_style: z.enum(BANNER_SIZES),
    cta_text: z.string().trim().max(L.cta_text.max),
    utm_prefix: z.string().trim().toLowerCase().max(L.utm_prefix.max).refine((value) => value === '' || URL_SLUG.test(value), 'uses lowercase letters, digits and single dashes only'),
  })
  // A switched-on planner with nowhere to post would fail every pod it touched.
  .refine((value) => !value.enabled || value.account_ids.length > 0, { message: 'Pick at least one account before switching promotions on', path: ['account_ids'] });

const badInput = (message: string) => new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

/** The settings document, created with its defaults the first time it is read. */
export async function loadPromoSettings(): Promise<PodPromoSettingsDoc> {
  const doc = await PodPromoSettingsModel.findOneAndUpdate(
    { key: 'default' },
    { $setOnInsert: { key: 'default' } },
    { upsert: true, new: true }
  ).lean<PodPromoSettingsDoc>();
  if (!doc) throw new Error('Pod promotion settings could not be read');
  return doc;
}

export function pubSettings(doc: PodPromoSettingsDoc) {
  return {
    enabled: doc.enabled,
    days_before: doc.days_before,
    post_hour: doc.post_hour,
    account_ids: doc.account_ids,
    needs_approval: doc.needs_approval,
    city_ids: doc.city_ids,
    club_ids: doc.club_ids,
    category_ids: doc.category_ids,
    price_filter: doc.price_filter,
    min_days_until_start: doc.min_days_until_start,
    banner_style: doc.banner_style,
    cta_text: doc.cta_text,
    utm_prefix: doc.utm_prefix,
    time_zone: getAppTimeZone(),
    updated_by_name: doc.updated_by_name,
    updated_at: doc.updated_at instanceof Date ? doc.updated_at.toISOString() : null,
  };
}

/** Every chosen account must still be connected; one that is not would fail each post. */
async function assertAccounts(accountIds: readonly string[]) {
  if (accountIds.length === 0) return;
  const found = await SocialAccountModel.countDocuments({ _id: { $in: [...new Set(accountIds)] } });
  if (found !== new Set(accountIds).size) throw badInput('One of the chosen accounts is no longer connected.');
}

async function nameOf(userId: string): Promise<string> {
  const user = await UserModel.findById(userId).select('profile.first_name profile.last_name').lean<{ profile?: { first_name?: string; last_name?: string } }>();
  return [user?.profile?.first_name, user?.profile?.last_name].filter(Boolean).join(' ');
}

export async function savePromoSettings(input: unknown, userId: string) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    throw badInput(parsed.error.issues.map((issue) => `${issue.path.join('.') || 'settings'} ${issue.message}`).join('; '));
  }
  await assertAccounts(parsed.data.account_ids);
  const doc = await PodPromoSettingsModel.findOneAndUpdate(
    { key: 'default' },
    { $set: { ...parsed.data, utm_prefix: parsed.data.utm_prefix || 'pod-promo', updated_by: userId, updated_by_name: await nameOf(userId) } },
    { upsert: true, new: true }
  ).lean<PodPromoSettingsDoc>();
  if (!doc) throw new Error('Pod promotion settings could not be saved');
  return pubSettings(doc);
}
