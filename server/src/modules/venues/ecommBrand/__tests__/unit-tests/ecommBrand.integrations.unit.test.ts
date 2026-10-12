import { applyShiprocketInput, clearIntegration, copyIntegration, integrationStatus, sameCredential, type IntegrationHolder } from '../../ecommBrand.integrations';
import { accountFromBrandIntegration } from '@modules/commerce/shiprocket/shiprocket.account';
import type { IBrandShiprocketIntegration } from '../../ecommBrand.model';

const shiprocket = (over: Partial<IBrandShiprocketIntegration> = {}): IBrandShiprocketIntegration => ({
  email: '',
  password: '',
  pickup_location: '',
  webhook_secret: '',
  sandbox: false,
  sandbox_email: '',
  sandbox_password: '',
  sandbox_api_url: '',
  connected: false,
  checked_at: null,
  message: '',
  details: [],
  ...over,
});

const holder = (over: Partial<IBrandShiprocketIntegration> = {}): IntegrationHolder => ({
  _id: 'brand-1',
  integrations: {
    shiprocket: shiprocket(over),
    razorpay: { key_id: '', key_secret: '', webhook_secret: '', connected: false, checked_at: null, message: '', details: [] },
  },
});

const LIVE = { email: 'live@brand.example.com', password: 'not-a-real-live-password' };
const SANDBOX = { sandbox_email: 'sandbox@brand.example.com', sandbox_password: 'not-a-real-sandbox-password' };

describe('applyShiprocketInput', () => {
  it('saves a production user, and keeps the saved password when it is left blank', () => {
    const brand = holder();
    expect(applyShiprocketInput(brand, { ...LIVE, pickup_location: ' Delhi ' })).toBe(true);
    expect(brand.integrations.shiprocket).toMatchObject({ ...LIVE, pickup_location: 'Delhi', sandbox: false });
    // Same account again: nothing the shipping side cares about moved.
    expect(applyShiprocketInput(brand, { email: LIVE.email, password: '' })).toBe(false);
    expect(brand.integrations.shiprocket.password).toBe(LIVE.password);
  });

  it('needs the production email and password while sandbox is off', () => {
    expect(() => applyShiprocketInput(holder(), { email: '', password: 'x' })).toThrow('Enter the ShipRocket API user email');
    expect(() => applyShiprocketInput(holder(), { email: LIVE.email })).toThrow('Enter the ShipRocket API user password');
    // A sandbox user on file does not stand in for the production one.
    expect(() => applyShiprocketInput(holder(SANDBOX), { email: '', sandbox: false })).toThrow('Enter the ShipRocket API user email');
  });

  it('saves the sandbox user beside the production one, and switching mode overwrites neither', () => {
    const brand = holder(LIVE);
    expect(applyShiprocketInput(brand, { email: LIVE.email, sandbox: true, ...SANDBOX, sandbox_api_url: ' https://api-sandbox.shiprocket.in ' })).toBe(true);
    expect(brand.integrations.shiprocket).toMatchObject({ ...LIVE, ...SANDBOX, sandbox: true, sandbox_api_url: 'https://api-sandbox.shiprocket.in' });
    expect(accountFromBrandIntegration('b1', brand.integrations.shiprocket)).toMatchObject({
      email: SANDBOX.sandbox_email,
      password: SANDBOX.sandbox_password,
      sandbox: true,
      sandboxApiUrl: 'https://api-sandbox.shiprocket.in',
    });

    // Back to live with nothing retyped: the production user is still there.
    expect(applyShiprocketInput(brand, { email: LIVE.email, sandbox: false })).toBe(true);
    expect(brand.integrations.shiprocket).toMatchObject({ ...LIVE, ...SANDBOX, sandbox: false });
    expect(accountFromBrandIntegration('b1', brand.integrations.shiprocket)).toMatchObject({ ...LIVE, sandbox: false, sandboxApiUrl: '' });
  });

  it('lets a sandbox-only account be saved before a production user exists', () => {
    const brand = holder();
    applyShiprocketInput(brand, { email: '', sandbox: true, ...SANDBOX });
    expect(brand.integrations.shiprocket).toMatchObject({ email: '', password: '', sandbox: true, ...SANDBOX });
    expect(integrationStatus(brand, 'SHIPROCKET')).toMatchObject({
      configured: true,
      identifier: '',
      has_secret: false,
      sandbox_identifier: SANDBOX.sandbox_email,
      has_sandbox_secret: true,
    });
  });

  it('refuses a half-typed sandbox user instead of sending the production password to the sandbox', () => {
    expect(() => applyShiprocketInput(holder(LIVE), { email: LIVE.email, sandbox: true, sandbox_email: SANDBOX.sandbox_email })).toThrow(
      'Enter the ShipRocket sandbox API user password',
    );
    expect(() => applyShiprocketInput(holder(LIVE), { email: LIVE.email, sandbox: true, sandbox_password: 'x' })).toThrow(
      'Enter the ShipRocket sandbox API user email',
    );
  });

  it('keeps an older sandbox connection working: no sandbox user means the production one is sent to the sandbox', () => {
    const brand = holder();
    applyShiprocketInput(brand, { ...LIVE, sandbox: true });
    expect(accountFromBrandIntegration('b1', brand.integrations.shiprocket)).toMatchObject({ ...LIVE, sandbox: true });
    // A request that does not say keeps the saved mode.
    applyShiprocketInput(brand, { email: LIVE.email });
    expect(brand.integrations.shiprocket.sandbox).toBe(true);
  });

  it('accepts only an https ShipRocket address for the sandbox, clears it when blank, and keeps it when left out', () => {
    const brand = holder({ ...LIVE, ...SANDBOX, sandbox: true, sandbox_api_url: 'https://api-sandbox.shiprocket.in' });
    for (const sandbox_api_url of ['http://api-sandbox.shiprocket.in', 'https://shiprocket.in.example.com', 'not a url']) {
      expect(() => applyShiprocketInput(brand, { email: LIVE.email, sandbox_api_url })).toThrow(/sandbox API URL must start with https/);
    }
    applyShiprocketInput(brand, { email: LIVE.email });
    expect(brand.integrations.shiprocket.sandbox_api_url).toBe('https://api-sandbox.shiprocket.in');
    expect(applyShiprocketInput(brand, { email: LIVE.email, sandbox_api_url: '' })).toBe(true);
    expect(brand.integrations.shiprocket.sandbox_api_url).toBe('');
  });
});

