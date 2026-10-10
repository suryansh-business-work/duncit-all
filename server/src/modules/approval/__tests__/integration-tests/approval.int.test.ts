jest.mock('@modules/commerce/shiprocket/shiprocket.gateway', () => ({
  ...jest.requireActual('@modules/commerce/shiprocket/shiprocket.gateway'),
  addPickupLocation: jest.fn(),
}));

import { Types } from 'mongoose';
import { addPickupLocation } from '@modules/commerce/shiprocket/shiprocket.gateway';
import { approvalService } from '../../approval.service';
import { ApprovalRequestModel } from '../../approval.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';
import { BrandPickupLocationModel } from '@modules/venues/brandPickupLocation/brandPickupLocation.model';

const ADMIN = { id: 'admin-1', name: 'admin@example.com' };
const mockAddPickup = addPickupLocation as jest.Mock;

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
    // The change is applied through a validated save, so the brand carries the
    // owner every real brand has.
    await EcommBrandModel.collection.insertOne({
      _id: brandId,
      owner_user_id: new Types.ObjectId(),
      brand_name: 'B',
      tagline: 'old',
    } as never);
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

  it('routes a brand-change payload that flips status to APPROVED through the real approve path', async () => {
    // The generic $set path must never grant approval silently — the real
    // approve() also grants the owner the e-commerce role.
    const { userService } = await import('@modules/access/user/user.service');
    const assignSpy = jest.spyOn(userService, 'assignRoles').mockResolvedValue(undefined as never);
    const ownerId = new Types.ObjectId();
    const brandId = new Types.ObjectId();
    // approve() refuses a brand whose wizard is incomplete, so the sneaky
    // brand is otherwise fully filled: only its status is being smuggled.
    await EcommBrandModel.collection.insertOne({
      _id: brandId,
      brand_name: 'Sneaky',
      status: 'SUBMITTED',
      owner_user_id: ownerId,
      description: 'A brand trying to approve itself through a change request.',
      contact_email: 'sneaky@example.com',
      registered_business_name: 'Sneaky Pvt Ltd',
      pan: 'AAAAA0000A',
      address_line1: '1 Back Lane, Sector 5',
      city: 'Gurugram',
      state: 'Haryana',
      postal_code: '122001',
      product_categories: ['Decor'],
      logo_url: 'https://ik.imagekit.io/duncit/brands/sneaky.png',
      documents: [{ type: 'PAN', url: 'https://ik.imagekit.io/duncit/brands/sneaky-pan.pdf', uploaded_at: new Date() }],
      integrations: { shiprocket: { connected: true }, razorpay: { connected: true } },
    } as never);
    const req = await approvalService.submitEcommChange(
      {
        kind: 'BRAND',
        target_id: brandId.toString(),
        target_name: 'Sneaky',
        details: [{ label: 'Status', value: 'APPROVED' }],
        payload: JSON.stringify({ status: 'APPROVED', tagline: 'now live' }),
      },
      ADMIN,
    );
    await approvalService.approve(req!.id, ADMIN);
    const brand: any = await EcommBrandModel.findById(brandId);
    expect(brand.status).toBe('APPROVED');
    expect(brand.approved_at).toBeTruthy();
    expect(brand.tagline).toBe('now live');
    // Both vendors are connected, so the real approve path also puts it live.
    expect(brand.live).toBe(true);
    expect(brand.live_since).toBeInstanceOf(Date);
    expect(assignSpy).toHaveBeenCalledWith(
      ownerId.toString(),
      expect.arrayContaining(['USER', 'ECOMM_MANAGER']),
    );
    assignSpy.mockRestore();
  });

  it('takes a live brand off the pod shop when an approved change pauses it', async () => {
    const live = await EcommBrandModel.create({
      owner_user_id: new Types.ObjectId(),
      brand_name: 'Selling Co',
      status: 'APPROVED',
      is_active: true,
      integrations: { shiprocket: { connected: true }, razorpay: { connected: true } },
    });
    expect(live.live).toBe(true);

    const req = await approvalService.submitEcommChange(
      {
        kind: 'BRAND',
        target_id: String(live._id),
        target_name: 'Selling Co',
        details: [{ label: 'Active', value: 'No' }],
        payload: JSON.stringify({ is_active: false }),
      },
      ADMIN,
    );
    await approvalService.approve(req!.id, ADMIN);

    // Saved through the model, so `live` is re-derived — a $set would have
    // left the paused brand selling.
    const after: any = await EcommBrandModel.findById(live._id).lean();
    expect(after.is_active).toBe(false);
    expect(after.live).toBe(false);
    expect(after.live_since).toBeNull();
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

describe('approval — warehouse approval requests', () => {
  const insertWarehouse = async () => {
    const id = new Types.ObjectId();
    await BrandPickupLocationModel.collection.insertOne({
      _id: id,
      owner_kind: 'BRAND',
      brand_id: new Types.ObjectId(),
      nickname: `WH-${String(id)}`,
      review_status: 'PENDING',
    } as never);
    return id;
  };

  it('submits, lists (all + by status), and approves — marking the warehouse APPROVED', async () => {
    const whId = await insertWarehouse();
    const req = await approvalService.submitWarehouseApproval(String(whId), 'WH One', false, 'u1');
    expect(req!.type).toBe('WAREHOUSE_APPROVAL');
    expect(req!.status).toBe('PENDING');
    expect((await approvalService.listWarehouseApprovals()).some((r: any) => r.id === req!.id)).toBe(true);
    expect((await approvalService.listWarehouseApprovals('PENDING')).some((r: any) => r.id === req!.id)).toBe(true);
    await approvalService.reviewWarehouse(req!.id, 'APPROVE', ADMIN);
    const wh: any = await BrandPickupLocationModel.findById(whId);
    expect(wh.review_status).toBe('APPROVED');
  });

  it('sends the approved warehouse to ShipRocket, and keeps the approval when ShipRocket refuses it', async () => {
    const address = {
      contact_name: 'Store Desk',
      phone: '9876543210',
      email: 'desk@brand.in',
      address_line1: '14 Industrial Estate, Phase 2',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411019',
    };
    const approve = async (nickname: string) => {
      const wh = await BrandPickupLocationModel.create({ ...address, owner_kind: 'BRAND', brand_id: null, nickname, review_status: 'PENDING' });
      const req = await approvalService.submitWarehouseApproval(String(wh._id), nickname, false, 'u1');
      const reviewed = await approvalService.reviewWarehouse(req!.id, 'APPROVE', ADMIN);
      return { reviewed, wh: await BrandPickupLocationModel.findById(wh._id).lean() };
    };

    mockAddPickup.mockReset().mockResolvedValue({ registered: true, pickup_id: '4411' });
    const taken = await approve('APPROVE-SENT');
    expect(mockAddPickup).toHaveBeenCalledWith(expect.objectContaining({ pickup_location: 'APPROVE-SENT', pin_code: '411019' }));
    expect([taken.wh?.review_status, taken.wh?.shiprocket_registered, taken.wh?.shiprocket_pickup_id, taken.wh?.shiprocket_error]).toEqual([
      'APPROVED',
      true,
      '4411',
      '',
    ]);

    mockAddPickup.mockReset().mockRejectedValue(new Error('ShipRocket refused addPickup: Invalid pincode'));
    const refused = await approve('APPROVE-REFUSED');
    expect(refused.reviewed!.status).toBe('APPROVED');
    expect([refused.wh?.review_status, refused.wh?.shiprocket_registered, refused.wh?.shiprocket_error]).toEqual([
      'APPROVED',
      false,
      'ShipRocket refused addPickup: Invalid pincode',
    ]);
  });

  it('never sends a denied warehouse to ShipRocket', async () => {
    mockAddPickup.mockReset();
    const whId = await insertWarehouse();
    const req = await approvalService.submitWarehouseApproval(String(whId), 'WH Denied', false, 'u1');
    await approvalService.reviewWarehouse(req!.id, 'DENY', ADMIN, 'wrong address');
    expect(mockAddPickup).not.toHaveBeenCalled();
  });

  it('supersedes a prior pending request and denies — marking the warehouse REJECTED', async () => {
    const whId = await insertWarehouse();
    await approvalService.submitWarehouseApproval(String(whId), 'WH Two', false, 'u1');
    const second = await approvalService.submitWarehouseApproval(String(whId), 'WH Two', true, 'u1');
    const pending = (await approvalService.listWarehouseApprovals('PENDING')).filter(
      (r: any) => r.target_id === String(whId),
    );
    expect(pending).toHaveLength(1);
    await approvalService.reviewWarehouse(second!.id, 'DENY', ADMIN, 'incomplete');
    const wh: any = await BrandPickupLocationModel.findById(whId);
    expect(wh.review_status).toBe('REJECTED');
  });

  it('reviewWarehouse rejects a missing id and a non-warehouse request', async () => {
    await expect(
      approvalService.reviewWarehouse(new Types.ObjectId().toString(), 'APPROVE', ADMIN),
    ).rejects.toThrow(/not found/i);
    const ecomm = await approvalService.submitEcommChange(
      { kind: 'PRODUCT', target_id: new Types.ObjectId().toString(), target_name: 'X', details: [], payload: '{}' },
      ADMIN,
    );
    await expect(approvalService.reviewWarehouse(ecomm!.id, 'APPROVE', ADMIN)).rejects.toThrow(/not a warehouse/i);
  });

  it('tolerates a missing target_id and a malformed target id when applying the decision', async () => {
    const noTarget = await ApprovalRequestModel.create({ type: 'WAREHOUSE_APPROVAL', status: 'PENDING', target_id: null });
    expect((await approvalService.reviewWarehouse(String(noTarget._id), 'APPROVE', ADMIN))!.status).toBe('APPROVED');
    const badTarget = await ApprovalRequestModel.create({ type: 'WAREHOUSE_APPROVAL', status: 'PENDING', target_id: 'not-an-id' });
    expect((await approvalService.reviewWarehouse(String(badTarget._id), 'APPROVE', ADMIN))!.status).toBe('APPROVED');
  });
});
