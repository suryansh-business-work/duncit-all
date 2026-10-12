jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn(), error: jest.fn(), info: jest.fn() } } }));
jest.mock('@modules/platform/envEntry/envEntry.connection', () => ({
  razorpayConnection: jest.fn(),
  shiprocketConnection: jest.fn(),
}));
jest.mock('@modules/commerce/shiprocket/shiprocket.account', () => ({
  ...jest.requireActual('@modules/commerce/shiprocket/shiprocket.account'),
  platformSandboxApiUrl: jest.fn().mockResolvedValue('https://sandbox.shiprocket.in'),
}));
jest.mock('../../ecommBrand.service', () => ({
  PROVIDER_KEY: { SHIPROCKET: 'shiprocket', RAZORPAY: 'razorpay' },
  resetOwnShiprocketWarehouses: jest.fn().mockResolvedValue(undefined),
}));

import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { razorpayConnection, shiprocketConnection } from '@modules/platform/envEntry/envEntry.connection';
import { EcommBrandModel } from '../../ecommBrand.model';
import { resetOwnShiprocketWarehouses } from '../../ecommBrand.service';
import { PartnerIntegrationModel } from '../../partnerIntegration.model';
import { partnerIntegrationService as svc } from '../../partnerIntegration.service';

/**
 * A partner's saved Razorpay / ShipRocket accounts: every read and write is
 * scoped to its owner, one account is saved once, the vendor is asked on every
 * save, and a change reaches every brand that uses the connection.
 */

const mockRzp = razorpayConnection as jest.Mock;
const mockSr = shiprocketConnection as jest.Mock;
const owner = new Types.ObjectId().toHexString();
const ok = { ok: true, message: 'Connected', details: ['live'] };
const rzp = (key_id = 'rzp_test_AAA', key_secret = 'not-a-real-secret') => ({ razorpay: { key_id, key_secret } });
const sr = (email = 'ops@brand.test', password = 'not-a-real-password') => ({ shiprocket: { email, password } });
let seq = 0;

beforeEach(() => {
  mockRzp.mockResolvedValue(ok);
  mockSr.mockResolvedValue(ok);
});

const brand = (over: Record<string, unknown> = {}) => {
  seq += 1;
  return EcommBrandModel.create({ owner_user_id: new Types.ObjectId(owner), brand_name: `Brand ${seq}`, ...over });
};

