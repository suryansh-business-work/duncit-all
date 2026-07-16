import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { AppNavItem } from '../src/types';
import { NavNode, type ExpandSignal } from '../src/chrome/AppSidebar/nav-items';

function renderNode(props: {
  item: AppNavItem;
  pathname: string;
  searching?: boolean;
  expandAll?: ExpandSignal;
  forceSelected?: boolean;
}) {
  return render(
    <MemoryRouter>
      <NavNode {...props} />
    </MemoryRouter>,
  );
}

const group: AppNavItem = {
  label: 'Sales',
  icon: 'sales',
  children: [
    { label: 'Leads', to: '/sales/leads', icon: 'people' },
    { label: 'Deals', to: '/sales/deals' },
  ],
};

describe('NavNode leaf', () => {
  it('marks a leaf selected when its route matches', () => {
    renderNode({ item: { label: 'Leads', to: '/sales/leads' }, pathname: '/sales/leads' });
    expect(screen.getByRole('link', { name: 'Leads' })).toHaveClass('Mui-selected');
  });

  it('honours an explicit forceSelected override', () => {
    renderNode({ item: { label: 'Leads', to: '/sales/leads' }, pathname: '/sales/leads', forceSelected: false });
    expect(screen.getByRole('link', { name: 'Leads' })).not.toHaveClass('Mui-selected');
  });

  it('renders a routeless leaf (falls back to the "#" target)', () => {
    renderNode({ item: { label: 'Nowhere' }, pathname: '/x' });
    expect(screen.getByRole('link', { name: 'Nowhere' })).toBeInTheDocument();
  });
});

describe('NavNode group', () => {
  it('opens active groups and force-selects the longest-prefix child', () => {
    renderNode({ item: group, pathname: '/sales/leads' });
    expect(screen.getByTestId('ExpandLessIcon')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Leads' })).toHaveClass('Mui-selected');
    expect(screen.getByRole('link', { name: 'Deals' })).not.toHaveClass('Mui-selected');
  });

  it('starts collapsed for an inactive group and toggles open on click', async () => {
    const u = userEvent.setup();
    renderNode({ item: group, pathname: '/other' });
    expect(screen.getByTestId('ExpandMoreIcon')).toBeInTheDocument();
    await u.click(screen.getByText('Sales'));
    expect(screen.getByTestId('ExpandLessIcon')).toBeInTheDocument();
  });

  it('force-expands while searching regardless of open state', () => {
    renderNode({ item: group, pathname: '/other', searching: true });
    expect(screen.getByTestId('ExpandLessIcon')).toBeInTheDocument();
  });

  it('re-syncs open state from the expand-all signal', () => {
    const { rerender } = render(
      <MemoryRouter>
        <NavNode item={group} pathname="/other" expandAll={{ open: true, nonce: 1 }} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('ExpandLessIcon')).toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <NavNode item={group} pathname="/other" expandAll={{ open: false, nonce: 2 }} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('ExpandMoreIcon')).toBeInTheDocument();
  });

  it('leaves child selection to matching when no direct child wins', () => {
    const nested: AppNavItem = {
      label: 'Ops',
      children: [{ label: 'Sub', children: [{ label: 'Deep', to: '/ops/sub/deep' }] }],
    };
    renderNode({ item: nested, pathname: '/ops/sub/deep' });
    expect(screen.getByRole('link', { name: 'Deep' })).toHaveClass('Mui-selected');
  });
});
