import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter } from 'react-router';
import { INTEL_BOOTSTRAP, INTEL_SESSION_START } from '../../src/graphql/chat';
import { bootstrap } from '../testkit';

const socket = vi.hoisted(() => ({ handlers: new Map<string, (f: unknown) => void>(), disconnect: vi.fn(), io: vi.fn() }));
vi.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => {
    socket.io(...args);
    return { on: (event: string, fn: (f: unknown) => void) => socket.handlers.set(event, fn), disconnect: socket.disconnect };
  },
}));
vi.mock('@duncit/shell', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  PortalAppShell: ({ nav, children }: { nav: Array<{ label: string }>; children: unknown }) => (
    <div>
      <nav>{nav.map((n) => <span key={n.label}>{n.label}</span>)}</nav>
      {children as never}
    </div>
  ),
}));

beforeEach(() => {
  socket.handlers.clear();
  sessionStorage.clear();
  localStorage.setItem('intel_token', 'tok');
});

const bootMock = (me: object = {}) => ({ request: { query: INTEL_BOOTSTRAP }, result: { data: { intelBootstrap: bootstrap({}, me) } }, maxUsageCount: 3 });
const sessionMock = (spy: () => void) => ({ request: { query: INTEL_SESSION_START }, result: () => {
  spy();
  return { data: { intelSessionStart: true } };
} });

describe('IntelAppShell', () => {
  it('shows admins every page and logs the session once per browser session', async () => {
    const started = vi.fn();
    const { default: IntelAppShell } = await import('../../src/components/IntelAppShell');
    render(
      <MockedProvider mocks={[bootMock(), sessionMock(started)]}>
        <MemoryRouter>
          <IntelAppShell>
            <p>page</p>
          </IntelAppShell>
        </MemoryRouter>
      </MockedProvider>
    );
    expect(await screen.findByText('Sync Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    await waitFor(() => expect(started).toHaveBeenCalledTimes(1));
    expect(sessionStorage.getItem('intel_session_logged')).toBe('1');
  });

  it('leaves Sync and Settings out of an employee’s menu', async () => {
    sessionStorage.setItem('intel_session_logged', '1');
    const { default: IntelAppShell } = await import('../../src/components/IntelAppShell');
    render(
      <MockedProvider mocks={[bootMock({ can_admin: false, level: 'EMPLOYEE' })]}>
        <MemoryRouter>
          <IntelAppShell>
            <p>page</p>
          </IntelAppShell>
        </MemoryRouter>
      </MockedProvider>
    );
    await waitFor(() => expect(screen.queryByText('Sync Dashboard')).not.toBeInTheDocument());
    expect(screen.getByText('Media Manager')).toBeInTheDocument();
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });
});

describe('useIntelEvents', () => {
  it('connects with the person’s token, forwards every frame and disconnects on unmount', async () => {
    const { useIntelEvents } = await import('../../src/lib/useIntelEvents');
    const onDelta = vi.fn();
    const onApproval = vi.fn();
    const { unmount } = renderHook(() => useIntelEvents({ onDelta, onApproval }));
    expect(socket.io).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ auth: { token: 'tok' } }));
    act(() => {
      socket.handlers.get('intel:delta')?.({ message_id: 'm', text: 'x' });
      socket.handlers.get('intel:approval')?.({ approval_id: 'a', status: 'EXECUTED' });
      socket.handlers.get('intel:tool')?.({ message_id: 'm', name: 't', status: 'OK' });
    });
    expect(onDelta).toHaveBeenCalledWith({ message_id: 'm', text: 'x' });
    expect(onApproval).toHaveBeenCalledWith({ approval_id: 'a', status: 'EXECUTED' });
    unmount();
    expect(socket.disconnect).toHaveBeenCalled();
  });

  it('does not connect without a token', async () => {
    localStorage.removeItem('intel_token');
    socket.io.mockClear();
    const { useIntelEvents } = await import('../../src/lib/useIntelEvents');
    renderHook(() => useIntelEvents({}));
    expect(socket.io).not.toHaveBeenCalled();
  });
});

describe('ChatStreamProvider', () => {
  it('turns socket frames into live text and clears it when the turn is done', async () => {
    const { ChatStreamProvider, liveStore } = await import('../../src/components/ChatStream');
    liveStore.reset();
    render(
      <MockedProvider mocks={[]}>
        <ChatStreamProvider>
          <span>child</span>
        </ChatStreamProvider>
      </MockedProvider>
    );
    act(() => socket.handlers.get('intel:delta')?.({ message_id: 'm9', text: 'Hi' }));
    expect(liveStore.get().m9?.text).toBe('Hi');
    act(() => socket.handlers.get('intel:done')?.({ message_id: 'm9', conversation_id: 'c' }));
    expect(liveStore.get().m9).toBeUndefined();
  });
});

describe('App routes', () => {
  it('serves the shared portal login at /login', async () => {
    vi.doMock('../../src/runtime', () => ({ runtime: { LoginPage: () => <p>login</p>, session: { getToken: () => null, clearToken: vi.fn(), hasAppAccess: () => true } }, graphqlUrl: 'http://localhost:2001/graphql' }));
    const { default: App } = await import('../../src/App');
    render(
      <MockedProvider mocks={[]}>
        <MemoryRouter initialEntries={['/login']}>
          <App />
        </MemoryRouter>
      </MockedProvider>
    );
    expect(screen.getByText('login')).toBeInTheDocument();
  });
});
