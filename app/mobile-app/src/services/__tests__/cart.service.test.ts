import { getItem, setItem } from '@/services/secure-storage';
import { getCartLines, setCartLines } from '@/services/cart';

jest.mock('@/services/secure-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

const mockGet = getItem as jest.Mock;
const mockSet = setItem as jest.Mock;

const line = {
  pod_id: 'p1',
  pod_title: 'Pod',
  club_slug: 'c',
  product_id: 'a',
  variant_id: '',
  variant_label: '',
  product_name: 'Alpha',
  image_url: '',
  unit_cost: 100,
  quantity: 1,
  max_quantity: 5,
};

beforeEach(() => jest.clearAllMocks());

describe('cart service', () => {
  it('round-trips lines through storage', async () => {
    await setCartLines([line]);
    expect(mockSet).toHaveBeenCalledWith('duncit.cart_lines', JSON.stringify([line]));
    mockGet.mockResolvedValue(JSON.stringify([line]));
    expect(await getCartLines()).toEqual([line]);
  });

  it('returns [] for empty, malformed, non-array or corrupt entries', async () => {
    mockGet.mockResolvedValue(null);
    expect(await getCartLines()).toEqual([]);
    mockGet.mockResolvedValue('{"not":"an array"}');
    expect(await getCartLines()).toEqual([]);
    mockGet.mockResolvedValue('not-json');
    expect(await getCartLines()).toEqual([]);
    // Malformed rows are dropped, valid ones kept.
    mockGet.mockResolvedValue(JSON.stringify([line, null, { product_id: 'x' }]));
    expect(await getCartLines()).toEqual([line]);
  });
});
