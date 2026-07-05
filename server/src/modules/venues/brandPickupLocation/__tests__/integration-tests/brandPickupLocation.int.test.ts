import { Types } from 'mongoose';
import { brandPickupLocationService } from '../../brandPickupLocation.service';
import { BrandPickupLocationModel } from '../../brandPickupLocation.model';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';

beforeEach(async () => {
  await BrandPickupLocationModel.deleteMany({});
});

describe('brandPickupLocationService', () => {
  it('enforces a single default per owner', async () => {
    await brandPickupLocationService.save(null, { owner_kind: 'DUNCIT', nickname: 'WH-A', is_default: true });
    await brandPickupLocationService.save(null, { owner_kind: 'DUNCIT', nickname: 'WH-B', is_default: true });
    const list = await brandPickupLocationService.list({ owner_kind: 'DUNCIT' });
    const defaults = list.filter((l) => l.is_default);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].nickname).toBe('WH-B');
  });

  it('syncs the owning brand default_pickup_location_id for BRAND locations', async () => {
    const brand = await EcommBrandModel.create({ owner_user_id: new Types.ObjectId(), brand_name: 'Acme' });
    const loc = await brandPickupLocationService.save(null, {
      owner_kind: 'BRAND',
      brand_id: String(brand._id),
      nickname: 'ACME-WH',
      is_default: true,
    });
    const updated = await EcommBrandModel.findById(brand._id);
    expect(String(updated?.default_pickup_location_id)).toBe(loc.id);
  });

  it('updates and deletes a location', async () => {
    const loc = await brandPickupLocationService.save(null, { owner_kind: 'DUNCIT', nickname: 'WH-X' });
    const updated = await brandPickupLocationService.save(loc.id, { owner_kind: 'DUNCIT', nickname: 'WH-X2' });
    expect(updated.nickname).toBe('WH-X2');
    expect(await brandPickupLocationService.remove(loc.id)).toBe(true);
    expect(await BrandPickupLocationModel.countDocuments()).toBe(0);
  });
});
