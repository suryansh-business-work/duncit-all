import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserProvider, useUserData, type UserDataContextValue } from '../src/UserContext';
import { AUTH_CHANGED_EVENT } from '../src/auth-events';
import { DEFAULT_STORAGE_KEY } from '../src/storage';

let captured: UserDataContextValue | null = null;

function Harness() {
  const ctx = useUserData();
  captured = ctx;
  const { user, loading, error, hasLoadFailure } = ctx;
  const name = user ? (user.full_name ?? '(no-name)') : '(null)';
  return (
    <div>
      <span data-testid="user">{name}</span>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="error">{error ? error.message : '(none)'}</span>
      <span data-testid="failure">{String(hasLoadFailure)}</span>
      <button
        type="button"
        onClick={() => {
          ctx.refetch().catch(() => undefined);
        }}
      >
        refetch
      </button>
      <button type="button" onClick={() => ctx.update({ full_name: 'Patched' })}>
        update-obj
      </button>
      <button
        type="button"
        onClick={() => ctx.update((c) => (c ? { ...c, full_name: 'FnPatched' } : c))}
      >
        update-fn
      </button>
      <button type="button" onClick={() => ctx.setUser({ full_name: 'SetUser' })}>
        set-user
      </button>
      <button type="button" onClick={ctx.logout}>
        logout
      </button>
    </div>
  );
}

type ProviderProps = ComponentProps<typeof UserProvider>;

function renderProvider(props: Partial<ProviderProps>) {
  const merged: ProviderProps = {
    isAuthed: () => false,
    loadUser: vi.fn(async () => null),
    children: <Harness />,
    ...props,
  };
  return render(<UserProvider {...merged} />);
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  captured = null;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('UserProvider — hydration & unauthenticated state', () => {
  it('hydrates the cached user and clears it when refetching while unauthenticated', async () => {
    localStorage.setItem(DEFAULT_STORAGE_KEY, JSON.stringify({ full_name: 'Cached' }));
    const loadUser = vi.fn(async () => ({ full_name: 'Fresh' }));
    renderProvider({ isAuthed: () => false, loadUser });

    expect(screen.getByTestId('user')).toHaveTextContent('Cached');
    expect(loadUser).not.toHaveBeenCalled();
    expect(screen.getByTestId('failure')).toHaveTextContent('false');

    await userEvent.click(screen.getByText('refetch'));
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('(null)'));
    expect(localStorage.getItem(DEFAULT_STORAGE_KEY)).toBeNull();
  });
});

describe('UserProvider — authenticated load', () => {
  it('loads a fresh user on mount when authenticated', async () => {
    const loadUser = vi.fn(async () => ({ full_name: 'Fresh' }));
    renderProvider({ isAuthed: () => true, loadUser });

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('Fresh'));
    expect(loadUser).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('failure')).toHaveTextContent('false');
  });

  it('keeps the cached user when the server returns null', async () => {
    localStorage.setItem(DEFAULT_STORAGE_KEY, JSON.stringify({ full_name: 'Cached' }));
    const loadUser = vi.fn(async () => null);
    renderProvider({ isAuthed: () => true, loadUser });

    await waitFor(() => expect(loadUser).toHaveBeenCalled());
    expect(screen.getByTestId('user')).toHaveTextContent('Cached');
    expect(screen.getByTestId('failure')).toHaveTextContent('false');
  });

  it('records an Error and shows the recovery dialog when the first load fails', async () => {
    const loadUser = vi.fn(async () => {
      throw new Error('boom');
    });
    renderProvider({ isAuthed: () => true, loadUser });

    await waitFor(() => expect(screen.getByTestId('failure')).toHaveTextContent('true'));
    expect(screen.getByTestId('error')).toHaveTextContent('boom');
    expect(screen.getByTestId('user')).toHaveTextContent('(null)');
    expect(screen.getByText('User data not loaded')).toBeInTheDocument();
  });

  it('wraps a non-Error rejection into an Error message', async () => {
    const loadUser = vi.fn(async () => {
      // eslint-disable-next-line no-throw-literal
      throw 'stringfail';
    });
    renderProvider({ isAuthed: () => true, loadUser });

    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('stringfail'));
  });

  it('does not auto-mount the recovery dialog when autoMountFailureDialog is false', async () => {
    const loadUser = vi.fn(async () => {
      throw new Error('boom');
    });
    renderProvider({ isAuthed: () => true, loadUser, autoMountFailureDialog: false });

    await waitFor(() => expect(screen.getByTestId('failure')).toHaveTextContent('true'));
    expect(screen.queryByText('User data not loaded')).not.toBeInTheDocument();
  });
});

