import { getCartLines, setCartLines } from '@/services/cart';
import { cartLineKey, selectCartCount, useCartStore, type CartLineMeta } from '@/stores/cart.store';

jest.mock('@/services/cart', () => ({
  getCartLines: jest.fn().mockResolvedValue([]),
  setCartLines: jest.fn().mockResolvedValue(undefined),
}));

const mockGet = getCartLines as jest.Mock;
const mockSet = setCartLines as jest.Mock;

const meta = (over: Partial<CartLineMeta> = {}): CartLineMeta => ({
  pod_id: 'p1',
  pod_title: 'Pod One',
  club_slug: 'club-one',
  product_id: 'a',
  variant_id: '',
  variant_label: '',
  product_name: 'Alpha',
  image_url: '',
  unit_cost: 100,
  max_quantity: 5,
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue([]);
  mockSet.mockResolvedValue(undefined);
  useCartStore.setState({ lines: [], hydrated: false });
});

describe('cart.store', () => {
  it('hydrates from the persisted lines', async () => {
    mockGet.mockResolvedValue([{ ...meta(), quantity: 2 }]);
    await useCartStore.getState().hydrate();
    expect(useCartStore.getState().hydrated).toBe(true);
    expect(useCartStore.getState().lines).toHaveLength(1);
  });

  it('setLine adds, replaces and removes lines (and persists each write)', () => {
    const { setLine } = useCartStore.getState();
    setLine(meta(), 2);
    setLine(meta({ product_id: 'a', variant_id: 'v1', variant_label: 'L', unit_cost: 120 }), 1);
    expect(useCartStore.getState().lines).toHaveLength(2);
    expect(selectCartCount(useCartStore.getState())).toBe(3);

    // Replacing the same product+variant keeps one line.
    setLine(meta(), 4);
    expect(useCartStore.getState().lines).toHaveLength(2);
    expect(selectCartCount(useCartStore.getState())).toBe(5);

    // Zero removes the line.
    setLine(meta(), 0);
    expect(useCartStore.getState().lines).toHaveLength(1);
    expect(mockSet).toHaveBeenCalledTimes(4);
  });

  it('removeLine targets one pod+key; clearPod empties only that pod', () => {
    const { setLine, removeLine, clearPod } = useCartStore.getState();
    setLine(meta(), 1);
    setLine(meta({ pod_id: 'p2', product_id: 'b', product_name: 'Beta' }), 2);
    removeLine('p1', cartLineKey({ product_id: 'a', variant_id: '' }));
    expect(useCartStore.getState().lines.map((l) => l.pod_id)).toEqual(['p2']);
    clearPod('p2');
    expect(useCartStore.getState().lines).toEqual([]);
  });

  it('survives a persistence failure (write is best-effort)', () => {
    mockSet.mockRejectedValue(new Error('storage full'));
    useCartStore.getState().setLine(meta(), 1);
    expect(useCartStore.getState().lines).toHaveLength(1);
  });
});
