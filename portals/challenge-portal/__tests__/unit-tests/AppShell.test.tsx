import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const navigateSpy = vi.hoisted(() => vi.fn());
const clearTokenSpy = vi.hoisted(() => vi.fn());
const hasAppAccessSpy = vi.hoisted(() => vi.fn());
const useUserDataMock = vi.hoisted(() => vi.fn());
const shellProps = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }));

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigateSpy,
}));
vi.mock('@duncit/user-context', () => ({ useUserData: useUserDataMock }));
vi.mock('../../src/lib/session', () => ({
  clearToken: clearTokenSpy,
  hasAppAccess: hasAppAccessSpy,
}));
vi.mock('@duncit/shell', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/shell')>()),
  AppShell: (props: Record<string, unknown>) => {
    shellProps.current = props;
    return (
      <div>
        <span data-testid="has-access">{String(props.hasAccess)}</span>
        <button type="button" onClick={props.onLogout as () => void}>
          logout
        </button>
        {props.children as React.ReactNode}
      </div>
    );
  },
}));

import AppShell from '../../src/components/AppShell';

describe('AppShell adapter', () => {
  beforeEach(() => {
    navigateSpy.mockReset();
    clearTokenSpy.mockReset();
    hasAppAccessSpy.mockReset();
    useUserDataMock.mockReset();
  });

  it('passes computed access + wires onDenied to clearToken when a user is present', () => {
    hasAppAccessSpy.mockReturnValue(true);
    useUserDataMock.mockReturnValue({
      user: { roles: ['CHALLENGE_MANAGER'] },
      loading: false,
      logout: vi.fn(),
    });

    render(
      <AppShell>
        <div>child-content</div>
      </AppShell>,
    );

    expect(screen.getByText('child-content')).toBeInTheDocument();
    expect(screen.getByTestId('has-access')).toHaveTextContent('true');
    expect(hasAppAccessSpy).toHaveBeenCalledWith(['CHALLENGE_MANAGER']);
    expect(shellProps.current?.onDenied).toBe(clearTokenSpy);
  });

  it('logout clears the token, calls context logout and navigates to /login', () => {
    const ctxLogout = vi.fn();
    hasAppAccessSpy.mockReturnValue(false);
    useUserDataMock.mockReturnValue({ user: { roles: [] }, loading: false, logout: ctxLogout });

    render(<AppShell>x</AppShell>);
    fireEvent.click(screen.getByText('logout'));

    expect(clearTokenSpy).toHaveBeenCalledTimes(1);
    expect(ctxLogout).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('leaves access undefined when there is no user', () => {
    useUserDataMock.mockReturnValue({ user: null, loading: true, logout: vi.fn() });

    render(<AppShell>x</AppShell>);

    expect(screen.getByTestId('has-access')).toHaveTextContent('undefined');
    expect(hasAppAccessSpy).not.toHaveBeenCalled();
  });
});
