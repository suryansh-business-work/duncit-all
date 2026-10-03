import { Types } from 'mongoose';
import { inventoryService } from '../../inventory.service';
import { InventoryProductModel } from '../../inventory.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';

/**
 * The pod shop follows the brand's derived `live` flag: an approved brand whose
 * integrations are still pending sells nothing — its products leave the shop
 * list and its product page offers no pod to buy through — while a brand that
 * is approved, active and connected (or waived) sells as before.
 */

const APPROVED_LISTING = {
  is_active: true,
  status: 'ACTIVE',
  pod_available: true,
  listing_review_status: 'APPROVED',
  ownership: 'BRAND',
};

const CONNECTED = { shiprocket: { connected: true }, razorpay: { connected: true } };

let seq = 0;

const seedBrand = (over: Record<string, unknown>) =>
  EcommBrandModel.create({
    owner_user_id: new Types.ObjectId(),
    brand_name: `Gate Brand ${++seq}`,
    status: 'APPROVED',
    is_active: true,
    ...over,
  });

const seedProduct = (brandId: Types.ObjectId, name: string) =>
  InventoryProductModel.create({
    product_name: name,
    sku: `GATE-${++seq}`,
    unit_cost: 100,
    inventory_count: 10,
    brand_id: brandId,
    ...APPROVED_LISTING,
  });

/** An upcoming pod that stocks every product given. */
const seedPodStocking = (productIds: Types.ObjectId[]) =>
  PodModel.collection.insertOne({
    _id: new Types.ObjectId(),
    pod_id: `gate-pod-${++seq}`,
    pod_title: 'Gate Pod',
    club_id: new Types.ObjectId(),
    products_enabled: true,
    is_active: true,
    venue_approval_status: 'NONE',
    pod_date_time: new Date(Date.now() + 86_400_000),
    product_requests: productIds.map((id) => ({
      product_id: id,
      product_name: 'stocked',
      unit_cost: 100,
      quantity: 5,
      sold_count: 0,
      total_cost: 500,
    })),
  } as never);

describe('pod shop — only live brands sell', () => {
  it('lists the products of a live brand and hides those of an approved brand with integrations pending', async () => {
    const live = await seedBrand({ integrations: CONNECTED });
    const pending = await seedBrand({ integrations: { razorpay: { connected: true } }, shipping_mode: 'OWN_SHIPROCKET' });
    const waived = await seedBrand({ integration_waived: true });
    expect([live.live, pending.live, waived.live]).toEqual([true, false, true]);

    await seedProduct(live._id, 'Live Mug');
    await seedProduct(pending._id, 'Pending Mug');
    await seedProduct(waived._id, 'Waived Mug');

    const names = (await inventoryService.listAvailablePodProducts()).map((p) => p.product_name).sort();
    expect(names).toEqual(['Live Mug', 'Waived Mug']);
  });

  it('the product page offers no pod for a brand that is not live, and does once it goes live', async () => {
    const brand = await seedBrand({ integrations: { razorpay: { connected: true } }, shipping_mode: 'OWN_SHIPROCKET' });
    const product = await seedProduct(brand._id, 'Pending Tee');
    await seedPodStocking([product._id]);

    // A stale product page must not stay purchasable.
    expect(await inventoryService.podsForProduct(String(product._id))).toEqual([]);

    // Choosing the Duncit courier settles shipping; the save re-derives `live`.
    brand.shipping_mode = 'DUNCIT_COURIER';
    await brand.save();
    expect(brand.live).toBe(true);

    const options = await inventoryService.podsForProduct(String(product._id));
    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({ pod_title: 'Gate Pod', available_count: 5 });
  });

  it('a paused live brand leaves the shop list and the product page with it', async () => {
    const brand = await seedBrand({ integrations: CONNECTED });
    const product = await seedProduct(brand._id, 'Paused Cap');
    await seedPodStocking([product._id]);
    expect((await inventoryService.listAvailablePodProducts()).map((p) => p.product_name)).toEqual(['Paused Cap']);

    brand.is_active = false;
    await brand.save();

    expect(await inventoryService.listAvailablePodProducts()).toEqual([]);
    expect(await inventoryService.podsForProduct(String(product._id))).toEqual([]);
  });
});
