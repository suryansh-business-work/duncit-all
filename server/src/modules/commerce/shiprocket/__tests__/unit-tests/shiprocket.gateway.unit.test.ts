import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { getServiceability } from '../../shiprocket.gateway';

jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));
const mockEnv = getRuntimeEnvValue as jest.Mock;

const configured = () =>
  mockEnv.mockImplementation(async (key: string) => {
    if (key === 'SHIPROCKET_EMAIL') return 'sr@duncit.com';
    if (key === 'SHIPROCKET_PASSWORD') return 'pw';
    if (key === 'SHIPROCKET_TOKEN_TTL_HOURS') return '240';
    return '';
  });

/** Dispatches by URL: /auth/login → token, /courier/serviceability → couriers. */
function fetchMock(couriers: any[]) {
  return jest.fn(async (url: string) => {
    if (String(url).includes('/auth/login')) {
      return { ok: true, json: async () => ({ token: 'tok' }) };
    }
    return { ok: true, json: async () => ({ data: { available_courier_companies: couriers } }) };
  });
}

afterEach(() => {
  delete (global as any).fetch;
});

describe('shiprocket.gateway getServiceability', () => {
  it('returns null when ShipRocket is not configured', async () => {
    mockEnv.mockResolvedValue('');
    const quote = await getServiceability({ pickupPincode: '110001', deliveryPincode: '560001', weightKg: 1 });
    expect(quote).toBeNull();
  });

  it('returns null when no courier services the lane', async () => {
    configured();
    (global as any).fetch = fetchMock([]);
    const quote = await getServiceability({ pickupPincode: '110001', deliveryPincode: '560001', weightKg: 1 });
    expect(quote).toBeNull();
  });

  it('picks the cheapest serviceable courier (rate/freight_charge tolerant)', async () => {
    configured();
    (global as any).fetch = fetchMock([
      { courier_name: 'Fast', courier_company_id: '1', rate: 90, etd: '3 days' },
      { courier_name: 'Cheap', courier_company_id: '2', freight_charge: 55, estimated_delivery_days: '5' },
    ]);
    const quote = await getServiceability({
      pickupPincode: '110001',
      deliveryPincode: '560001',
      weightKg: 2,
      cod: true,
    });
    expect(quote).toMatchObject({
      serviceable: true,
      courier_name: 'Cheap',
      courier_company_id: '2',
      freight_charge: 55,
      etd: '5',
    });
  });
});
