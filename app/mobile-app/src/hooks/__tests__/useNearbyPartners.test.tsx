import { act, renderHook, waitFor } from '@testing-library/react-native';

import { PartnerSide } from '@/generated/graphql/graphql';
import {
  NearbyHostsForVenueDocument,
  NearbyVenuesForHostDocument,
  PodRequestHostCategoriesDocument,
  PodRequestQuotaDocument,
  PodRequestSearchVenuesDocument,
  SendPodPartnerRequestDocument,
} from '@/graphql/pod-requests';
import { useNearbyHosts } from '@/hooks/useNearbyHosts';
import { useNearbyPartners, type NearbyItem } from '@/hooks/useNearbyPartners';
import { useNearbySearch } from '@/hooks/useNearbySearch';
import { useNearbyVenues } from '@/hooks/useNearbyVenues';
import { graphqlRequest } from '@/services/graphql.client';
import { useLocationStore } from '@/stores/location.store';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

/** Answers each operation by its document, so a hook's several queries can run in any order. */
const respondByDocument = (answers: Map<unknown, (vars: never) => unknown>) =>
  mockRequest.mockImplementation((doc: unknown, vars: never) => {
    const answer = answers.get(doc);
    if (!answer) return Promise.reject(new Error('unexpected operation'));
    return Promise.resolve().then(() => answer(vars));
  });

const quota = { podPartnerRequestQuota: { limit: 10, remaining: 4 } };

const item: NearbyItem = {
  id: 'h1',
  kind: 'HOST',
  name: 'Asha',
  imageUrl: '',
  category: 'Yoga',
  place: '',
  distanceKm: 1.2,
  openStatus: null,
};

beforeEach(() => {
  mockRequest.mockReset();
  useLocationStore.setState({ selectedId: 'l1', zoneName: 'Andheri', cityLabel: 'Mumbai' });
});

describe('useNearbySearch', () => {
  afterEach(() => jest.useRealTimers());

  it('starts at 5 km around the picked city + area with the default categories', () => {
    const defaults = ['c1'];
    const { result } = renderHook(() => useNearbySearch(defaults));
    expect(result.current.placeName).toBe('Andheri, Mumbai');
    expect(result.current.radiusKm).toBe(5);
    expect(result.current.search).toEqual({
      location_id: 'l1',
      zone_name: 'Andheri',
      radius_km: 5,
      category_ids: ['c1'],
    });
  });

  it('sends no area when only a city is picked', () => {
    useLocationStore.setState({ zoneName: '' });
    const defaults: string[] = [];
    const { result } = renderHook(() => useNearbySearch(defaults));
    expect(result.current.placeName).toBe('Mumbai');
    expect(result.current.search.zone_name).toBeNull();
  });

  it('clamps the radius to 0–10 km and re-runs the search only once the slider rests', () => {
    jest.useFakeTimers();
    const defaults: string[] = [];
    const { result } = renderHook(() => useNearbySearch(defaults));

    act(() => result.current.setRadiusKm(25));
    expect(result.current.radiusKm).toBe(10);
    expect(result.current.search.radius_km).toBe(5);
    act(() => jest.advanceTimersByTime(399));
    expect(result.current.search.radius_km).toBe(5);
    act(() => jest.advanceTimersByTime(1));
    expect(result.current.search.radius_km).toBe(10);

    act(() => result.current.setRadiusKm(-3));
    expect(result.current.radiusKm).toBe(0);
  });

  it("keeps the partner's own category pick, including all, until reset", () => {
    const defaults = ['c1'];
    const { result } = renderHook(() => useNearbySearch(defaults));
    act(() => result.current.setCategoryIds([]));
    expect(result.current.categoryIds).toEqual([]);
    act(() => result.current.setCategoryIds(['c2', 'c3']));
    expect(result.current.search.category_ids).toEqual(['c2', 'c3']);
    act(() => result.current.resetCategories());
    expect(result.current.categoryIds).toEqual(['c1']);
  });
});

