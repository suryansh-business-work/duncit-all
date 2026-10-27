import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { setAmbientDateSettings } from '@duncit/app-settings';
import type { DuncitColumn } from '@duncit/table';
import type { LiteAdminUserRow } from '../../../graphql/users';
import { buildUserColumns, userRowId } from '../../../pages/users/columns';
import { makeMe } from '../../fixtures';
import { portalT } from '../../test-utils';

beforeAll(() => setAmbientDateSettings({ dateFormat: 'yyyy-MM-dd', timeZone: 'UTC', timeZoneAware: true }));
afterAll(() => setAmbientDateSettings({}));

const columns = buildUserColumns(portalT, (row) => <span>actions for {row.name}</span>);
const column = (field: string): DuncitColumn<LiteAdminUserRow> => {
  const found = columns.find((c) => c.field === field);
  if (!found) throw new Error(`no column ${field}`);
  return found;
};
const value = (field: string, row: LiteAdminUserRow) => column(field).valueGetter?.(row);

describe('user columns', () => {
  it('keys rows by id and heads the columns in English', () => {
    expect(userRowId(makeMe())).toBe('user-1');
    expect(columns.map((c) => c.headerName)).toEqual(['Name', 'Email', 'Handle', 'Duncit account', 'Admin', 'Blocked', 'Hosted', 'Created', 'Actions']);
  });

  it('prefixes the handle with @', () => {
    expect(value('handle', makeMe({ handle: 'asha' }))).toBe('@asha');
  });

  it('exports each flag in words', () => {
    expect(value('duncit_linked', makeMe({ duncit_linked: true }))).toBe('Linked');
    expect(value('duncit_linked', makeMe({ duncit_linked: false }))).toBe('Lite only');
    expect(value('is_admin', makeMe({ is_admin: true }))).toBe('Admin');
    expect(value('is_admin', makeMe({ is_admin: false }))).toBe('Member');
    expect(value('is_blocked', makeMe({ is_blocked: true }))).toBe('Blocked');
    expect(value('is_blocked', makeMe({ is_blocked: false }))).toBe('OK');
  });

  it('draws a blocked account as an error chip', () => {
    render(<>{column('is_blocked').cellRenderer?.(makeMe({ is_blocked: true }))}</>);
    expect(screen.getByText('Blocked').closest('.MuiChip-root')).toHaveClass('MuiChip-colorError');
  });

  it('draws a linked Duncit account as an info chip and an admin as a primary one', () => {
    render(
      <>
        {column('duncit_linked').cellRenderer?.(makeMe({ duncit_linked: true }))}
        {column('is_admin').cellRenderer?.(makeMe({ is_admin: true }))}
      </>,
    );
    expect(screen.getByText('Linked').closest('.MuiChip-root')).toHaveClass('MuiChip-colorInfo');
    expect(screen.getByText('Admin').closest('.MuiChip-root')).toHaveClass('MuiChip-colorPrimary');
  });

  it('never sorts or filters the computed columns, and hides the hosted count by default', () => {
    expect(column('duncit_linked')).toMatchObject({ sortable: false, filterable: false });
    expect(column('events_hosted')).toMatchObject({ sortable: false, filterable: false, hide: true });
  });

  it('shows the created date and the page-supplied actions', () => {
    expect(value('created_at', makeMe())).toBe('2026-01-10');
    expect(column('created_at').hide).toBe(false);
    render(<>{column('actions').cellRenderer?.(makeMe())}</>);
    expect(screen.getByText('actions for Asha Rao')).toBeInTheDocument();
  });
});
