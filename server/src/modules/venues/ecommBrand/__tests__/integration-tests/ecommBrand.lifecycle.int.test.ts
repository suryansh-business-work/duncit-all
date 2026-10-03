// Every vendor and messaging edge is stubbed: the brand's own ShipRocket and
// Razorpay checks, WhatsApp/email, warehouse registration, and the role writer.
jest.mock('@modules/platform/envEntry/envEntry.connection', () => ({
  razorpayConnection: jest.fn(),
  shiprocketConnection: jest.fn(),
}));
jest.mock('@services/notify/notify.service', () => ({ notifyEvent: jest.fn(), notifyEach: jest.fn() }));
jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn() }));
jest.mock('@modules/platform/whatsapp/whatsapp.service', () => ({ whatsappService: { send: jest.fn() } }));
jest.mock('@modules/venues/brandPickupLocation/brandPickupLocation.service', () => ({
  brandPickupLocationService: { registerBrandWarehouses: jest.fn() },
}));
jest.mock('@modules/access/user/user.service', () => ({ userService: { assignRoles: jest.fn() } }));
jest.mock('@modules/access/user/effective-roles', () => ({ effectiveRoleKeys: jest.fn() }));
jest.mock('@modules/content/policyAcceptance/policyAcceptance.service', () => ({
  policyAcceptanceService: { recordBrandConsent: jest.fn() },
}));

import { Types } from 'mongoose';
import { razorpayConnection, shiprocketConnection } from '@modules/platform/envEntry/envEntry.connection';
import { notifyEach, notifyEvent } from '@services/notify/notify.service';
import { sendEmail } from '@services/email/email.service';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';
import { brandPickupLocationService } from '@modules/venues/brandPickupLocation/brandPickupLocation.service';
import { userService } from '@modules/access/user/user.service';
import { effectiveRoleKeys } from '@modules/access/user/effective-roles';
import { policyAcceptanceService } from '@modules/content/policyAcceptance/policyAcceptance.service';
import { PolicyModel } from '@modules/content/policy/policy.model';
import { getUrlConfigs } from '@config/url-configs';
import { UserModel } from '@modules/access/user/user.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { BrandPickupLocationModel } from '@modules/venues/brandPickupLocation/brandPickupLocation.model';
import { EcommBrandModel } from '../../ecommBrand.model';
import { forgetConsentCache } from '../../ecommBrand.integrations';
import { ecommBrandService as svc } from '../../ecommBrand.service';

/**
 * A partner brand's life after the first save: review round-trips, the signed
 * consent, its own vendor credentials, pausing, and removal — with who gets
 * told, and that a brand with live products can never be deleted out from
 * under them.
 */

const READY = {
  description: 'Handmade home decor and apparel.',
  registered_business_name: 'Acme Co Pvt Ltd',
  gstin: '29AABCA1234F1ZP',
  address_line1: '12 Market Street, Koregaon Park',
  city: 'Pune',
  state: 'Maharashtra',
  postal_code: '411001',
  product_categories: ['Decor', 'Apparel'],
  logo_url: 'https://ik.imagekit.io/duncit/brands/acme-logo.png',
  documents: [{ type: 'GST certificate', url: 'https://ik.imagekit.io/duncit/brands/acme-gst.pdf' }],
};

const mockNotify = notifyEvent as jest.Mock;
const mockMail = sendEmail as jest.Mock;
const mockRoles = effectiveRoleKeys as jest.Mock;
const mockShiprocket = shiprocketConnection as jest.Mock;
const mockRazorpay = razorpayConnection as jest.Mock;
let seq = 0;

const owner = () => new Types.ObjectId().toHexString();
const connectBoth = (id: unknown) =>
  EcommBrandModel.updateOne(
    { _id: id },
    { $set: { 'integrations.shiprocket.connected': true, 'integrations.razorpay.connected': true } }
  );

async function readyBrand(userId: string, over: Record<string, unknown> = {}) {
  seq += 1;
  const draft = await svc.save(userId, null, {
    ...READY,
    brand_name: `Acme ${seq}`,
    contact_person: 'Asha',
    contact_email: `owner${seq}@acme.com`,
    ...over,
  });
  await connectBoth(draft.id);
  return draft;
}

