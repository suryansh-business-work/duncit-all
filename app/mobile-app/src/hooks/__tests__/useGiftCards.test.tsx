import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useFinanceCurrency, useGiftCards } from '@/hooks/useGiftCards';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const settings = { enabled: true, amounts: [500, 1000] };
const categories = [{ id: 'c1', name: 'Birthday' }];
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
  it('loads settings and categories once', async () => {
    route({
      MobileGiftCardSettings: { publicGiftCardSettings: settings },
      MobileGiftCardCategories: { categories },
    });
    const { result } = renderHook(() => useGiftCards());
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.settings).toEqual(settings);
    expect(result.current.categories).toEqual(categories);
    expect(result.current.hasError).toBe(false);
    expect(result.current.cards).toBeNull();
  });

  it('flags an error when the buy context cannot load', async () => {
    route({
      MobileGiftCardSettings: new Error('nope'),
      MobileGiftCardCategories: { categories },
    });
    const { result } = renderHook(() => useGiftCards());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasError).toBe(true);
    expect(result.current.settings).toBeNull();
  });

  it('refreshCards loads the caller cards, and flags a failure', async () => {
    route({
      MobileGiftCardSettings: { publicGiftCardSettings: settings },
      MobileGiftCardCategories: { categories },
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
