import { Types } from 'mongoose';
import { StoreSubscriptionModel } from './storeSubscription.model';
import type { IStoreSettings } from './storeSettings.model';
import type { AutoshipDiscount } from './store.pricing';

/**
 * The autoship discount a checkout may claim: only for the buyer's OWN live
 * subscription, only on that subscription's product, and only while the store
 * offers autoship at all. Anything else earns nothing — never an error, so a
 * stale "Order now" link still checks out at the ordinary price.
 */
export async function autoshipDiscountFor(
  userId: string | null,
  autoshipId: string | null | undefined,
  settings: IStoreSettings
): Promise<AutoshipDiscount | null> {
  if (!settings.autoship_enabled || settings.autoship_discount_pct <= 0) return null;
  if (!userId || !autoshipId || !Types.ObjectId.isValid(autoshipId)) return null;
  const sub = await StoreSubscriptionModel.findOne({
    _id: new Types.ObjectId(autoshipId),
    user_id: new Types.ObjectId(userId),
    status: 'ACTIVE',
  })
    .select('product_id variant_id')
    .lean();
  if (!sub) return null;
  return {
    product_id: String(sub.product_id),
    variant_id: sub.variant_id ?? '',
    pct: settings.autoship_discount_pct,
  };
}