describe('save', () => {
  it('refuses a missing or over-long name and an unknown provider', async () => {
    await expect(svc.save(owner, null, 'RAZORPAY', { label: '  ', ...rzp() })).rejects.toThrow('Give this connection a name');
    await expect(svc.save(owner, null, 'RAZORPAY', { label: null, ...rzp() })).rejects.toThrow('Give this connection a name');
    await expect(svc.save(owner, null, 'RAZORPAY', { label: 'x'.repeat(61), ...rzp() })).rejects.toThrow('under 60 characters');
    await expect(svc.save(owner, null, 'STRIPE' as never, { label: 'x' })).rejects.toThrow('Unknown integration provider');
  });

  it('saves a Razorpay account after the vendor accepts it, and never returns the secret', async () => {
    const pub = await svc.save(owner, null, 'RAZORPAY', { label: ' Main ', ...rzp() });

    expect(pub).toMatchObject({ provider: 'RAZORPAY', label: 'Main', brands: [] });
    expect(pub.status).toMatchObject({ configured: true, connected: true, identifier: 'rzp_test_AAA', has_secret: true, message: 'Connected' });
    expect(JSON.stringify(pub)).not.toContain('not-a-real-secret');
    expect(mockRzp).toHaveBeenCalledTimes(1);
    expect(pub.created_at).toEqual(expect.any(String));
  });

  it('saves a ShipRocket account, and records a vendor refusal on the connection rather than failing the save', async () => {
    mockSr.mockResolvedValueOnce({ ok: false, message: 'Invalid credentials', details: [] });
    const pub = await svc.save(owner, null, 'SHIPROCKET', { label: 'Courier', ...sr() });
    expect(pub.status).toMatchObject({ configured: true, connected: false, message: 'Invalid credentials', identifier: 'ops@brand.test' });
  });

  it('reports the vendor as unreachable when its check throws, and logs it', async () => {
    mockRzp.mockRejectedValueOnce(new Error('ECONNRESET'));
    const pub = await svc.save(owner, null, 'RAZORPAY', { label: 'Main', ...rzp() });
    expect(pub.status).toMatchObject({ connected: false, message: 'Razorpay could not be reached — try again shortly' });
    expect(logs.server.warn).toHaveBeenCalledWith('ecommBrand', 'probe', expect.objectContaining({ provider: 'RAZORPAY' }));
  });

  it('treats a missing ShipRocket block as an empty one and asks for the user', async () => {
    await expect(svc.save(owner, null, 'SHIPROCKET', { label: 'Courier' })).rejects.toThrow('Enter the ShipRocket API user email');
  });

  it('names a linked brand written before brands had names as blank', async () => {
    const saved = await svc.save(owner, null, 'RAZORPAY', { label: 'Main', ...rzp() });
    await EcommBrandModel.collection.insertOne({
      owner_user_id: new Types.ObjectId(owner),
      integration_links: { razorpay: new Types.ObjectId(saved.id) },
    } as never);
    const [row] = await svc.listMine(owner);
    expect(row.brands).toEqual([{ id: expect.any(String), brand_name: '' }]);
  });

  it('refuses the same account twice, by its public id and secret, but allows it under another partner', async () => {
    await svc.save(owner, null, 'RAZORPAY', { label: 'Main', ...rzp() });
    await expect(svc.save(owner, null, 'RAZORPAY', { label: 'Copy', ...rzp() })).rejects.toThrow('already saved as "Main"');
    const other = new Types.ObjectId().toHexString();
    await expect(svc.save(other, null, 'RAZORPAY', { label: 'Mine', ...rzp() })).resolves.toMatchObject({ label: 'Mine' });
  });

  it('refuses a ShipRocket account that is a sandbox-only copy of one already saved', async () => {
    const sandbox = { shiprocket: { sandbox: true, sandbox_email: 'sb@brand.test', sandbox_password: 'not-a-real-sandbox-pass' } };
    await svc.save(owner, null, 'SHIPROCKET', { label: 'Sandbox', ...sandbox });
    await expect(svc.save(owner, null, 'SHIPROCKET', { label: 'Again', ...sandbox })).rejects.toThrow('already saved as "Sandbox"');
  });

  it('refuses incomplete credentials before calling the vendor', async () => {
    await expect(svc.save(owner, null, 'RAZORPAY', { label: 'A', razorpay: { key_id: 'rzp_test_X' } })).rejects.toThrow('Enter the Razorpay key secret');
    await expect(svc.save(owner, null, 'SHIPROCKET', { label: 'A', shiprocket: { email: 'a@b.test' } })).rejects.toThrow('Enter the ShipRocket API user password');
    await expect(svc.save(owner, null, 'RAZORPAY', { label: 'A' })).rejects.toThrow('Enter the Razorpay key id');
    expect(mockRzp).not.toHaveBeenCalled();
  });

  it('edits only the owner’s own connection, keeps a blank secret, and will not change provider', async () => {
    const saved = await svc.save(owner, null, 'RAZORPAY', { label: 'Main', ...rzp() });

    const edited = await svc.save(owner, saved.id, 'RAZORPAY', { label: 'Renamed', razorpay: { key_id: 'rzp_test_AAA', key_secret: '' } });
    expect(edited).toMatchObject({ id: saved.id, label: 'Renamed' });
    expect((await PartnerIntegrationModel.findById(saved.id))?.integrations.razorpay.key_secret).toBe('not-a-real-secret');

    await expect(svc.save(owner, saved.id, 'SHIPROCKET', { label: 'x', ...sr() })).rejects.toThrow('cannot change provider');
    await expect(svc.save(new Types.ObjectId().toHexString(), saved.id, 'RAZORPAY', { label: 'x', ...rzp() })).rejects.toMatchObject({
      message: 'Integration not found',
      extensions: { code: 'NOT_FOUND' },
    });
    await expect(svc.save(owner, 'nope', 'RAZORPAY', { label: 'x', ...rzp() })).rejects.toThrow('Invalid integration');
  });

  it('carries a changed credential to every brand using the connection, and re-registers warehouses on a new ShipRocket account', async () => {
    const saved = await svc.save(owner, null, 'SHIPROCKET', { label: 'Courier', ...sr('old@brand.test', 'pw-old-not-real') });
    const using = await brand({ integration_links: { shiprocket: saved.id } });
    const bystander = await brand();

    const moved = await svc.save(owner, saved.id, 'SHIPROCKET', { label: 'Courier', ...sr('new@brand.test', 'pw-new-not-real') });

    expect(moved.brands).toEqual([{ id: String(using._id), brand_name: using.brand_name }]);
    expect((await EcommBrandModel.findById(using._id))?.integrations.shiprocket).toMatchObject({ email: 'new@brand.test', connected: true });
    expect((await EcommBrandModel.findById(bystander._id))?.integrations.shiprocket.email).toBe('');
    expect(resetOwnShiprocketWarehouses).toHaveBeenCalledTimes(1);

    // Same account again: nothing to re-register.
    (resetOwnShiprocketWarehouses as jest.Mock).mockClear();
    await svc.save(owner, saved.id, 'SHIPROCKET', { label: 'Courier 2', ...sr('new@brand.test', '') });
    expect(resetOwnShiprocketWarehouses).not.toHaveBeenCalled();
  });
});

