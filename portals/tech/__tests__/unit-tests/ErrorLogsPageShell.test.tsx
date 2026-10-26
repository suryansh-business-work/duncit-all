import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const m = vi.hoisted(() => ({
  setSelected: vi.fn(),
  selected: null as null | { id: string },
}));

vi.mock('../../src/pages/error-logs-page/useErrorLogPage', () => ({
  useErrorLogPage: () => ({
    selected: m.selected,
    setSelected: m.setSelected,
    fetchRows: vi.fn(),
    isSuperAdmin: false,
    bulk: {
      selectedIds: [],
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
  TelemetryBulkBar: () => null,
  TelemetryDeleteButton: () => null,
}));
vi.mock('../../src/pages/error-logs-page/ErrorLogsTable', () => ({
  default: (p: { onOpen: (row: { id: string }) => void }) => (
    <button type="button" onClick={() => p.onOpen({ id: 'row-1' })}>
      open-row
    </button>
  ),
}));
vi.mock('../../src/pages/error-logs-page/ErrorLogDetailDialog', () => ({
  default: (p: { row: { id: string } | null; onClose: () => void }) =>
    p.row ? (
      <button type="button" onClick={p.onClose}>
        close-detail
      </button>
    ) : null,
}));

import ErrorLogsPage from '../../src/pages/error-logs-page';

beforeEach(() => {
  vi.clearAllMocks();
  m.selected = null;
});

describe('ErrorLogsPage', () => {
  it('opens a row in the detail dialog', () => {
    render(<ErrorLogsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'open-row' }));
    expect(m.setSelected).toHaveBeenCalledWith({ id: 'row-1' });
  });

  it('closes the detail dialog by clearing the selection', () => {
    m.selected = { id: 'row-1' };
    render(<ErrorLogsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'close-detail' }));
    expect(m.setSelected).toHaveBeenCalledWith(null);
  });
});