const setStatus = (id: string, status: string) => EcommBrandModel.updateOne({ _id: id }, { $set: { status } });

beforeEach(() => {
  forgetConsentCache();
  mockNotify.mockResolvedValue({ wa: { status: 'SENT' } });
  mockMail.mockResolvedValue(undefined);
  mockRoles.mockResolvedValue([]);
});

describe('review round-trips', () => {
  it('submitting tells the owner and every active Products Manager with an address', async () => {
    const uid = owner();
    await UserModel.create({ _id: uid, auth: { email: 'brand-owner@x.com' }, profile: { first_name: 'Asha', last_name: 'Rao' } });
    await UserModel.create({
      auth: { email: 'pm@duncit.com' },
      profile: { first_name: 'Priya' },
      metadata: { status: 'ACTIVE', role_keys: ['PRODUCTS_MANAGER'] },
    });
    await UserModel.create({ auth: {}, profile: { first_name: 'NoMail' }, metadata: { status: 'ACTIVE', role_keys: ['PRODUCTS_MANAGER'] } });
    await UserModel.create({
      auth: { email: 'gone-pm@duncit.com' },
      profile: { first_name: 'Gone' },
      metadata: { status: 'SUSPENDED', role_keys: ['PRODUCTS_MANAGER'] },
    });
    const brand = await readyBrand(uid);

    await svc.submit(uid, brand.id);

    const { partnersUrl, productsUrl } = await getUrlConfigs();
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'ECOMM_BRAND_SUBMITTED',
        params: ['Asha', brand.brand_name],
        email: brand.contact_email,
        vars: { brand_url: `${partnersUrl}/ecomm-brand/${brand.id}/edit` },
      })
    );
    expect(mockMail).toHaveBeenCalledTimes(1);
    expect(mockMail).toHaveBeenCalledWith({
      to: 'pm@duncit.com',
      subject: `Brand awaiting review: ${brand.brand_name}`,
      template: 'ecomm-brand-review-requested',
      category: 'notification',
      vars: {
        name: 'Priya',
        brand: brand.brand_name,
        owner: 'Asha Rao',
        category: 'Decor, Apparel',
        review_url: `${productsUrl}/ecomm/brands/${brand.id}`,
      },
    });
  });

  it('a failing owner notice or reviewer email never fails the submission', async () => {
    const uid = owner();
    await UserModel.create({ auth: { email: 'pm2@duncit.com' }, profile: { first_name: 'Pm' }, metadata: { status: 'ACTIVE', role_keys: ['PRODUCTS_MANAGER'] } });
    mockNotify.mockRejectedValueOnce(new Error('AiSensy down'));
    mockMail.mockRejectedValueOnce(new Error('SMTP down'));
    const brand = await readyBrand(uid);

    await expect(svc.submit(uid, brand.id)).resolves.toMatchObject({ status: 'SUBMITTED' });
  });

  it('withdraw moves only a submitted brand back to draft, and only for its owner', async () => {
    const uid = owner();
    const brand = await readyBrand(uid);
    await expect(svc.withdraw(uid, brand.id)).rejects.toThrow('Only a submitted brand can be moved back to draft');
    await svc.submit(uid, brand.id);

    await expect(svc.withdraw(owner(), brand.id)).rejects.toThrow('Brand not found');
    await expect(svc.withdraw(uid, 'not-an-id')).rejects.toThrow('Invalid brand');

    const back = await svc.withdraw(uid, brand.id);
    expect(back).toMatchObject({ status: 'DRAFT', submitted_at: null });
  });

  it('approval notifies on the transition only, trims tags and registers warehouses each time', async () => {
    const uid = owner();
    const brand = await readyBrand(uid);
    mockRoles.mockResolvedValue(['HOST']);

    const approved = await svc.approve(brand.id, 'Looks good', [' eco ', '', 'handmade']);
    expect(approved).toMatchObject({ status: 'APPROVED', reviewer_notes: 'Looks good', tags: ['eco', 'handmade'] });
    expect(userService.assignRoles).toHaveBeenCalledWith(uid, ['HOST', 'USER', 'ECOMM_MANAGER']);
    expect(notifyEach).toHaveBeenCalledTimes(1);
    const events = jest.mocked(notifyEach).mock.calls[0][0].map((n: { event: string }) => n.event);
    expect(events).toEqual(['ECOMM_ONBOARDING_APPROVED', 'ECOMM_BRAND_ADDED']);

    // Re-approving (a change request, an admin editing notes) keeps the notes and tells nobody again.
    const again = await svc.approve(brand.id);
    expect(again.reviewer_notes).toBe('Looks good');
    expect(notifyEach).toHaveBeenCalledTimes(1);
    expect(brandPickupLocationService.registerBrandWarehouses).toHaveBeenCalledTimes(2);
  });

  it('revokeApprovalForUser un-approves only that user’s approved brands', async () => {
    const uid = owner();
    const live = await readyBrand(uid);
    const draft = await readyBrand(uid);
    const others = await readyBrand(owner());
    await setStatus(live.id, 'APPROVED');
    await setStatus(others.id, 'APPROVED');

    await expect(svc.revokeApprovalForUser(uid)).resolves.toBe(true);

    expect(await svc.getById(live.id)).toMatchObject({
      status: 'REJECTED',
      reviewer_notes: 'Approval revoked — seller access was removed.',
    });
    expect((await svc.getById(draft.id))?.status).toBe('DRAFT');
    expect((await svc.getById(others.id))?.status).toBe('APPROVED');
  });
});

