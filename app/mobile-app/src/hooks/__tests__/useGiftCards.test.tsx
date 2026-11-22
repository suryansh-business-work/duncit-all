import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useFinanceCurrency, useGiftCards } from '@/hooks/useGiftCards';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const storefront = {
  design: {
    id: 'd1',
    name: 'Classic',
    front_image_url: 'https://img/f.png',
    back_image_url: 'https://img/b.png',
  },
  settings: {
    denominations: [500, 1000],
    min_amount: 100,
    max_amount: 10000,
    max_quantity: 10,
    physical_enabled: true,
    shipping_fee: 99,
  },
  physical_available: 5,
  currency_symbol: '₹',
};
const cards = { owned: [{ id: 'g1' }], received: [] };

/** Answers each operation by its name; an Error value is thrown. */
function route(map: Record<string, unknown>) {
  mockRequest.mockImplementation(async (doc: { definitions: { name?: { value: string } }[] }) => {
    const name = doc.definitions[0]?.name?.value ?? '';
    const value = map[name];
    if (value instanceof Error) throw value;
    return value;
  });
}

beforeEach(() => mockRequest.mockReset());

describe('useFinanceCurrency', () => {
  it('reads the configured currency symbol', async () => {
    route({ MobilePublicFinanceSettings: { publicFinanceSettings: { currency_symbol: 'Rs' } } });
    const { result } = renderHook(() => useFinanceCurrency());
    expect(result.current).toBe('');
    await waitFor(() => expect(result.current).toBe('Rs'));
  });

  it('stays empty when the read fails', async () => {
    route({ MobilePublicFinanceSettings: new Error('down') });
    const { result } = renderHook(() => useFinanceCurrency());
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    await act(async () => {});
    expect(result.current).toBe('');
  });
});

describe('useGiftCards', () => {
  it('loads the storefront — the default design, the policy and printed stock — once', async () => {
    route({ MobileGiftCardStorefront: { giftCardStorefront: storefront } });
    const { result } = renderHook(() => useGiftCards());
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.storefront).toEqual(storefront);
    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(result.current.hasError).toBe(false);
    expect(result.current.cards).toBeNull();
  });

  it('flags an error when the buy context cannot load', async () => {
    route({ MobileGiftCardStorefront: new Error('nope') });
    const { result } = renderHook(() => useGiftCards());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasError).toBe(true);
    expect(result.current.storefront).toBeNull();
  });

  it('refreshCards loads the caller cards, and flags a failure', async () => {
    route({
      MobileGiftCardStorefront: { giftCardStorefront: storefront },
      MobileMyGiftCards: { myGiftCards: cards },
    });
    const { result } = renderHook(() => useGiftCards());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.refreshCards();
    });
    expect(result.current.cards).toEqual(cards);
    expect(result.current.cardsError).toBe(false);
    expect(result.current.cardsLoading).toBe(false);

    route({ MobileMyGiftCards: new Error('boom') });
    await act(async () => {
      await result.current.refreshCards();
    });
    expect(result.current.cardsError).toBe(true);
    expect(result.current.cardsLoading).toBe(false);
  });
});
