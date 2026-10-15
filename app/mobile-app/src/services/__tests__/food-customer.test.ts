import type { DocumentNode, OperationDefinitionNode } from 'graphql';
import type { MyVenueFoodOrdersPage } from '@duncit/utils';

import { fetchMyFoodOrders, fetchVenueFoodRating } from '@/services/food-customer';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

/** The operation a parsed document names — which query was sent. */
const operationOf = (doc: unknown) =>
  ((doc as DocumentNode).definitions[0] as OperationDefinitionNode).name?.value;

beforeEach(() => mockRequest.mockReset());

describe('fetchMyFoodOrders', () => {
  it('asks with the session for the scope, venue and keys, and answers the page', async () => {
    const page: MyVenueFoodOrdersPage = { rows: [], total: 0, page: 1, page_size: 20 };
    mockRequest.mockResolvedValue({ myVenueFoodOrders: page });
    const input = {
      scope: 'CURRENT' as const,
      venue_id: 'v1',
      keys: [{ order_id: 'o1', access_key: 'ak' }],
      page: 1,
      page_size: 20,
    };

    await expect(fetchMyFoodOrders(input)).resolves.toBe(page);

    const [doc, variables, options] = mockRequest.mock.calls[0] as unknown[];
    expect(operationOf(doc)).toBe('MyVenueFoodOrders');
    expect(variables).toEqual({ input });
    expect(options).toEqual({ auth: true });
  });

  it('passes a failed request on to the caller', async () => {
    mockRequest.mockRejectedValue(new Error('offline'));
    await expect(fetchMyFoodOrders({ scope: 'PAST' })).rejects.toThrow('offline');
  });
});

describe('fetchVenueFoodRating', () => {
  it('asks for one venue’s rating, publicly, and answers it', async () => {
    const rating = { venue_id: 'v1', average: 4.3, count: 12 };
    mockRequest.mockResolvedValue({ venueFoodRating: rating });

    await expect(fetchVenueFoodRating('v1')).resolves.toBe(rating);

    expect(mockRequest).toHaveBeenCalledTimes(1);
    const call = mockRequest.mock.calls[0] as unknown[];
    expect(operationOf(call[0])).toBe('VenueFoodRating');
    expect(call[1]).toEqual({ venueId: 'v1' });
    // A public read: no session option rides along.
    expect(call).toHaveLength(2);
  });
});