describe('the Brand Consent', () => {
  const publish = (content = '<p>Consent v1</p>') =>
    PolicyModel.create({ slug: 'brand-partner-consent', title: 'Brand Partner Consent', content, is_active: true });

  it('with nothing published there is nothing to sign and no policy to show', async () => {
    const uid = owner();
    const brand = await readyBrand(uid);
    await expect(svc.signConsent(uid, brand.id, 'Asha Rao')).rejects.toThrow('No Brand Consent is published yet');
    expect(await svc.consentPolicy()).toBeNull();
  });

  it('once published it is required to submit; signing records the acceptance and unblocks it', async () => {
    const uid = owner();
    const brand = await readyBrand(uid);
    const policy = await publish();
    forgetConsentCache();

    await expect(svc.submit(uid, brand.id)).rejects.toThrow(/Final consent/);
    await expect(svc.signConsent(uid, brand.id, ' ab ')).rejects.toThrow('Type your full name to sign');

    const signed = await svc.signConsent(uid, brand.id, '  Asha Rao ');
    expect(signed).toMatchObject({
      accepted: true,
      signed_name: 'Asha Rao',
      policy_slug: 'brand-partner-consent',
      policy_title: 'Brand Partner Consent',
      current: true,
      available: true,
    });
    expect(policyAcceptanceService.recordBrandConsent).toHaveBeenCalledWith(uid, expect.objectContaining({ slug: 'brand-partner-consent' }));
    expect((await svc.consentPolicy())?.id).toBe(String(policy._id));
    await expect(svc.submit(uid, brand.id)).resolves.toMatchObject({ status: 'SUBMITTED' });
  });

  it('a signature goes stale when the wording changes, and the completion drops with it', async () => {
    const uid = owner();
    const brand = await readyBrand(uid);
    await publish('<p>Consent v1</p>');
    forgetConsentCache();
    await svc.signConsent(uid, brand.id, 'Asha Rao');
    const pub = await svc.myBrand(uid, brand.id);

    expect((await svc.consentField(pub)).current).toBe(true);
    const full = await svc.completionField(pub as never);
    expect(full.percent).toBe(100);

    await PolicyModel.updateOne({ slug: 'brand-partner-consent' }, { $set: { content: '<p>Consent v2</p>' } });
    forgetConsentCache();

    expect(await svc.consentField(pub)).toMatchObject({ accepted: true, current: false, available: true });
    const stale = await svc.completionField(pub as never);
    expect(stale.percent).toBeLessThan(100);
    expect(stale.steps.find((s: { key: string }) => s.key === 'consent')?.complete).toBe(false);
  });
});

