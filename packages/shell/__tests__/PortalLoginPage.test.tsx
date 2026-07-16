import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom';
import type { ReactNode } from 'react';

vi.mock('@apollo/client', () => ({ useMutation: vi.fn(), useQuery: vi.fn(), gql: (s: string) => s }));
vi.mock('@duncit/utils', () => ({ parseApiError: (e: { message?: string }) => `DEF:${e?.message ?? ''}` }));

const navSpy = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (orig) => {
  const actual = await orig<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navSpy };
});

type LoginProps = {
  config: { brandName: string; contactEmail?: string };
  errorMessage?: string | null;
  loading?: boolean;
  onSubmit: (v: { email: string; password: string }) => void;
  footerSlot?: ReactNode;
};
vi.mock('@duncit/user-context', () => ({
  LoginScreen: ({ config, errorMessage, loading, onSubmit, footerSlot }: LoginProps) => (
    <div>
      <span data-testid="brand">{config.brandName}</span>
      <span data-testid="contact">{config.contactEmail ?? ''}</span>
      <span data-testid="err">{errorMessage}</span>
      <span data-testid="loading">{String(!!loading)}</span>
      <button onClick={() => onSubmit({ email: 'a@b.c', password: 'pw' })}>submit</button>
      <div data-testid="footer">{footerSlot}</div>
    </div>
  ),
}));

import { useMutation, useQuery } from '@apollo/client';
import { DuncitThemeProvider } from '@duncit/theme';
import PortalLoginPage from '../src/portal-login/PortalLoginPage';
import type { PortalLoginPageProps } from '../src/portal-login/portal-login.types';

const mockMutation = vi.mocked(useMutation);
const mockQuery = vi.mocked(useQuery);

const appConfig = {
  key: 'crm',
  name: 'CRM',
  fullName: 'Duncit CRM',
  tagline: 't',
  promoTitle: 'pt',
  promoText: 'px',
  loginImage: '/bg.png',
};

function makeSession(hasAccess: boolean) {
  return {
    setToken: vi.fn(),
    hasAppAccess: vi.fn(() => hasAccess),
    accessDeniedMessage: vi.fn(() => 'no access here'),
  };
}

function renderPage(props: Partial<PortalLoginPageProps>, entry: MemoryRouterProps['initialEntries'] = ['/login']) {
  const merged = { appConfig, session: makeSession(true), ...props } as PortalLoginPageProps;
  return render(
    <DuncitThemeProvider defaultMode="light" storageKey="login_test">
      <MemoryRouter initialEntries={entry}>
        <PortalLoginPage {...merged} />
      </MemoryRouter>
    </DuncitThemeProvider>,
  );
}

beforeEach(() => {
  navSpy.mockClear();
  mockQuery.mockReturnValue({ data: { branding: { portals_logo_url: '/l.png' } }, loading: false } as never);
});

describe('PortalLoginPage', () => {
  it('logs in, writes the token and redirects to the safe ?redirect target', async () => {
    const u = userEvent.setup();
    const login = vi.fn().mockResolvedValue({ data: { login: { token: 'T', user: { roles: ['ADMIN'] } } } });
    mockMutation.mockReturnValue([login, { loading: false }] as never);
    const session = makeSession(true);
    renderPage({ session, footerSlot: <span>footer-here</span> }, ['/login?redirect=%2Fdash']);

    expect(screen.getByTestId('brand')).toHaveTextContent('Duncit CRM');
    expect(screen.getByTestId('footer')).toHaveTextContent('footer-here');
    await u.click(screen.getByText('submit'));

    expect(login).toHaveBeenCalledWith({ variables: { input: { email: 'a@b.c', password: 'pw', portal_key: 'crm' } } });
    expect(session.setToken).toHaveBeenCalledWith('T');
    expect(navSpy).toHaveBeenCalledWith('/dash', { replace: true });
  });

  it('redirects using router state when there is no ?redirect param', async () => {
    const u = userEvent.setup();
    const login = vi.fn().mockResolvedValue({ data: { login: { token: 'T', user: { roles: ['ADMIN'] } } } });
    mockMutation.mockReturnValue([login, { loading: false }] as never);
    renderPage({}, [{ pathname: '/login', search: '', state: { from: { pathname: '/from', search: '?a=1' } } }]);
    await u.click(screen.getByText('submit'));
    expect(navSpy).toHaveBeenCalledWith('/from?a=1', { replace: true });
  });

  it('falls back to defaultRedirect when neither param nor state is present', async () => {
    const u = userEvent.setup();
    const login = vi.fn().mockResolvedValue({ data: { login: { token: 'T', user: { roles: ['ADMIN'] } } } });
    mockMutation.mockReturnValue([login, { loading: false }] as never);
    renderPage({ defaultRedirect: '/hub' });
    await u.click(screen.getByText('submit'));
    expect(navSpy).toHaveBeenCalledWith('/hub', { replace: true });
  });

  it('shows the login-failed message when the response has no token', async () => {
    const u = userEvent.setup();
    const login = vi.fn().mockResolvedValue({ data: { login: { token: null } } });
    mockMutation.mockReturnValue([login, { loading: false }] as never);
    renderPage({});
    await u.click(screen.getByText('submit'));
    expect(await screen.findByTestId('err')).toHaveTextContent('DEF:Login failed. Please try again.');
    expect(navSpy).not.toHaveBeenCalled();
  });

  it('blocks access with the denied message when roles are insufficient', async () => {
    const u = userEvent.setup();
    const login = vi.fn().mockResolvedValue({ data: { login: { token: 'T', user: { roles: ['X'] } } } });
    mockMutation.mockReturnValue([login, { loading: false }] as never);
    const session = makeSession(false);
    renderPage({ session, parseError: (e) => `C:${(e as Error).message}` });
    await u.click(screen.getByText('submit'));
    expect(await screen.findByTestId('err')).toHaveTextContent('C:no access here');
    expect(session.setToken).not.toHaveBeenCalled();
  });

  it('skips the access gate for exempt portals and merges config overrides + extra fields', async () => {
    const u = userEvent.setup();
    const login = vi.fn().mockResolvedValue({ data: { login: { token: 'T', user: { roles: [] } } } });
    mockMutation.mockReturnValue([login, { loading: true }] as never);
    const session = makeSession(false);
    renderPage({
      session,
      skipAccessGate: true,
      extraUserFields: ['onboarding_survey_completed'],
      configOverrides: { contactEmail: 'help@x.test' },
    });
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
    expect(screen.getByTestId('contact')).toHaveTextContent('help@x.test');
    await u.click(screen.getByText('submit'));
    expect(session.setToken).toHaveBeenCalledWith('T');
  });

  it('renders the ?denied=1 banner while the gate is active', () => {
    mockMutation.mockReturnValue([vi.fn(), { loading: false }] as never);
    renderPage({}, ['/login?denied=1']);
    expect(screen.getByTestId('err')).toHaveTextContent('no access here');
  });

  it('suppresses the denied banner for gate-exempt portals', () => {
    mockMutation.mockReturnValue([vi.fn(), { loading: false }] as never);
    renderPage({ skipAccessGate: true }, ['/login?denied=1']);
    expect(screen.getByTestId('err')).toBeEmptyDOMElement();
  });
});
