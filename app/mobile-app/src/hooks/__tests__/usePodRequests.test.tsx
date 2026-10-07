import { act, renderHook, waitFor } from '@testing-library/react-native';

import { PartnerSide } from '@/generated/graphql/graphql';
import {
  CancelPodPartnerRequestDocument,
  MyPodPartnerRequestsDocument,
  PodPartnerRequestDocument,
  PodRequestPodLinkDocument,
  RequestPodPartnerSlotDocument,
  RespondPodPartnerRequestDocument,
  RespondPodPartnerSlotDocument,
} from '@/graphql/pod-requests';
import { usePodRequestActions } from '@/hooks/usePodRequestActions';
import { usePodRequestDetail } from '@/hooks/usePodRequestDetail';
import { usePodRequests } from '@/hooks/usePodRequests';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const row = (id: string, direction: string, status: string, viewer_side = 'HOST') => ({
  id,
  direction,
  status,
  viewer_side,
  note: '',
  venue: null,
  host: null,
  created_at: '2030-01-01T00:00:00.000Z',
});

beforeEach(() => mockRequest.mockReset());

describe('usePodRequests', () => {
  it("splits a host's requests into received, accepted and sent", async () => {
    mockRequest.mockResolvedValueOnce({
      myPodPartnerRequests: [
        row('in', 'VENUE_TO_HOST', 'REQUESTED'),
        row('acc', 'VENUE_TO_HOST', 'SLOT_REQUESTED'),
        row('gone', 'VENUE_TO_HOST', 'REJECTED'),
        row('out', 'HOST_TO_VENUE', 'REQUESTED'),
      ],
    });
    const { result } = renderHook(() => usePodRequests(PartnerSide.Host));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockRequest).toHaveBeenCalledWith(
      MyPodPartnerRequestsDocument,
      { side: PartnerSide.Host, venue_id: null },
      { auth: true },
    );
    expect(result.current.incoming.map((r) => r.id)).toEqual(['in']);
    expect(result.current.accepted.map((r) => r.id)).toEqual(['acc']);
    expect(result.current.sent.map((r) => r.id)).toEqual(['out']);
    expect(result.current.error).toBeNull();
  });

  it('lists nothing for a venue owner until a venue is picked, then narrows to it', async () => {
    mockRequest.mockResolvedValue({ myPodPartnerRequests: [] });
    const { result, rerender } = renderHook(
      ({ venueId }: { venueId: string | null }) => usePodRequests(PartnerSide.Venue, venueId),
      { initialProps: { venueId: null } as { venueId: string | null } },
    );
    expect(result.current.isLoading).toBe(false);
    expect(mockRequest).not.toHaveBeenCalled();

    rerender({ venueId: 'v1' });
    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1));
    expect(mockRequest).toHaveBeenCalledWith(
      MyPodPartnerRequestsDocument,
      { side: PartnerSide.Venue, venue_id: 'v1' },
      { auth: true },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("shows the server's message when the list fails, and a fallback for anything else", async () => {
    mockRequest.mockRejectedValueOnce(new Error('Not a venue owner'));
    const { result } = renderHook(() => usePodRequests(PartnerSide.Venue, 'v1'));
    await waitFor(() => expect(result.current.error).toBe('Not a venue owner'));
    expect(result.current.incoming).toEqual([]);

    mockRequest.mockRejectedValueOnce({});
    const { result: other } = renderHook(() => usePodRequests(PartnerSide.Host));
    await waitFor(() => expect(other.current.error).toMatch(/Something went wrong/));
  });
});

