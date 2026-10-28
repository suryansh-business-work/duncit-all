import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SignInPage } from '../../../pages/signin';
import { meFixture, renderWithProviders } from '../../test-utils';

const elsewhere = [
  { path: '/discover', element: <p>Discover page</p> },
  { path: '/tickets', element: <p>Tickets page</p> },
];

const openSignedIn = (route: string) => renderWithProviders(<SignInPage />, { path: '/signin', route, routes: elsewhere, me: meFixture() });

describe('SignInPage', () => {
  it('shows a visitor the sign-in door as a page', async () => {
    renderWithProviders(<SignInPage />, { path: '/signin', route: '/signin?next=/tickets', routes: elsewhere });
    expect(screen.getByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByTestId('sign-in-panel')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('Sign in | Duncit Lite'));
  });

  it('sends a signed-in reader on to the page they came for', async () => {
    const { router } = openSignedIn('/signin?next=/tickets');
    await waitFor(() => expect(router.state.location.pathname).toBe('/tickets'));
    expect(screen.getByText('Tickets page')).toBeInTheDocument();
  });

  it.each([
    ['no next at all', '/signin'],
    ['an absolute link off the site', '/signin?next=https://evil.example/steal'],
    ['a protocol-relative link off the site', '/signin?next=//evil.example/steal'],
    ['a bare word', '/signin?next=tickets'],
  ])('sends a signed-in reader to Discover for %s', async (_case, route) => {
    const { router } = openSignedIn(route);
    await waitFor(() => expect(router.state.location.pathname).toBe('/discover'));
    expect(screen.getByText('Discover page')).toBeInTheDocument();
  });

  it('replaces the sign-in entry rather than stacking it in history', async () => {
    const { router } = openSignedIn('/signin?next=/tickets');
    await waitFor(() => expect(router.state.location.pathname).toBe('/tickets'));
    expect(router.state.historyAction).toBe('REPLACE');
  });
});
