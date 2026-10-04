import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  MobileUserInfoDocument,
  MobileAccountHealthDocument,
  MobileUpdateProfileDocument,
  MobileUpdateProfileVisibilityDocument,
} from '@/graphql/account';
import { MobileSetUsernameDocument } from '@/graphql/username';
import { graphqlRequest } from '@/services/graphql.client';
import { useAccount } from '@/hooks/useAccount';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRefetchMe = jest.fn();
// The profile record is the user info already held in the `me` store; the hook
// selects from it and asks the store to refetch after every update.
let mockMeState: {
  data: { me: Record<string, unknown> | null } | undefined;
  isLoading: boolean;
  error: unknown;
  refetch: jest.Mock;
};
jest.mock('@/stores/me.store', () => {
  const useMeStore = (selector: (state: typeof mockMeState) => unknown) => selector(mockMeState);
  useMeStore.getState = () => mockMeState;
  return { useMeStore };
});

const mockRequest = graphqlRequest as jest.Mock;

const account = { me: { user_id: 'u1', first_name: 'Riya', roles: ['USER'] } };
const health = {
  myAccountHealth: { base_score: 100, total_score: 100, band: 'GREEN', adjustments: [] },
};

function routeRequest(doc: unknown) {
  if (doc === MobileUpdateProfileDocument)
    return Promise.resolve({ updateMyProfile: { user_id: 'u1' } });
  if (doc === MobileAccountHealthDocument) return Promise.resolve(health);
  if (doc === MobileUserInfoDocument) return Promise.resolve(account);
  return Promise.resolve({});
}

beforeEach(() => {
  mockRequest.mockReset().mockImplementation(routeRequest);
  mockRefetchMe.mockReset();
  mockMeState = { data: account, isLoading: false, error: undefined, refetch: mockRefetchMe };
});

describe('useAccount', () => {
  it('loads the account record and health', async () => {
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.me?.first_name).toBe('Riya');
    expect(result.current.health?.band).toBe('GREEN');
  });

  it('reads the profile from the me store instead of asking for it again', async () => {
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockRequest).toHaveBeenCalledWith(MobileAccountHealthDocument, undefined, {
      auth: true,
    });
    expect(mockRequest).not.toHaveBeenCalledWith(MobileUserInfoDocument, undefined, {
      auth: true,
    });
  });

  it('captures a health load error', async () => {
    const boom = new Error('boom');
    mockRequest.mockReset().mockRejectedValue(boom);
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe(boom);
    expect(result.current.health).toBeNull();
  });

  it('surfaces the me store error ahead of the health result', async () => {
    const storeError = new Error('me failed');
    mockMeState = { data: undefined, isLoading: false, error: storeError, refetch: mockRefetchMe };
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe(storeError);
    expect(result.current.me).toBeNull();
  });

  it('stays loading while the me store is still fetching with nothing cached', async () => {
    mockMeState = { data: undefined, isLoading: true, error: undefined, refetch: mockRefetchMe };
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.health?.band).toBe('GREEN'));
    expect(result.current.isLoading).toBe(true);
  });

  it('coalesces a missing account record and health to null', async () => {
    mockMeState = { ...mockMeState, data: { me: null } };
    mockRequest.mockReset().mockImplementation((doc: unknown) => {
      if (doc === MobileAccountHealthDocument) return Promise.resolve({ myAccountHealth: null });
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

  it('refresh reloads the account health and the me store', async () => {
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    mockRequest.mockClear();
    await act(async () => {
      await result.current.refresh();
    });
    expect(mockRequest).toHaveBeenCalledWith(MobileAccountHealthDocument, undefined, {
      auth: true,
    });
    expect(mockRefetchMe).toHaveBeenCalledTimes(1);
  });

  it('setUsername renames the handle through its own mutation, then refreshes', async () => {
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.setUsername('riya.r');
    });
    expect(mockRequest).toHaveBeenCalledWith(
      MobileSetUsernameDocument,
      { username: 'riya.r' },
      { auth: true },
    );
    expect(mockRefetchMe).toHaveBeenCalledTimes(1);
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