describe('vendor integrations', () => {
  it('connects ShipRocket, checks it at once, and never echoes the password', async () => {
    const uid = owner();
    const brand = await readyBrand(uid);
    mockShiprocket.mockResolvedValue({ ok: true, message: 'Logged in', details: ['2 pickups'] });

    const status = await svc.connectIntegration(uid, brand.id, 'SHIPROCKET', {
      email: ' api@acme.com ',
      password: 's3cret',
      pickup_location: ' Pune WH ',
    });

    expect(status).toMatchObject({
      provider: 'SHIPROCKET',
      configured: true,
      connected: true,
      message: 'Logged in',
      details: ['2 pickups'],
      identifier: 'api@acme.com',
      has_secret: true,
      pickup_location: 'Pune WH',
    });
    expect(JSON.stringify(status)).not.toContain('s3cret');
    const read = mockShiprocket.mock.calls[0][0];
    expect(read('email')).toBe('api@acme.com');
    expect(read('password')).toBe('s3cret');
    expect((await EcommBrandModel.findById(brand.id).lean())?.integrations.shiprocket.connected).toBe(true);
  });

  it('a live Razorpay key reads as live mode; a blank secret keeps the saved one', async () => {
    const uid = owner();
    const brand = await readyBrand(uid);
    mockRazorpay.mockResolvedValue({ ok: true, message: 'ok', details: [] });

    await svc.connectIntegration(uid, brand.id, 'RAZORPAY', { key_id: 'rzp_live_abc', key_secret: 'sec' });
    const status = await svc.connectIntegration(uid, brand.id, 'RAZORPAY', { key_id: 'rzp_live_abc', key_secret: '' });

    expect(status).toMatchObject({ live_mode: true, has_secret: true, identifier: 'rzp_live_abc' });
    expect(mockRazorpay.mock.calls[1][0]('key_secret')).toBe('sec');
  });

  it('refuses an unknown provider, missing credentials, and changes while in review', async () => {
    const uid = owner();
    const brand = await readyBrand(uid);
    await expect(svc.connectIntegration(uid, brand.id, 'PAYPAL' as never, {})).rejects.toThrow('Unknown integration provider');
    await expect(svc.connectIntegration(uid, brand.id, 'SHIPROCKET', { password: 'x' })).rejects.toThrow(
      'Enter the ShipRocket API user email'
    );
    await expect(svc.connectIntegration(uid, brand.id, 'RAZORPAY', { key_id: 'rzp_test_1' })).rejects.toThrow(
      'Enter the Razorpay key secret'
    );
    await svc.submit(uid, brand.id);
    await expect(svc.connectIntegration(uid, brand.id, 'RAZORPAY', { key_id: 'k', key_secret: 's' })).rejects.toThrow(
      'Withdraw the brand from review before changing its integrations'
    );
    await expect(svc.disconnectIntegration(uid, brand.id, 'RAZORPAY')).rejects.toThrow('Withdraw the brand from review');
  });

  it('an unreachable vendor is recorded as not connected with a retry message', async () => {
    const uid = owner();
    const brand = await readyBrand(uid);
    mockShiprocket.mockRejectedValue(new Error('ETIMEDOUT'));
    const status = await svc.connectIntegration(uid, brand.id, 'SHIPROCKET', { email: 'a@b.com', password: 'p' });
    expect(status).toMatchObject({ connected: false, message: 'ShipRocket could not be reached — try again shortly' });
  });

  it('recheck needs a saved credential; disconnect forgets it; the reviewer can probe any brand', async () => {
    const uid = owner();
    const brand = await readyBrand(uid);
    await expect(svc.recheckIntegration(uid, brand.id, 'RAZORPAY')).rejects.toThrow('Save the Razorpay keys first');

    mockRazorpay.mockResolvedValue({ ok: false, message: 'Bad key', details: [] });
    await svc.connectIntegration(uid, brand.id, 'RAZORPAY', { key_id: 'rzp_test_1', key_secret: 's' });
    mockRazorpay.mockResolvedValue({ ok: true, message: 'Good now', details: [] });
    expect(await svc.recheckIntegration(uid, brand.id, 'RAZORPAY')).toMatchObject({ connected: true, message: 'Good now' });
    expect(await svc.reviewIntegration(brand.id, 'RAZORPAY')).toMatchObject({ connected: true });

    const cleared = await svc.disconnectIntegration(uid, brand.id, 'RAZORPAY');
    expect(cleared).toMatchObject({ configured: false, connected: false, identifier: '', has_secret: false });

    await expect(svc.reviewIntegration('nope', 'RAZORPAY')).rejects.toThrow('Invalid brand');
    await expect(svc.reviewIntegration(new Types.ObjectId().toHexString(), 'RAZORPAY')).rejects.toThrow('Brand not found');
  });
});

