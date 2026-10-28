import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter, matchRoutes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NOT_FOUND_ROUTE_ID, routes } from '../routes';
import { TestProviders, seedCache } from './test-utils';

/** The route the router lands on for a path. */
const landing = (path: string) => matchRoutes(routes, path)?.at(-1)?.route;

const pages = routes[0]?.children ?? [];

beforeEach(() => {
  vi.stubGlobal('scrollTo', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the route table', () => {
  it('places every fixed page at its own path', () => {
    expect(landing('/home')?.path).toBe('/home');
    expect(landing('/hosting')?.path).toBe('/hosting');
    expect(landing('/discover')?.path).toBe('/discover');
    expect(landing('/category/music')?.path).toBe('/category/:slug');
    expect(landing('/search')?.path).toBe('/search');
    expect(landing('/e/garden-party')?.path).toBe('/e/:slug');
    expect(landing('/e/garden-party/edit')?.path).toBe('/e/:slug/edit');
    expect(landing('/e/garden-party/manage')?.path).toBe('/e/:slug/manage');
    expect(landing('/e/garden-party/scan')?.path).toBe('/e/:slug/scan');
    expect(landing('/create')?.path).toBe('/create');
    expect(landing('/tickets/reg-1')?.path).toBe('/tickets/:id');
    expect(landing('/calendars/new')?.path).toBe('/calendars/new');
    expect(landing('/calendars/cal-1/edit')?.path).toBe('/calendars/:id/edit');
    expect(landing('/cal/run-club')?.path).toBe('/cal/:slug');
    expect(landing('/u/asha')?.path).toBe('/u/:handle');
    expect(landing('/settings')?.path).toBe('/settings');
    expect(landing('/profile')?.path).toBe('/profile');
    expect(landing('/signin')?.path).toBe('/signin');
  });

  it('never lets a city slug shadow a fixed page, while a free single segment is a city', () => {
    expect(landing('/delhi')?.path).toBe('/:citySlug');
    expect(landing('/tickets')?.path).toBe('/tickets');
    expect(landing('/calendars')?.path).toBe('/calendars');
    const paths = pages.map((page) => page.path);
    expect(paths.indexOf('/:citySlug')).toBe(paths.length - 2);
    expect(paths.at(-1)).toBe('*');
  });

  it('sends unknown paths, and the explicit /404, to the not-found page the server answers 404 for', () => {
    expect(landing('/404')?.id).toBe(NOT_FOUND_ROUTE_ID);
    expect(landing('/e/garden-party/unknown')?.id).toBe(`${NOT_FOUND_ROUTE_ID}-any`);
    expect(landing('/a/b/c')?.id).toBe(`${NOT_FOUND_ROUTE_ID}-any`);
  });

  it('lets only the landing page draw edge to edge', () => {
    const bleeds = (handle: unknown): boolean => typeof handle === 'object' && handle !== null && 'bleed' in handle && handle.bleed === true;
    expect(pages.filter((page) => bleeds(page.handle)).map((page) => page.path)).toEqual(['/']);
  });
});

describe('rendering a route', () => {
  it('loads the page code on first visit, inside the shell', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/no/such/page'] });
    render(
      <TestProviders cache={seedCache()}>
        <RouterProvider router={router} />
      </TestProviders>,
    );

    expect(await screen.findByTestId('not-found', undefined, { timeout: 5000 })).toHaveTextContent('We could not find that');
    expect(screen.getByRole('main')).toContainElement(screen.getByTestId('not-found'));
    expect(screen.getByRole('link', { name: 'Go to Discover' })).toHaveAttribute('href', '/discover');
  });
});
