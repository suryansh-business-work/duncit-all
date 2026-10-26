import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { fallbackT } from '@duncit/shell';
import type { DuncitColumn } from '@duncit/table';
import { buildConnectionColumns } from '../../../src/pages/connections/connectionColumns';
import type { ConnectionRow } from '../../../src/pages/connections/queries';
import { connection } from '../../mocks/fixtures';

const build = (manager: boolean, onRevoke = vi.fn()) =>
  buildConnectionColumns({
    t: fallbackT,
    formatDateTime: (date) => `at ${date.toISOString()}`,
    manager,
    connectorLabel: (resource) => (resource.endsWith('/pods/mcp') ? 'Pods console' : resource),
    onRevoke,
  });
const column = (columns: DuncitColumn<ConnectionRow>[], field: string) => {
  const found = columns.find((entry) => entry.field === field);
  if (!found) throw new Error(`no column ${field}`);
  return found;
};

describe('buildConnectionColumns', () => {
  it('gives managers a Person column and no one else', () => {
    expect(build(true).map((entry) => entry.field)).toContain('user_email');
    expect(build(false).map((entry) => entry.field)).not.toContain('user_email');
  });

  it('reads access, connector, status and dates in words', () => {
    const columns = build(true);
    const row = connection();
    expect(column(columns, 'scopes').valueGetter?.(row)).toBe('Read & write');
    expect(column(columns, 'scopes').valueGetter?.(connection({ scopes: ['mcp:read'] }))).toBe('Read only');
    expect(column(columns, 'resource').valueGetter?.(row)).toBe('Pods console');
    expect(column(columns, 'status').valueGetter?.(row)).toBe('Active');
    expect(column(columns, 'created_at').valueGetter?.(row)).toBe('at 2026-10-20T08:00:00.000Z');
    expect(column(columns, 'last_used_at').valueGetter?.(connection({ last_used_at: null }))).toBe('—');
    expect(column(columns, 'last_ip').valueGetter?.(connection({ last_ip: null }))).toBe('—');
    expect(column(columns, 'user_email').valueGetter?.(connection({ user_email: null }))).toBe('Unknown');
  });

  it('cannot sort or filter what the server works out per row', () => {
    const columns = build(false);
    for (const field of ['scopes', 'resource', 'status', 'last_ip']) {
      expect(column(columns, field)).toMatchObject({ sortable: false, filterable: false });
    }
  });

  it('revokes an active connection from its row, naming the app', () => {
    const onRevoke = vi.fn();
    const columns = build(false, onRevoke);
    const row = connection();
    render(<>{column(columns, 'actions').cellRenderer?.(row)}</>);
    fireEvent.click(screen.getByRole('button', { name: 'Revoke Claude' }));
    expect(onRevoke).toHaveBeenCalledWith(row);
  });

  it('will not revoke a connection that has already ended', () => {
    const columns = build(false);
    render(<>{column(columns, 'actions').cellRenderer?.(connection({ status: 'REVOKED' }))}</>);
    expect(screen.getByRole('button', { name: 'This connection has already ended' })).toBeDisabled();
  });

  it('draws the status as a chip', () => {
    const columns = build(false);
    render(<>{column(columns, 'status').cellRenderer?.(connection({ status: 'EXPIRED' }))}</>);
    expect(screen.getByText('Expired')).toBeInTheDocument();
  });
});