describe('usePodRequestActions', () => {
  it('sends each move with its own mutation, then reloads', async () => {
    const reload = jest.fn().mockResolvedValue(undefined);
    mockRequest.mockResolvedValue({});
    const { result } = renderHook(() => usePodRequestActions(reload));

    let ok = false;
    await act(async () => {
      ok = await result.current.respond('r1', true);
    });
    expect(ok).toBe(true);
    expect(mockRequest).toHaveBeenLastCalledWith(
      RespondPodPartnerRequestDocument,
      { id: 'r1', accept: true },
      { auth: true },
    );

    await act(async () => {
      await result.current.withdraw('r2');
    });
    expect(mockRequest).toHaveBeenLastCalledWith(
      CancelPodPartnerRequestDocument,
      { id: 'r2' },
      { auth: true },
    );

    await act(async () => {
      await result.current.requestSlot('r3', 's9');
    });
    expect(mockRequest).toHaveBeenLastCalledWith(
      RequestPodPartnerSlotDocument,
      { id: 'r3', slot_id: 's9' },
      { auth: true },
    );

    await act(async () => {
      await result.current.respondSlot('r4', false);
    });
    expect(mockRequest).toHaveBeenLastCalledWith(
      RespondPodPartnerSlotDocument,
      { id: 'r4', confirm: false },
      { auth: true },
    );
    expect(reload).toHaveBeenCalledTimes(4);
    expect(result.current.busy).toBe(false);
    expect(result.current.error).toBe('');
  });

  it("keeps a refused move's message (no reload) until it is cleared", async () => {
    const reload = jest.fn().mockResolvedValue(undefined);
    mockRequest.mockRejectedValueOnce(new Error('CONFLICT: already answered'));
    const { result } = renderHook(() => usePodRequestActions(reload));

    let ok = true;
    await act(async () => {
      ok = await result.current.respond('r1', false);
    });
    expect(ok).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    expect(result.current.error).toBe('CONFLICT: already answered');
    expect(result.current.busy).toBe(false);

    act(() => result.current.clearError());
    expect(result.current.error).toBe('');
  });

  it('reports a failed reload too, with the fallback for a non-Error', async () => {
    const reload = jest.fn().mockRejectedValue('');
    mockRequest.mockResolvedValueOnce({});
    const { result } = renderHook(() => usePodRequestActions(reload));
    let ok = true;
    await act(async () => {
      ok = await result.current.withdraw('r1');
    });
    expect(ok).toBe(false);
    expect(result.current.error).toMatch(/Something went wrong/);
  });
});

describe('usePodRequestDetail', () => {
  const detail = (pod_id: string | null) => ({
    podPartnerRequest: { ...row('r1', 'VENUE_TO_HOST', 'POD_CREATED'), pod_id },
  });

  it('loads a request with no pod without asking for a pod link', async () => {
    mockRequest.mockResolvedValueOnce(detail(null));
    const { result } = renderHook(() => usePodRequestDetail('r1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.request?.id).toBe('r1');
    expect(result.current.pod).toBeNull();
    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(mockRequest).toHaveBeenCalledWith(
      PodPartnerRequestDocument,
      { id: 'r1' },
      { auth: true },
    );
  });

  it("reads the created pod's public address", async () => {
    mockRequest
      .mockResolvedValueOnce(detail('pod-doc'))
      .mockResolvedValueOnce({ pod: { id: 'pod-doc', pod_id: 'p-slug', club_slug: 'c-slug' } });
    const { result } = renderHook(() => usePodRequestDetail('r1'));
    await waitFor(() => expect(result.current.pod).not.toBeNull());
    expect(result.current.pod).toEqual({ id: 'pod-doc', pod_id: 'p-slug', club_slug: 'c-slug' });
    expect(mockRequest).toHaveBeenLastCalledWith(
      PodRequestPodLinkDocument,
      { pod_doc_id: 'pod-doc' },
      { auth: true },
    );
  });

  it('keeps the pod empty when the pod is no longer readable', async () => {
    mockRequest.mockResolvedValueOnce(detail('pod-doc')).mockResolvedValueOnce({ pod: null });
    const { result } = renderHook(() => usePodRequestDetail('r1'));
    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.pod).toBeNull();
    expect(result.current.request?.pod_id).toBe('pod-doc');
  });

  it("shows the server's refusal, or 'not found' for anything else", async () => {
    mockRequest.mockRejectedValueOnce(new Error('Forbidden'));
    const { result } = renderHook(() => usePodRequestDetail('r1'));
    await waitFor(() => expect(result.current.error).toBe('Forbidden'));
    expect(result.current.request).toBeNull();

    mockRequest.mockRejectedValueOnce(null);
    const { result: other } = renderHook(() => usePodRequestDetail('r2'));
    await waitFor(() => expect(other.current.error).toBe('This Pod Request could not be found.'));
  });

  it('does nothing without an id', () => {
    const { result } = renderHook(() => usePodRequestDetail(''));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.request).toBeNull();
    expect(mockRequest).not.toHaveBeenCalled();
  });
});
