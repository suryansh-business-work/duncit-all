import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { PortalModeRow, PortalModeState } from './queries';

const m = vi.hoisted(() => ({
  run: vi.fn(),
  notify: vi.fn(),
  confirmMock: vi.fn(),
  refetchSpy: vi.fn(),
}));
vi.mock('@apollo/client', async (io) => {
  const actual = await io<typeof import('@apollo/client')>();
  return { ...actual, useApolloClient: () => ({}), useMutation: () => [m.run, { loading: false }] as const };
});
vi.mock('@duncit/dialogs', () => ({ notify: m.notify, useConfirm: () => m.confirmMock }));
vi.mock('@duncit/utils', () => ({ parseApiError: (e: unknown) => (e instanceof Error ? e.message : 'err') }));
vi.mock('@duncit/table', () => ({ useApolloTableFetch: () => vi.fn() }));

const row: PortalModeRow = { id: 'p1', key: 'crm', name: 'CRM', mode: 'LIVE' } as PortalModeRow;

vi.mock('./PortalModesTable', () => ({
  default: (p: {
    refetchRef: { current: (() => void) | null };
    busyKey: string | null;
    onChange: (r: PortalModeRow, mode: PortalModeState) => void;
  }) => {
    p.refetchRef.current = m.refetchSpy;
    return (
      <div>
        <span>busy:{p.busyKey ?? 'none'}</span>
        <button type="button" onClick={() => p.onChange(row, 'DEVELOPMENT')}>to-dev</button>
        <button type="button" onClick={() => p.onChange(row, 'MAINTENANCE')}>to-maint</button>
        <button type="button" onClick={() => p.onChange(row, 'LIVE')}>to-live</button>
      </div>
    );
  },
}));

import PortalModesPage from './index';

beforeEach(() => {
  m.run.mockReset();
  m.run.mockResolvedValue({ data: {} });
  m.notify.mockReset();
  m.confirmMock.mockReset();
  m.refetchSpy.mockReset();
});

describe('PortalModesPage', () => {
  it('confirms then applies a development mode change', async () => {
    m.confirmMock.mockResolvedValue(true);
    render(<PortalModesPage />);
    fireEvent.click(screen.getByRole('button', { name: 'to-dev' }));
    await waitFor(() => expect(m.notify).toHaveBeenCalledWith('CRM → development', 'success'));
    expect(m.refetchSpy).toHaveBeenCalled();
  });

  it('applies a Live change without confirmation', async () => {
    render(<PortalModesPage />);
    fireEvent.click(screen.getByRole('button', { name: 'to-live' }));
    await waitFor(() => expect(m.notify).toHaveBeenCalledWith('CRM → live', 'success'));
    expect(m.confirmMock).not.toHaveBeenCalled();
  });

  it('aborts a maintenance change when confirm is declined', async () => {
    m.confirmMock.mockResolvedValue(false);
    render(<PortalModesPage />);
    fireEvent.click(screen.getByRole('button', { name: 'to-maint' }));
    await waitFor(() => expect(m.confirmMock).toHaveBeenCalled());
    expect(m.run).not.toHaveBeenCalled();
  });

  it('notifies on a mutation failure', async () => {
    m.confirmMock.mockResolvedValue(true);
    m.run.mockRejectedValue(new Error('mode boom'));
    render(<PortalModesPage />);
    fireEvent.click(screen.getByRole('button', { name: 'to-maint' }));
    await waitFor(() => expect(m.notify).toHaveBeenCalledWith('mode boom', 'error'));
  });
});
