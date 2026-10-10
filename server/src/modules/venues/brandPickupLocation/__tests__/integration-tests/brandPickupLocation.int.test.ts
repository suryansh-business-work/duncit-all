import { Types } from 'mongoose';
import { brandPickupLocationService } from '../../brandPickupLocation.service';
import { BrandPickupLocationModel } from '../../brandPickupLocation.model';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';

beforeEach(async () => {
  await BrandPickupLocationModel.deleteMany({});
});

/** A pickup address ShipRocket would take — a partner save is held to its rules. */
const ADDRESS = {
  contact_name: 'Store Desk',
  phone: '9876543210',
  email: 'desk@brand.in',
  address_line1: '14 Industrial Estate, Phase 2',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411019',
};

/*
  A DUNCIT warehouse IS a ShipRocket pickup address now: save() hands it to
  saveDuncitPickup, which validates the address and puts it on the account
  before anything is written (covered by the shiprocket suites). The service's
  own write path — defaults, updates, deletes — is the BRAND one, exercised here.
*/
describe('brandPickupLocationService', () => {
  it('enforces a single default per owner', async () => {
    const brand = await EcommBrandModel.create({ owner_user_id: new Types.ObjectId(), brand_name: 'Two WH Co' });
    const brand_id = String(brand._id);
    await brandPickupLocationService.save(null, { owner_kind: 'BRAND', brand_id, nickname: 'WH-A', is_default: true });
    await brandPickupLocationService.save(null, { owner_kind: 'BRAND', brand_id, nickname: 'WH-B', is_default: true });
    const list = await brandPickupLocationService.list({ owner_kind: 'BRAND', brand_id });
    const defaults = list.filter((l) => l.is_default);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].nickname).toBe('WH-B');
  });

  it('refuses a Duncit warehouse whose address ShipRocket would reject, writing nothing', async () => {
    await expect(
      brandPickupLocationService.save(null, { owner_kind: 'DUNCIT', nickname: 'WH-A' })
    ).rejects.toThrow(/^Enter the house number and street .*a contact email$/);
    expect(await BrandPickupLocationModel.countDocuments()).toBe(0);
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
    const brand_id = String(new Types.ObjectId());
    const loc = await brandPickupLocationService.save(null, { owner_kind: 'BRAND', brand_id, nickname: 'WH-X' });
    const updated = await brandPickupLocationService.save(loc.id, { owner_kind: 'BRAND', brand_id, nickname: 'WH-X2' });
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
      ...ADDRESS,
      nickname: 'OWN-WH',
      is_default: true,
    });
    expect(saved.owner_kind).toBe('BRAND');
    expect(saved.brand_id).toBe(String(brand._id));
    expect(saved.is_default).toBe(true);

    const list = await brandPickupLocationService.listMine(userId, String(brand._id));
    expect(list.map((l) => l.nickname)).toEqual(['OWN-WH']);

    // Edits stay scoped to the same brand and update in place.
    const renamed = await brandPickupLocationService.saveMine(userId, String(brand._id), saved.id, {
      ...ADDRESS,
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
      ...ADDRESS,
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
      ...ADDRESS,
      owner_kind: 'BRAND',
      nickname: 'DEF-A',
      is_default: true,
    });
    const second = await brandPickupLocationService.saveMine(userId, String(brand._id), null, {
      ...ADDRESS,
      owner_kind: 'BRAND',
      nickname: 'DEF-B',
    });
    const nowDefault = await brandPickupLocationService.setDefaultMine(userId, String(brand._id), second.id);
    expect(nowDefault.is_default).toBe(true);
    const list = await brandPickupLocationService.listMine(userId, String(brand._id));
    expect(list.find((l) => l.id === first.id)?.is_default).toBe(false);
  });

  it('gates a partner warehouse: saved PENDING with an approval request raised', async () => {
    const { ApprovalRequestModel } = await import('@modules/approval/approval.model');
    const userId = new Types.ObjectId().toString();
    const brand = await seedOwnedBrand(userId, 'Gate Co');
    const saved = await brandPickupLocationService.saveMine(userId, String(brand._id), null, {
      ...ADDRESS,
      owner_kind: 'BRAND',
      nickname: 'GATE-WH',
    });
    expect(saved.review_status).toBe('PENDING');
    const reqs = await ApprovalRequestModel.find({ type: 'WAREHOUSE_APPROVAL', target_id: saved.id });
    expect(reqs).toHaveLength(1);
    expect(reqs[0]?.status).toBe('PENDING');
  });

  it('defaults review_status to APPROVED for a legacy doc without the field', async () => {
    const raw = new Types.ObjectId();
    await BrandPickupLocationModel.collection.insertOne({
      _id: raw,
      owner_kind: 'DUNCIT',
      nickname: 'LEGACY-WH',
    } as never);
    const list = await brandPickupLocationService.list({ owner_kind: 'DUNCIT' });
    expect(list.find((l) => l.id === String(raw))?.review_status).toBe('APPROVED');
  });

  it('surfaces a CONFLICT for a duplicate nickname and rethrows other save errors', async () => {
    const userId = new Types.ObjectId().toString();
    const brand = await seedOwnedBrand(userId, 'Dup Co');
    // Nicknames are unique across every owner (one ShipRocket account), so a
    // Duncit warehouse already holding the name blocks the partner's.
    await BrandPickupLocationModel.create({ owner_kind: 'DUNCIT', nickname: 'DUP-WH' });
    await expect(
      brandPickupLocationService.saveMine(userId, String(brand._id), null, { ...ADDRESS, owner_kind: 'BRAND', nickname: 'DUP-WH' })
    ).rejects.toThrow(/already exists/i);
    // A non-duplicate failure (missing nickname) is not masked as a conflict.
    await expect(
      brandPickupLocationService.saveMine(userId, String(brand._id), null, { ...ADDRESS, owner_kind: 'BRAND', nickname: '' })
    ).rejects.toThrow(/Name the warehouse/);
  });

  it('turns back an address ShipRocket would refuse, saving nothing and raising no request', async () => {
    const { ApprovalRequestModel } = await import('@modules/approval/approval.model');
    const userId = new Types.ObjectId().toString();
    const brand = await seedOwnedBrand(userId, 'Strict Co');
    const save = (input: Record<string, unknown>) =>
      brandPickupLocationService.saveMine(userId, String(brand._id), null, { ...ADDRESS, owner_kind: 'BRAND', ...input });

    await expect(save({ nickname: 'SHORT-ST', address_line1: 'Sector 5' })).rejects.toThrow(/at least 10 characters/);
    await expect(save({ nickname: 'BAD-PIN', pincode: '4110' })).rejects.toThrow(/6-digit pincode/);
    await expect(save({ nickname: 'BAD-PHONE', phone: '98765' })).rejects.toThrow(/10-digit phone number/);
    await expect(save({ nickname: 'NO-MAIL', email: '' })).rejects.toThrow(/contact email/);
    await expect(save({ nickname: 'N'.repeat(37) })).rejects.toThrow(/36 characters/);
    // The boundary is taken: 36 characters is the longest name ShipRocket holds.
    expect((await save({ nickname: 'N'.repeat(36) })).nickname).toHaveLength(36);

    expect(await BrandPickupLocationModel.countDocuments({ brand_id: brand._id })).toBe(1);
    expect(await ApprovalRequestModel.countDocuments({ type: 'WAREHOUSE_APPROVAL' })).toBe(1);
  });

  it('refuses a changed address on a warehouse ShipRocket holds, but lets the same address be saved again', async () => {
    const userId = new Types.ObjectId().toString();
    const brand = await seedOwnedBrand(userId, 'Held Co');
    const held = await BrandPickupLocationModel.create({
      ...ADDRESS,
      owner_kind: 'BRAND',
      brand_id: brand._id,
      nickname: 'HELD-WH',
      // As ShipRocket hands the number back — still the same ten digits.
      phone: '+91 98765 43210',
      shiprocket_registered: true,
    });
    const save = (input: Record<string, unknown>) =>
      brandPickupLocationService.saveMine(userId, String(brand._id), held.id, {
        ...ADDRESS,
        owner_kind: 'BRAND',
        nickname: 'HELD-WH',
        ...input,
      });

    await expect(save({ address_line1: '99 Another Road, Phase 1' })).rejects.toThrow(/ShipRocket already holds/);
    expect((await BrandPickupLocationModel.findById(held._id).lean())?.address_line1).toBe(ADDRESS.address_line1);

    const same = await save({ city: 'PUNE', is_default: true });
    expect(same.id).toBe(held.id);
    expect(same.is_default).toBe(true);
  });
});