describe('UserProvider — update / setUser', () => {
  it('merges an object patch onto an existing user', async () => {
    localStorage.setItem(DEFAULT_STORAGE_KEY, JSON.stringify({ full_name: 'Cached' }));
    renderProvider({ isAuthed: () => false });

    await userEvent.click(screen.getByText('update-obj'));
    expect(screen.getByTestId('user')).toHaveTextContent('Patched');
    expect(JSON.parse(localStorage.getItem(DEFAULT_STORAGE_KEY) ?? '{}').full_name).toBe('Patched');
  });

  it('creates a user from an object patch when there is no current user', async () => {
    renderProvider({ isAuthed: () => false });

    expect(screen.getByTestId('user')).toHaveTextContent('(null)');
    await userEvent.click(screen.getByText('update-obj'));
    expect(screen.getByTestId('user')).toHaveTextContent('Patched');
  });

  it('applies a functional patch', async () => {
    localStorage.setItem(DEFAULT_STORAGE_KEY, JSON.stringify({ full_name: 'Cached' }));
    renderProvider({ isAuthed: () => false });

    await userEvent.click(screen.getByText('update-fn'));
    expect(screen.getByTestId('user')).toHaveTextContent('FnPatched');
  });

  it('replaces the user wholesale via setUser', async () => {
    renderProvider({ isAuthed: () => false });

    await userEvent.click(screen.getByText('set-user'));
    expect(screen.getByTestId('user')).toHaveTextContent('SetUser');
  });
});

describe('UserProvider — logout & reload', () => {
  it('calls the injected onLogout and clears storage', async () => {
    localStorage.setItem(DEFAULT_STORAGE_KEY, JSON.stringify({ full_name: 'Cached' }));
    const onLogout = vi.fn();
    renderProvider({ isAuthed: () => false, onLogout });

    await userEvent.click(screen.getByText('logout'));
    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('user')).toHaveTextContent('(null)');
    expect(localStorage.getItem(DEFAULT_STORAGE_KEY)).toBeNull();
  });

  it('navigates to /login when no onLogout is provided', async () => {
    localStorage.setItem(DEFAULT_STORAGE_KEY, JSON.stringify({ full_name: 'Cached' }));
    renderProvider({ isAuthed: () => false });

    await userEvent.click(screen.getByText('logout'));
    expect(screen.getByTestId('user')).toHaveTextContent('(null)');
  });

  it('reloads the page via window.location.reload', () => {
    renderProvider({ isAuthed: () => false });
    const ctx = captured as UserDataContextValue;
    const reload = vi.fn();
    const original = Object.getOwnPropertyDescriptor(window, 'location');
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: 'http://localhost/', hostname: 'localhost', reload },
    });
    try {
      ctx.reloadApp();
      expect(reload).toHaveBeenCalledTimes(1);
    } finally {
      if (original) Object.defineProperty(window, 'location', original);
    }
  });

  it('is SSR-safe: reloadApp no-ops when window is undefined', () => {
    renderProvider({ isAuthed: () => false });
    const ctx = captured as UserDataContextValue;
    vi.stubGlobal('window', undefined);
    expect(() => ctx.reloadApp()).not.toThrow();
  });
});

describe('UserProvider — useUserData guard', () => {
  it('throws when used outside a provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Harness />)).toThrow('useUserData must be used inside a <UserProvider>');
    spy.mockRestore();
  });
});

describe('UserProvider — auth-changed & visibility refresh', () => {
  it('refetches when the auth-changed event fires', async () => {
    let authed = false;
    const loadUser = vi.fn(async () => ({ full_name: 'AfterLogin' }));
    renderProvider({ isAuthed: () => authed, loadUser });

    expect(loadUser).not.toHaveBeenCalled();
    authed = true;
    act(() => {
      window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
    });
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('AfterLogin'));
    expect(loadUser).toHaveBeenCalledTimes(1);
  });

  it('refetches on visibilitychange when visible, authed and past the throttle', async () => {
    let authed = false;
    const loadUser = vi.fn(async () => ({ full_name: 'Visible' }));
    renderProvider({ isAuthed: () => authed, loadUser });

    authed = true;
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(() => expect(loadUser).toHaveBeenCalledTimes(1));
  });

  it('ignores visibilitychange while the document is hidden', async () => {
    const loadUser = vi.fn(async () => ({ full_name: 'Mounted' }));
    renderProvider({ isAuthed: () => true, loadUser });
    await waitFor(() => expect(loadUser).toHaveBeenCalledTimes(1));

    // Override on the document instance, then delete it so the prototype getter
    // ('visible') is restored for later tests — restoring the prototype descriptor
    // would leave this instance-level override shadowing it.
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    try {
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      expect(loadUser).toHaveBeenCalledTimes(1);
    } finally {
      delete (document as unknown as { visibilityState?: unknown }).visibilityState;
    }
  });

  it('throttles visibilitychange refreshes that happen right after a load', async () => {
    const loadUser = vi.fn(async () => ({ full_name: 'Mounted' }));
    renderProvider({ isAuthed: () => true, loadUser });
    await waitFor(() => expect(loadUser).toHaveBeenCalledTimes(1));

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(loadUser).toHaveBeenCalledTimes(1);
  });

  it('ignores visibilitychange when unauthenticated', () => {
    const loadUser = vi.fn(async () => ({ full_name: 'Never' }));
    renderProvider({ isAuthed: () => false, loadUser });

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(loadUser).not.toHaveBeenCalled();
  });
});
