/**
 * The minimised sidebar.
 *
 * At 72px there is no room for a label, so a group cannot push its children
 * down the rail — a nested tree here would be a column of icons with no way to
 * tell what any of them belongs to. It opens them beside the rail instead, and
 * the tooltip is both the label and what a screen reader announces.
 */
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import { NavRail, RAIL_WIDTH } from '../src/chrome/AppSidebar/NavRail';
import type { AppNavItem } from '../src/types';

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const NAV: AppNavItem[] = [
  { label: 'Dashboard', to: '/', icon: 'dashboard' },
  {
    label: 'Sales',
    icon: 'sales',
    children: [
      { label: 'Leads', to: '/sales/leads', icon: 'people' },
      { label: 'Deals', to: '/sales/deals' },
    ],
  },
  { label: 'Nowhere', icon: 'help' },
];

const rail = (props: { nav?: AppNavItem[]; onNavigate?: () => void } = {}, path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <NavRail nav={props.nav ?? NAV} onNavigate={props.onNavigate} />
    </MemoryRouter>
  );

describe('NavRail', () => {
  it('is one icon per top-level entry, each labelled for a screen reader', () => {
    rail();

    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sales' })).toBeInTheDocument();
    expect(RAIL_WIDTH).toBe(72);
  });

  it('marks the page the reader is on', () => {
    rail({}, '/sales/leads');

    // A group counts as active when the page inside it is the one open.
    expect(screen.getByRole('button', { name: 'Sales' })).toHaveClass('Mui-selected');
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveClass('Mui-selected');
  });

  it('reports a leaf pick to the caller, so a temporary drawer can close', () => {
    const onNavigate = vi.fn();
    rail({ onNavigate });

    fireEvent.click(screen.getByRole('link', { name: 'Dashboard' }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  // A leaf with nowhere to go is still a link rather than a dead icon, and it
  // leaves the reader where they already were.
  it('keeps a leaf with no route on the page it is already on', () => {
    rail({}, '/sales/leads');

    expect(screen.getByRole('link', { name: 'Nowhere' })).toHaveAttribute('href', '/sales/leads');
  });

  it('opens a group beside the rail, named, with its children under it', async () => {
    rail();

    fireEvent.click(screen.getByRole('button', { name: 'Sales' }));
    await settle();

    expect(screen.getByRole('presentation')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Leads' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Deals' })).toBeInTheDocument();
  });

  // Leaving it open over the page it just navigated to is a menu that has to be
  // dismissed twice.
  it('closes the group when a page inside it is picked, and tells the caller', async () => {
    const onNavigate = vi.fn();
    rail({ onNavigate });
    fireEvent.click(screen.getByRole('button', { name: 'Sales' }));
    await settle();

    fireEvent.click(screen.getByRole('link', { name: 'Leads' }));
    await settle();

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('link', { name: 'Leads' })).not.toBeInTheDocument();
  });

  it('closes the group when the reader dismisses it instead', async () => {
    rail();
    fireEvent.click(screen.getByRole('button', { name: 'Sales' }));
    await settle();

    fireEvent.keyDown(screen.getByRole('presentation'), { key: 'Escape' });
    await settle();

    expect(screen.queryByRole('link', { name: 'Leads' })).not.toBeInTheDocument();
  });

  it('opens a group on a surface that passed no navigate callback at all', async () => {
    rail({ onNavigate: undefined });
    fireEvent.click(screen.getByRole('button', { name: 'Sales' }));
    await settle();

    fireEvent.click(screen.getByRole('link', { name: 'Deals' }));
    await settle();

    expect(screen.queryByRole('link', { name: 'Deals' })).not.toBeInTheDocument();
  });

  it('renders an empty rail without a group popover to open', () => {
    const { container } = rail({ nav: [] });

    expect(container.querySelectorAll('a')).toHaveLength(0);
    expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
  });
});
