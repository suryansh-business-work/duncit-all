import { renderHook, waitFor } from '@testing-library/react-native';

import { MobileProductShippingQuoteDocument } from '@/graphql/productCheckout';
import { graphqlRequest } from '@/services/graphql.client';
import { useProductShippingQuote } from '@/hooks/useProductShippingQuote';
import type { ProductCartItemInput } from '@/generated/graphql/graphql';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const items: ProductCartItemInput[] = [{ product_id: 'a', pod_id: 'p1', quantity: 1 }];
const quote = { total: 80, currency_symbol: '₹', all_quoted: true, lines: [] };

beforeEach(() => {
  mockRequest.mockReset().mockResolvedValue({ productShippingQuote: quote });
});

describe('useProductShippingQuote', () => {
  it('does not fetch until the pincode is a valid delivery pincode', () => {
    const { result } = renderHook(() => useProductShippingQuote(items, '41'));
    expect(result.current.pincodeValid).toBe(false);
    expect(result.current.quote).toBeNull();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('does not fetch when there are no items even with a valid pincode', () => {
    const { result } = renderHook(() => useProductShippingQuote([], '411001'));
    expect(result.current.pincodeValid).toBe(true);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('treats an empty pincode as invalid and never fetches', () => {
    const { result } = renderHook(() => useProductShippingQuote(items, ''));
    expect(result.current.pincodeValid).toBe(false);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('fetches the live quote once the pincode is valid', async () => {
    const { result } = renderHook(() => useProductShippingQuote(items, '411001'));
    await waitFor(() => expect(result.current.quote).toEqual(quote));
    expect(mockRequest).toHaveBeenCalledWith(
      MobileProductShippingQuoteDocument,
      { input: { items, delivery_pincode: '411001' } },
      { auth: true },
    );
    expect(result.current.loading).toBe(false);
  });

  it('clears the quote when the request fails', async () => {
    mockRequest.mockReset().mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => useProductShippingQuote(items, '411001'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.quote).toBeNull();
  });

  it('refetches when the delivery pincode changes', async () => {
    const { result, rerender } = renderHook(
      ({ pincode }: { pincode: string }) => useProductShippingQuote(items, pincode),
      { initialProps: { pincode: '411001' } },
    );
    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1));
    rerender({ pincode: '560001' });
    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(2));
    expect(mockRequest).toHaveBeenLastCalledWith(
      MobileProductShippingQuoteDocument,
      { input: { items, delivery_pincode: '560001' } },
      { auth: true },
    );
    expect(result.current.pincodeValid).toBe(true);
  });
});