describe('useNearbyPartners', () => {
  it("loads the results and the host's own quota, and refreshes both after a send", async () => {
    const fetchItems = jest.fn().mockResolvedValue([item]);
    respondByDocument(
      new Map<unknown, (vars: never) => unknown>([
        [PodRequestQuotaDocument, () => quota],
        [SendPodPartnerRequestDocument, () => ({ sendPodPartnerRequest: { id: 'r1' } })],
      ]),
    );
    const { result } = renderHook(() =>
      useNearbyPartners(fetchItems, true, PartnerSide.Host, null),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(result.current.quota).toEqual(quota.podPartnerRequestQuota));
    expect(result.current.items).toEqual([item]);
    expect(mockRequest).toHaveBeenCalledWith(
      PodRequestQuotaDocument,
      { side: PartnerSide.Host, venue_id: null },
      { auth: true },
    );

    const input = { direction: 'HOST_TO_VENUE', venue_id: 'v1', note: null } as never;
    await act(async () => {
      await result.current.send(input);
    });
    expect(mockRequest).toHaveBeenCalledWith(
      SendPodPartnerRequestDocument,
      { input },
      {
        auth: true,
      },
    );
    expect(fetchItems).toHaveBeenCalledTimes(2);
    expect(mockRequest.mock.calls.filter(([doc]) => doc === PodRequestQuotaDocument)).toHaveLength(
      2,
    );
  });

  it("passes the server's refusal of a send up to the caller", async () => {
    const fetchItems = jest.fn().mockResolvedValue([]);
    respondByDocument(
      new Map<unknown, (vars: never) => unknown>([
        [PodRequestQuotaDocument, () => quota],
        [
          SendPodPartnerRequestDocument,
          () => {
            throw new Error('LIMIT_REACHED');
          },
        ],
      ]),
    );
    const { result } = renderHook(() =>
      useNearbyPartners(fetchItems, true, PartnerSide.Host, null),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await expect(result.current.send({} as never)).rejects.toThrow('LIMIT_REACHED');
    expect(fetchItems).toHaveBeenCalledTimes(1);
  });

  it('stays idle while disabled and skips the venue quota without a venue', async () => {
    const fetchItems = jest.fn().mockResolvedValue([item]);
    const { result } = renderHook(() =>
      useNearbyPartners(fetchItems, false, PartnerSide.Venue, null),
    );
    expect(result.current.isLoading).toBe(false);
    expect(fetchItems).not.toHaveBeenCalled();
    expect(mockRequest).not.toHaveBeenCalled();
    expect(result.current.quota).toBeNull();
  });

  it('shows a failed search, and a fallback when the failure carries no message', async () => {
    const fetchItems = jest.fn().mockRejectedValue(new Error('Search down'));
    mockRequest.mockResolvedValue(quota);
    const { result } = renderHook(() =>
      useNearbyPartners(fetchItems, true, PartnerSide.Venue, 'v1'),
    );
    await waitFor(() => expect(result.current.error).toBe('Search down'));
    expect(result.current.items).toEqual([]);

    mockRequest.mockReset();
    mockRequest.mockRejectedValue(undefined);
    const okItems = jest.fn().mockResolvedValue([]);
    const { result: quotaFail } = renderHook(() =>
      useNearbyPartners(okItems, false, PartnerSide.Venue, 'v1'),
    );
    await waitFor(() => expect(quotaFail.current.error).toMatch(/Something went wrong/));
  });
});

const venues = {
  myVenues: [
    {
      id: 'pend',
      venue_name: 'Pending',
      city: 'Mumbai',
      status: 'PENDING',
      venue_category: { category_id: 'cx' },
    },
    {
      id: 'v1',
      venue_name: 'Hall',
      city: 'Mumbai',
      status: 'APPROVED',
      venue_category: { category_id: 'c1' },
    },
    {
      id: 'v2',
      venue_name: 'Turf',
      city: 'Mumbai',
      status: 'APPROVED',
      venue_category: { category_id: null },
    },
  ],
};

describe('useNearbyHosts', () => {
  const hosts = {
    nearbyHostsForVenue: [
      {
        user_id: 'h1',
        name: 'Asha',
        photo_url: 'https://cdn/a.jpg',
        categories: ['Yoga', 'Dance'],
        distance_km: 2.3,
        open_request_status: 'REQUESTED',
      },
      {
        user_id: 'h2',
        name: 'Ben',
        photo_url: '',
        categories: [],
        distance_km: 4,
        open_request_status: null,
      },
    ],
  };

  it('searches around the first approved venue with its category, as host cards', async () => {
    respondByDocument(
      new Map<unknown, (vars: never) => unknown>([
        [PodRequestSearchVenuesDocument, () => venues],
        [NearbyHostsForVenueDocument, () => hosts],
        [PodRequestQuotaDocument, () => quota],
      ]),
    );
    const { result } = renderHook(() => useNearbyHosts());
    await waitFor(() => expect(result.current.partners.items).toHaveLength(2));

    // Venues still under review are never offered.
    expect(result.current.venues.map((v) => v.id)).toEqual(['v1', 'v2']);
    expect(result.current.venue?.id).toBe('v1');
    expect(mockRequest).toHaveBeenCalledWith(
      NearbyHostsForVenueDocument,
      {
        venue_id: 'v1',
        search: { location_id: 'l1', zone_name: 'Andheri', radius_km: 5, category_ids: ['c1'] },
      },
      { auth: true },
    );
    expect(mockRequest).toHaveBeenCalledWith(
      PodRequestQuotaDocument,
      { side: PartnerSide.Venue, venue_id: 'v1' },
      { auth: true },
    );
    expect(result.current.partners.items).toEqual([
      {
        id: 'h1',
        kind: 'HOST',
        name: 'Asha',
        imageUrl: 'https://cdn/a.jpg',
        category: 'Yoga · Dance',
        place: '',
        distanceKm: 2.3,
        openStatus: 'REQUESTED',
      },
      {
        id: 'h2',
        kind: 'HOST',
        name: 'Ben',
        imageUrl: '',
        category: '',
        place: '',
        distanceKm: 4,
        openStatus: null,
      },
    ]);
  });

  it('switching venue brings back that venue’s own default category', async () => {
    respondByDocument(
      new Map<unknown, (vars: never) => unknown>([
        [PodRequestSearchVenuesDocument, () => venues],
        [NearbyHostsForVenueDocument, () => hosts],
        [PodRequestQuotaDocument, () => quota],
      ]),
    );
    const { result } = renderHook(() => useNearbyHosts());
    await waitFor(() => expect(result.current.venue?.id).toBe('v1'));
    act(() => result.current.state.setCategoryIds(['c9']));
    expect(result.current.state.categoryIds).toEqual(['c9']);

    act(() => result.current.selectVenue('v2'));
    expect(result.current.venue?.id).toBe('v2');
    // v2 has no category of its own → all categories.
    expect(result.current.state.categoryIds).toEqual([]);
    await waitFor(() =>
      expect(mockRequest).toHaveBeenCalledWith(
        NearbyHostsForVenueDocument,
        expect.objectContaining({ venue_id: 'v2' }),
        { auth: true },
      ),
    );
  });

  it('sends a VENUE_TO_HOST request from the picked venue, without an empty note', async () => {
    respondByDocument(
      new Map<unknown, (vars: never) => unknown>([
        [PodRequestSearchVenuesDocument, () => venues],
        [NearbyHostsForVenueDocument, () => hosts],
        [PodRequestQuotaDocument, () => quota],
        [SendPodPartnerRequestDocument, () => ({ sendPodPartnerRequest: { id: 'r1' } })],
      ]),
    );
    const { result } = renderHook(() => useNearbyHosts());
    await waitFor(() => expect(result.current.partners.items).toHaveLength(2));

    await act(async () => {
      await result.current.send(item, '');
    });
    expect(mockRequest).toHaveBeenCalledWith(
      SendPodPartnerRequestDocument,
      { input: { direction: 'VENUE_TO_HOST', venue_id: 'v1', host_user_id: 'h1', note: null } },
      { auth: true },
    );
    await act(async () => {
      await result.current.send(item, 'Weekend yoga?');
    });
    expect(
      mockRequest.mock.calls.filter(([doc]) => doc === SendPodPartnerRequestDocument)[1]?.[1],
    ).toEqual({
      input: {
        direction: 'VENUE_TO_HOST',
        venue_id: 'v1',
        host_user_id: 'h1',
        note: 'Weekend yoga?',
      },
    });
  });

  it("does not search without a venue or a picked city, and shows the venues' failure", async () => {
    useLocationStore.setState({ selectedId: '' });
    mockRequest.mockRejectedValueOnce(new Error('Venues unavailable'));
    const { result } = renderHook(() => useNearbyHosts());
    await waitFor(() => expect(result.current.venuesError).toBe('Venues unavailable'));
    expect(result.current.venue).toBeNull();
    expect(result.current.venuesLoading).toBe(false);
    expect(mockRequest).toHaveBeenCalledTimes(1);

    mockRequest.mockRejectedValueOnce(42);
    const { result: other } = renderHook(() => useNearbyHosts());
    await waitFor(() => expect(other.current.venuesError).toMatch(/Something went wrong/));
  });
});

describe('useNearbyVenues', () => {
  const nearby = {
    nearbyVenuesForHost: [
      {
        id: 'v1',
        venue_name: 'Hall',
        category: 'Sports',
        locality: 'Bandra',
        city: 'Mumbai',
        cover_image_url: 'https://cdn/v.jpg',
        distance_km: 3.5,
        open_request_status: null,
      },
      {
        id: 'v2',
        venue_name: 'Loft',
        category: 'Arts',
        locality: '',
        city: 'Mumbai',
        cover_image_url: '',
        distance_km: 6,
        open_request_status: 'ACCEPTED',
      },
    ],
  };

  it("waits for the host's categories, then searches with them (deduped)", async () => {
    let releaseHost: (value: unknown) => void = () => undefined;
    mockRequest.mockImplementation((doc: unknown) => {
      if (doc === PodRequestHostCategoriesDocument) {
        return new Promise((resolve) => {
          releaseHost = resolve;
        });
      }
      if (doc === NearbyVenuesForHostDocument) return Promise.resolve(nearby);
      return Promise.resolve(quota);
    });
    const { result } = renderHook(() => useNearbyVenues());
    expect(result.current.hostLoading).toBe(true);
    expect(mockRequest).not.toHaveBeenCalledWith(
      NearbyVenuesForHostDocument,
      expect.anything(),
      expect.anything(),
    );

    await act(async () => {
      releaseHost({
        myHost: {
          id: 'host',
          host_categories: [
            { category_id: 'c1' },
            { category_id: 'c1' },
            { category_id: null },
            { category_id: 'c2' },
          ],
        },
      });
    });
    await waitFor(() => expect(result.current.partners.items).toHaveLength(2));
    expect(mockRequest).toHaveBeenCalledWith(
      NearbyVenuesForHostDocument,
      {
        search: {
          location_id: 'l1',
          zone_name: 'Andheri',
          radius_km: 5,
          category_ids: ['c1', 'c2'],
        },
      },
      { auth: true },
    );
    expect(result.current.partners.items[0]).toEqual({
      id: 'v1',
      kind: 'VENUE',
      name: 'Hall',
      imageUrl: 'https://cdn/v.jpg',
      category: 'Sports',
      place: 'Bandra, Mumbai',
      distanceKm: 3.5,
      openStatus: null,
    });
    expect(result.current.partners.items[1]?.place).toBe('Mumbai');
    expect(result.current.partners.items[1]?.openStatus).toBe('ACCEPTED');
  });

  it('searches all categories for a host with no profile and sends HOST_TO_VENUE requests', async () => {
    respondByDocument(
      new Map<unknown, (vars: never) => unknown>([
        [PodRequestHostCategoriesDocument, () => ({ myHost: null })],
        [NearbyVenuesForHostDocument, () => nearby],
        [PodRequestQuotaDocument, () => quota],
        [SendPodPartnerRequestDocument, () => ({ sendPodPartnerRequest: { id: 'r1' } })],
      ]),
    );
    const { result } = renderHook(() => useNearbyVenues());
    await waitFor(() => expect(result.current.partners.items).toHaveLength(2));
    expect(result.current.state.categoryIds).toEqual([]);

    const venue = { ...item, id: 'v1', kind: 'VENUE' as const };
    await act(async () => {
      await result.current.send(venue, 'Hello');
    });
    expect(mockRequest).toHaveBeenCalledWith(
      SendPodPartnerRequestDocument,
      { input: { direction: 'HOST_TO_VENUE', venue_id: 'v1', note: 'Hello' } },
      { auth: true },
    );
    await act(async () => {
      await result.current.send(venue, '');
    });
    expect(
      mockRequest.mock.calls.filter(([doc]) => doc === SendPodPartnerRequestDocument)[1]?.[1],
    ).toEqual({ input: { direction: 'HOST_TO_VENUE', venue_id: 'v1', note: null } });
  });

  it("shows the host profile's failure and never searches", async () => {
    mockRequest.mockImplementation((doc: unknown) =>
      doc === PodRequestHostCategoriesDocument
        ? Promise.reject(new Error('Host lookup failed'))
        : Promise.resolve(quota),
    );
    const { result } = renderHook(() => useNearbyVenues());
    await waitFor(() => expect(result.current.hostError).toBe('Host lookup failed'));
    expect(result.current.partners.isLoading).toBe(false);
    expect(mockRequest).not.toHaveBeenCalledWith(
      NearbyVenuesForHostDocument,
      expect.anything(),
      expect.anything(),
    );

    mockRequest.mockImplementation((doc: unknown) =>
      doc === PodRequestHostCategoriesDocument ? Promise.reject({}) : Promise.resolve(quota),
    );
    const { result: other } = renderHook(() => useNearbyVenues());
    await waitFor(() => expect(other.current.hostError).toMatch(/Something went wrong/));
  });
});