describe('shipping mode', () => {
  it('a real change un-registers the brand’s warehouses, and re-registers at once for a live brand', async () => {
    const uid = owner();
    const brand = await readyBrand(uid);
    const wh = await BrandPickupLocationModel.create({
      owner_kind: 'BRAND',
      brand_id: brand.id,
      nickname: `brand-wh-${seq}`,
      shiprocket_registered: true,
      shiprocket_error: 'old',
    });
    await setStatus(brand.id, 'APPROVED');

    // No mode saved and no ShipRocket login on file reads as the Duncit
    // courier, so choosing the brand's own account is a real change.
    await svc.setShippingMode(uid, brand.id, 'OWN_SHIPROCKET');

    expect(await BrandPickupLocationModel.findById(wh._id).lean()).toMatchObject({ shiprocket_registered: false, shiprocket_error: '' });
    expect(brandPickupLocationService.registerBrandWarehouses).toHaveBeenCalledWith(brand.id);

    await BrandPickupLocationModel.updateOne({ _id: wh._id }, { $set: { shiprocket_registered: true } });
    await svc.setShippingMode(uid, brand.id, 'OWN_SHIPROCKET');
    expect((await BrandPickupLocationModel.findById(wh._id).lean())?.shiprocket_registered).toBe(true);
    expect(brandPickupLocationService.registerBrandWarehouses).toHaveBeenCalledTimes(1);
  });
});

describe('pausing', () => {
  it('the owner can pause their own brand; the owner is emailed and messaged; a no-op toggle says nothing', async () => {
    const uid = owner();
    const brand = await readyBrand(uid);
    await expect(svc.setActiveOwned(owner(), brand.id, false)).rejects.toThrow('Brand not found');

    const paused = await svc.setActiveOwned(uid, brand.id, false);
    expect(paused.is_active).toBe(false);
    expect(mockMail).toHaveBeenCalledWith(expect.objectContaining({ template: 'brand-deactivated', to: brand.contact_email }));
    expect(whatsappService.send).toHaveBeenCalledWith(expect.objectContaining({ event: 'ECOMM_ACCOUNT_SUSPENDED', params: ['Asha'] }));

    await svc.setActiveOwned(uid, brand.id, false);
    expect(mockMail).toHaveBeenCalledTimes(1);
  });

  it('a reactivation email failure is logged and the WhatsApp still goes', async () => {
    const uid = owner();
    const brand = await readyBrand(uid);
    await EcommBrandModel.updateOne({ _id: brand.id }, { $set: { is_active: false } });
    mockMail.mockRejectedValueOnce(new Error('SMTP'));

    await expect(svc.setActive(brand.id, true)).resolves.toMatchObject({ is_active: true });
    expect(whatsappService.send).toHaveBeenCalledWith(expect.objectContaining({ event: 'ECOMM_ACCOUNT_REACTIVATED' }));
  });
});

