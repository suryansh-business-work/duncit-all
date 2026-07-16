import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { makePortalModeRow, setPortalModeMock } from '../mocks/portal-mode.mock';
import type { PortalModeRow, PortalModeState } from '../../src/pages/portal-modes/queries';

const m = vi.hoisted(() => ({ notify: vi.fn(), confirmMock: vi.fn(), refetchSpy: vi.fn() }));
vi.mock('@duncit/dialogs', () => ({ notify: m.notify, useConfirm: () => m.confirmMock }));
vi.mock('@duncit/utils', () => ({ parseApiError: (e: unknown) => (e instanceof Error ? e.message : 'err') }));
vi.mock('@duncit/table', () => ({ useApolloTableFetch: () => vi.fn() }));

const row = makePortalModeRow({ id: 'p1', key: 'crm', name: 'CRM', mode: 'LIVE' });

vi.mock('../../src/pages/portal-modes/PortalModesTable', () => ({
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

import PortalModesPage from '../../src/pages/portal-modes/index';

beforeEach(() => {
  m.notify.mockReset();
  m.confirmMock.mockReset();
  m.refetchSpy.mockReset();
});

describe('PortalModesPage', () => {
  it('confirms then applies a development mode change', async () => {
    m.confirmMock.mockResolvedValue(true);
    renderWithProviders(<PortalModesPage />, { mocks: [setPortalModeMock()] });
    fireEvent.click(screen.getByRole('button', { name: 'to-dev' }));
    await waitFor(() => expect(m.notify).toHaveBeenCalledWith('CRM → development', 'success'));
    expect(m.refetchSpy).toHaveBeenCalled();
  });

  it('applies a Live change without confirmation', async () => {
    renderWithProviders(<PortalModesPage />, { mocks: [setPortalModeMock()] });
    fireEvent.click(screen.getByRole('button', { name: 'to-live' }));
    await waitFor(() => expect(m.notify).toHaveBeenCalledWith('CRM → live', 'success'));
    expect(m.confirmMock).not.toHaveBeenCalled();
  });

  it('aborts a maintenance change when confirm is declined', async () => {
    m.confirmMock.mockResolvedValue(false);
    renderWithProviders(<PortalModesPage />);
    fireEvent.click(screen.getByRole('button', { name: 'to-maint' }));
    await waitFor(() => expect(m.confirmMock).toHaveBeenCalled());
    expect(m.notify).not.toHaveBeenCalled();
    expect(m.refetchSpy).not.toHaveBeenCalled();
  });

  it('notifies on a mutation failure', async () => {
    m.confirmMock.mockResolvedValue(true);
    renderWithProviders(<PortalModesPage />, { mocks: [setPortalModeMock({ error: 'mode boom' })] });
    fireEvent.click(screen.getByRole('button', { name: 'to-maint' }));
    await waitFor(() => expect(m.notify).toHaveBeenCalledWith('mode boom', 'error'));
  });
});
