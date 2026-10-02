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

  it('reads a brand from before the choice as its own account when it saved one, else the Duncit courier', () => {
    expect(brandShippingMode({ shipping_mode: null, integrations: { shiprocket: ownIntegration as any } })).toBe('OWN_SHIPROCKET');
    expect(brandShippingMode({ shipping_mode: null, integrations: null })).toBe('DUNCIT_COURIER');
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
    });
  });

  it('refuses an OWN brand with no saved account, saying what to fix', async () => {
    const brand = await seedBrand({ shipping_mode: 'OWN_SHIPROCKET' });
    await expect(getBrandShiprocketAccount(brand._id)).rejects.toThrow(/its own ShipRocket account, but none is saved/);
  });

  it('ships a Duncit-courier brand on the partner courier account, and refuses while none is mapped', async () => {
    const brand = await seedBrand({ shipping_mode: 'DUNCIT_COURIER' });
    await expect(getBrandShiprocketAccount(brand._id)).rejects.toThrow(/Duncit courier is not set up/);

    await seedEntry(['partners'], 'courier@duncit.com');
    expect(await getBrandShiprocketAccount(brand._id)).toMatchObject({
      email: 'courier@duncit.com',
      sessionKey: PARTNER_COURIER_SESSION_KEY,
    });
  });
});
