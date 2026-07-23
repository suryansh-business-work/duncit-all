import { Types } from 'mongoose';
import { partnerDashboardService } from '../../partnerDashboard.service';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';
import { BrandPickupLocationModel } from '@modules/venues/brandPickupLocation/brandPickupLocation.model';
import { ProductOrderModel } from '@modules/commerce/productOrder/productOrder.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PaymentReleaseModel } from '@modules/finance/finance/paymentRelease.model';

const inDays = (d: number) => new Date(Date.now() + d * 86_400_000);

describe('partnerDashboardService integration', () => {
  it('returns zeroed metrics for a partner with no data', async () => {
    const result = await partnerDashboardService.get(new Types.ObjectId().toString(), {
      from: '2020-01-01',
      to: '2030-01-01',
    });

    expect(result.summary.number_of_pods).toBe(0);
    expect(result.summary.total_earning).toBe(0);
    expect(result.venue.venue_earning).toBe(0);
    expect(result.host.host_earning).toBe(0);
    expect(result.products.product_earning).toBe(0);
    expect(result.venue.added_slots).toBe(0);
    expect(new Date(result.from).getUTCFullYear()).toBe(2020);
  });

  it('counts only upcoming available slots in venue.added_slots', async () => {
    const ownerId = new Types.ObjectId().toString();
    const venue = await VenueModel.create({
      owner_user_id: ownerId,
      status: 'APPROVED',
      is_active: true,
      venue_name: 'Hall',
    });
    await VenueSlotModel.create([
      { venue_id: venue._id, owner_user_id: ownerId, start_at: inDays(2), end_at: inDays(2.1), status: 'AVAILABLE' },
      { venue_id: venue._id, owner_user_id: ownerId, start_at: inDays(3), end_at: inDays(3.1), status: 'AVAILABLE' },
      // Past slot — excluded.
      { venue_id: venue._id, owner_user_id: ownerId, start_at: inDays(-2), end_at: inDays(-1.9), status: 'AVAILABLE' },
      // Booked slot — excluded (no longer an open availability).
      { venue_id: venue._id, owner_user_id: ownerId, start_at: inDays(4), end_at: inDays(4.1), status: 'BOOKED' },
    ]);

    const result = await partnerDashboardService.get(ownerId, { from: '2020-01-01', to: '2030-01-01' });
    expect(result.venue.added_slots).toBe(2);
  });

  it('nets product earning by the Duncit commission (settled basis, not gross)', async () => {
    const ownerId = new Types.ObjectId().toString();
    const productId = new Types.ObjectId();
    await InventoryProductModel.collection.insertOne({
      _id: productId,
      listing_submitted_by_id: ownerId,
      listing_review_status: 'APPROVED',
      commission_pct: 20,
    } as never);
    await PodModel.collection.insertOne({
      _id: new Types.ObjectId(),
      pod_title: 'Jam',
      pod_date_time: new Date('2025-06-01T00:00:00Z'),
      product_requests: [{ product_id: productId, unit_cost: 100, quantity: 2, total_cost: 200 }],
    } as never);

    const result = await partnerDashboardService.get(ownerId, { from: '2020-01-01', to: '2030-01-01' });
    // Gross ₹200 minus the 20% product commission = ₹160 net earning.
    expect(result.products.product_earning).toBe(160);
    expect(result.summary.product_earning).toBe(160);
  });

  it('bases venue earning on the pod date, not the release review date', async () => {
    const ownerId = new Types.ObjectId().toString();
    const venue = await VenueModel.create({
      owner_user_id: ownerId,
      status: 'APPROVED',
      is_active: true,
      venue_name: 'Hall',
    });
    const inRangePod = new Types.ObjectId();
    const outOfRangePod = new Types.ObjectId();
    await PodModel.collection.insertMany([
      { _id: inRangePod, club_id: new Types.ObjectId(), pod_title: 'June pod', pod_date_time: new Date('2025-06-15T00:00:00Z'), venue_id: venue._id },
      { _id: outOfRangePod, club_id: new Types.ObjectId(), pod_title: 'Aug pod', pod_date_time: new Date('2025-08-15T00:00:00Z'), venue_id: venue._id },
    ] as never);
    await PaymentReleaseModel.create([
      // Pod is in range → counted.
      {
        release_id: 'REL-IN', kind: 'VENUE_BILLING', status: 'APPROVED', pod_id: inRangePod, pod_title: 'June pod',
        venue_id: venue._id, beneficiary_name: 'V', beneficiary_email: 'v@x.io', amount_requested: 500, approved_amount: 500,
        reviewed_at: new Date('2025-06-20T00:00:00Z'),
      },
      // Pod is OUT of range but the release was reviewed inside the window — must
      // NOT be counted under the pod-date basis (the bug being fixed).
      {
        release_id: 'REL-OUT', kind: 'VENUE_BILLING', status: 'APPROVED', pod_id: outOfRangePod, pod_title: 'Aug pod',
        venue_id: venue._id, beneficiary_name: 'V', beneficiary_email: 'v@x.io', amount_requested: 999, approved_amount: 999,
        reviewed_at: new Date('2025-06-20T00:00:00Z'),
      },
    ]);

    const result = await partnerDashboardService.get(ownerId, { from: '2025-06-01', to: '2025-06-30' });
    expect(result.summary.venue_earning).toBe(500);
    expect(result.venue.venue_earning).toBe(500);
    expect(result.summary.total_earning).toBe(500);
  });

  it('counts a settled release even after its pod is reassigned to another venue', async () => {
    const ownerId = new Types.ObjectId().toString();
    const myVenue = await VenueModel.create({
      owner_user_id: ownerId,
      status: 'APPROVED',
      is_active: true,
      venue_name: 'Mine',
    });
    const reassignedPod = new Types.ObjectId();
    // The pod now points at a DIFFERENT (not-owned) venue, but the release was
    // stamped with myVenue as the beneficiary — the earning must still count.
    await PodModel.collection.insertOne({
      _id: reassignedPod, club_id: new Types.ObjectId(), pod_title: 'Reassigned',
      pod_date_time: new Date('2025-06-15T00:00:00Z'), venue_id: new Types.ObjectId(),
    } as never);
    await PaymentReleaseModel.create({
      release_id: 'REL-REASSIGN', kind: 'VENUE_BILLING', status: 'APPROVED', pod_id: reassignedPod,
      pod_title: 'Reassigned', venue_id: myVenue._id, beneficiary_name: 'V', beneficiary_email: 'v@x.io',
      amount_requested: 300, approved_amount: 300,
    });

    const result = await partnerDashboardService.get(ownerId, { from: '2025-06-01', to: '2025-06-30' });
    expect(result.summary.venue_earning).toBe(300);
  });
});