describe('listMine and recheck', () => {
  it('lists the partner’s own connections newest first, narrowed by provider, each with the brands using it', async () => {
    const first = await svc.save(owner, null, 'RAZORPAY', { label: 'Old', ...rzp() });
    await new Promise((r) => setTimeout(r, 5));
    const second = await svc.save(owner, null, 'SHIPROCKET', { label: 'New', ...sr() });
    await svc.save(new Types.ObjectId().toHexString(), null, 'RAZORPAY', { label: 'Stranger', ...rzp('rzp_test_ZZZ') });
    await brand({ integration_links: { razorpay: first.id } });

    const all = await svc.listMine(owner);
    expect(all.map((c) => c.label)).toEqual(['New', 'Old']);
    expect(all[1].brands).toHaveLength(1);
    expect(all[0].brands).toEqual([]);
    expect((await svc.listMine(owner, 'RAZORPAY')).map((c) => c.id)).toEqual([first.id]);
    expect(second.id).toBe(all[0].id);
    await expect(svc.listMine(owner, 'STRIPE' as never)).rejects.toThrow('Unknown integration provider');
    expect(await svc.listMine(new Types.ObjectId().toHexString())).toEqual([]);
  });

  it('checks the saved account again and updates the brands that use it', async () => {
    const saved = await svc.save(owner, null, 'RAZORPAY', { label: 'Main', ...rzp() });
    const using = await brand({ integration_links: { razorpay: saved.id } });
    mockRzp.mockResolvedValueOnce({ ok: false, message: 'Key revoked', details: ['revoked'] });

    const out = await svc.recheck(owner, saved.id);

    expect(out.status).toMatchObject({ connected: false, message: 'Key revoked' });
    expect((await EcommBrandModel.findById(using._id))?.integrations.razorpay).toMatchObject({ connected: false, message: 'Key revoked' });
    await expect(svc.recheck(new Types.ObjectId().toHexString(), saved.id)).rejects.toThrow('Integration not found');
  });
});

describe('remove', () => {
  it('deletes an unused connection, and names the brands when one is in use', async () => {
    const free = await svc.save(owner, null, 'RAZORPAY', { label: 'Free', ...rzp() });
    expect(await svc.remove(owner, free.id)).toBe(true);
    expect(await PartnerIntegrationModel.countDocuments()).toBe(0);

    const used = await svc.save(owner, null, 'RAZORPAY', { label: 'Used', ...rzp('rzp_test_BBB') });
    await brand({ brand_name: 'Alpha', integration_links: { razorpay: used.id } });
    await expect(svc.remove(owner, used.id)).rejects.toThrow('In use by Alpha. Choose another connection on that brand first.');

    await brand({ brand_name: '', integration_links: { razorpay: used.id } });
    await expect(svc.remove(owner, used.id)).rejects.toThrow('In use by Alpha, Untitled brand. Choose another connection on those brands first.');
    expect(await PartnerIntegrationModel.countDocuments()).toBe(1);
  });
});

