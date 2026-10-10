jest.mock('../../shiprocket.gateway', () => ({
  ...jest.requireActual('../../shiprocket.gateway'),
  listPickupLocations: jest.fn(),
  addPickupLocation: jest.fn(),
}));

import { Types } from 'mongoose';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';
import { BrandPickupLocationModel } from '@modules/venues/brandPickupLocation/brandPickupLocation.model';
import { addPickupLocation, listPickupLocations, type ShiprocketPickup } from '../../shiprocket.gateway';
import { syncBrandPickupLocations } from '../../shiprocket.ops';

/**
 * A brand's warehouses brought in step with ShipRocket, both ways: an approved
 * warehouse the account lacks is sent there, and on the brand's OWN account
 * every pickup there becomes the brand's warehouse. On the Duncit courier the
 * account is shared by every partner, so nothing is taken in — the brand's rows
 * are only matched.
 */

const mockList = listPickupLocations as jest.Mock;
const mockAdd = addPickupLocation as jest.Mock;
// Credentials are read from the environment, never written into the test (S2068).
const secret = process.env.TEST_SHIPROCKET_PASSWORD ?? 'test-only';

const pickup = (nickname: string, verified = true): ShiprocketPickup => ({
  id: `pk-${nickname}`,
  nickname,
  name: 'Store Desk',
  email: 'desk@brand.in',
  address_line1: '14 Industrial Estate, Phase 2',
  address_line2: '',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411019',
  phone: '9876543210',
  verified,
});

const seedBrand = (shipping_mode: 'OWN_SHIPROCKET' | 'DUNCIT_COURIER') =>
  EcommBrandModel.create({
    owner_user_id: new Types.ObjectId(),
    brand_name: `Brand ${shipping_mode}`,
    shipping_mode,
    integrations: { shiprocket: { email: 'api@brand.in', password: secret, connected: true } },
  });

beforeAll(() => BrandPickupLocationModel.init());
beforeEach(() => {
  mockList.mockReset();
  mockAdd.mockReset();
});

/** An approved warehouse of the brand's with an address ShipRocket would take. */
const seedApproved = (brand_id: Types.ObjectId, nickname: string, extra: Record<string, unknown> = {}) =>
  BrandPickupLocationModel.create({
    owner_kind: 'BRAND',
    brand_id,
    nickname,
    review_status: 'APPROVED',
    contact_name: 'Nikhil',
    phone: '7042174680',
    email: 'nikhil@brand.in',
    address_line1: 'Plot 12, Rajnagar Extension',
    city: 'Ghaziabad',
    state: 'Uttar Pradesh',
    pincode: '201017',
    ...extra,
  });

