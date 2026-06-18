import { act, renderHook } from '@testing-library/react-native';
import * as Location from 'expo-location';

import {
  MobileActiveSosDocument,
  MobileMyCallbacksDocument,
  MobilePendingPodFeedbackDocument,
  MobileRaiseSosDocument,
  MobileRequestCallbackDocument,
  MobileSubmitFeedbackDocument,
  MobileSupportCallTargetDocument,
} from '@/graphql/bouncer';
import { graphqlRequest } from '@/services/graphql.client';
import { useBouncer } from '@/hooks/useBouncer';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;
const reqPerm = Location.requestForegroundPermissionsAsync as jest.Mock;
const getPos = Location.getCurrentPositionAsync as jest.Mock;

beforeEach(() => {
  mockRequest.mockReset().mockResolvedValue({});
  reqPerm.mockReset().mockResolvedValue({ granted: false });
  getPos.mockReset();
});

describe('useBouncer', () => {
  it('loads the support target and active SOS', async () => {
    mockRequest
      .mockResolvedValueOnce({ bouncerSupportTarget: { phone: '123', available: true } })
      .mockResolvedValueOnce({ myActiveBouncerSos: { id: 's1', status: 'OPEN' } });
    const { result } = renderHook(() => useBouncer());

    const target = await result.current.loadSupportTarget();
    expect(target.bouncerSupportTarget.phone).toBe('123');
    expect(mockRequest).toHaveBeenCalledWith(MobileSupportCallTargetDocument, undefined, {
      auth: true,
    });

    const sos = await result.current.getActiveSos('p1');
    expect(sos?.id).toBe('s1');
    expect(mockRequest).toHaveBeenCalledWith(
      MobileActiveSosDocument,
      { pod_id: 'p1' },
      { auth: true },
    );
  });

  it('raises an SOS with a null location when permission is denied', async () => {
    const { result } = renderHook(() => useBouncer());
    await act(async () => {
      await result.current.raiseSos('p1', '  help  ');
    });
    expect(mockRequest).toHaveBeenCalledWith(
      MobileRaiseSosDocument,
      { input: { pod_id: 'p1', message: 'help', location: null } },
      { auth: true },
    );
  });

  it('captures location for an SOS when permission is granted', async () => {
    reqPerm.mockResolvedValue({ granted: true });
    getPos.mockResolvedValue({ coords: { latitude: 1, longitude: 2, accuracy: 5 } });
    const { result } = renderHook(() => useBouncer());
    await act(async () => {
      await result.current.raiseSos('p1', '');
    });
    expect(mockRequest).toHaveBeenCalledWith(
      MobileRaiseSosDocument,
      { input: { pod_id: 'p1', message: null, location: { lat: 1, lng: 2, accuracy: 5 } } },
      { auth: true },
    );
  });

  it('falls back to null location when geolocation throws', async () => {
    reqPerm.mockResolvedValue({ granted: true });
    getPos.mockRejectedValue(new Error('gps off'));
    const { result } = renderHook(() => useBouncer());
    await act(async () => {
      await result.current.raiseSos('p1', 'help');
    });
    expect(mockRequest).toHaveBeenCalledWith(
      MobileRaiseSosDocument,
      { input: { pod_id: 'p1', message: 'help', location: null } },
      { auth: true },
    );
  });

  it('requests a callback', async () => {
    const { result } = renderHook(() => useBouncer());
    await act(async () => {
      await result.current.requestCallback('p1', 'noise');
    });
    expect(mockRequest).toHaveBeenCalledWith(
      MobileRequestCallbackDocument,
      { input: { pod_id: 'p1', reason: 'noise' } },
      { auth: true },
    );
  });

  it('nulls out a blank callback reason and an unknown pod', async () => {
    const { result } = renderHook(() => useBouncer());
    await act(async () => {
      await result.current.requestCallback(null, '   ');
    });
    expect(mockRequest).toHaveBeenCalledWith(
      MobileRequestCallbackDocument,
      { input: { pod_id: null, reason: null } },
      { auth: true },
    );
  });

  it('lists the user’s callback history', async () => {
    mockRequest.mockResolvedValueOnce({ myCallbackRequests: [{ id: 'c1', status: 'CLOSED' }] });
    const { result } = renderHook(() => useBouncer());
    const rows = await result.current.listMyCallbacks();
    expect(rows[0]?.id).toBe('c1');
    expect(mockRequest).toHaveBeenCalledWith(MobileMyCallbacksDocument, undefined, { auth: true });
  });

  it('loads the pending pod for the feedback prompt', async () => {
    mockRequest.mockResolvedValueOnce({ myPendingPodFeedback: { id: 'p9', title: 'Past Pod' } });
    const { result } = renderHook(() => useBouncer());
    const pod = await result.current.getPendingPodFeedback();
    expect(pod?.title).toBe('Past Pod');
    expect(mockRequest).toHaveBeenCalledWith(MobilePendingPodFeedbackDocument, undefined, {
      auth: true,
    });
  });

  it('submits pod feedback, nulling a blank message', async () => {
    const { result } = renderHook(() => useBouncer());
    await act(async () => {
      await result.current.submitPodFeedback('p9', 5, 'HOST', '   ');
    });
    expect(mockRequest).toHaveBeenCalledWith(
      MobileSubmitFeedbackDocument,
      { input: { pod_id: 'p9', rating: 5, category: 'HOST', message: null } },
      { auth: true },
    );
  });
});
