import { renderHook, waitFor } from '@testing-library/react-native';

import { useMe, useRoleLabels } from '@/hooks/useMe';
import { graphqlRequest } from '@/services/graphql.client';
import { useAuthStore } from '@/stores/auth.store';
import { useMeStore } from '@/stores/me.store';
import { useRolesStore } from '@/stores/roles.store';

jest.mock('@/services/graphql.client');
const mockedRequest = jest.mocked(graphqlRequest);

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ token: 'signed-in' });
  useMeStore.setState({ data: undefined, isLoading: false, error: undefined });
  useRolesStore.setState({ data: undefined, isLoading: false, error: undefined });
});

describe('useMe', () => {
  it('fetches the signed-in user with auth', async () => {
    mockedRequest.mockResolvedValue({ me: { user_id: 'u1', full_name: 'Asha' } } as never);
    const { result } = renderHook(() => useMe());
    await waitFor(() => expect(result.current.data?.me?.full_name).toBe('Asha'));
    expect(mockedRequest).toHaveBeenCalledWith(expect.anything(), undefined, { auth: true });
  });

  it('does not ask for the user while signed out', async () => {
    useAuthStore.setState({ token: null });
    mockedRequest.mockResolvedValue({ me: { user_id: 'u1', full_name: 'Asha' } } as never);
    const { result } = renderHook(() => useMe());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockedRequest).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });
});

describe('useRoleLabels', () => {
  it('maps server role names and title-cases unknown keys', async () => {
    mockedRequest.mockResolvedValue({ publicRoles: [{ key: 'HOST', name: 'Host' }] } as never);
    const { result } = renderHook(() => useRoleLabels());
    await waitFor(() => expect(result.current.labelFor('HOST')).toBe('Host'));
    // Unknown key falls back to a title-cased label (empty segments tolerated).
    expect(result.current.labelFor('CITY_ADMIN')).toBe('City Admin');
    expect(result.current.labelFor('A__B')).toBe('A  B');
  });
});
