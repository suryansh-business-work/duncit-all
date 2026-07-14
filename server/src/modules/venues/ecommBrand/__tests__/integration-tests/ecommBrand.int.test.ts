import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { ecommBrandService } from '../../ecommBrand.service';
import { ecommBrandResolvers } from '../../ecommBrand.resolver';
import { EcommBrandModel } from '../../ecommBrand.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { UserModel } from '@modules/access/user/user.model';
import { makeContext } from '@test/harness';

describe('ecommBrandService integration', () => {
  const newOwner = () => new Types.ObjectId().toString();

  it('saves a draft, then submits it for review', async () => {
    const owner = newOwner();
    const draft = await ecommBrandService.save(owner, null, {
      brand_name: 'Acme Co',
      description: 'Handmade home decor and apparel.',
      contact_email: 'owner@acme.com',
      product_categories: ['Decor', 'Apparel'],
    });
    expect(draft.status).toBe('DRAFT');
    expect(draft.brand_name).toBe('Acme Co');

    const submitted = await ecommBrandService.submit(owner, draft.id);
    expect(submitted.status).toBe('SUBMITTED');
    expect(submitted.submitted_at).toBeTruthy();

    const mine = await ecommBrandService.listMine(owner);
    expect(mine).toHaveLength(1);
    expect(mine[0].status).toBe('SUBMITTED');
  });

  it('lets one partner submit multiple brands', async () => {
    const owner = newOwner();
    const a = await ecommBrandService.save(owner, null, { brand_name: 'Brand A', description: 'first brand here', contact_email: 'a@x.com' });
    await ecommBrandService.submit(owner, a.id);
    const b = await ecommBrandService.save(owner, null, { brand_name: 'Brand B', description: 'second brand here', contact_email: 'b@x.com' });
    await ecommBrandService.submit(owner, b.id);

    const mine = await ecommBrandService.listMine(owner);
    expect(mine).toHaveLength(2);
    expect(mine.map((m) => m.brand_name).sort()).toEqual(['Brand A', 'Brand B']);
  });

  it('rejects submitting a brand with no name', async () => {
    const owner = newOwner();
    const draft = await ecommBrandService.save(owner, null, { description: 'desc but no name here' });
    await expect(ecommBrandService.submit(owner, draft.id)).rejects.toThrow(/brand name/i);
  });

  it("rejects editing a brand the user does not own", async () => {
    const owner = newOwner();
    const draft = await ecommBrandService.save(owner, null, { brand_name: 'Mine' });
    await expect(ecommBrandService.save(newOwner(), draft.id, { brand_name: 'Hijack' })).rejects.toThrow(/not found/i);
  });

  it('rejects a brand with reviewer notes', async () => {
    const owner = newOwner();
    const draft = await ecommBrandService.save(owner, null, {
      brand_name: 'Rejectable',
      description: 'something to review',
      contact_email: 'r@b.com',
    });
    await ecommBrandService.submit(owner, draft.id);
    const rejected = await ecommBrandService.reject(draft.id, 'Logo resolution too low');
    expect(rejected.status).toBe('REJECTED');
    expect(rejected.reviewer_notes).toBe('Logo resolution too low');
  });
});

