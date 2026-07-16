import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { EnvEntry } from './queries';
import type { PortalListItem } from './portal-env-queries';

const m = vi.hoisted(() => ({
  queryData: undefined as unknown,
  queryLoading: false,
  run: vi.fn(),
  mutLoading: false,
  notify: vi.fn(),
}));
vi.mock('@apollo/client', async (io) => {
  const actual = await io<typeof import('@apollo/client')>();
  return {
    ...actual,
    useQuery: () => ({ data: m.queryData, loading: m.queryLoading }),
    useMutation: () => [m.run, { loading: m.mutLoading }] as const,
  };
});
vi.mock('@duncit/dialogs', () => ({ notify: m.notify }));
vi.mock('@duncit/utils', () => ({ parseApiError: (e: unknown) => (e instanceof Error ? e.message : 'err') }));

import PortalEnvDrawer from './PortalEnvDrawer';

const portal: PortalListItem = { key: 'crm', name: 'CRM' } as PortalListItem;
const entry = (over: Partial<EnvEntry>): EnvEntry =>
  ({
    id: 'x', name: 'Entry', category: 'EMAIL', description: '',
    is_default: false, is_active: true, assigned_portals: [], config: [],
    secrets: [], last_used_at: null, last_tested_at: null, last_test_ok: null,
    created_at: null, updated_at: null, ...over,
  }) as EnvEntry;

beforeEach(() => {
  m.queryData = { envEntries: [
    entry({ id: 'a', name: 'Assigned SMTP', category: 'EMAIL', assigned_portals: ['crm'], is_default: true }),
    entry({ id: 'b', name: 'Other Key', category: 'IMAGEKIT', is_active: false }),
  ] };
  m.queryLoading = false;
  m.mutLoading = false;
  m.run.mockReset();
  m.run.mockResolvedValue({ data: {} });
  m.notify.mockReset();
});

describe('PortalEnvDrawer', () => {
  it('renders nothing meaningful when no portal is selected', () => {
    render(<PortalEnvDrawer portal={null} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.queryByText('CRM')).not.toBeInTheDocument();
  });

  it('preselects assigned entries, shows default + off badges, and groups by category', () => {
    render(<PortalEnvDrawer portal={portal} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByText('CRM')).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(screen.getByText('Off')).toBeInTheDocument();
    expect(screen.getByText('EMAIL')).toBeInTheDocument();
    expect(screen.getByText('IMAGEKIT')).toBeInTheDocument();
    // one entry preselected -> "Save (1)" and singular guarded by save()
    expect(screen.getByRole('button', { name: 'Save (1)' })).toBeInTheDocument();
  });

  it('filters by search term and skips non-matches', () => {
    render(<PortalEnvDrawer portal={portal} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('Search configs…'), { target: { value: 'imagekit' } });
    expect(screen.getByText('Other Key')).toBeInTheDocument();
    expect(screen.queryByText('Assigned SMTP')).not.toBeInTheDocument();
  });

  it('toggles selection on and off', () => {
    render(<PortalEnvDrawer portal={portal} onClose={vi.fn()} onSaved={vi.fn()} />);
    // deselect the preselected one -> Save (0)
    fireEvent.click(screen.getByText('Assigned SMTP'));
    expect(screen.getByRole('button', { name: 'Save (0)' })).toBeInTheDocument();
    // select two -> plural path in save()
    fireEvent.click(screen.getByText('Assigned SMTP'));
    fireEvent.click(screen.getByText('Other Key'));
    expect(screen.getByRole('button', { name: 'Save (2)' })).toBeInTheDocument();
  });

  it('saves (plural), notifies, calls onSaved + onClose', async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    render(<PortalEnvDrawer portal={portal} onClose={onClose} onSaved={onSaved} />);
    fireEvent.click(screen.getByText('Other Key')); // now 2 selected
    fireEvent.click(screen.getByRole('button', { name: 'Save (2)' }));
    await waitFor(() => expect(m.notify).toHaveBeenCalledWith('Saved 2 entries for CRM', 'success'));
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('saves (singular) message', async () => {
    render(<PortalEnvDrawer portal={portal} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save (1)' }));
    await waitFor(() => expect(m.notify).toHaveBeenCalledWith('Saved 1 entry for CRM', 'success'));
  });

  it('notifies on a save error', async () => {
    m.run.mockRejectedValue(new Error('save boom'));
    render(<PortalEnvDrawer portal={portal} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save (1)' }));
    await waitFor(() => expect(m.notify).toHaveBeenCalledWith('save boom', 'error'));
  });

  it('shows a spinner while loading with no data yet', () => {
    m.queryData = undefined; // exercises data?.envEntries ?? [] fallback
    m.queryLoading = true;
    render(<PortalEnvDrawer portal={portal} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('disables actions while the mutation is in flight', () => {
    m.mutLoading = true;
    render(<PortalEnvDrawer portal={portal} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Saving…/ })).toBeDisabled();
  });
});
