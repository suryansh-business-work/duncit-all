import { Types } from 'mongoose';
import { ecommBrandService } from '../../ecommBrand.service';

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