describe('ecommBrand table queries (shared table engine)', () => {
  it('serves ecommBrandsTable with search, filters, sort and paging', async () => {
    const owner = new Types.ObjectId();
    await EcommBrandModel.create({ owner_user_id: owner, brand_name: 'Alpha Attire', city: 'Delhi', status: 'APPROVED', contact_person: 'Asha' });
    await EcommBrandModel.create({ owner_user_id: owner, brand_name: 'Beta Bags', city: 'Mumbai', status: 'SUBMITTED', contact_person: 'Bala' });
    await EcommBrandModel.create({ owner_user_id: owner, brand_name: 'Gamma Goods', city: 'Delhi', status: 'DRAFT', is_active: false });

    // Plain envelope with the default sort (created_at desc) and clamp defaults.
    const all = await ecommBrandService.table();
    expect(all.total).toBe(3);
    expect(all.rows.map((b) => b.brand_name)).toEqual(['Gamma Goods', 'Beta Bags', 'Alpha Attire']);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans brand_name and contact_person.
    const byPerson = await ecommBrandService.table({ search: 'bala' });
    expect(byPerson.rows.map((b) => b.brand_name)).toEqual(['Beta Bags']);

    // Enum + boolean filters narrow (old UI's status select + active toggle).
    const approved = await ecommBrandService.table({
      filters: [{ field: 'status', op: 'eq', value: 'APPROVED' }],
    });
    expect(approved.rows.map((b) => b.brand_name)).toEqual(['Alpha Attire']);
    const inactive = await ecommBrandService.table({
      filters: [{ field: 'is_active', op: 'is_false' }],
    });
    expect(inactive.rows.map((b) => b.brand_name)).toEqual(['Gamma Goods']);

    // Allowlisted sort + paging.
    const sorted = await ecommBrandService.table({ sort_by: 'brand_name', sort_dir: 'asc' });
    expect(sorted.rows.map((b) => b.brand_name)).toEqual(['Alpha Attire', 'Beta Bags', 'Gamma Goods']);
    const page2 = await ecommBrandService.table({ sort_by: 'brand_name', sort_dir: 'asc', page: 2, page_size: 1 });
    expect(page2.rows.map((b) => b.brand_name)).toEqual(['Beta Bags']);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });

  it('myEcommBrandsTable is scoped to the caller and ignores scope-breaking filters', async () => {
    const a = new Types.ObjectId();
    const b = new Types.ObjectId();
    await EcommBrandModel.create({ owner_user_id: a, brand_name: 'Mine One' });
    await EcommBrandModel.create({ owner_user_id: a, brand_name: 'Mine Two' });
    await EcommBrandModel.create({ owner_user_id: b, brand_name: 'Theirs' });

    // Default sort = updated_at desc (newest brand first).
    const mine = await ecommBrandService.myTable(String(a));
    expect(mine.total).toBe(2);
    expect(mine.rows.map((x) => x.brand_name)).toEqual(['Mine Two', 'Mine One']);

    const theirs = await ecommBrandService.myTable(String(b));
    expect(theirs.rows.map((x) => x.brand_name)).toEqual(['Theirs']);

    // owner_user_id is not allowlisted — a hostile filter is dropped and user A
    // can NEVER pull user B's brands through the table query.
    const hostile = await ecommBrandService.myTable(String(a), {
      filters: [{ field: 'owner_user_id', op: 'eq', value: String(b) }],
    });
    expect(hostile.total).toBe(2);
    expect(hostile.rows.every((x) => x.owner_user_id === String(a))).toBe(true);
  });

  it('marketplaceBrandsTable hides deactivated brands and defaults to APPROVED', async () => {
    const owner = new Types.ObjectId();
    await EcommBrandModel.create({ owner_user_id: owner, brand_name: 'Live', status: 'APPROVED', is_active: true });
    await EcommBrandModel.create({ owner_user_id: owner, brand_name: 'Hidden', status: 'APPROVED', is_active: false });
    await EcommBrandModel.create({ owner_user_id: owner, brand_name: 'Pending', status: 'SUBMITTED', is_active: true });

    // No status filter → APPROVED default (mirrors marketplaceBrands' `status ?? 'APPROVED'`).
    const dflt = await ecommBrandService.marketplaceTable();
    expect(dflt.rows.map((b) => b.brand_name)).toEqual(['Live']);

    // An explicit status filter replaces the default…
    const submitted = await ecommBrandService.marketplaceTable({
      filters: [{ field: 'status', op: 'eq', value: 'SUBMITTED' }],
    });
    expect(submitted.rows.map((b) => b.brand_name)).toEqual(['Pending']);

    // …but the active-only storefront gate always holds.
    const approvedExplicit = await ecommBrandService.marketplaceTable({
      filters: [{ field: 'status', op: 'eq', value: 'APPROVED' }],
    });
    expect(approvedExplicit.rows.map((b) => b.brand_name)).toEqual(['Live']);
  });
});

