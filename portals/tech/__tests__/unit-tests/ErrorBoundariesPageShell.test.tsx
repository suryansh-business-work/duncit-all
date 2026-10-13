import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const m = vi.hoisted(() => ({
  setSelected: vi.fn(),
  selected: null as null | { id: string },
  isSuperAdmin: false,
  deleteProps: null as null | { target: string; canDeleteEverything: boolean },
  barProps: null as null | { target: string; selectedIds: string[] },
}));

vi.mock('../../src/pages/error-logs-page/useErrorLogPage', () => ({
  useErrorLogPage: () => ({
    selected: m.selected,
    setSelected: m.setSelected,
    fetchRows: vi.fn(),
    isSuperAdmin: m.isSuperAdmin,
    bulk: {
      selectedIds: ['a'],
      view: null,
      clear: vi.fn(),
      afterDelete: vi.fn(),
      refetchRef: { current: null },
      selection: {},
      onQueryChange: vi.fn(),
    },
  }),
}));
vi.mock('../../src/components/telemetry-delete', () => ({
  TelemetryBulkBar: (p: { target: string; selectedIds: string[] }) => {
    m.barProps = p;
    return null;
  },
  TelemetryDeleteButton: (p: { target: string; canDeleteEverything: boolean }) => {
    m.deleteProps = p;
    return <span data-testid="delete-button" />;
  },
}));
vi.mock('../../src/pages/error-boundaries-page/ErrorBoundariesTable', () => ({
  default: (p: { onOpen: (row: { id: string }) => void; toolbarActions: ReactNode }) => (
    <div>
      {p.toolbarActions}
      <button type="button" onClick={() => p.onOpen({ id: 'row-1' })}>
        open-row
      </button>
    </div>
  ),
}));
vi.mock('../../src/pages/error-boundaries-page/ErrorBoundaryDetailDialog', () => ({
  default: (p: { row: { id: string } | null; onClose: () => void }) =>
    p.row ? (
      <button type="button" onClick={p.onClose}>
        close-detail
      </button>
    ) : null,
}));

import ErrorBoundariesPage from '../../src/pages/error-boundaries-page';

beforeEach(() => {
  vi.clearAllMocks();
  m.selected = null;
  m.isSuperAdmin = false;
});

describe('ErrorBoundariesPage', () => {
  it('scopes bulk delete to the logs collection and passes the super-admin flag through', () => {
    m.isSuperAdmin = true;
    render(<ErrorBoundariesPage />);
    expect(m.barProps).toMatchObject({ target: 'LOGS', selectedIds: ['a'] });
    expect(m.deleteProps).toEqual(expect.objectContaining({ target: 'LOGS', canDeleteEverything: true }));
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('never offers delete-everything to a non-super-admin', () => {
    render(<ErrorBoundariesPage />);
    expect(m.deleteProps?.canDeleteEverything).toBe(false);
  });

  it('opens a row through the page selection', () => {
    render(<ErrorBoundariesPage />);
    fireEvent.click(screen.getByRole('button', { name: 'open-row' }));
    expect(m.setSelected).toHaveBeenCalledWith({ id: 'row-1' });
  });

  it('closes the detail dialog by clearing the selection', () => {
    m.selected = { id: 'row-1' };
    render(<ErrorBoundariesPage />);
    fireEvent.click(screen.getByRole('button', { name: 'close-detail' }));
    expect(m.setSelected).toHaveBeenCalledWith(null);
  });
});
