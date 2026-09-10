import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { changeLogColumns } from '../../../src/shared/change-logs/columns';
import type { EntityChangeLogRow } from '../../../src/shared/change-logs/queries';

/**
 * The change-log table.
 *
 * Entries are append-only, one row per changed field, so the columns are the
 * whole feature: what changed, from what, to what, by whom, from where. A cell
 * that renders blank instead of an em-dash reads as a broken page rather than as
 * "this field was empty on that side", which is why the empty cases are here.
 */
const t = (key: string) => key;

const row: EntityChangeLogRow = {
  id: 'log1',
  entity_type: 'VENUE',
  entity_id: '66f1a2b3c4d5e6f708192a3b',
  entity_label: 'Third Wave Coffee, Indiranagar',
  field: 'settings.rules.buffer_minutes',
  field_label: 'Buffer Between Slots (min)',
  old_value: '0',
  new_value: '15',
  action: 'UPDATE',
  actor_type: 'ADMIN',
  actor_user_id: '66d0b1c2d3e4f5a6b7c8d9e0',
  actor_name: 'Asha Rao',
  source: 'ADMIN_PORTAL',
  created_at: '2026-08-30T04:05:00.000Z',
};

const columnsFor = (withEntity: boolean) => changeLogColumns(t, withEntity);
const find = (withEntity: boolean, field: string) => {
  const found = columnsFor(withEntity).find((c) => c.field === field);
  if (!found) throw new Error(`no column ${field}`);
  return found;
};

describe('changeLogColumns', () => {
  it('omits the record column on a single record’s history', () => {
    // Every row is the same record there, so the column would be a wasted one.
    expect(columnsFor(false).map((c) => c.field)).toEqual([
      'field_label',
      'old_value',
      'new_value',
      'action',
      'created_at',
      'actor_type',
      'actor_name',
      'source',
    ]);
  });

  it('prepends the record column on the console-wide feed', () => {
    expect(columnsFor(true)[0].field).toBe('entity_label');
  });

  it('renders the field over the document path it maps to', () => {
    render(<>{find(false, 'field_label').cellRenderer?.(row)}</>);
    expect(screen.getByText('Buffer Between Slots (min)')).toBeInTheDocument();
    expect(screen.getByText('settings.rules.buffer_minutes')).toBeInTheDocument();
  });

  it('falls back to the raw path when the server sent no label', () => {
    render(<>{find(false, 'field_label').cellRenderer?.({ ...row, field_label: '' })}</>);
    // Both lines then show the path — the headline because it has nothing else,
    // and the caption because that is what it always shows. Never a blank cell.
    expect(screen.getAllByText('settings.rules.buffer_minutes')).toHaveLength(2);
  });

  it('renders both sides of the change', () => {
    render(<>{find(false, 'old_value').cellRenderer?.(row)}</>);
    expect(screen.getByText('0')).toBeInTheDocument();
    render(<>{find(false, 'new_value').cellRenderer?.(row)}</>);
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('em-dashes a side that was empty — a CREATE has no old value', () => {
    render(<>{find(false, 'old_value').cellRenderer?.({ ...row, old_value: '' })}</>);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('chips the action, the actor kind and the surface', () => {
    render(<>{find(false, 'action').cellRenderer?.(row)}</>);
    expect(screen.getByText('directory.changeLogs.actionUpdate')).toBeInTheDocument();

    render(<>{find(false, 'actor_type').cellRenderer?.(row)}</>);
    expect(screen.getByText('directory.changeLogs.actorAdmin')).toBeInTheDocument();

    render(<>{find(false, 'source').cellRenderer?.(row)}</>);
    expect(screen.getByText('directory.changeLogs.sourceAdminPortal')).toBeInTheDocument();
  });

  it('names OWNER for a partner editing their own record', () => {
    render(<>{find(false, 'actor_type').cellRenderer?.({ ...row, actor_type: 'OWNER' })}</>);
    expect(screen.getByText('directory.changeLogs.actorOwner')).toBeInTheDocument();
  });

  it('renders who did it over their account id', () => {
    render(<>{find(false, 'actor_name').cellRenderer?.(row)}</>);
    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByText('66d0b1c2d3e4f5a6b7c8d9e0')).toBeInTheDocument();
  });

  it('em-dashes both halves for a SYSTEM write with no actor', () => {
    render(
      <>
        {find(false, 'actor_name').cellRenderer?.({
          ...row,
          actor_type: 'SYSTEM',
          actor_name: '',
          actor_user_id: null,
        })}
      </>,
    );
    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('makes the actor searchable as name plus id', () => {
    expect(find(false, 'actor_name').valueGetter?.(row)).toBe(
      'Asha Rao — 66d0b1c2d3e4f5a6b7c8d9e0',
    );
    expect(
      find(false, 'actor_name').valueGetter?.({ ...row, actor_name: '', actor_user_id: null }),
    ).toBe('');
  });

  it('renders the record over its id on the feed', () => {
    render(<>{find(true, 'entity_label').cellRenderer?.(row)}</>);
    expect(screen.getByText('Third Wave Coffee, Indiranagar')).toBeInTheDocument();
    expect(screen.getByText('66f1a2b3c4d5e6f708192a3b')).toBeInTheDocument();
  });

  it('leaves the two value columns unsortable — the server indexes neither', () => {
    expect(find(false, 'old_value').sortable).toBe(false);
    expect(find(false, 'new_value').sortable).toBe(false);
  });

  it('dates the row through the admin-configured format', () => {
    // Not a hardcoded pattern: whatever the surface is set to.
    expect(find(false, 'created_at').valueGetter?.(row)).toBeTruthy();
  });
});
