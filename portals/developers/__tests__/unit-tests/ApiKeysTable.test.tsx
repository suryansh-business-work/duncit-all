import { describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ApiKeysTable from '../../src/pages/api-keys/ApiKeysTable';
import type { ApiKeyRow } from '../../src/pages/api-keys/queries';
import { makeApiKeyRow, makeRevokedApiKeyRow } from '../mocks';

// The table page renders through the shared @duncit/table; the stand-in runs
// every column's valueGetter + cellRenderer against the fetched rows for real.
vi.mock('@duncit/table', () => import('./table-mock'));

const renderTable = (rows: ApiKeyRow[], onRevoke = vi.fn()) => {
  render(
    <ApiKeysTable
      fetchRows={async () => ({ rows, total: rows.length })}
      refetchRef={createRef()}
      toolbarActions={<button type="button">tb</button>}
      onRevoke={onRevoke}
    />,
  );
  return onRevoke;
};

describe('ApiKeysTable', () => {
  it('renders name, monospace key, scope chips, dates and Active/Revoked status', async () => {
    renderTable([makeApiKeyRow(), makeRevokedApiKeyRow()]);

    await waitFor(() => expect(screen.getAllByText('Staging').length).toBe(2));
    // Monospace key cell (cellRenderer) + prefix value (valueGetter) both render.
    expect(screen.getAllByText('dk_abc…').length).toBe(2);
    expect(screen.getAllByText('dk_abc').length).toBe(2);
    // Scope chips + the joined scope value.
    expect(screen.getAllByText('venues:read').length).toBeGreaterThan(0);
    expect(screen.getAllByText('slots:read').length).toBeGreaterThan(0);
    expect(screen.getAllByText('venues:read, slots:read').length).toBe(2);
    // Dates: created (both), last-used (active only), revoked (revoked only).
    expect(screen.getAllByText('fmt:2026-01-01').length).toBe(2);
    expect(screen.getByText('fmt:2026-02-02')).toBeInTheDocument();
    expect(screen.getByText('fmt:2026-03-03')).toBeInTheDocument();
    // Null dates dash out (revoked's last-used + active's revoked-at).
    expect(screen.getAllByText('—').length).toBe(2);
    // Status value + chip, both variants.
    expect(screen.getAllByText('Active').length).toBe(2);
    expect(screen.getAllByText('Revoked').length).toBe(2);
  });

  it('renders a Revoke action only for active keys and forwards the row', async () => {
    const onRevoke = renderTable([makeApiKeyRow(), makeRevokedApiKeyRow()]);
    await waitFor(() => expect(screen.getAllByText('Staging').length).toBe(2));

    // Exactly one Revoke button — the active row; the revoked row renders none.
    const revokeButtons = screen.getAllByRole('button', { name: 'Revoke' });
    expect(revokeButtons).toHaveLength(1);
    fireEvent.click(revokeButtons[0]);
    expect(onRevoke).toHaveBeenCalledWith(expect.objectContaining({ id: 'k1' }));
  });

  it('shows the empty state when there are no keys', async () => {
    renderTable([]);
    await waitFor(() =>
      expect(screen.getByTestId('table-empty')).toHaveTextContent(/No API keys yet/),
    );
  });
});
