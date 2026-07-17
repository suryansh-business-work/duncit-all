import { describe, expect, it } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { Route } from 'react-router-dom';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../../src/pages/LoginPage';
import { appConfig } from '../../src/config/app-config';
import { getToken } from '../../src/lib/session';
import { brandingMock, loginMock } from '../mocks';
import { renderWithProviders } from '../testkit';

const ROLE = appConfig.requiredRoles[0];

// Every login render mounts the real shared PortalLoginPage, whose `useBranding`
// hook fires the AppBranding query — so a branding mock always leads the list.
const renderLogin = (mocks: MockedResponse[] = [], initialEntries: string[] = ['/login']) =>
  renderWithProviders(<></>, {
    mocks: [brandingMock(), ...mocks],
    initialEntries,
    routes: (
      <>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>HOME</div>} />
        <Route path="/profile" element={<div>PROFILE HOME</div>} />
      </>
    ),
  });

const submitLogin = () => {
  fireEvent.change(screen.getByPlaceholderText('e-mail address'), { target: { value: 'manager@duncit.com' } });
  fireEvent.change(screen.getByPlaceholderText('password'), { target: { value: 'secret123' } });
  fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
};

describe('LoginPage', () => {
  it('renders the login form', async () => {
    renderLogin();
    expect(await screen.findByRole('heading', { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e-mail address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('password')).toBeInTheDocument();
  });

  it('warns when redirected after an access denial', async () => {
    renderLogin([], ['/login?denied=1']);
    expect(await screen.findByText(/do not have access/i)).toBeInTheDocument();
  });

  it('logs in and navigates to the default route', async () => {
    renderLogin([loginMock({ token: 'tok', roles: [ROLE] })]);
    await screen.findByRole('heading', { name: /log in/i });
    submitLogin();
    await waitFor(() => expect(screen.getByText('HOME')).toBeInTheDocument());
    expect(getToken()).toBe('tok');
  });

  it('honours a safe redirect query param', async () => {
    renderLogin([loginMock({ token: 'tok', roles: [ROLE] })], ['/login?redirect=%2Fprofile']);
    await screen.findByRole('heading', { name: /log in/i });
    submitLogin();
    await waitFor(() => expect(screen.getByText('PROFILE HOME')).toBeInTheDocument());
  });

  it('shows an access-denied error for an unauthorised role', async () => {
    renderLogin([loginMock({ token: 'tok', roles: ['SOMETHING_ELSE'] })]);
    await screen.findByRole('heading', { name: /log in/i });
    submitLogin();
    await waitFor(() => expect(screen.getByText(/do not have access/i)).toBeInTheDocument());
  });

  it('shows an error when the server returns no token', async () => {
    renderLogin([loginMock({ token: '' })]);
    await screen.findByRole('heading', { name: /log in/i });
    submitLogin();
    await waitFor(() => expect(screen.getByText(/login failed/i)).toBeInTheDocument());
  });
});