describe('brand-level product commission (Onboarded E-Commerce Brands console)', () => {
  const newOwner = () => new Types.ObjectId().toString();

  it('sets, validates, and exposes the brand commission override', async () => {
    const draft = await ecommBrandService.save(newOwner(), null, {
      brand_name: 'Override Co',
      description: 'Brand with a custom commission.',
      contact_email: 'oc@x.com',
    });
    expect(draft.product_commission_pct).toBe(0); // inherit by default

    const updated = await ecommBrandService.setCommission(draft.id, 12.5);
    expect(updated.product_commission_pct).toBe(12.5);

    await expect(ecommBrandService.setCommission(draft.id, 101)).rejects.toThrow(/0 and 100/);
    await expect(ecommBrandService.setCommission(draft.id, -1)).rejects.toThrow(/0 and 100/);
    await expect(ecommBrandService.setCommission(draft.id, Number.NaN)).rejects.toThrow(/0 and 100/);
    await expect(
      ecommBrandService.setCommission(new Types.ObjectId().toString(), 10)
    ).rejects.toThrow(/not found/i);
  });

  it('setBrandCommission mutation is gated to onboarding/admin/finance roles', async () => {
    const draft = await ecommBrandService.save(newOwner(), null, {
      brand_name: 'Gated Co',
      description: 'Role gating test brand.',
      contact_email: 'gc@x.com',
    });
    const M = ecommBrandResolvers.Mutation as any;
    // The resolver gate throws synchronously (non-async arrow).
    expect(() =>
      M.setBrandCommission({}, { brand_doc_id: draft.id, product_commission_pct: 9 }, makeContext({ roles: ['USER'] }))
    ).toThrow(/access denied/i);
    const asOnboarding = await M.setBrandCommission(
      {},
      { brand_doc_id: draft.id, product_commission_pct: 9 },
      makeContext({ roles: ['ONBOARDING_MANAGER'] })
    );
    expect(asOnboarding.product_commission_pct).toBe(9);
    const asFinance = await M.setBrandCommission(
      {},
      { brand_doc_id: draft.id, product_commission_pct: 7 },
      makeContext({ roles: ['FINANCE_MANAGER'] })
    );
    expect(asFinance.product_commission_pct).toBe(7);
  });
});

describe('brand deactivate + developer hard-delete', () => {
  it('toggles active and hides deactivated brands from an activeOnly list only', async () => {
    const owner = new Types.ObjectId();
    await EcommBrandModel.create({ owner_user_id: owner, brand_name: 'On', status: 'APPROVED', is_active: true });
    const off = await EcommBrandModel.create({ owner_user_id: owner, brand_name: 'Off', status: 'APPROVED', is_active: true });

    const toggled = await ecommBrandService.setActive(String(off._id), false);
    expect(toggled.is_active).toBe(false);

    const activeOnly = await ecommBrandService.list({ status: 'APPROVED', activeOnly: true });
    expect(activeOnly.map((b) => b.brand_name)).toEqual(['On']);
    expect(await ecommBrandService.list({ status: 'APPROVED' })).toHaveLength(2);
  });

  it('blocks brand delete while it has products, then deletes when clean', async () => {
    const brand = await EcommBrandModel.create({ owner_user_id: new Types.ObjectId(), brand_name: 'Del', status: 'APPROVED' });
    const bid = String(brand._id);
    const product = await InventoryProductModel.create({
      product_name: 'P', sku: 'DELBRAND1', unit_cost: 10, brand_id: brand._id, ownership: 'BRAND',
    });
    await expect(ecommBrandService.deleteBrand(bid)).rejects.toThrow(/still has 1 product/i);

    await InventoryProductModel.deleteOne({ _id: product._id });
    expect(await ecommBrandService.deleteBrand(bid)).toBe(true);
    expect(await EcommBrandModel.findById(bid)).toBeNull();
  });

  it('deleteEcommBrand is developer-gated and re-verifies the caller password', async () => {
    const brand = await EcommBrandModel.create({ owner_user_id: new Types.ObjectId(), brand_name: 'Guarded', status: 'APPROVED' });
    const bid = String(brand._id);
    const M = ecommBrandResolvers.Mutation as any;

    // Non-developer → access denied before any password check.
    await expect(
      M.deleteEcommBrand({}, { brand_doc_id: bid, email: 'x@x.com', password: 'p' }, makeContext({ roles: ['ONBOARDING_MANAGER'] }))
    ).rejects.toThrow(/access denied/i);

    const dev = await UserModel.create({
      auth: { email: 'brand-dev@x.com', password: await bcrypt.hash('secret', 10) },
      profile: { first_name: 'Dev' },
    });
    const ctx = makeContext({ id: String(dev._id), roles: ['DEVELOPERS_MANAGER'] });

    // Wrong password → rejected, brand survives.
    await expect(
      M.deleteEcommBrand({}, { brand_doc_id: bid, email: 'brand-dev@x.com', password: 'nope' }, ctx)
    ).rejects.toThrow(/password is incorrect/i);
    expect(await EcommBrandModel.findById(bid)).not.toBeNull();

    // Correct email + password → deleted.
    expect(await M.deleteEcommBrand({}, { brand_doc_id: bid, email: 'brand-dev@x.com', password: 'secret' }, ctx)).toBe(true);
    expect(await EcommBrandModel.findById(bid)).toBeNull();
  });
});
