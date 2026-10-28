import { lazy } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell, type RouteHandle } from '../../layout/AppShell';
import { TestProviders, seedCache } from '../test-utils';

/** A page whose code never finishes loading, to show the shell's wait. */
const NeverLoads = lazy(() => new Promise<never>(() => undefined));

const renderShell = (path: string) => {
  const router = createMemoryRouter(
    [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <p>Landing hero</p>, handle: { bleed: true } satisfies RouteHandle },
          { path: '/discover', element: <p>Discover page</p> },
          { path: '/slow', element: <NeverLoads /> },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  render(
    <TestProviders cache={seedCache()}>
      <RouterProvider router={router} />
    </TestProviders>,
  );
  return { router, user: userEvent.setup() };
};

beforeEach(() => {
  vi.stubGlobal('scrollTo', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('AppShell', () => {
  it('lays out a skip link to the main region, the header, the page and the footer', () => {
    renderShell('/discover');

    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main-content');
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
    expect(main).toHaveAttribute('tabindex', '-1');
    expect(within(main).getByText('Discover page')).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('puts an ordinary page in the animated content column', () => {
    renderShell('/discover');
    expect(screen.getByText('Discover page').closest('[data-lite-animate]')).not.toBeNull();
  });

  it('lets a route that asks to bleed draw edge to edge', () => {
    renderShell('/');
    expect(screen.getByText('Landing hero').closest('[data-lite-animate]')).toBeNull();
  });

  it('announces the wait while a page’s code loads', () => {
    renderShell('/slow');
    expect(within(screen.getByRole('main')).getByRole('status', { name: 'Loading…' })).toBeInTheDocument();
  });

  it('moves keyboard focus to the new page on navigation', async () => {
    const { router } = renderShell('/');
    expect(screen.getByRole('main')).not.toHaveFocus();

    await act(async () => {
      await router.navigate('/discover');
    });

    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('mounts the one sign-in dialog, opened from the header', async () => {
    const { user } = renderShell('/discover');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(within(screen.getByRole('banner')).getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('dialog', { name: 'Sign in' })).toBeInTheDocument();
  });
});
