import { renderHook, waitFor } from '@testing-library/react-native';
import { logs } from '@duncit/logs';

import type { CreatePodVenue } from '@/components/create-pod';
import { CreatePodPartnerRequestDocument } from '@/graphql/pod-requests';
import { loadPartnerRequestPrefill } from '@/hooks/partnerRequestPrefill';
import { useCreatePod } from '@/hooks/useCreatePod';
import { graphqlRequest } from '@/services/graphql.client';
import { useAppSettingsStore } from '@/stores/app-settings.store';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

let mockLogError: jest.SpyInstance;

// Built from local wall-clock parts so the typed text does not depend on the machine's zone.
const START = new Date(2030, 0, 5, 18, 30).toISOString();
const END = new Date(2030, 0, 5, 20, 0).toISOString();
const PATTERN = 'dd/MM/yyyy HH:mm';

const hall = {
  id: 'v1',
  location_id: 'l9',
  capacity: 80,
  capacity_items: [
    { label: 'Court A', capacity: 12 },
    { label: 'Court B', capacity: 20 },
  ],
} as unknown as CreatePodVenue;
const studio = {
  id: 'v2',
  location_id: null,
  capacity: 30,
  capacity_items: [],
} as unknown as CreatePodVenue;

const request = (overrides: Record<string, unknown> = {}) => ({
  podPartnerRequest: {
    id: 'req1',
    status: 'SLOT_CONFIRMED',
    viewer_side: 'HOST',
    venue: { id: 'v1' },
    slot: { id: 's1', start_at: START, end_at: END, space_label: 'Court B' },
    ...overrides,
  },
});

beforeEach(() => {
  mockRequest.mockReset();
  mockLogError = jest.spyOn(logs.mobileApp, 'error').mockImplementation(() => undefined);
});

describe('loadPartnerRequestPrefill', () => {
  it('lays the confirmed slot over the form: venue, its city, the space, spots and the window', async () => {
    mockRequest.mockResolvedValueOnce(request());
    const prefill = await loadPartnerRequestPrefill('req1', [studio, hall], PATTERN);
    expect(mockRequest).toHaveBeenCalledWith(
      CreatePodPartnerRequestDocument,
      { id: 'req1' },
      { auth: true },
    );
    expect(prefill).toEqual({
      pinnedVenueId: 'v1',
      values: {
        venue_id: 'v1',
        location_id: 'l9',
        venue_slot_id: 's1',
        venue_space_label: 'Court B',
        no_of_spots_text: '20',
        pod_date_time_text: '05/01/2030 18:30',
        pod_end_date_time_text: '05/01/2030 20:00',
        partner_request_id: 'req1',
      },
    });
  });

  it('matches a whole-venue slot to the whole venue, and keeps the city when the venue has none', async () => {
    mockRequest.mockResolvedValueOnce(
      request({
        venue: { id: 'v2' },
        slot: { id: 's2', start_at: START, end_at: END, space_label: '' },
      }),
    );
    const prefill = await loadPartnerRequestPrefill('req1', [studio], PATTERN);
    expect(prefill?.values.venue_space_label).toBe('Whole venue');
    expect(prefill?.values.no_of_spots_text).toBe('30');
    expect(prefill?.values).not.toHaveProperty('location_id');
  });

  it('leaves the space for the host to pick when the slot names one the venue no longer sells', async () => {
    mockRequest.mockResolvedValueOnce(
      request({ slot: { id: 's1', start_at: START, end_at: END, space_label: 'Gone' } }),
    );
    const prefill = await loadPartnerRequestPrefill('req1', [hall], PATTERN);
    expect(prefill?.values.venue_slot_id).toBe('s1');
    expect(prefill?.values).not.toHaveProperty('venue_space_label');
    expect(prefill?.values).not.toHaveProperty('no_of_spots_text');
  });

  it.each([
    ['the slot is not confirmed yet', { status: 'SLOT_REQUESTED' }],
    ['the viewer is the venue side', { viewer_side: 'VENUE' }],
    ['the pod already exists', { status: 'POD_CREATED' }],
    ['the venue is not on offer', { venue: { id: 'elsewhere' } }],
    ['the request has no venue', { venue: null }],
    ['the request has no slot', { slot: null }],
  ])('returns null when %s', async (_why, overrides) => {
    mockRequest.mockResolvedValueOnce(request(overrides));
    await expect(loadPartnerRequestPrefill('req1', [hall], PATTERN)).resolves.toBeNull();
  });
});