describe('syncBrandPickupLocations', () => {
  it("takes in the brand's own-account pickups as its warehouses, the first as default", async () => {
    const brand = await seedBrand('OWN_SHIPROCKET');
    mockList.mockResolvedValue([pickup('BR-PUNE'), pickup('BR-MUMBAI', false)]);

    const result = await syncBrandPickupLocations(String(brand._id));

    expect(result.shiprocket_error).toBe('');
    expect(result.adopted).toBe(2);
    const rows = await BrandPickupLocationModel.find({ brand_id: brand._id }).sort({ nickname: 1 }).lean();
    expect(rows.map((r) => [r.nickname, r.owner_kind, r.review_status, r.shiprocket_registered])).toEqual([
      ['BR-MUMBAI', 'BRAND', 'APPROVED', true],
      ['BR-PUNE', 'BRAND', 'APPROVED', true],
    ]);
    expect(rows.filter((r) => r.is_default)).toHaveLength(1);
    expect(rows.find((r) => r.nickname === 'BR-MUMBAI')?.shiprocket_error).toMatch(/phone verification/);
  });

  it('never takes a nickname another owner already holds', async () => {
    const brand = await seedBrand('OWN_SHIPROCKET');
    await BrandPickupLocationModel.create({ owner_kind: 'DUNCIT', nickname: 'SHARED-WH' });
    mockList.mockResolvedValue([pickup('SHARED-WH')]);

    const result = await syncBrandPickupLocations(String(brand._id));

    expect(result.adopted).toBe(0);
    expect(await BrandPickupLocationModel.countDocuments({ brand_id: brand._id })).toBe(0);
  });

  it('on the shared Duncit courier only matches the brand’s rows, adopting nothing', async () => {
    const brand = await seedBrand('DUNCIT_COURIER');
    await BrandPickupLocationModel.create({ owner_kind: 'BRAND', brand_id: brand._id, nickname: 'MINE', review_status: 'APPROVED' });
    await BrandPickupLocationModel.create({ owner_kind: 'BRAND', brand_id: brand._id, nickname: 'WAITING', review_status: 'PENDING' });
    // No SHIPROCKET entry is mapped to the Partners app, so the courier account cannot be resolved.
    const result = await syncBrandPickupLocations(String(brand._id));

    expect(mockList).not.toHaveBeenCalled();
    expect(result.shiprocket_error).toMatch(/Duncit courier is not set up/);
    expect(result.adopted).toBe(0);
    expect(result.warehouses.map((w) => w.nickname).sort()).toEqual(['MINE', 'WAITING']);
  });

  it('sends an approved warehouse ShipRocket lacks to the account, then records what the account holds', async () => {
    const brand = await seedBrand('OWN_SHIPROCKET');
    await seedApproved(brand._id, 'nikhil warehouse', { shiprocket_error: 'No ShipRocket pickup address is named "nikhil warehouse"' });
    await BrandPickupLocationModel.create({ owner_kind: 'BRAND', brand_id: brand._id, nickname: 'WAITING', review_status: 'PENDING' });
    mockAdd.mockResolvedValue({ registered: true, pickup_id: '9911' });
    // Missing on the first read; listed, verified, once it has been added.
    mockList.mockResolvedValueOnce([]).mockResolvedValue([pickup('nikhil warehouse')]);

    const result = await syncBrandPickupLocations(String(brand._id));

    expect(result.shiprocket_error).toBe('');
    // Only the approved one is sent — a warehouse still in review never reaches ShipRocket.
    expect(mockAdd).toHaveBeenCalledTimes(1);
    expect(mockAdd).toHaveBeenCalledWith({
      pickup_location: 'nikhil warehouse',
      name: 'Nikhil',
      email: 'nikhil@brand.in',
      phone: '7042174680',
      address: 'Plot 12, Rajnagar Extension',
      address_2: '',
      city: 'Ghaziabad',
      state: 'Uttar Pradesh',
      country: 'India',
      pin_code: '201017',
    });
    const sent = result.warehouses.find((w) => w.nickname === 'nikhil warehouse');
    expect(sent?.shiprocket_registered).toBe(true);
    expect(sent?.shiprocket_error).toBe('');
    expect(sent?.shiprocket_pickup_id).toBe('pk-nikhil warehouse');
    // ShipRocket's copy of the address is what the warehouse now reads.
    expect([sent?.address_line1, sent?.city, sent?.pincode]).toEqual(['14 Industrial Estate, Phase 2', 'Pune', '411019']);
    const waiting = result.warehouses.find((w) => w.nickname === 'WAITING');
    expect([waiting?.shiprocket_registered, waiting?.shiprocket_error]).toEqual([false, '']);
  });

  it('sends nothing when every approved warehouse is already on the account', async () => {
    const brand = await seedBrand('OWN_SHIPROCKET');
    await seedApproved(brand._id, 'Held-WH');
    mockList.mockResolvedValue([pickup('HELD-WH', false)]);

    const result = await syncBrandPickupLocations(String(brand._id));

    expect(mockAdd).not.toHaveBeenCalled();
    expect(mockList).toHaveBeenCalledTimes(1);
    // Matched whatever the case of the name; unverified is said, not hidden.
    expect(result.warehouses.map((w) => [w.nickname, w.shiprocket_registered, w.shiprocket_error])).toEqual([
      ['Held-WH', true, 'Awaiting phone verification in ShipRocket'],
    ]);
  });

  it("keeps ShipRocket's own reason on a warehouse it refuses, and stops calling it registered", async () => {
    const brand = await seedBrand('OWN_SHIPROCKET');
    await seedApproved(brand._id, 'REFUSED', { shiprocket_registered: true });
    mockAdd.mockRejectedValue(new Error('ShipRocket refused addPickup: Address line 1 should have House no / Flat no / Road no'));
    mockList.mockResolvedValue([]);

    const result = await syncBrandPickupLocations(String(brand._id));

    // The account was read, so this is not an unreadable-ShipRocket error — it belongs to the one warehouse.
    expect(result.shiprocket_error).toBe('');
    expect(result.warehouses.map((w) => [w.nickname, w.shiprocket_registered, w.shiprocket_error])).toEqual([
      ['REFUSED', false, 'ShipRocket refused addPickup: Address line 1 should have House no / Flat no / Road no'],
    ]);
  });

  it('never calls ShipRocket for an address it would refuse, and says what to fix', async () => {
    const brand = await seedBrand('OWN_SHIPROCKET');
    await seedApproved(brand._id, 'SHORT', { address_line1: 'Sector 5' });
    mockList.mockResolvedValue([]);

    const result = await syncBrandPickupLocations(String(brand._id));

    expect(mockAdd).not.toHaveBeenCalled();
    expect(result.warehouses[0]?.shiprocket_registered).toBe(false);
    expect(result.warehouses[0]?.shiprocket_error).toBe(
      'ShipRocket needs the house number and street (at least 10 characters) for this pickup address',
    );
  });

  it('treats a name the account already holds as registered, so two syncs at once add nothing twice', async () => {
    const brand = await seedBrand('OWN_SHIPROCKET');
    await seedApproved(brand._id, 'RACED');
    mockAdd.mockRejectedValue(new Error('ShipRocket refused addPickup: Address nick name already in use'));
    mockList.mockResolvedValueOnce([]).mockResolvedValue([pickup('RACED')]);

    const result = await syncBrandPickupLocations(String(brand._id));

    expect(result.warehouses.map((w) => [w.nickname, w.shiprocket_registered, w.shiprocket_error])).toEqual([['RACED', true, '']]);
  });

  it('still lists the warehouses, with the reason, when ShipRocket cannot be read', async () => {
    const brand = await seedBrand('OWN_SHIPROCKET');
    await BrandPickupLocationModel.create({ owner_kind: 'BRAND', brand_id: brand._id, nickname: 'KEPT', review_status: 'APPROVED', shiprocket_registered: true });
    mockList.mockRejectedValue(new Error('ShipRocket refused listPickups (HTTP 403)'));

    const result = await syncBrandPickupLocations(String(brand._id));

    expect(result.shiprocket_error).toBe('ShipRocket refused listPickups (HTTP 403)');
    expect(result.warehouses.map((w) => [w.nickname, w.shiprocket_registered])).toEqual([['KEPT', true]]);
  });
});
