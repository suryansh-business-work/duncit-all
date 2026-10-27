import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SignInDialog } from '../../../components/auth/SignInDialog';
import { Hero } from '../../../pages/landing/Hero';
import { meFixture, renderWithProviders } from '../../test-utils';

const createPage = { path: '/create', element: <p>Create page</p> };

const renderHero = (signedIn: boolean) =>
  renderWithProviders(
    <>
      <Hero covers={[]} />
      <SignInDialog />
    </>,
    { path: '/', routes: [createPage], me: signedIn ? meFixture() : null, settings: { site_name: 'Lite Events' } },
  );

describe('Hero', () => {
  it('names the site, carries the headline and links to Discover', () => {
    renderHero(false);
    expect(screen.getByText('Lite Events')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Delightful eventsstart here');
    expect(screen.getByRole('link', { name: 'Discover events' })).toHaveAttribute('href', '/discover');
  });

  it('asks a visitor to sign in before creating, and stays put when they close the dialog', async () => {
    const { user, router } = renderHero(false);
    await user.click(screen.getByRole('button', { name: 'Create your first event' }));

    const dialog = await screen.findByRole('dialog', { name: 'Sign in' });
    expect(dialog).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');

    await user.click(screen.getByRole('button', { name: 'Close sign-in' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(router.state.location.pathname).toBe('/');
  });

  it('takes a signed-in reader straight to the create page', async () => {
    const { user, router } = renderHero(true);
    await user.click(screen.getByRole('button', { name: 'Create your first event' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/create'));
    expect(screen.getByText('Create page')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
