import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { PRODUCT_SHIPPING_QUOTE, type ProductCartItemInput } from '../../checkout-page/queries';
import { useProductShippingQuote } from '../useProductShippingQuote';

const items: ProductCartItemInput[] = [{ product_id: 'a', pod_id: 'pod1', quantity: 2 }];

const shippingMock = (): MockedResponse => ({
  request: { query: PRODUCT_SHIPPING_QUOTE },
  variableMatcher: () => true,
  result: {
    data: { productShippingQuote: { total: 80, currency_symbol: '₹', all_quoted: true, lines: [] } },
  },
});

const wrapper = (mocks: MockedResponse[]) =>
  function Wrapper({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
      <MockedProvider mocks={mocks} addTypename={false}>
        {children}
      </MockedProvider>
    );
  };

describe('useProductShippingQuote', () => {
  it('does not quote for an invalid pincode (no query fired)', () => {
    const { result } = renderHook(() => useProductShippingQuote(items, '12'), { wrapper: wrapper([]) });
    expect(result.current.pincodeValid).toBe(false);
    expect(result.current.quote).toBeNull();
  });

  it('does not quote when the cart has no items', () => {
    const { result } = renderHook(() => useProductShippingQuote([], '560001'), { wrapper: wrapper([]) });
    expect(result.current.pincodeValid).toBe(true);
    expect(result.current.quote).toBeNull();
  });

  it('fetches the live quote once the pincode is valid', async () => {
    const { result } = renderHook(() => useProductShippingQuote(items, '560001'), {
      wrapper: wrapper([shippingMock()]),
    });
    await waitFor(() => expect(result.current.quote).not.toBeNull());
    expect(result.current.quote?.total).toBe(80);
    expect(result.current.quote?.all_quoted).toBe(true);
  });
});
