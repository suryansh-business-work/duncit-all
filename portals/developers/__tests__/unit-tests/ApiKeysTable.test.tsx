import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import type { ApiKeyRow } from '../../src/pages/api-keys/queries';

const captured = vi.hoisted(() => ({ props: null as Record<string, any> | null }));

vi.mock('@duncit/table', () => ({
  DuncitTable: (props: Record<string, unknown>) => {
    captured.props = props;
    return <div data-testid="duncit-table" />;
  },
  formatDateCell: (iso: string | null, _fmt: string) => (iso ? `fmt:${iso}` : '—'),
}));

import ApiKeysTable from '../../src/pages/api-keys/ApiKeysTable';

const activeRow: ApiKeyRow = {
  id: 'k1',
  name: 'Staging',
  key_prefix: 'dk_abc',
  scopes: ['venues:read', 'slots:read'],
  last_used_at: '2026-02-02',
  revoked_at: null,
  created_at: '2026-01-01',
};

const revokedRow: ApiKeyRow = { ...activeRow, id: 'k2', revoked_at: '2026-03-03', last_used_at: null };

const onRevoke = vi.fn();

const renderTable = () =>
  render(
    <ApiKeysTable
      fetchRows={vi.fn() as never}
      refetchRef={createRef()}
      toolbarActions={<button type="button">tb</button>}
      onRevoke={onRevoke}
    />,
  );

const cols = () => captured.props?.columns as Array<Record<string, any>>;
const col = (field: string) => cols().find((c) => c.field === field)!;

describe('ApiKeysTable', () => {
  beforeEach(() => {
    captured.props = null;
    onRevoke.mockReset();
  });

  it('wires the shared DuncitTable with the portal config', () => {
    renderTable();
    expect(screen.getByTestId('duncit-table')).toBeInTheDocument();
    expect(captured.props?.tableId).toBe('developers-api-keys');
    expect(captured.props?.emptyText).toMatch(/No API keys yet/);
    expect(captured.props?.defaultSort).toEqual({ field: 'created_at', dir: 'desc' });
    expect(captured.props?.searchPlaceholder).toMatch(/Search name or key prefix/);
    expect((captured.props?.getRowId as (k: ApiKeyRow) => string)(activeRow)).toBe('k1');
    expect(cols()).toHaveLength(8);
  });

  it('renders the monospace key cell and returns the prefix as its value', () => {
    renderTable();
    render(col('key_prefix').cellRenderer(activeRow));
    expect(screen.getByText('dk_abc…')).toBeInTheDocument();
    expect(col('key_prefix').valueGetter(activeRow)).toBe('dk_abc');
  });

  it('renders one chip per scope and joins scopes for the value', () => {
    renderTable();
    render(col('scopes').cellRenderer(activeRow));
    expect(screen.getByText('venues:read')).toBeInTheDocument();
    expect(screen.getByText('slots:read')).toBeInTheDocument();
    expect(col('scopes').valueGetter(activeRow)).toBe('venues:read, slots:read');
  });

  it('formats the date columns and dashes null dates', () => {
    renderTable();
    expect(col('created_at').valueGetter(activeRow)).toBe('fmt:2026-01-01');
    expect(col('last_used_at').valueGetter(activeRow)).toBe('fmt:2026-02-02');
    expect(col('last_used_at').valueGetter(revokedRow)).toBe('—');
    expect(col('revoked_at').valueGetter(activeRow)).toBe('—');
    expect(col('revoked_at').valueGetter(revokedRow)).toBe('fmt:2026-03-03');
  });

  it('shows Active vs Revoked status via value + chip renderer', () => {
    renderTable();
    expect(col('status').valueGetter(activeRow)).toBe('Active');
    expect(col('status').valueGetter(revokedRow)).toBe('Revoked');
    const { rerender } = render(col('status').cellRenderer(activeRow));
    expect(screen.getByText('Active')).toBeInTheDocument();
    rerender(col('status').cellRenderer(revokedRow));
    expect(screen.getByText('Revoked')).toBeInTheDocument();
  });

  it('renders a Revoke action for active keys that calls onRevoke, and nothing for revoked keys', () => {
    renderTable();
    const actions = col('actions');
    const { container } = render(actions.cellRenderer(activeRow));
    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }));
    expect(onRevoke).toHaveBeenCalledWith(activeRow);

    const empty = render(actions.cellRenderer(revokedRow));
    expect(empty.container.querySelector('button')).toBeNull();
    expect(container).toBeTruthy();
  });
});
