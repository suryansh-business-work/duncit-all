/**
 * A nav entry's red count (`AppNavItem.badge`): work waiting on the signed-in
 * user, e.g. a venue's unanswered requests. It must show only when something
 * waits, say what waits on hover and to a screen reader without renaming the
 * link, and stay visible on a closed group and on the icon rail.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import type { ReactNode } from 'react';

import { hasNavBadge, navBadgeOf, navBadgeText } from '../src/chrome/AppSidebar/helpers';
import { NavNode } from '../src/chrome/AppSidebar/nav-items';
import { NavRail } from '../src/chrome/AppSidebar/NavRail';
import { NavCountBadge } from '../src/chrome/AppSidebar/NavCountBadge';
import { localizeNav } from '../src/i18n/localize-nav';
import type { AppNavItem } from '../src/types';

const WAITING = '3 waiting for your action';

const requests: AppNavItem = {
  label: 'Workshop & Event Requests',
  to: '/venues/requests',
  icon: 'host-request',
  badge: { count: 3, label: WAITING },
};

const group: AppNavItem = {
  label: 'Requests',
  icon: 'host-request',
  children: [requests, { label: 'Pod Requests', to: '/venues/pod-requests', badge: { count: 2, label: '2 more' } }],
};

const inRouter = (node: ReactNode) => render(<MemoryRouter>{node}</MemoryRouter>);

describe('nav badge helpers', () => {
  it('shows a badge only when something waits', () => {
    expect(hasNavBadge({ count: 1 })).toBe(true);
    expect(hasNavBadge({ count: 0 })).toBe(false);
    expect(hasNavBadge(null)).toBe(false);
    expect(hasNavBadge(undefined)).toBe(false);
  });

  it('caps the visible count at 99+', () => {
    expect(navBadgeText(7)).toBe('7');
    expect(navBadgeText(99)).toBe('99');
    expect(navBadgeText(100)).toBe('99+');
  });

  it('gives a leaf its own badge and a group the sum of its children', () => {
    expect(navBadgeOf(requests)).toEqual({ count: 3, label: WAITING });
    expect(navBadgeOf(group)).toEqual({ count: 5, label: `${WAITING}, 2 more` });
  });

  it('gives nothing when no child waits, or a leaf’s count is zero', () => {
    expect(navBadgeOf({ label: 'Pods', children: [{ label: 'Your pods', to: '/pods' }] })).toBeNull();
    expect(navBadgeOf({ ...requests, badge: { count: 0 } })).toBeNull();
  });

  it('leaves a group label out when no child badge has one', () => {
    expect(navBadgeOf({ label: 'G', children: [{ label: 'a', to: '/a', badge: { count: 4 } }] })).toEqual({ count: 4 });
  });
});

describe('localizeNav and badges', () => {
  it('translates a keyed badge label with its count filled in', () => {
    const t = vi.fn((key: string, options?: { vars?: Record<string, string | number> }) => `${options?.vars?.count} ${key}`);
    const [item] = localizeNav([{ label: 'R', to: '/r', badge: { count: 4, labelKey: 'shell.nav.waitingForYourAction' } }], t);

    expect(item?.badge).toEqual({ count: 4, labelKey: 'shell.nav.waitingForYourAction', label: '4 shell.nav.waitingForYourAction' });
    expect(t).toHaveBeenCalledWith('shell.nav.waitingForYourAction', { vars: { count: 4 } });
  });

  it('leaves an unkeyed badge as it is', () => {
    const [item] = localizeNav([requests], (key: string) => key);
    expect(item?.badge).toEqual(requests.badge);
  });
});

describe('NavCountBadge', () => {
  it('renders nothing for a zero count, and only the children around one', () => {
    const { container } = render(<NavCountBadge badge={{ count: 0 }} />);
    expect(container).toBeEmptyDOMElement();
    render(
      <NavCountBadge badge={null}>
        <span>glyph</span>
      </NavCountBadge>,
    );
    expect(screen.getByText('glyph')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-nav-badge')).toBeNull();
  });

  it('shows the capped number and reads out the label instead', () => {
    render(<NavCountBadge badge={{ count: 120, label: '120 waiting' }} />);
    const badge = screen.getByTestId('shell-nav-badge');
    expect(within(badge).getByText('99+')).toHaveAttribute('aria-hidden', 'true');
    expect(within(badge).getByText('120 waiting')).toBeInTheDocument();
  });
});

describe('a sidebar row with waiting work', () => {
  it('shows the count beside the label and keeps the link’s own name', () => {
    inRouter(<NavNode item={requests} pathname="/" />);
    const link = screen.getByRole('link', { name: /Workshop & Event Requests/ });
    expect(within(link).getByText('3')).toBeInTheDocument();
    expect(link).not.toHaveAttribute('aria-label', WAITING);
  });

  it('says what waits on hover', async () => {
    inRouter(<NavNode item={requests} pathname="/" />);
    await userEvent.hover(screen.getByRole('link', { name: /Workshop & Event Requests/ }));
    expect(await screen.findByRole('tooltip')).toHaveTextContent(WAITING);
  });

  it('shows no count on a row with nothing waiting', () => {
    inRouter(<NavNode item={{ ...requests, badge: { count: 0 } }} pathname="/" />);
    expect(screen.queryByTestId('shell-nav-badge')).toBeNull();
  });

  it('carries its children’s total on a closed group, and hands it back once opened', async () => {
    inRouter(<NavNode item={group} pathname="/" />);
    const header = screen.getByRole('button', { name: /Requests/ });
    expect(within(header).getByText('5')).toBeInTheDocument();

    await userEvent.click(header);

    expect(within(header).queryByTestId('shell-nav-badge')).toBeNull();
    expect(within(screen.getByRole('link', { name: /Workshop & Event Requests/ })).getByText('3')).toBeInTheDocument();
  });
});

describe('the icon rail with waiting work', () => {
  it('puts the count on the glyph and names it in the tooltip', () => {
    inRouter(<NavRail nav={[requests]} />);
    const link = screen.getByRole('link', { name: `Workshop & Event Requests (${WAITING})` });
    expect(within(link).getByText('3')).toBeInTheDocument();
  });

  it('puts a group’s total on its glyph', () => {
    inRouter(<NavRail nav={[group]} />);
    const button = screen.getByRole('button', { name: `Requests (${WAITING}, 2 more)` });
    expect(within(button).getByText('5')).toBeInTheDocument();
  });

  it('keeps the plain name when nothing waits', () => {
    inRouter(<NavRail nav={[{ ...requests, badge: undefined }]} />);
    expect(screen.getByRole('link', { name: 'Workshop & Event Requests' })).toBeInTheDocument();
  });
});
