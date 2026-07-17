import { Types } from 'mongoose';
import { approvalService } from '../../approval.service';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';

const ADMIN = { id: 'admin-1', name: 'admin@example.com' };

// The generic Admin approval inbox now serves cross-portal (ecomm change)
// requests only — onboarding-meeting approvals are decided in the Onboarding
// console itself (see meeting.int.test.ts → "meeting decide").
describe('approval — ecomm change requests', () => {
  it('submits a product change, lists it by kind, and applies the payload on approval (Task B item 2)', async () => {
    const productId = new Types.ObjectId();
    await InventoryProductModel.collection.insertOne({
      _id: productId,
      product_name: 'Old name',
      selling_price: 100,
    } as never);

    const req = await approvalService.submitEcommChange(
      {
        kind: 'PRODUCT',
        target_id: productId.toString(),
        target_name: 'Old name',
        details: [{ label: 'Selling price (₹)', value: '999' }],
        payload: JSON.stringify({ selling_price: 999, product_name: 'New name' }),
      },
      { id: 'pm-1', name: 'pm@example.com' },
    );
    expect(req!.type).toBe('ECOMM_PRODUCT_CHANGE');
    expect(req!.status).toBe('PENDING');
    expect(req!.target_id).toBe(productId.toString());

    // Listing is kind-scoped.
    expect((await approvalService.listEcommChanges('PRODUCT')).some((r: any) => r.id === req!.id)).toBe(true);
    expect((await approvalService.listEcommChanges('BRAND')).some((r: any) => r.id === req!.id)).toBe(false);
    expect((await approvalService.listEcommChanges()).some((r: any) => r.id === req!.id)).toBe(true);

    // Approval applies the payload to the product.
    await approvalService.approve(req!.id, ADMIN);
    const updated: any = await InventoryProductModel.findById(productId);
    expect(updated.selling_price).toBe(999);
    expect(updated.product_name).toBe('New name');

    // A reviewed request can't be reviewed again.
    await expect(approvalService.approve(req!.id, ADMIN)).rejects.toThrow(/already/i);
  });

  it('applies a brand change on approval and tolerates a malformed payload (Task B item 2)', async () => {
    const brandId = new Types.ObjectId();
    await EcommBrandModel.collection.insertOne({ _id: brandId, brand_name: 'B', tagline: 'old' } as never);
    const brandReq = await approvalService.submitEcommChange(
      {
        kind: 'BRAND',
        target_id: brandId.toString(),
        target_name: 'B',
        details: [{ label: 'Tagline', value: 'new tag' }],
        payload: JSON.stringify({ tagline: 'new tag' }),
      },
      ADMIN,
    );
    expect(brandReq!.type).toBe('ECOMM_BRAND_CHANGE');
    await approvalService.approve(brandReq!.id, ADMIN);
    const brand: any = await EcommBrandModel.findById(brandId);
    expect(brand.tagline).toBe('new tag');

    // A malformed payload is swallowed — the approval still succeeds.
    const bad = await approvalService.submitEcommChange(
      {
        kind: 'PRODUCT',
        target_id: new Types.ObjectId().toString(),
        target_name: 'X',
        details: [{ label: 'x', value: 'y' }],
        payload: 'not-json',
      },
      ADMIN,
    );
    const approved = await approvalService.approve(bad!.id, ADMIN);
    expect(approved!.status).toBe('APPROVED');
  });

  it('denies a request and blocks a second decision', async () => {
    const req = await approvalService.submitEcommChange(
      {
        kind: 'BRAND',
        target_id: new Types.ObjectId().toString(),
        target_name: 'Deny me',
        details: [{ label: 'Tagline', value: 'x' }],
        payload: JSON.stringify({ tagline: 'x' }),
      },
      ADMIN,
    );
    const denied = await approvalService.deny(req!.id, ADMIN, 'Not now');
    expect(denied!.status).toBe('DENIED');
    expect(denied!.review_notes).toBe('Not now');
    await expect(approvalService.deny(req!.id, ADMIN, 'again')).rejects.toThrow(/already/i);
  });

  it('lists requests filtered by status and type, and 404s an unknown id', async () => {
    const pending = await approvalService.list({ status: 'PENDING' });
    expect(pending.every((r: any) => r.status === 'PENDING')).toBe(true);
    const byType = await approvalService.list({ type: 'ECOMM_PRODUCT_CHANGE' });
    expect(byType.every((r: any) => r.type === 'ECOMM_PRODUCT_CHANGE')).toBe(true);

    await expect(approvalService.approve(new Types.ObjectId().toString(), ADMIN)).rejects.toThrow(/not found/i);
    await expect(approvalService.deny(new Types.ObjectId().toString(), ADMIN)).rejects.toThrow(/not found/i);
  });
});