describe('reviewerSetSandbox', () => {
  const withShiprocket = (over: Record<string, unknown> = {}) =>
    brand({
      integrations: {
        shiprocket: { email: 'ops@brand.test', password: 'not-a-real-password', sandbox_email: 'sb@brand.test', sandbox_password: 'not-a-real-sb', ...over },
      },
    });

  it('refuses an invalid or unknown brand, and one with no ShipRocket account', async () => {
    await expect(svc.reviewerSetSandbox('bad', true)).rejects.toThrow('Invalid brand');
    await expect(svc.reviewerSetSandbox(new Types.ObjectId().toHexString(), true)).rejects.toThrow('Brand not found');
    const empty = await brand();
    await expect(svc.reviewerSetSandbox(String(empty._id), true)).rejects.toThrow('no ShipRocket account saved yet');
  });

  it('switches a brand’s own account, re-registering warehouses only when the mode really changed', async () => {
    const own = await withShiprocket();

    const toSandbox = await svc.reviewerSetSandbox(String(own._id), true);
    expect(toSandbox).toMatchObject({ sandbox: true, connected: true });
    expect(resetOwnShiprocketWarehouses).toHaveBeenCalledTimes(1);

    (resetOwnShiprocketWarehouses as jest.Mock).mockClear();
    await svc.reviewerSetSandbox(String(own._id), true);
    expect(resetOwnShiprocketWarehouses).not.toHaveBeenCalled();
    expect((await EcommBrandModel.findById(own._id))?.integrations.shiprocket.sandbox).toBe(true);
  });

  it('switches the saved connection a brand follows, so every brand using it moves together', async () => {
    const saved = await svc.save(owner, null, 'SHIPROCKET', {
      label: 'Courier',
      shiprocket: { email: 'ops@brand.test', password: 'not-a-real-password', sandbox_email: 'sb@brand.test', sandbox_password: 'not-a-real-sb' },
    });
    const one = await brand({ integration_links: { shiprocket: saved.id }, integrations: { shiprocket: { email: 'ops@brand.test', password: 'not-a-real-password' } } });
    const two = await brand({ integration_links: { shiprocket: saved.id } });

    const status = await svc.reviewerSetSandbox(String(one._id), true);

    expect(status.sandbox).toBe(true);
    expect((await PartnerIntegrationModel.findById(saved.id))?.integrations.shiprocket.sandbox).toBe(true);
    expect((await EcommBrandModel.findById(two._id))?.integrations.shiprocket.sandbox).toBe(true);
  });
});

describe('backfillFromBrands', () => {
  it('turns typed-in credentials into one saved connection per account, links the brands, and is safe to run again', async () => {
    const a = await brand({ brand_name: 'Alpha', integrations: { razorpay: { key_id: 'rzp_live_A', key_secret: 'not-a-real-a' } } });
    const b = await brand({ brand_name: 'Beta', integrations: { razorpay: { key_id: 'rzp_live_A', key_secret: 'not-a-real-a' } } });
    const c = await brand({
      brand_name: '',
      integrations: { shiprocket: { email: 'ops@brand.test', password: 'not-a-real-password' } },
    });
    await brand({ brand_name: 'NoCreds' });

    expect(await svc.backfillFromBrands()).toEqual({ created: 2, linked: 3 });

    const connections = await PartnerIntegrationModel.find({}).sort({ provider: 1 });
    expect(connections.map((x) => x.label)).toEqual(['Alpha Razorpay', 'Brand ShipRocket']);
    const linkA = (await EcommBrandModel.findById(a._id))?.integration_links?.razorpay;
    expect(String(linkA)).toBe(String(connections[0]._id));
    expect(String((await EcommBrandModel.findById(b._id))?.integration_links?.razorpay)).toBe(String(linkA));
    expect(String((await EcommBrandModel.findById(c._id))?.integration_links?.shiprocket)).toBe(String(connections[1]._id));
    expect(logs.server.info).toHaveBeenCalledWith('ecommBrand', 'integrationBackfill', { created: 2, linked: 3 });

    (logs.server.info as jest.Mock).mockClear();
    expect(await svc.backfillFromBrands()).toEqual({ created: 0, linked: 0 });
    expect(logs.server.info).not.toHaveBeenCalled();
    expect(await PartnerIntegrationModel.countDocuments()).toBe(2);
  });

  it('reuses an existing saved connection holding exactly the same credential', async () => {
    const saved = await svc.save(owner, null, 'RAZORPAY', { label: 'Main', ...rzp('rzp_live_Q', 'not-a-real-q') });
    const b = await brand({ integrations: { razorpay: { key_id: 'rzp_live_Q', key_secret: 'not-a-real-q' } } });

    expect(await svc.backfillFromBrands()).toEqual({ created: 0, linked: 1 });
    expect(String((await EcommBrandModel.findById(b._id))?.integration_links?.razorpay)).toBe(saved.id);
  });
});
