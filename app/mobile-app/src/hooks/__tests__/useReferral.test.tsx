import { act, renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { ApplyReferralCodeDocument, MyReferralDocument } from '@/graphql/referral';
import { useReferral } from '@/hooks/useReferral';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const referral = {
  code: 'DUN-AB12CD',
  gift_description: '₹100 off',
  referred_by_name: null,
  referred: [],
};

beforeEach(() => {
  mockRequest.mockReset().mockImplementation((doc: unknown) => {
    if (doc === MyReferralDocument) return Promise.resolve({ myReferral: referral });
    return Promise.resolve({ applyReferralCode: { code: 'DUN-AB12CD', referred_by_name: 'A' } });
  });
});

describe('useReferral', () => {
  it('loads my referral state', async () => {
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.referral?.code).toBe('DUN-AB12CD');
  });

  it('swallows a load failure', async () => {
    mockRequest.mockReset().mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.referral).toBeNull();
  });

  it('applies a code and refetches', async () => {
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    let ok = false;
    await act(async () => {
      ok = await result.current.applyCode('DUN-FRIEND');
    });
    expect(ok).toBe(true);
    expect(mockRequest).toHaveBeenCalledWith(
      ApplyReferralCodeDocument,
      { code: 'DUN-FRIEND' },
      { auth: true },
    );
  });

  it('surfaces Error and non-Error apply failures', async () => {
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    mockRequest.mockImplementationOnce(() => Promise.reject(new Error('Code missing')));
    await act(async () => {
      await result.current.applyCode('X');
    });
    expect(result.current.applyError).toBe('Code missing');
    mockRequest.mockImplementationOnce(() => Promise.reject('nope'));
    await act(async () => {
      await result.current.applyCode('Y');
    });
    expect(result.current.applyError).toBe('Could not apply the code');
  });

  it('ignores a load resolving after unmount', async () => {
    let resolve!: (value: unknown) => void;
    mockRequest.mockReset().mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { unmount } = renderHook(() => useReferral());
    unmount();
    await act(async () => {
      resolve({ myReferral: referral });
    });
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });
});
