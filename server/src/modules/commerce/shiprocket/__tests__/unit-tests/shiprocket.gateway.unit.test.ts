jest.mock('@config/redis', () => ({
  ...jest.requireActual('@config/redis'),
  cacheGet: jest.fn(),
  cacheSet: jest.fn(),
}));
jest.mock('../../shiprocket.account', () => ({
  getShiprocketAccount: jest.fn(),
  isShiprocketConfigured: jest.fn(),
}));
jest.mock('../../shiprocket.client', () => ({
  ...jest.requireActual('../../shiprocket.client'),
  srRequest: jest.fn(),
}));

import { cacheGet, cacheSet } from '@config/redis';
import { isShiprocketConfigured } from '../../shiprocket.account';
import { shiprocketError, srRequest } from '../../shiprocket.client';
import { getServiceability, weightSlab, type ServiceabilityArgs } from '../../shiprocket.gateway';

/**
 * The rate lookup behind every product-page pincode check and every checkout
 * quote. It asks ShipRocket for the chargeable weight's slab (so a light toy
 * in a big box is rated as the box), and caches the answer per lane so a busy
 * product page does not call ShipRocket on every view.
 */
const mockConfigured = jest.mocked(isShiprocketConfigured);
const mockGet = jest.mocked(cacheGet);
const mockSet = jest.mocked(cacheSet);
const mockRequest = jest.mocked(srRequest);

const lane: ServiceabilityArgs = { pickupPincode: '201301', deliveryPincode: '560034', weightKg: 0.25 };

const couriers = (list: Record<string, unknown>[], recommended?: number) => ({
  data: { recommended_courier_company_id: recommended, available_courier_companies: list },
});

beforeEach(() => {
  mockConfigured.mockResolvedValue(true);
  mockGet.mockResolvedValue(null);
  mockSet.mockResolvedValue(undefined);
});

describe('weightSlab', () => {
  it.each([
    [0.2, 0.5],
    [0.5, 0.5],
    [0.51, 1],
    [1.2, 1.5],
    [0, 0.5],
  ])('rounds a %p kg parcel up to the %p kg slab', (weightKg, slab) => {
    expect(weightSlab({ ...lane, weightKg })).toBe(slab);
  });

  it('rates by the volumetric weight when the box outweighs its contents', () => {
    // 300 g in a 40 × 30 × 20 cm box → 4.8 kg volumetric → the 5 kg slab
    expect(weightSlab({ ...lane, weightKg: 0.3, lengthCm: 40, breadthCm: 30, heightCm: 20 })).toBe(5);
  });
});

describe('getServiceability', () => {
  it('answers null without a lookup when ShipRocket is not configured', async () => {
    mockConfigured.mockResolvedValue(false);
    await expect(getServiceability(lane)).resolves.toBeNull();
    expect(mockGet).not.toHaveBeenCalled();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('asks for the slab, the dimensions and the declared value, and returns the cheapest courier', async () => {
    mockRequest.mockResolvedValue(
      couriers([
        { courier_company_id: 12, courier_name: 'Delhivery Surface', rate: 68, etd: 'Sep 23, 2026' },
        { courier_company_id: 51, courier_name: 'Ekart Logistics', freight_charge: 59, estimated_delivery_days: '5' },
        { courier_company_id: 24, courier_name: 'Xpressbees Surface', total_charge: 74 },
      ])
    );
    const quote = await getServiceability({
      ...lane,
      weightKg: 1.2,
      lengthCm: 30,
      breadthCm: 20,
      heightCm: 15,
      cod: true,
      declaredValue: 1248.6,
    });
    // 30 × 20 × 15 / 5000 = 1.8 kg chargeable → the 2 kg slab
    expect(mockRequest).toHaveBeenCalledWith(
      '/courier/serviceability/?pickup_postcode=201301&delivery_postcode=560034&weight=2&cod=1&length=30&breadth=20&height=15&declared_value=1249',
      { method: 'GET' },
      { op: 'serviceability', retry: true }
    );
    expect(quote).toEqual({
      serviceable: true,
      courier_name: 'Ekart Logistics',
      courier_company_id: '51',
      freight_charge: 59,
      etd: '5',
    });
  });

  it('leaves out the dimensions and value it was not given', async () => {
    mockRequest.mockResolvedValue(couriers([{ courier_company_id: 12, courier_name: 'Delhivery Surface', rate: 68 }]));
    await getServiceability(lane);
    expect(mockRequest.mock.calls[0][0]).toBe(
      '/courier/serviceability/?pickup_postcode=201301&delivery_postcode=560034&weight=0.5&cod=0'
    );
  });

  it('caches the answer per lane, slab and COD for six hours', async () => {
    mockRequest.mockResolvedValue(couriers([{ courier_company_id: 12, courier_name: 'Delhivery Surface', rate: 68 }]));
    const quote = await getServiceability({ ...lane, cod: true });
    expect(mockGet).toHaveBeenCalledWith('sr:svc:201301:560034:0.5:1');
    expect(mockSet).toHaveBeenCalledWith('sr:svc:201301:560034:0.5:1', { quote }, 6 * 3600);
  });

  it('answers from the cache without calling ShipRocket', async () => {
    const cached = { serviceable: true, courier_name: 'Delhivery Surface', courier_company_id: '12', freight_charge: 68, etd: '' };
    mockGet.mockResolvedValue({ quote: cached });
    await expect(getServiceability(lane)).resolves.toEqual(cached);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('remembers an unreachable lane too', async () => {
    mockGet.mockResolvedValue({ quote: null });
    await expect(getServiceability(lane)).resolves.toBeNull();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('answers null when no courier serves the lane', async () => {
    mockRequest.mockResolvedValue(couriers([]));
    await expect(getServiceability(lane)).resolves.toBeNull();
    expect(mockSet).toHaveBeenCalledWith(expect.any(String), { quote: null }, 6 * 3600);
  });

  // ShipRocket answers an unreachable lane with a 404 rather than an empty list.
  it('reads a 404 as "not serviceable", not as a failure', async () => {
    mockRequest.mockRejectedValue(shiprocketError('ShipRocket: Delivery postcode not serviceable', 404));
    await expect(getServiceability(lane)).resolves.toBeNull();
    expect(mockSet).toHaveBeenCalledWith(expect.any(String), { quote: null }, 6 * 3600);
  });

  it('throws any other failure and never caches it', async () => {
    mockRequest.mockRejectedValue(shiprocketError('ShipRocket: Internal Server Error', 500));
    await expect(getServiceability(lane)).rejects.toThrow('Internal Server Error');
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('reads a courier that quotes nothing as a zero rate with blank fields', async () => {
    mockRequest.mockResolvedValue(couriers([{}]));
    await expect(getServiceability(lane)).resolves.toEqual({
      serviceable: true,
      courier_name: '',
      courier_company_id: '',
      freight_charge: 0,
      etd: '',
    });
  });
});