describe('useCreatePod with a Pod Request', () => {
  const options = {
    me: { user_id: 'u1', roles: ['HOST'], selected_location_id: 'l2' },
    clubs: [],
    locations: [{ id: 'l2', location_name: 'Mumbai', city: 'Mumbai' }],
    publicVenues: [
      { ...hall, venue_name: 'Hall', is_active: true },
      { id: 'off', venue_name: 'Off', location_id: 'l2', is_active: false },
    ],
    myHost: { id: 'h1', status: 'APPROVED', host_categories: [] },
    availablePodProducts: [],
    publicFinanceSettings: null,
  };

  beforeEach(() => {
    useAppSettingsStore.setState({
      data: { publicAppSettings: { date_format: 'dd/MM/yyyy', time_format: 'HH:mm' } } as never,
    });
  });

  afterEach(() => useAppSettingsStore.setState({ data: undefined }));

  it('opens a fresh pod with the request’s venue, slot and id, pinning the venue', async () => {
    mockRequest.mockResolvedValueOnce(options).mockResolvedValueOnce(request());
    const { result } = renderHook(() => useCreatePod(undefined, 'req1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.pinnedVenueId).toBe('v1');
    expect(result.current.initialValues).toMatchObject({
      venue_id: 'v1',
      location_id: 'l9',
      venue_slot_id: 's1',
      venue_space_label: 'Court B',
      no_of_spots_text: '20',
      pod_date_time_text: '05/01/2030 18:30',
      partner_request_id: 'req1',
    });
  });

  it('only offers active venues to the prefill', async () => {
    mockRequest
      .mockResolvedValueOnce(options)
      .mockResolvedValueOnce(request({ venue: { id: 'off' } }));
    const { result } = renderHook(() => useCreatePod(undefined, 'req1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.pinnedVenueId).toBeUndefined();
    expect(result.current.initialValues.venue_id).toBe('');
    expect(result.current.initialValues.location_id).toBe('l2');
  });

  it('logs a failed prefill and opens the form blank', async () => {
    const error = new Error('Request not found');
    mockRequest.mockResolvedValueOnce(options).mockRejectedValueOnce(error);
    const { result } = renderHook(() => useCreatePod(undefined, 'req1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockLogError).toHaveBeenCalledWith('useCreatePod', 'loadPartnerRequestPrefill', {
      error,
    });
    expect(result.current.initialValues.venue_id).toBe('');
    expect(result.current.initialValues.partner_request_id).toBe('');
    expect(result.current.initialValues.location_id).toBe('l2');
    expect(result.current.pinnedVenueId).toBeUndefined();
  });

  it('never prefills over a resumed draft, but keeps a request draft’s venue pinned', async () => {
    mockRequest.mockResolvedValueOnce(options).mockResolvedValueOnce({
      myPodDraft: {
        id: 'd1',
        step: 2,
        payload: JSON.stringify({ venue_id: 'v1', partner_request_id: 'req1' }),
      },
    });
    const { result } = renderHook(() => useCreatePod('d1', 'req1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Two reads only: options + draft — the request is not fetched again.
    expect(mockRequest).toHaveBeenCalledTimes(2);
    expect(mockRequest).not.toHaveBeenCalledWith(
      CreatePodPartnerRequestDocument,
      expect.anything(),
      expect.anything(),
    );
    expect(result.current.initialValues.venue_id).toBe('v1');
    expect(result.current.pinnedVenueId).toBe('v1');
  });

  it('pins nothing for an ordinary resumed draft', async () => {
    mockRequest.mockResolvedValueOnce(options).mockResolvedValueOnce({
      myPodDraft: { id: 'd2', step: 2, payload: JSON.stringify({ venue_id: 'v1' }) },
    });
    const { result } = renderHook(() => useCreatePod('d2'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.initialValues.venue_id).toBe('v1');
    expect(result.current.pinnedVenueId).toBeUndefined();
  });
});