describe('sameCredential / copyIntegration / clearIntegration', () => {
  it('judges two holders by the user each signs in with now', () => {
    const live = holder({ ...LIVE, ...SANDBOX });
    expect(sameCredential(live, holder(LIVE), 'SHIPROCKET')).toBe(true);
    // The same saved users, one in sandbox mode: a different account as far as orders go.
    expect(sameCredential(live, holder({ ...LIVE, ...SANDBOX, sandbox: true }), 'SHIPROCKET')).toBe(false);
    expect(
      sameCredential(
        holder({ ...LIVE, ...SANDBOX, sandbox: true }),
        holder({ ...LIVE, ...SANDBOX, sandbox: true, sandbox_api_url: 'https://other.shiprocket.in' }),
        'SHIPROCKET',
      ),
    ).toBe(false);
  });

  it('copies the sandbox user with the rest, and clears all of it', () => {
    const from = holder({ ...LIVE, ...SANDBOX, sandbox: true, sandbox_api_url: 'https://api-sandbox.shiprocket.in', connected: true });
    const to = holder();
    copyIntegration(from, to, 'SHIPROCKET');
    expect(to.integrations.shiprocket).toMatchObject({ ...LIVE, ...SANDBOX, sandbox: true, sandbox_api_url: 'https://api-sandbox.shiprocket.in', connected: true });
    clearIntegration(to, 'SHIPROCKET');
    expect(to.integrations.shiprocket).toMatchObject({ email: '', password: '', sandbox: false, sandbox_email: '', sandbox_password: '', sandbox_api_url: '', connected: false });
    expect(integrationStatus(to, 'SHIPROCKET').configured).toBe(false);
  });
});
