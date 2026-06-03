import { renderHook } from '@testing-library/react-native';

import { useLogout } from '@/hooks/useLogout';
import { useAuthStore } from '@/stores/auth.store';
import { useMeStore } from '@/stores/me.store';

describe('useLogout', () => {
  it('signs out and resets the cached user', async () => {
    const signOut = jest.fn().mockResolvedValue(undefined);
    const reset = jest.fn();
    useAuthStore.setState({ signOut });
    useMeStore.setState({ reset });

    const { result } = renderHook(() => useLogout());
    await result.current();

    expect(signOut).toHaveBeenCalled();
    expect(reset).toHaveBeenCalled();
  });
});
