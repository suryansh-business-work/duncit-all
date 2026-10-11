import { createHash } from 'node:crypto';
import { Types } from 'mongoose';
import {
  PARTNER_COURIER_SESSION_KEY,
  brandShippingMode,
  getBrandShiprocketAccount,
  getPartnerCourierAccount,
} from '../../shiprocket.account';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';
import { EnvEntryModel } from '@modules/platform/envEntry/envEntry.model';

// Credentials are read from the environment, never written into the test (S2068).
const secret = process.env.TEST_SHIPROCKET_PASSWORD ?? 'test-only';

const seedBrand = (over: Record<string, unknown> = {}) =>
  EcommBrandModel.create({ owner_user_id: new Types.ObjectId(), brand_name: 'Yonex', ...over });

const ownIntegration = { email: 'ops@yonex.in', password: secret, connected: false };

const seedEntry = (assigned_portals: string[], email: string, is_default = false) =>
  EnvEntryModel.create({
    name: `ShipRocket ${email}`,
    category: 'SHIPROCKET',
    is_active: true,
    is_default,
    assigned_portals,
    config: { email, password: secret, webhook_secret: `key-${email}` },
  });

describe('brandShippingMode', () => {
  it("keeps the brand's own choice", () => {
    expect(brandShippingMode({ shipping_mode: 'DUNCIT_COURIER', integrations: { shiprocket: ownIntegration as any } })).toBe(
      'DUNCIT_COURIER',
    );
  });

  it('reads a brand with no recorded choice as its own account, whether or not it has saved one', () => {
    expect(brandShippingMode({ shipping_mode: null, integrations: { shiprocket: ownIntegration as any } })).toBe('OWN_SHIPROCKET');
    // The Duncit courier is no longer offered, so a brand without credentials is not put on it either.
    expect(brandShippingMode({ shipping_mode: null, integrations: null })).toBe('OWN_SHIPROCKET');
  });
});

describe('getPartnerCourierAccount', () => {
  it("is only the entry mapped to the Partners console — never the pet store's default", async () => {
    await seedEntry(['ecomm-portal'], 'store@duncit.com', true);
    expect(await getPartnerCourierAccount()).toBeNull();

    await seedEntry(['partners'], 'courier@duncit.com');
    expect(await getPartnerCourierAccount()).toMatchObject({
      email: 'courier@duncit.com',
      sessionKey: PARTNER_COURIER_SESSION_KEY,
    });
  });
});

describe('getBrandShiprocketAccount', () => {
  it('is null for an id that is not a brand — a Duncit-owned product', async () => {
    expect(await getBrandShiprocketAccount(null)).toBeNull();
    expect(await getBrandShiprocketAccount('not-an-id')).toBeNull();
    expect(await getBrandShiprocketAccount(new Types.ObjectId())).toBeNull();
  });

  it("ships an OWN brand on its saved account even after a failed recheck", async () => {
    const brand = await seedBrand({ shipping_mode: 'OWN_SHIPROCKET', integrations: { shiprocket: ownIntegration } });
    expect(await getBrandShiprocketAccount(brand._id)).toMatchObject({
      email: 'ops@yonex.in',
      sessionKey: `brand:${brand._id}`,
      sandbox: false,
      // A live account is keyed exactly as it was before sandbox mode existed, so its cached token still matches.
      hash: createHash('sha256').update(`ops@yonex.in:${secret}`).digest('hex'),
    });
  });

  it('keys a brand in sandbox mode apart from the same login used live', async () => {
    const live = await seedBrand({ shipping_mode: 'OWN_SHIPROCKET', integrations: { shiprocket: ownIntegration } });
    const sandboxed = await seedBrand({
      shipping_mode: 'OWN_SHIPROCKET',
      integrations: { shiprocket: { ...ownIntegration, sandbox: true } },
    });
    const liveAccount = await getBrandShiprocketAccount(live._id);
    const sandboxAccount = await getBrandShiprocketAccount(sandboxed._id);
    expect(sandboxAccount).toMatchObject({ email: 'ops@yonex.in', sandbox: true });
    // A live token must never be replayed at the sandbox, nor the reverse.
    expect(sandboxAccount?.hash).not.toBe(liveAccount?.hash);
  });

  it('refuses an OWN brand with no saved account, saying what to fix', async () => {
    const brand = await seedBrand({ shipping_mode: 'OWN_SHIPROCKET' });
    await expect(getBrandShiprocketAccount(brand._id)).rejects.toThrow(/This brand has no ShipRocket account connected/);
  });

  it('never falls back to the Duncit courier for a brand with no recorded choice and no account', async () => {
    // The courier account exists, but it is no longer offered to a brand that never chose it.
    await seedEntry(['partners'], 'courier@duncit.com');
    const brand = await seedBrand();
    await expect(getBrandShiprocketAccount(brand._id)).rejects.toThrow(/This brand has no ShipRocket account connected/);
  });

  it('keeps a brand that chose the Duncit courier on the partner courier account, and refuses while none is mapped', async () => {
    const brand = await seedBrand({ shipping_mode: 'DUNCIT_COURIER' });
    await expect(getBrandShiprocketAccount(brand._id)).rejects.toThrow(/Duncit courier, which is no longer offered/);

    await seedEntry(['partners'], 'courier@duncit.com');
    expect(await getBrandShiprocketAccount(brand._id)).toMatchObject({
      email: 'courier@duncit.com',
      sessionKey: PARTNER_COURIER_SESSION_KEY,
    });
  });
});
