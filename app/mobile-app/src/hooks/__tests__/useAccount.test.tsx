import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  MobileAccountDocument,
  MobileAccountHealthDocument,
  MobileUpdateProfileDocument,
  MobileUpdateProfileVisibilityDocument,
} from '@/graphql/account';
import { graphqlRequest } from '@/services/graphql.client';
import { useAccount } from '@/hooks/useAccount';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRefetchMe = jest.fn();
jest.mock('@/stores/me.store', () => ({
  useMeStore: { getState: () => ({ refetch: mockRefetchMe }) },
}));

const mockRequest = graphqlRequest as jest.Mock;

const account = { me: { user_id: 'u1', first_name: 'Riya', roles: ['USER'] } };
const health = {
  myAccountHealth: { base_score: 100, total_score: 100, band: 'GREEN', adjustments: [] },
};

function routeRequest(doc: unknown) {
  if (doc === MobileUpdateProfileDocument)
    return Promise.resolve({ updateMyProfile: { user_id: 'u1' } });
  if (doc === MobileAccountHealthDocument) return Promise.resolve(health);
  if (doc === MobileAccountDocument) return Promise.resolve(account);
  return Promise.resolve({});
}

beforeEach(() => {
  mockRequest.mockReset().mockImplementation(routeRequest);
  mockRefetchMe.mockReset();
});

describe('useAccount', () => {
  it('loads the account record and health', async () => {
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.me?.first_name).toBe('Riya');
    expect(result.current.health?.band).toBe('GREEN');
  });

  it('captures a load error', async () => {
    mockRequest.mockReset().mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeDefined();
  });

  it('coalesces a missing account record and health to null', async () => {
    mockRequest.mockReset().mockImplementation((doc: unknown) => {
      if (doc === MobileAccountHealthDocument) return Promise.resolve({ myAccountHealth: null });
      if (doc === MobileAccountDocument) return Promise.resolve({ me: null });
      return Promise.resolve({});
    });
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.me).toBeNull();
    expect(result.current.health).toBeNull();
  });

  it('updateProfile saves then refreshes me + account', async () => {
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.updateProfile({ first_name: 'Riya R' });
    });
    expect(mockRequest).toHaveBeenCalledWith(
      MobileUpdateProfileDocument,
      { input: { first_name: 'Riya R' } },
      { auth: true },
    );
    expect(mockRefetchMe).toHaveBeenCalled();
  });

  it('refresh reloads the account record and the me store', async () => {
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.refresh();
    });
    expect(mockRequest).toHaveBeenCalledWith(MobileAccountDocument, undefined, { auth: true });
    expect(mockRefetchMe).toHaveBeenCalled();
  });

  it('updateVisibility toggles privacy and refreshes', async () => {
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.updateVisibility(true);
    });
    expect(mockRequest).toHaveBeenCalledWith(
      MobileUpdateProfileVisibilityDocument,
      { visibility: 'PRIVATE' },
      { auth: true },
    );
    await act(async () => {
      await result.current.updateVisibility(false);
    });
    expect(mockRequest).toHaveBeenCalledWith(
      MobileUpdateProfileVisibilityDocument,
      { visibility: 'PUBLIC' },
      { auth: true },
    );
    expect(mockRefetchMe).toHaveBeenCalled();
  });
});
