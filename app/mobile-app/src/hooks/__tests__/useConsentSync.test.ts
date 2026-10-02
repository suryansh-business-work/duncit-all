import { renderHook, waitFor } from '@testing-library/react-native';
import type { ConsentChoice } from '@duncit/utils';

import { useConsentSync } from '@/hooks/useConsentSync';
import { MyTrackingConsentDocument, SetMyTrackingConsentDocument } from '@/graphql/privacy';
import { graphqlRequest } from '@/services/graphql.client';
import { useConsentStore } from '@/stores/consent.store';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@/services/secure-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));
const mockLogError = jest.fn();
jest.mock('@duncit/logs', () => ({
  logs: { mobileApp: { error: (...args: unknown[]) => mockLogError(...args) } },
}));

const mockRequest = graphqlRequest as jest.Mock;

const consent = (analytics: boolean, marketing: boolean): ConsentChoice => ({
  analytics,
  marketing,
  decided_at: '2026-10-01T00:00:00.000Z',
});

/** Answer the read with `remote`, and echo any write back. */
function serverHas(remote: ConsentChoice | null | undefined) {
  mockRequest.mockImplementation((document: unknown, variables?: { input: ConsentChoice }) => {
    if (document === MyTrackingConsentDocument) {
      return Promise.resolve({ myTrackingConsent: remote });
    }
    return Promise.resolve({ setMyTrackingConsent: { ...variables?.input } });
  });
}

const writes = () => mockRequest.mock.calls.filter(([doc]) => doc === SetMyTrackingConsentDocument);
const reads = () => mockRequest.mock.calls.filter(([doc]) => doc === MyTrackingConsentDocument);

beforeEach(() => {
  jest.clearAllMocks();
  useConsentStore.setState({ hydrated: true, choice: null });
});

describe('useConsentSync', () => {
  it('asks the server nothing while signed out', () => {
    serverHas(consent(true, true));
    renderHook(() => useConsentSync(false));
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('records the device answer when the server has none', async () => {
    useConsentStore.setState({ choice: consent(true, false) });
    serverHas(null);
    renderHook(() => useConsentSync(true));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0]?.[1]).toEqual({
      input: { analytics: true, marketing: false, surface: 'NATIVE' },
    });
    expect(writes()[0]?.[2]).toEqual({ auth: true });
  });

  it('records the device answer when the server disagrees', async () => {
    useConsentStore.setState({ choice: consent(true, true) });
    serverHas(consent(true, false));
    renderHook(() => useConsentSync(true));
    await waitFor(() => expect(writes()).toHaveLength(1));
  });

  it('writes nothing when both sides already agree', async () => {
    useConsentStore.setState({ choice: consent(false, true) });
    serverHas(consent(false, true));
    renderHook(() => useConsentSync(true));
    await waitFor(() => expect(reads()).toHaveLength(1));
    await waitFor(() => expect(writes()).toHaveLength(0));
  });

  it('adopts the answer given on another device', async () => {
    serverHas(consent(true, false));
    renderHook(() => useConsentSync(true));
    await waitFor(() => expect(useConsentStore.getState().choice).toEqual(consent(true, false)));
    expect(writes()).toHaveLength(0);
  });

  it('keeps asking when neither side has answered (a missing field reads as none)', async () => {
    serverHas(undefined);
    renderHook(() => useConsentSync(true));
    await waitFor(() => expect(reads()).toHaveLength(1));
    expect(useConsentStore.getState().choice).toBeNull();
    expect(writes()).toHaveLength(0);
  });

  it('waits for the stored choice to be read before comparing', async () => {
    useConsentStore.setState({ hydrated: false, choice: null });
    serverHas(consent(true, true));
    renderHook(() => useConsentSync(true));
    await waitFor(() => expect(reads()).toHaveLength(1));
    expect(useConsentStore.getState().choice).toBeNull();
  });

  it('logs a failed read and a failed write', async () => {
    mockRequest.mockRejectedValueOnce(new Error('offline'));
    const { rerender } = renderHook(({ authed }: { authed: boolean }) => useConsentSync(authed), {
      initialProps: { authed: true },
    });
    await waitFor(() =>
      expect(mockLogError).toHaveBeenCalledWith('useConsentSync', 'read', expect.anything()),
    );

    useConsentStore.setState({ choice: consent(true, true) });
    mockRequest
      .mockResolvedValueOnce({ myTrackingConsent: null })
      .mockRejectedValueOnce(new Error('offline'));
    rerender({ authed: false });
    rerender({ authed: true });
    await waitFor(() =>
      expect(mockLogError).toHaveBeenCalledWith('useConsentSync', 'record', expect.anything()),
    );
  });
});
