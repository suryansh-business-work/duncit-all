import { Types } from 'mongoose';
import { brandPickupLocationService } from '../../brandPickupLocation.service';
import { BrandPickupLocationModel } from '../../brandPickupLocation.model';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';

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

describe('brandPickupLocationService partner-scoped ops', () => {
  const seedOwnedBrand = async (userId: string, name = 'Own Co') =>
    EcommBrandModel.create({ owner_user_id: new Types.ObjectId(userId), brand_name: name });

  it('saves into the caller\'s own brand only — client owner_kind/brand_id are ignored', async () => {
    const userId = new Types.ObjectId().toString();
    const brand = await seedOwnedBrand(userId);
    const saved = await brandPickupLocationService.saveMine(userId, String(brand._id), null, {
      // Hostile client values — the server must force BRAND + the owned brand.
      owner_kind: 'DUNCIT',
      brand_id: String(new Types.ObjectId()),
      nickname: 'OWN-WH',
      city: 'Pune',
      pincode: '411001',
      is_default: true,
    });
    expect(saved.owner_kind).toBe('BRAND');
    expect(saved.brand_id).toBe(String(brand._id));
    expect(saved.is_default).toBe(true);

    const list = await brandPickupLocationService.listMine(userId, String(brand._id));
    expect(list.map((l) => l.nickname)).toEqual(['OWN-WH']);

    // Edits stay scoped to the same brand and update in place.
    const renamed = await brandPickupLocationService.saveMine(userId, String(brand._id), saved.id, {
      owner_kind: 'BRAND',
      nickname: 'OWN-WH-2',
    });
    expect(renamed.id).toBe(saved.id);
    expect(renamed.nickname).toBe('OWN-WH-2');
  });

  it('404s for a brand the caller does not own (and rejects an invalid brand id)', async () => {
    const userId = new Types.ObjectId().toString();
    const foreign = await EcommBrandModel.create({ owner_user_id: new Types.ObjectId(), brand_name: 'Foreign Co' });
    await expect(brandPickupLocationService.listMine(userId, String(foreign._id))).rejects.toThrow(/brand not found/i);
    await expect(brandPickupLocationService.listMine(userId, 'not-an-id')).rejects.toThrow(/invalid brand/i);
  });

  it('404s when touching a warehouse of a different brand', async () => {
    const userId = new Types.ObjectId().toString();
    const mine = await seedOwnedBrand(userId, 'Mine Co');
    const otherWh = await BrandPickupLocationModel.create({
      owner_kind: 'BRAND',
      brand_id: new Types.ObjectId(),
      nickname: 'OTHER-WH',
    });
    await expect(
      brandPickupLocationService.saveMine(userId, String(mine._id), otherWh.id, { owner_kind: 'BRAND', nickname: 'X' })
    ).rejects.toThrow(/not found/i);
    await expect(
      brandPickupLocationService.setDefaultMine(userId, String(mine._id), otherWh.id)
    ).rejects.toThrow(/not found/i);
    await expect(brandPickupLocationService.removeMine(userId, String(mine._id), 'nope')).rejects.toThrow(/not found/i);
  });

  it('blocks deleting a warehouse still used by a product, then allows once freed', async () => {
    const userId = new Types.ObjectId().toString();
    const brand = await seedOwnedBrand(userId, 'Del Co');
    const wh = await brandPickupLocationService.saveMine(userId, String(brand._id), null, {
      owner_kind: 'BRAND',
      nickname: 'DEL-WH',
    });
    const product = await InventoryProductModel.create({
      product_name: 'Uses warehouse',
      sku: 'BPL-REF-1',
      unit_cost: 10,
      brand_id: brand._id,
      ownership: 'BRAND',
      pickup_location_id: wh.id,
    });
    await expect(brandPickupLocationService.removeMine(userId, String(brand._id), wh.id)).rejects.toThrow(
      /used by 1 product/i
    );
    await InventoryProductModel.deleteOne({ _id: product._id });
    expect(await brandPickupLocationService.removeMine(userId, String(brand._id), wh.id)).toBe(true);
  });

  it('setDefaultMine flips the default within the brand', async () => {
    const userId = new Types.ObjectId().toString();
    const brand = await seedOwnedBrand(userId, 'Default Co');
    const first = await brandPickupLocationService.saveMine(userId, String(brand._id), null, {
      owner_kind: 'BRAND',
      nickname: 'DEF-A',
      is_default: true,
    });
    const second = await brandPickupLocationService.saveMine(userId, String(brand._id), null, {
      owner_kind: 'BRAND',
      nickname: 'DEF-B',
    });
    const nowDefault = await brandPickupLocationService.setDefaultMine(userId, String(brand._id), second.id);
    expect(nowDefault.is_default).toBe(true);
    const list = await brandPickupLocationService.listMine(userId, String(brand._id));
    expect(list.find((l) => l.id === first.id)?.is_default).toBe(false);
  });

  it('surfaces a CONFLICT for a duplicate nickname and rethrows other save errors', async () => {
    const userId = new Types.ObjectId().toString();
    const brand = await seedOwnedBrand(userId, 'Dup Co');
    await brandPickupLocationService.save(null, { owner_kind: 'DUNCIT', nickname: 'DUP-WH' });
    await expect(
      brandPickupLocationService.saveMine(userId, String(brand._id), null, { owner_kind: 'BRAND', nickname: 'DUP-WH' })
    ).rejects.toThrow(/already exists/i);
    // A non-duplicate failure (missing nickname) is not masked as a conflict.
    await expect(
      brandPickupLocationService.saveMine(userId, String(brand._id), null, { owner_kind: 'BRAND', nickname: '' })
    ).rejects.toThrow(/nickname/i);
  });
});
