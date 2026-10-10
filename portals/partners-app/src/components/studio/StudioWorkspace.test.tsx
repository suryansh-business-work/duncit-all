import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { PUBLIC_FEATURE_FLAGS } from '@duncit/app-settings';
import { STUDIO_OPTION_LIST } from '@duncit/utils';
import { partnerUser, renderWithProviders } from '../../__tests__/render';
import StudioWorkspace from './StudioWorkspace';
import { STUDIO_MENU_COLLAPSED_KEY } from './studio-menu-state';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const flagsMock = (flags: Record<string, boolean>): MockedResponse => ({
  request: { query: PUBLIC_FEATURE_FLAGS, variables: {} },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      publicFeatureFlags: Object.entries(flags).map(([key, enabled]) => ({ __typename: 'PublicFeatureFlag', key, enabled })),
    },
  },
});

const page = <p data-testid="page">The open page</p>;

const open = (route: string, roles: string[], flags: Record<string, boolean> = { is_product_visible: true }) =>
  renderWithProviders(<StudioWorkspace>{page}</StudioWorkspace>, {
    mocks: [flagsMock(flags)],
    route,
    user: partnerUser({ roles: ['USER', ...roles] }),
  });

const menuLinks = (menu: HTMLElement) => within(within(menu).getByRole('list')).getAllByRole('link');

describe('StudioWorkspace', () => {
  it('keeps the studio menu beside the open page, with that page marked as the current one', async () => {
    open('/host/nearby-venues', ['HOST']);

    const menu = await screen.findByRole('navigation', { name: 'Host Options' });
    const expected = STUDIO_OPTION_LIST.HOST.filter((option) => !option.autoPods);
    expect(menuLinks(menu).map((link) => link.getAttribute('href'))).toEqual(expected.map((option) => option.portal));
    expect(within(menu).getByRole('link', { current: 'page' }).getAttribute('href')).toBe('/host/nearby-venues');
    // The page is still there, untouched, next to the menu.
    expect(screen.getByTestId('page').textContent).toBe('The open page');
    // The heading leads back to the full Options page.
    expect(within(menu).getByTestId('studio-menu-title').getAttribute('href')).toBe('/host/options');
  });

  it('minimises on request, remembers it, and expands again', async () => {
    open('/host/dashboard', ['HOST']);
    const menu = await screen.findByTestId('studio-menu');
    expect(menu.dataset.collapsed).toBe('false');

    fireEvent.click(within(menu).getByRole('button', { name: 'Minimise the menu' }));

    expect(menu.dataset.collapsed).toBe('true');
    expect(localStorage.getItem(STUDIO_MENU_COLLAPSED_KEY)).toBe('1');
    const expand = within(menu).getByRole('button', { name: 'Expand the menu' });
    expect(expand.getAttribute('aria-expanded')).toBe('false');
    // Minimised, the heading names the page that is open — and every entry keeps its name.
    expect(within(menu).getByTestId('studio-menu-title').textContent).toBe('Dashboard');
    expect(within(menu).getByTestId('studio-menu-item-pods').getAttribute('aria-label')).toBe('Your Pods');

    fireEvent.click(expand);
    expect(menu.dataset.collapsed).toBe('false');
    expect(localStorage.getItem(STUDIO_MENU_COLLAPSED_KEY)).toBe('0');
  });

  it('opens minimised for a partner who left it that way', async () => {
    localStorage.setItem(STUDIO_MENU_COLLAPSED_KEY, '1');
    open('/host/dashboard', ['HOST']);
    expect((await screen.findByTestId('studio-menu')).dataset.collapsed).toBe('true');
  });

  it('follows the studio of the page when the partner holds several', async () => {
    open('/ecomm-brand/warehouses', ['HOST', 'ECOMM_MANAGER']);
    const menu = await screen.findByRole('navigation', { name: 'Brand Options' });
    expect(within(menu).getByRole('link', { current: 'page' }).getAttribute('href')).toBe('/ecomm-brand/warehouses');
  });

  it('shows the page alone on the Options page and on pages outside the studio', async () => {
    const { unmount } = open('/host/options', ['HOST']);
    expect(await screen.findByTestId('page')).toBeTruthy();
    expect(screen.queryByTestId('studio-menu')).toBeNull();
    unmount();

    open('/earn', ['HOST']);
    expect(await screen.findByTestId('page')).toBeTruthy();
    expect(screen.queryByTestId('studio-menu')).toBeNull();
  });

  it('shows the page alone to somebody who holds no studio', async () => {
    open('/wallet', []);
    expect(await screen.findByTestId('page')).toBeTruthy();
    expect(screen.queryByTestId('studio-menu')).toBeNull();
  });
});