describe('partnerDashboardService.ecommStats', () => {
  const seedOrder = (over: Record<string, unknown>) =>
    ProductOrderModel.create({
      order_no: `eco-${Math.random().toString(36).slice(2)}`,
      buyer_id: new Types.ObjectId(),
      payment_id: new Types.ObjectId(),
      items_total: 0,
      total: 0,
      fulfilment_method: 'SHIP',
      ...over,
    });

  it('rejects an invalid caller and a foreign/invalid brand narrow', async () => {
    await expect(partnerDashboardService.ecommStats('not-an-id')).rejects.toThrow(/authentication/i);
    const ownerId = new Types.ObjectId().toString();
    await expect(partnerDashboardService.ecommStats(ownerId, 'nope')).rejects.toThrow(/invalid brand/i);
    const foreign = await EcommBrandModel.create({ owner_user_id: new Types.ObjectId(), brand_name: 'Foreign' });
    await expect(partnerDashboardService.ecommStats(ownerId, String(foreign._id))).rejects.toThrow(/not yours/i);
  });

  it('returns zeros for a partner with no brands', async () => {
    const stats = await partnerDashboardService.ecommStats(new Types.ObjectId().toString());
    expect(stats).toEqual({
      total_brands: 0,
      approved_brands: 0,
      total_products: 0,
      approved_products: 0,
      total_warehouses: 0,
      total_orders: 0,
      total_items_sold: 0,
      gross_revenue: 0,
    });
  });

  it('aggregates brands, products, warehouses and only the partner\'s countable order lines', async () => {
    const ownerId = new Types.ObjectId().toString();
    const owner = new Types.ObjectId(ownerId);
    const approved = await EcommBrandModel.create({ owner_user_id: owner, brand_name: 'Approved Co', status: 'APPROVED' });
    await EcommBrandModel.create({ owner_user_id: owner, brand_name: 'Draft Co', status: 'DRAFT' });
    const foreignBrand = await EcommBrandModel.create({ owner_user_id: new Types.ObjectId(), brand_name: 'Foreign Co' });

    await InventoryProductModel.create({ product_name: 'Mine A', sku: 'ECO-A', unit_cost: 5, brand_id: approved._id, ownership: 'BRAND', listing_review_status: 'APPROVED' });
    await InventoryProductModel.create({ product_name: 'Mine P', sku: 'ECO-P', unit_cost: 5, brand_id: approved._id, ownership: 'BRAND', listing_review_status: 'PENDING' });
    await InventoryProductModel.create({ product_name: 'Foreign', sku: 'ECO-F', unit_cost: 5, brand_id: foreignBrand._id, ownership: 'BRAND', listing_review_status: 'APPROVED' });

    await BrandPickupLocationModel.create({ owner_kind: 'BRAND', brand_id: approved._id, nickname: 'ECO-WH-1' });
    await BrandPickupLocationModel.create({ owner_kind: 'BRAND', brand_id: foreignBrand._id, nickname: 'ECO-WH-2' });

    const productId = new Types.ObjectId();
    // Countable order: one owned line + one foreign line (only the owned line sums).
    await seedOrder({
      line_items: [
        { product_id: productId, name: 'Mine A', qty: 2, unit_cost: 100.25, gross: 200.505, ownership: 'BRAND', brand_id: approved._id },
        { product_id: productId, name: 'Foreign', qty: 5, unit_cost: 10, gross: 50, ownership: 'BRAND', brand_id: foreignBrand._id },
      ],
    });
    // Second countable order for the same brand.
    await seedOrder({
      line_items: [{ product_id: productId, name: 'Mine A', qty: 1, unit_cost: 100, gross: 100, ownership: 'BRAND', brand_id: approved._id }],
    });
    // Cancelled order — never counted.
    await seedOrder({
      fulfilment_status: 'CANCELLED',
      line_items: [{ product_id: productId, name: 'Mine A', qty: 9, unit_cost: 100, gross: 900, ownership: 'BRAND', brand_id: approved._id }],
    });
    // Foreign-only order — not the partner's sale at all.
    await seedOrder({
      line_items: [{ product_id: productId, name: 'Foreign', qty: 3, unit_cost: 10, gross: 30, ownership: 'BRAND', brand_id: foreignBrand._id }],
    });

    const stats = await partnerDashboardService.ecommStats(ownerId);
    expect(stats.total_brands).toBe(2);
    expect(stats.approved_brands).toBe(1);
    expect(stats.total_products).toBe(2);
    expect(stats.approved_products).toBe(1);
    expect(stats.total_warehouses).toBe(1);
    expect(stats.total_orders).toBe(2);
    expect(stats.total_items_sold).toBe(3);
    // 200.505 + 100 → rounded to 2dp.
    expect(stats.gross_revenue).toBe(300.51);

    // Narrowing to one owned brand keeps the same scope here (single selling brand).
    const narrowed = await partnerDashboardService.ecommStats(ownerId, String(approved._id));
    expect(narrowed.total_brands).toBe(1);
    expect(narrowed.total_orders).toBe(2);
  });
});
