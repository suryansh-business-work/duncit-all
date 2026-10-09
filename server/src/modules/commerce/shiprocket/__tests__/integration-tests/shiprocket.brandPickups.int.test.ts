jest.mock('../../shiprocket.gateway', () => ({
  ...jest.requireActual('../../shiprocket.gateway'),
  listPickupLocations: jest.fn(),
}));

import { Types } from 'mongoose';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';
import { BrandPickupLocationModel } from '@modules/venues/brandPickupLocation/brandPickupLocation.model';
import { listPickupLocations, type ShiprocketPickup } from '../../shiprocket.gateway';
import { syncBrandPickupLocations } from '../../shiprocket.ops';

/**
 * A brand's "Sync with ShipRocket": on its OWN account every pickup there
 * becomes the brand's warehouse; on the Duncit courier the account is shared by
 * every partner, so nothing is taken in — the brand's rows are only matched.
 */

const mockList = listPickupLocations as jest.Mock;
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
beforeEach(() => mockList.mockReset());

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

  it('marks an approved warehouse missing from ShipRocket and leaves a pending one as it was', async () => {
    const brand = await seedBrand('OWN_SHIPROCKET');
    await BrandPickupLocationModel.create({ owner_kind: 'BRAND', brand_id: brand._id, nickname: 'GONE', review_status: 'APPROVED', shiprocket_registered: true });
    await BrandPickupLocationModel.create({ owner_kind: 'BRAND', brand_id: brand._id, nickname: 'WAITING', review_status: 'PENDING', shiprocket_error: '' });
    mockList.mockResolvedValue([]);

    await syncBrandPickupLocations(String(brand._id));

    const gone = await BrandPickupLocationModel.findOne({ nickname: 'GONE' }).lean();
    const waiting = await BrandPickupLocationModel.findOne({ nickname: 'WAITING' }).lean();
    expect(gone?.shiprocket_registered).toBe(false);
    expect(gone?.shiprocket_error).toBe('No ShipRocket pickup address is named "GONE"');
    expect(waiting?.shiprocket_error).toBe('');
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
