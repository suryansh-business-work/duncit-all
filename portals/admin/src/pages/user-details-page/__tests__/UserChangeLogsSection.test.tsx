import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { formatDateTime } from '@duncit/app-settings';
import UserChangeLogsSection from '../UserChangeLogsSection';
import { CHANGE_LOG_COLUMNS } from '../UserChangeLogsSection/columns';
import {
  ACTION_COLORS,
  ACTION_OPTIONS,
  ACTOR_COLORS,
  ACTOR_OPTIONS,
  SOURCE_OPTIONS,
  labelOf,
} from '../UserChangeLogsSection/options';
import type { UserChangeLogRow } from '../queries';
import { renderWithProviders } from './testkit';
import { __setTableRows, tableFetchCalls } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));

const USER_ID = 'u-changelog-1';

const makeRow = (over: Partial<UserChangeLogRow> = {}): UserChangeLogRow => ({
  id: 'cl-1',
  field: 'first_name',
  field_label: 'First name',
  old_value: 'Asha',
  new_value: 'Aashi',
  action: 'UPDATE',
  actor_type: 'USER',
  actor_user_id: 'u-42',
  actor_name: 'Asha N',
  source: 'MWEB',
  created_at: '2026-02-01T10:00:00.000Z',
  ...over,
});

const columnBy = (field: string) => {
  const col = CHANGE_LOG_COLUMNS.find((c) => c.field === field);
  if (!col) throw new Error(`column ${field} not found`);
  return col;
};

const valueOf = (field: string, row: UserChangeLogRow) => columnBy(field).valueGetter?.(row);

const renderCell = (field: string, row: UserChangeLogRow) => {
  const col = columnBy(field);
  if (!col.cellRenderer) throw new Error(`column ${field} has no cellRenderer`);
  return render(<>{col.cellRenderer(row)}</>);
};

describe('options.ts — enum lists and lookups', () => {
  it('lists every action, actor and source option', () => {
    expect(ACTION_OPTIONS).toEqual([
      { value: 'CREATE', label: 'Created' },
      { value: 'UPDATE', label: 'Updated' },
      { value: 'DELETE', label: 'Deleted' },
    ]);
    expect(ACTOR_OPTIONS).toEqual([
      { value: 'USER', label: 'User' },
      { value: 'ADMIN', label: 'Admin' },
      { value: 'SYSTEM', label: 'System' },
    ]);
    expect(SOURCE_OPTIONS).toEqual([
      { value: 'NATIVE', label: 'Native' },
      { value: 'MWEB', label: 'mWeb' },
      { value: 'ADMIN_PORTAL', label: 'Admin Portal' },
      { value: 'PORTAL', label: 'Portal' },
      { value: 'SERVER', label: 'System' },
    ]);
  });

  it('labelOf resolves a known value and falls back to the raw value for an unknown one', () => {
    expect(labelOf(ACTION_OPTIONS, 'CREATE')).toBe('Created');
    expect(labelOf(ACTION_OPTIONS, 'UNKNOWN')).toBe('UNKNOWN');
  });

  it('maps every action and actor to its chip color', () => {
    expect(ACTION_COLORS).toEqual({ CREATE: 'success', UPDATE: 'info', DELETE: 'error' });
    expect(ACTOR_COLORS).toEqual({ USER: 'primary', ADMIN: 'warning', SYSTEM: 'default' });
  });
});

describe('columns.ts — CHANGE_LOG_COLUMNS shape', () => {
  it('builds the columns in the order the spec asks for', () => {
    expect(CHANGE_LOG_COLUMNS.map((c) => c.field)).toEqual([
      'field_label',
      'old_value',
      'new_value',
      'action',
      'created_at',
      'updated_at',
      'actor_type',
      'actor_name',
      'source',
    ]);
  });

  it('labels every header', () => {
    expect(Object.fromEntries(CHANGE_LOG_COLUMNS.map((c) => [c.field, c.headerName]))).toEqual({
      field_label: 'Field / Data Name',
      old_value: 'Old Data',
      new_value: 'New Data',
      action: 'Action',
      created_at: 'Created Date',
      updated_at: 'Last Updated Date',
      actor_type: 'Updated By',
      actor_name: 'Updated By Name / ID',
      source: 'Source',
    });
  });

  it('append-only rows are never edited, so only the created-at date sorts/filters', () => {
    expect(columnBy('old_value').sortable).toBe(false);
    expect(columnBy('new_value').sortable).toBe(false);
    expect(columnBy('updated_at').sortable).toBe(false);
    expect(columnBy('created_at').filter).toEqual({ type: 'date' });
    expect(columnBy('updated_at').filter).toBeUndefined();
  });

  it('offers the exact enum options each filterable column accepts', () => {
    expect(columnBy('action').filter).toEqual({ type: 'select', options: ACTION_OPTIONS });
    expect(columnBy('actor_type').filter).toEqual({ type: 'select', options: ACTOR_OPTIONS });
    expect(columnBy('source').filter).toEqual({ type: 'select', options: SOURCE_OPTIONS });
  });
});

