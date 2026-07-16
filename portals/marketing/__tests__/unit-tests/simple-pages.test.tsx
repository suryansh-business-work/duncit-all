import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const userCtxMock = vi.hoisted(() => ({ value: { user: null as any } }));
vi.mock('@duncit/user-context', () => ({ useUserData: () => userCtxMock.value }));

const loginSpy = vi.hoisted(() => ({ props: null as any }));
vi.mock('@duncit/shell', () => ({
  parseEnvRoles: (_e: unknown, fallback: string[]) => fallback,
  PortalLoginPage: (props: any) => {
    loginSpy.props = props;
    return <div>portal-login · {props.appConfig.name}</div>;
  },
  createSession: () => ({
    getToken: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn(),
    hasAppAccess: () => true,
    accessDeniedMessage: 'denied',
  }),
  SUPER_ROLE: 'SUPER_ADMIN',
}));

import WelcomePage from '../../src/pages/WelcomePage';
import LoginPage from '../../src/pages/LoginPage';

afterEach(() => {
  userCtxMock.value = { user: null };
});

describe('WelcomePage', () => {
  it('greets a signed-in user by first name', () => {
    userCtxMock.value = { user: { first_name: 'Sam', full_name: 'Sam Fox' } };
    render(<WelcomePage />);
    expect(screen.getByText('Hi Sam')).toBeInTheDocument();
    expect(screen.getByText('Welcome to Duncit Marketing')).toBeInTheDocument();
  });

  it('falls back to the full name when there is no first name', () => {
    userCtxMock.value = { user: { first_name: '', full_name: 'Sam Fox' } };
    render(<WelcomePage />);
    expect(screen.getByText('Hi Sam Fox')).toBeInTheDocument();
  });

  it('greets "there" when there is no user', () => {
    render(<WelcomePage />);
    expect(screen.getByText('Hi there')).toBeInTheDocument();
  });
});

describe('LoginPage', () => {
  it('renders the shared portal login with this portal config + session', () => {
    render(<LoginPage />);
    expect(screen.getByText('portal-login · Marketing')).toBeInTheDocument();
    expect(loginSpy.props.session).toHaveProperty('setToken');
    expect(loginSpy.props.session).toHaveProperty('hasAppAccess');
    expect(loginSpy.props.session).toHaveProperty('accessDeniedMessage');
  });
});
