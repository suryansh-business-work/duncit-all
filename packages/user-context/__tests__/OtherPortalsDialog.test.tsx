import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OtherPortalsDialog from '../src/login-screen/OtherPortalsDialog';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('OtherPortalsDialog', () => {
  it('renders nothing while closed', () => {
    render(<OtherPortalsDialog open={false} onClose={vi.fn()} />);
    expect(screen.queryByText('Other portals')).not.toBeInTheDocument();
  });

  it('lists every portal when open with no filters applied', () => {
    render(<OtherPortalsDialog open onClose={vi.fn()} />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Finance')).toBeInTheDocument();
    // "Onboarding" is a portal name (not also a category chip label, unlike "Partners").
    expect(screen.getByText('Onboarding')).toBeInTheDocument();
  });

  it('filters by a portal name typed into the search box', async () => {
    render(<OtherPortalsDialog open onClose={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText('Search portals…'), 'admin');
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.queryByText('Finance')).not.toBeInTheDocument();
  });

  it('matches on the description, not just the name', async () => {
    render(<OtherPortalsDialog open onClose={vi.fn()} />);
    // "payouts" appears in Finance's description but in no portal name.
    await userEvent.type(screen.getByPlaceholderText('Search portals…'), 'payouts');
    expect(screen.getByText('Finance')).toBeInTheDocument();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });

  it('shows an empty-state message when nothing matches the query', async () => {
    render(<OtherPortalsDialog open onClose={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText('Search portals…'), 'zzzznope');
    expect(screen.getByText(/No portals match/)).toBeInTheDocument();
  });

  it('filters by category when a category chip is clicked', async () => {
    render(<OtherPortalsDialog open onClose={vi.fn()} />);
    // "Growth" contains CRM/Ads/Marketing/Challenges but not Admin (Operations).
    await userEvent.click(screen.getByRole('button', { name: 'Growth' }));
    expect(screen.getByText('CRM')).toBeInTheDocument();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });

  it('navigates to the resolved portal URL when a card is clicked', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    render(<OtherPortalsDialog open onClose={vi.fn()} />);
    // Admin card — on localhost this resolves to the dev port.
    await userEvent.click(screen.getByText('Admin'));
    expect(open).toHaveBeenCalledWith('http://localhost:2002/', '_self');
  });

  it('calls onClose when the dialog requests to close (Escape)', async () => {
    const onClose = vi.fn();
    render(<OtherPortalsDialog open onClose={onClose} />);
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByPlaceholderText('Search portals…'), '{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
