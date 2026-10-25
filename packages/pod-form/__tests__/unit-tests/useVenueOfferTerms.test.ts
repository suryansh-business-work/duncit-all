import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const useQueryMock = vi.fn();
vi.mock('@apollo/client', () => ({
  gql: (s: TemplateStringsArray) => s.join(''),
}));
vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

import { POD_FORM_VENUE_OFFER_TERMS, useVenueOfferTerms } from '../../src/slots/useVenueOfferTerms';

const answer = (publicVenue: unknown) => ({ data: { publicVenue }, loading: false, error: undefined });

beforeEach(() => {
  useQueryMock.mockReset();
});

describe('useVenueOfferTerms', () => {
  it('asks for the one venue the offer is to, and only the bounds it needs', () => {
    useQueryMock.mockReturnValue(answer({ id: 'v1', capacity: 40, offer_min_guests: 8 }));
    renderHook(() => useVenueOfferTerms('v1'));
    const [doc, options] = useQueryMock.mock.calls[0];
    expect(doc).toBe(POD_FORM_VENUE_OFFER_TERMS);
    expect(String(doc)).toMatch(/publicVenue\(venue_id: \$venue_id\)\s*\{\s*id\s*capacity\s*offer_min_guests\s*\}/);
    expect(options).toMatchObject({ variables: { venue_id: 'v1' }, skip: false, fetchPolicy: 'cache-first' });
  });

  it("floors an offer at the venue's minimum, with what the venue holds", () => {
    useQueryMock.mockReturnValue(answer({ id: 'v1', capacity: 40, offer_min_guests: 8 }));
    const { result } = renderHook(() => useVenueOfferTerms('v1'));
    expect(result.current).toEqual({ minGuests: 8, capacity: 40 });
  });

  it('never floors above what the venue holds — the server asks for the capacity then', () => {
    useQueryMock.mockReturnValue(answer({ id: 'v1', capacity: 6, offer_min_guests: 8 }));
    const { result } = renderHook(() => useVenueOfferTerms('v1'));
    expect(result.current).toEqual({ minGuests: 6, capacity: 6 });
  });

  it('keeps the minimum when the venue names no capacity', () => {
    useQueryMock.mockReturnValue(answer({ id: 'v1', capacity: null, offer_min_guests: 8.6 }));
    const { result } = renderHook(() => useVenueOfferTerms('v1'));
    expect(result.current).toEqual({ minGuests: 8, capacity: null });
  });

  it('knows nothing while the venue is not answered, or not public', () => {
    useQueryMock.mockReturnValue({ data: undefined, loading: true, error: undefined });
    expect(renderHook(() => useVenueOfferTerms('v1')).result.current).toEqual({ minGuests: 0, capacity: null });
    useQueryMock.mockReturnValue(answer(null));
    expect(renderHook(() => useVenueOfferTerms('v1')).result.current).toEqual({ minGuests: 0, capacity: null });
  });

  it('asks nothing when no offer is being made, whatever an earlier answer left', () => {
    useQueryMock.mockReturnValue(answer({ id: 'v1', capacity: 40, offer_min_guests: 8 }));
    const { result } = renderHook(() => useVenueOfferTerms(''));
    expect(useQueryMock.mock.calls[0][1]).toMatchObject({ skip: true });
    expect(result.current).toEqual({ minGuests: 0, capacity: null });
  });
});
