import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { createTranslator } from '@duncit/i18n';
import { PORTAL_FALLBACK } from '../../../shared/i18n';
import { ConsoleNav } from '../../layout/ConsoleNav';
import { DRAWER_WIDTH, NAV_ITEMS } from '../../layout/nav-items';

const { has } = createTranslator({ locale: 'en-IN', fallback: PORTAL_FALLBACK });

describe('NAV_ITEMS', () => {
  it('starts at the dashboard and gives every entry a unique path, test id and real copy', () => {
    expect(NAV_ITEMS[0]?.path).toBe('/');
    expect(new Set(NAV_ITEMS.map((item) => item.path)).size).toBe(NAV_ITEMS.length);
    expect(new Set(NAV_ITEMS.map((item) => item.testId)).size).toBe(NAV_ITEMS.length);
    for (const item of NAV_ITEMS) expect(has(item.labelKey), item.labelKey).toBe(true);
    expect(DRAWER_WIDTH).toBeGreaterThan(0);
  });
});

const renderNav = (route: string, onNavigate = vi.fn()) => {
  render(
    <MemoryRouter initialEntries={[route]}>
      <ConsoleNav onNavigate={onNavigate} />
    </MemoryRouter>,
  );
  return { onNavigate, nav: within(screen.getByRole('navigation', { name: 'Console navigation' })) };
};

describe('ConsoleNav', () => {
  it('links every console page under the console title, in order', () => {
    const { nav } = renderNav('/');
    expect(screen.getByText('Duncit Lite Console')).toBeInTheDocument();
    const links = nav.getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      'Dashboard',
      'Events',
      'Users',
      'Registrations',
      'Calendars',
      'Categories',
      'Cities',
      'Policies',
      'Environment',
      'Email templates',
      'Email logs',
      'Localization',
      'Settings',
    ]);
    expect(links.map((link) => link.getAttribute('href'))).toEqual(NAV_ITEMS.map((item) => item.path));
  });

  it('marks only the current page active; the dashboard only on its own path', () => {
    const { nav } = renderNav('/events');
    expect(nav.getByRole('link', { name: 'Events' })).toHaveClass('active');
    expect(nav.getByRole('link', { name: 'Events' })).toHaveAttribute('aria-current', 'page');
    expect(nav.getByRole('link', { name: 'Dashboard' })).not.toHaveClass('active');
  });

  it('tells the drawer a page was picked so it can close', async () => {
    const user = userEvent.setup();
    const { nav, onNavigate } = renderNav('/');
    await user.click(nav.getByRole('link', { name: 'Settings' }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(nav.getByRole('link', { name: 'Settings' })).toHaveClass('active');
  });
});
