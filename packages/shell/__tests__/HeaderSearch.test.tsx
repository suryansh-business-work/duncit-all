import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AppNavItem } from '../src/types';
import { HeaderSearch, deriveSearchItems } from '../src/chrome/HeaderSearch';

const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));

const nav: AppNavItem[] = [
  { label: 'Home', to: '/' },
  { label: 'Sales', children: [{ label: 'Leads', to: '/leads' }] },
  { label: 'GroupOnly', children: [{ label: 'Deals', to: '/deals' }] },
];

describe('deriveSearchItems', () => {
  it('flattens leaves and threads the parent label as section', () => {
    const items = deriveSearchItems(nav);
    expect(items).toEqual([
      { label: 'Home', to: '/', section: undefined },
      { label: 'Leads', to: '/leads', section: 'Sales' },
      { label: 'Deals', to: '/deals', section: 'GroupOnly' },
    ]);
  });
});

describe('HeaderSearch component', () => {
  beforeEach(() => navigate.mockClear());

  it('derives options from nav, navigates on select, and fires onNavigated', async () => {
    const user = userEvent.setup();
    const onNavigated = vi.fn();
    render(<HeaderSearch nav={nav} onNavigated={onNavigated} />);
    const input = screen.getByPlaceholderText('Search');
    await user.click(input);
    await user.type(input, 'Leads');
    await user.click(await screen.findByText('Leads'));
    expect(navigate).toHaveBeenCalledWith('/leads');
    expect(onNavigated).toHaveBeenCalledTimes(1);
  });

  it('renders a section caption when the item has a section, and prefers explicit items', async () => {
    const user = userEvent.setup();
    render(<HeaderSearch items={[{ label: 'Reports', to: '/reports', section: 'Analytics' }]} />);
    const input = screen.getByPlaceholderText('Search');
    await user.click(input);
    await user.type(input, 'Rep');
    expect(await screen.findByText('Analytics · /reports')).toBeInTheDocument();
  });

  it('renders with an empty option set when neither items nor nav are given', () => {
    render(<HeaderSearch />);
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
  });

  it('focuses the field on "/" when not already typing', () => {
    render(<HeaderSearch nav={nav} />);
    const input = screen.getByPlaceholderText('Search');
    const ev = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true });
    document.body.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(input).toHaveFocus();
  });

  it('ignores "/" while typing inside a form field', () => {
    render(<HeaderSearch nav={nav} />);
    const input = screen.getByPlaceholderText('Search') as HTMLInputElement;
    const ev = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true });
    input.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
  });

  it('ignores non-slash keys', () => {
    render(<HeaderSearch nav={nav} />);
    const ev = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
    document.body.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
  });

  it('handles a keydown with no event target', () => {
    render(<HeaderSearch nav={nav} />);
    const input = screen.getByPlaceholderText('Search');
    const ev = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'target', { get: () => null });
    window.dispatchEvent(ev);
    expect(input).toHaveFocus();
  });

  it('does not bind the "/" shortcut when disabled', () => {
    render(<HeaderSearch nav={nav} disableSlashShortcut />);
    const input = screen.getByPlaceholderText('Search');
    const ev = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true });
    document.body.dispatchEvent(ev);
    expect(input).not.toHaveFocus();
  });
});
