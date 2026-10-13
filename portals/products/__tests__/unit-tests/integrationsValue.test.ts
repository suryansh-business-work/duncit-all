import { describe, expect, it } from 'vitest';
import { integrationsValue } from '../../src/pages/ecomm/brandReviewCells';
import type { BrandIntegrationStatus } from '../../src/pages/ecomm/queries';
import { makeEcommBrandRow } from '../mocks/ecommBrand.mock';

const status = (provider: BrandIntegrationStatus['provider'], connected: boolean): BrandIntegrationStatus => ({
  provider,
  configured: true,
  connected,
  message: '',
  details: [],
  identifier: '',
  has_secret: true,
  pickup_location: '',
  live_mode: false,
  has_webhook_secret: false,
  sandbox: false,
});

const t = (key: string) => key.split('.').pop() ?? key;

const brand = (shiprocket: boolean, razorpay: boolean) =>
  makeEcommBrandRow({
    integrations: { shiprocket: status('SHIPROCKET', shiprocket), razorpay: status('RAZORPAY', razorpay) },
  });

describe('integrationsValue', () => {
  it('names both connected providers', () => {
    expect(integrationsValue(brand(true, true), t)).toBe('shiprocket, razorpay');
  });

  it('names only the connected provider', () => {
    expect(integrationsValue(brand(true, false), t)).toBe('shiprocket');
    expect(integrationsValue(brand(false, true), t)).toBe('razorpay');
  });

  it('says not connected when neither provider is', () => {
    expect(integrationsValue(brand(false, false), t)).toBe('notConnected');
  });
});
