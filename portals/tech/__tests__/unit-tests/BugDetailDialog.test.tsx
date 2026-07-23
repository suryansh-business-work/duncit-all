import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import BugDetailDialog from '../../src/pages/bugs-page/BugDetailDialog';
import type { BugRow } from '../../src/pages/bugs-page/queries';

const makeBug = (over: Partial<BugRow> = {}): BugRow => ({
  id: 'b1',
  title: 'Boom',
  error_name: 'TypeError',
  message: 'x is undefined',
  page: '/home',
  source: 'mweb',
  app: 'DuncitApp',
  platform: 'web',
  os: 'iOS 17',
  occurrence_count: 5,
  first_seen_at: '2026-01-01T00:00:00.000Z',
  last_seen_at: '2026-01-02T00:00:00.000Z',
  env_counts: { localhost: 1, staging: 2, production: 3 },
  last_url: 'https://mweb.duncit.com/home',
  last_host: 'mweb.duncit.com',
  last_stack: 'TypeError: x\n  at foo',
  status: 'OPEN',
  ...over,
});

const noop = { onClose: vi.fn(), onStatus: vi.fn() };

describe('BugDetailDialog', () => {
  it('renders nothing when there is no bug', () => {
    const { container } = render(<BugDetailDialog bug={null} busy={false} {...noop} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders full detail with a stack trace and fires onStatus / onClose', () => {
    const onStatus = vi.fn();
    const onClose = vi.fn();
    const bug = makeBug();
    render(<BugDetailDialog bug={bug} busy={false} onClose={onClose} onStatus={onStatus} />);

    // populated Field values
    expect(screen.getByText('https://mweb.duncit.com/home')).toBeInTheDocument();
    expect(screen.getByText('mweb.duncit.com')).toBeInTheDocument();
    expect(screen.getByText('web · iOS 17')).toBeInTheDocument();
    // stack section present
    expect(screen.getByText('Latest stack trace')).toBeInTheDocument();
    // env chips
    expect(screen.getByText('Production: 3')).toBeInTheDocument();

    // current-status button is disabled (variant contained branch)
    expect(screen.getByRole('button', { name: 'Mark Open' })).toBeDisabled();

    // a non-current status button fires onStatus
    fireEvent.click(screen.getByRole('button', { name: 'Mark Resolved' }));
    expect(onStatus).toHaveBeenCalledWith(bug, 'RESOLVED');

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows the dash fallback for empty fields and omits the stack section', () => {
    const bug = makeBug({ last_url: null, last_host: null, last_stack: null, os: null });
    render(<BugDetailDialog bug={bug} busy={false} {...noop} />);

    // last_url / last_host render '—' via the Field fallback
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
    // platform without os
    expect(screen.getByText('web')).toBeInTheDocument();
    // no stack section
    expect(screen.queryByText('Latest stack trace')).not.toBeInTheDocument();
  });

  it('disables all status buttons while busy', () => {
    render(<BugDetailDialog bug={makeBug()} busy {...noop} />);
    expect(screen.getByRole('button', { name: 'Mark Open' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mark Resolved' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mark Ignored' })).toBeDisabled();
  });
});