describe('columns.ts — value getters', () => {
  it('reads the field label, old/new values and the action/actor/source enums', () => {
    const row = makeRow();
    expect(valueOf('field_label', row)).toBe('First name');
    expect(valueOf('old_value', row)).toBe('Asha');
    expect(valueOf('new_value', row)).toBe('Aashi');
    expect(valueOf('action', row)).toBe('UPDATE');
    expect(valueOf('actor_type', row)).toBe('USER');
    expect(valueOf('source', row)).toBe('MWEB');
  });

  it('formats both date columns through the admin-configured formatter', () => {
    const row = makeRow({ created_at: '2026-03-04T08:00:00.000Z' });
    expect(valueOf('created_at', row)).toBe(formatDateTime(row.created_at));
    // Append-only: "last updated" mirrors "created" for a row that is never touched again.
    expect(valueOf('updated_at', row)).toBe(formatDateTime(row.created_at));
  });

  it('joins the actor name and id, dropping whichever side is missing', () => {
    expect(valueOf('actor_name', makeRow({ actor_name: 'Asha N', actor_user_id: 'u-42' }))).toBe(
      'Asha N — u-42',
    );
    expect(valueOf('actor_name', makeRow({ actor_name: '', actor_user_id: 'u-42' }))).toBe('u-42');
    expect(valueOf('actor_name', makeRow({ actor_name: 'Asha N', actor_user_id: null }))).toBe('Asha N');
    expect(valueOf('actor_name', makeRow({ actor_name: '', actor_user_id: null }))).toBe('');
  });
});

describe('cells.tsx — cell renderers', () => {
  it('stacks the human field label above the raw field path', () => {
    renderCell('field_label', makeRow({ field_label: 'First name', field: 'first_name' }));
    expect(screen.getByText('First name')).toBeInTheDocument();
    expect(screen.getByText('first_name')).toBeInTheDocument();
  });

  it('falls back to the raw field path when there is no human label', () => {
    renderCell('field_label', makeRow({ field_label: '', field: 'raw_field' }));
    expect(screen.getAllByText('raw_field')).toHaveLength(2);
  });

  it('renders a stored value with a tooltip, and an em-dash for an empty one', () => {
    const withValue = renderCell('old_value', makeRow({ old_value: 'Asha' }));
    expect(screen.getByText('Asha')).toBeInTheDocument();
    withValue.unmount();

    const { container } = renderCell('new_value', makeRow({ new_value: '' }));
    expect(container).toHaveTextContent('—');
  });

  it('colors the action chip per action, with the matching label', () => {
    const created = renderCell('action', makeRow({ action: 'CREATE' }));
    expect(created.getByText('Created').closest('.MuiChip-root')).toHaveClass('MuiChip-colorSuccess');
    created.unmount();

    const updated = renderCell('action', makeRow({ action: 'UPDATE' }));
    expect(updated.getByText('Updated').closest('.MuiChip-root')).toHaveClass('MuiChip-colorInfo');
    updated.unmount();

    const deleted = renderCell('action', makeRow({ action: 'DELETE' }));
    expect(deleted.getByText('Deleted').closest('.MuiChip-root')).toHaveClass('MuiChip-colorError');
  });

  it('colors the actor chip per actor type, with the matching label', () => {
    const user = renderCell('actor_type', makeRow({ actor_type: 'USER' }));
    expect(user.getByText('User').closest('.MuiChip-root')).toHaveClass('MuiChip-colorPrimary');
    user.unmount();

    const admin = renderCell('actor_type', makeRow({ actor_type: 'ADMIN' }));
    expect(admin.getByText('Admin').closest('.MuiChip-root')).toHaveClass('MuiChip-colorWarning');
    admin.unmount();

    const system = renderCell('actor_type', makeRow({ actor_type: 'SYSTEM' }));
    expect(system.getByText('System').closest('.MuiChip-root')).toHaveClass('MuiChip-colorDefault');
  });

  it('labels the source chip from the shared option list', () => {
    renderCell('source', makeRow({ source: 'ADMIN_PORTAL' }));
    expect(screen.getByText('Admin Portal')).toBeInTheDocument();
  });

  it('falls back to the raw source value when it is not one of the known five', () => {
    renderCell('source', makeRow({ source: 'UNKNOWN' as UserChangeLogRow['source'] }));
    expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
  });

  it('shows the actor name above the account id, dashing whichever is missing', () => {
    const withActor = renderCell('actor_name', makeRow({ actor_name: 'Asha N', actor_user_id: 'u-42' }));
    expect(screen.getByText('Asha N')).toBeInTheDocument();
    expect(screen.getByText('u-42')).toBeInTheDocument();
    withActor.unmount();

    const { container } = renderCell('actor_name', makeRow({ actor_name: '', actor_user_id: null }));
    expect(within(container).getAllByText('—')).toHaveLength(2);
  });
});

describe('UserChangeLogsSection — table wiring', () => {
  beforeEach(() => {
    __setTableRows([]);
  });

  it('scopes the table fetch to this user and labels the section', async () => {
    renderWithProviders(<UserChangeLogsSection userId={USER_ID} />);

    expect(screen.getByText('User Change Logs')).toBeInTheDocument();
    expect(tableFetchCalls.resultKey).toBe('userChangeLogsTable');
    expect(tableFetchCalls.extraVariables).toEqual({ user_id: USER_ID });
    await waitFor(() => expect(screen.getByTestId('table-empty')).toBeInTheDocument());
  });

  it('shows the empty copy when there is no change history yet', async () => {
    renderWithProviders(<UserChangeLogsSection userId={USER_ID} />);

    await waitFor(() => expect(screen.getByTestId('table-empty')).toBeInTheDocument());
    expect(screen.getByTestId('table-empty')).toHaveTextContent('No profile changes recorded yet.');
  });

  it('never fetches rows when there is no user id yet', async () => {
    __setTableRows([makeRow()]);
    renderWithProviders(<UserChangeLogsSection userId="" />);

    await waitFor(() => expect(screen.getByTestId('table-empty')).toBeInTheDocument());
    expect(screen.queryAllByTestId('table-row')).toHaveLength(0);
  });

  it('renders one row per change, keyed by its own id', async () => {
    __setTableRows([makeRow({ id: 'cl-1' }), makeRow({ id: 'cl-2', field: 'email' })]);
    renderWithProviders(<UserChangeLogsSection userId={USER_ID} />);

    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(2));
  });
});
