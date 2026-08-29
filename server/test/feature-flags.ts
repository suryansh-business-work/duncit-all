import { FeatureFlagModel } from '@modules/platform/settings/settings.model';
import {
  invalidateFeatureFlagCache,
  PRODUCT_VISIBILITY_FLAG,
} from '@modules/platform/settings/featureFlag.gate';

/**
 * Turns the product system flag ON for a suite.
 *
 * `is_product_visible` ships OFF, and the server honours it — product
 * operations refuse, and a pod checkout cannot carry shop lines while it is
 * off. A suite that exercises the shop is describing a server with the feature
 * enabled, and says so here. Collections are wiped between tests, so this
 * belongs in a `beforeEach`.
 *
 * Deliberately NOT in `@test/harness`: that module builds the whole Apollo
 * schema on import, which is far more than a suite needs to flip one flag.
 */
export async function enableProducts(): Promise<void> {
  await FeatureFlagModel.updateOne(
    { key: PRODUCT_VISIBILITY_FLAG },
    { $set: { name: 'Product Features Visible', enabled: true, is_system: true } },
    { upsert: true },
  );
  invalidateFeatureFlagCache();
}

/** The other half: the shop switched off, for a suite asserting the refusal. */
export async function disableProducts(): Promise<void> {
  await FeatureFlagModel.updateOne(
    { key: PRODUCT_VISIBILITY_FLAG },
    { $set: { name: 'Product Features Visible', enabled: false, is_system: true } },
    { upsert: true },
  );
  invalidateFeatureFlagCache();
}
