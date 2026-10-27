import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Header } from '../../../layout/header';
import { meFixture, renderWithProviders } from '../../test-utils';

afterEach(() => {
  localStorage.clear();
});

const siteNav = () => screen.getByRole('navigation', { name: 'Site navigation' });

describe('Header', () => {
  it('links the mark home, named after the site', () => {
    renderWithProviders(<Header />, { settings: { site_name: 'Lite Events' } });
    expect(screen.getByRole('link', { name: 'Lite Events home' })).toHaveAttribute('href', '/');
  });

  it('shows a visitor only Discover, an Explore link and Sign in', () => {
    renderWithProviders(<Header />);

    const links = within(siteNav()).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/discover']);
    expect(screen.getByRole('link', { name: 'Explore events' })).toHaveAttribute('href', '/discover');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Create event' })).not.toBeInTheDocument();
  });

  it('shows a signed-in reader Events, Calendars and Discover, Create event and the account menu', () => {
    renderWithProviders(<Header />, { me: meFixture() });

    const nav = within(siteNav());
    expect(nav.getByRole('link', { name: 'Events' })).toHaveAttribute('href', '/home');
    expect(nav.getByRole('link', { name: 'Calendars' })).toHaveAttribute('href', '/calendars');
    expect(nav.getByRole('link', { name: 'Discover' })).toHaveAttribute('href', '/discover');
    expect(screen.getByRole('link', { name: 'Create event' })).toHaveAttribute('href', '/create');
    expect(screen.getByRole('button', { name: 'Account menu' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Explore events' })).not.toBeInTheDocument();
  });

  it('marks the place the reader is in as the current page', () => {
    renderWithProviders(<Header />, { me: meFixture(), route: '/e/garden-party/manage' });

    const nav = within(siteNav());
    expect(nav.getByRole('link', { name: 'Events' })).toHaveAttribute('aria-current', 'page');
    expect(nav.getByRole('link', { name: 'Calendars' })).not.toHaveAttribute('aria-current');
    expect(nav.getByRole('link', { name: 'Discover' })).not.toHaveAttribute('aria-current');
  });

  it('follows the reader to Discover on a search', () => {
    renderWithProviders(<Header />, { route: '/search?q=jazz' });
    expect(within(siteNav()).getByRole('link', { name: 'Discover' })).toHaveAttribute('aria-current', 'page');
  });

  it('shows the display toggle and the local clock', () => {
    renderWithProviders(<Header />);
    expect(screen.getByTestId('mode-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('header-clock')).toBeInTheDocument();
  });
});
