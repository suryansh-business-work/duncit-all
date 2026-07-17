import { describe, expect, it, vi, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../testkit';

const userCtxMock = vi.hoisted(() => ({ value: { user: null as any } }));
vi.mock('@duncit/user-context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/user-context')>()),
  useUserData: () => userCtxMock.value,
}));

// Spread the real shell (keeps ColorModeProvider for renderWithProviders) and
// replace only the shared login page with a probe that surfaces its props.
const loginSpy = vi.hoisted(() => ({ props: null as any }));
vi.mock('@duncit/shell', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/shell')>()),
  PortalLoginPage: (props: any) => {
    loginSpy.props = props;
    return <div>{`portal-login · ${props.appConfig.name}`}</div>;
  },
}));

import WelcomePage from '../../src/pages/WelcomePage';
import LoginPage from '../../src/pages/LoginPage';

afterEach(() => {
  userCtxMock.value = { user: null };
});

describe('WelcomePage', () => {
  it('greets a signed-in user by first name', () => {
    userCtxMock.value = { user: { first_name: 'Sam', full_name: 'Sam Fox' } };
    renderWithProviders(<WelcomePage />);
    expect(screen.getByText('Hi Sam')).toBeInTheDocument();
    expect(screen.getByText('Welcome to Duncit Marketing')).toBeInTheDocument();
  });

  it('falls back to the full name when there is no first name', () => {
    userCtxMock.value = { user: { first_name: '', full_name: 'Sam Fox' } };
    renderWithProviders(<WelcomePage />);
    expect(screen.getByText('Hi Sam Fox')).toBeInTheDocument();
  });

  it('greets "there" when there is no user', () => {
    renderWithProviders(<WelcomePage />);
    expect(screen.getByText('Hi there')).toBeInTheDocument();
  });
});

describe('LoginPage', () => {
  it('renders the shared portal login with this portal config + session', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByText('portal-login · Marketing')).toBeInTheDocument();
    expect(loginSpy.props.session).toHaveProperty('setToken');
    expect(loginSpy.props.session).toHaveProperty('hasAppAccess');
    expect(loginSpy.props.session).toHaveProperty('accessDeniedMessage');
  });
});