describe('admin edits', () => {
  it('adminUpdate stamps the status dates, and approving grants the role and registers warehouses', async () => {
    const uid = owner();
    const brand = await readyBrand(uid);
    await expect(svc.adminUpdate(new Types.ObjectId().toHexString(), {})).rejects.toThrow('Brand not found');

    const submitted = await svc.adminUpdate(brand.id, { description: 'Edited by onboarding' }, 'SUBMITTED');
    expect(submitted.submitted_at).not.toBeNull();
    expect(userService.assignRoles).not.toHaveBeenCalled();

    const rejected = await svc.adminUpdate(brand.id, {}, 'REJECTED');
    expect(rejected.status).toBe('REJECTED');

    const approved = await svc.adminUpdate(brand.id, {}, 'APPROVED');
    expect(approved).toMatchObject({ status: 'APPROVED', rejected_at: null });
    expect(approved.approved_at).not.toBeNull();
    expect(userService.assignRoles).toHaveBeenCalledWith(uid, ['USER', 'ECOMM_MANAGER']);
    expect(brandPickupLocationService.registerBrandWarehouses).toHaveBeenCalledWith(brand.id);
  });

  it('createDraftFromApproval reuses an open draft, reopens a rejected one, and never overwrites typed details', async () => {
    const uid = owner();
    const first = await svc.createDraftFromApproval({ userId: uid, name: 'Meeting Name', email: 'm@x.com', phone: '98' });
    expect(first).toMatchObject({ status: 'DRAFT', brand_name: 'Meeting Name', contact_person: 'Meeting Name', contact_email: 'm@x.com' });

    await EcommBrandModel.updateOne({ _id: first.id }, { $set: { status: 'REJECTED', brand_name: 'Typed Name' } });
    const reused = await svc.createDraftFromApproval({ userId: uid, name: 'Other', email: 'o@x.com' });
    expect(reused).toMatchObject({ id: first.id, status: 'DRAFT', brand_name: 'Typed Name', contact_email: 'm@x.com' });
    expect(await EcommBrandModel.countDocuments({ owner_user_id: uid })).toBe(1);
  });
});

describe('removal', () => {
  const seedProduct = (brandId: string) =>
    InventoryProductModel.create({ product_name: 'Vase', sku: `VASE-${++seq}`, unit_cost: 100, brand_id: brandId, ownership: 'BRAND' });

  it('an approved brand that still sells cannot be deleted by its owner', async () => {
    const uid = owner();
    const brand = await readyBrand(uid);
    await setStatus(brand.id, 'APPROVED');
    await seedProduct(brand.id);
    await expect(svc.deleteMine(uid, brand.id)).rejects.toThrow(
      'This brand still has 1 product(s). Deactivate it instead, or remove the products first.'
    );
    expect(await EcommBrandModel.exists({ _id: brand.id })).not.toBeNull();
  });

  it('deleting the owner’s last brand removes its warehouses and the seller role, and tells them', async () => {
    const uid = owner();
    const brand = await readyBrand(uid);
    await BrandPickupLocationModel.create({ owner_kind: 'BRAND', brand_id: brand.id, nickname: `del-wh-${seq}` });
    mockRoles.mockResolvedValue(['USER', 'ECOMM_MANAGER']);

    await expect(svc.deleteMine(uid, brand.id)).resolves.toBe(true);

    expect(await EcommBrandModel.exists({ _id: brand.id })).toBeNull();
    expect(await BrandPickupLocationModel.countDocuments({ brand_id: brand.id })).toBe(0);
    expect(userService.assignRoles).toHaveBeenCalledWith(uid, ['USER']);
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'ECOMM_BRAND_DELETED', params: ['Asha', brand.brand_name], vars: { reason: '' } })
    );
  });

  it('keeps the seller role while another brand remains, and skips the write when the role is not held', async () => {
    const uid = owner();
    const a = await readyBrand(uid);
    const b = await readyBrand(uid);
    mockRoles.mockResolvedValue(['USER', 'ECOMM_MANAGER']);
    await svc.deleteMine(uid, a.id);
    expect(mockRoles).not.toHaveBeenCalled();

    mockRoles.mockResolvedValue(['USER']);
    await svc.deleteMine(uid, b.id);
    expect(userService.assignRoles).not.toHaveBeenCalled();
  });

  it('adminDelete validates, blocks on products, and sends the trimmed reason', async () => {
    const brand = await readyBrand(owner());
    await expect(svc.adminDelete('bad', 'x')).rejects.toThrow('Invalid brand id');
    await expect(svc.adminDelete(new Types.ObjectId().toHexString(), 'x')).rejects.toThrow('Brand not found');
    const product = await seedProduct(brand.id);
    await expect(svc.adminDelete(brand.id, 'x')).rejects.toThrow(
      'This brand still has 1 product(s). Deactivate it, or remove the products before deleting.'
    );
    await InventoryProductModel.deleteOne({ _id: product._id });

    await expect(svc.adminDelete(brand.id, '  Duplicate listing  ')).resolves.toBe(true);
    expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({ vars: { reason: 'Duplicate listing' } }));
  });
});
