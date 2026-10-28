import { vi } from 'vitest';

/** Stub for @duncit/user-context. Tests set `userContextControls` before render. */

export const userContextControls: { user: any; loading: boolean; logout: ReturnType<typeof vi.fn> } = {
  user: null,
  loading: false,
  logout: vi.fn(),
};

export function resetUserContext(): void {
  userContextControls.user = null;
  userContextControls.loading = false;
  userContextControls.logout = vi.fn();
}

export const useUserData = () => ({
  user: userContextControls.user,
  loading: userContextControls.loading,
  logout: userContextControls.logout,
});

export const createSessionUserLoader = (_client: unknown) => async () => null;
export const UserProvider = ({ children }: any) => children;
