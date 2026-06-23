import { Types } from 'mongoose';
import { ecommBrandService } from '../../ecommBrand.service';

describe('ecommBrandService integration', () => {
  const newOwner = () => new Types.ObjectId().toString();

  it('saves a draft, then submits it for review', async () => {
    const owner = newOwner();
    const draft = await ecommBrandService.save(owner, {
      brand_name: 'Acme Co',
      description: 'Handmade home decor and apparel.',
      contact_email: 'owner@acme.com',
      product_categories: ['Decor', 'Apparel'],
    });
    expect(draft.status).toBe('DRAFT');
    expect(draft.brand_name).toBe('Acme Co');
    expect(draft.product_categories).toEqual(['Decor', 'Apparel']);

    const submitted = await ecommBrandService.submit(owner);
    expect(submitted.status).toBe('SUBMITTED');
    expect(submitted.submitted_at).toBeTruthy();

    const mine = await ecommBrandService.getMine(owner);
    expect(mine?.status).toBe('SUBMITTED');
  });

  it('rejects submitting a brand with no name', async () => {
    const owner = newOwner();
    await ecommBrandService.save(owner, { description: 'desc but no name here' });
    await expect(ecommBrandService.submit(owner)).rejects.toThrow(/brand name/i);
  });

  it('rejects a brand with reviewer notes', async () => {
    const owner = newOwner();
    const draft = await ecommBrandService.save(owner, {
      brand_name: 'Rejectable',
      description: 'something to review',
      contact_email: 'r@b.com',
    });
    await ecommBrandService.submit(owner);
    const rejected = await ecommBrandService.reject(draft.id, 'Logo resolution too low');
    expect(rejected.status).toBe('REJECTED');
    expect(rejected.reviewer_notes).toBe('Logo resolution too low');
  });
});
