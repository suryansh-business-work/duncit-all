import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setAmbientDateSettings } from '@duncit/app-settings';
import type { LiteEnvEntry } from '../../../graphql/environment';
import { EnvEntriesTable } from '../../../pages/environment/EnvEntriesTable';
import { makeEnvEntry } from '../../fixtures';
import { findRow, renderWithProviders } from '../../test-utils';

vi.mock('@duncit/table', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/table')>();
  const { FakeDuncitTable } = await import('../../fake-table');
  return { ...actual, DuncitTable: FakeDuncitTable };
});

beforeAll(() => setAmbientDateSettings({ dateFormat: 'yyyy-MM-dd', timeFormat: 'HH:mm', timeZone: 'UTC', timeZoneAware: true }));
afterAll(() => setAmbientDateSettings({}));

const untested = makeEnvEntry();
const passed = makeEnvEntry({ id: 'env-2', name: 'Backup SMTP', description: null, is_default: true, last_tested_at: '2026-03-15T14:30:00.000Z', last_test_ok: true });
const failed = makeEnvEntry({ id: 'env-3', name: 'Old relay', is_active: false, last_tested_at: '2026-03-16T08:05:00.000Z', last_test_ok: false });

const setup = (rows: LiteEnvEntry[] = [untested, passed, failed]) => {
  const handlers = { onEdit: vi.fn(), onDelete: vi.fn(), onSetDefault: vi.fn(), onTest: vi.fn() };
  renderWithProviders(<EnvEntriesTable rows={rows} categoryLabel="Email (SMTP)" toolbarActions={<button type="button">Add Email (SMTP)</button>} {...handlers} />);
  return { user: userEvent.setup(), handlers };
};

describe('EnvEntriesTable', () => {
  it('names the grid after the category and carries the toolbar action', async () => {
    setup();
    expect(await screen.findByRole('region', { name: 'Email (SMTP)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Email (SMTP)' })).toBeInTheDocument();
  });

  it('shows each entry with its description and status chips', async () => {
    setup();
    const first = await findRow('env-1');
    expect(first.getByText('Primary SMTP')).toBeInTheDocument();
    expect(first.getByText('Gmail relay')).toBeInTheDocument();
    expect(first.getByText('Active')).toBeInTheDocument();
    expect(first.queryByText('Default')).not.toBeInTheDocument();
    expect((await findRow('env-2')).getByText('Default')).toBeInTheDocument();
    expect((await findRow('env-3')).getByText('Off')).toBeInTheDocument();
  });

  it('says when each entry was last tested and how it went', async () => {
    setup();
    expect((await findRow('env-1')).getByRole('img', { name: 'Not tested yet' })).toBeInTheDocument();
    expect((await findRow('env-2')).getByRole('img', { name: 'Passed · 2026-03-15 · 14:30' })).toBeInTheDocument();
    expect((await findRow('env-3')).getByRole('img', { name: 'Failed · 2026-03-16 · 08:05' })).toBeInTheDocument();
  });

  it('sorts and exports the name and the last-test outcome as text', async () => {
    setup();
    const row = await findRow('env-2');
    expect(row.getByTestId('cell-name')).toHaveAttribute('data-value', 'Backup SMTP');
    expect(row.getByTestId('cell-last_tested_at')).toHaveAttribute('data-value', 'Passed · 2026-03-15 · 14:30');
    expect((await findRow('env-1')).getByTestId('cell-last_tested_at')).toHaveAttribute('data-value', 'Not tested yet');
  });

  it('searches the name and the description, an entry without a description included', async () => {
    const { user } = setup();
    await findRow('env-1');
    const search = screen.getByRole('textbox', { name: 'Search name or description' });
    await user.type(search, 'RELAY');
    await waitFor(() => expect(screen.queryByTestId('row-env-2')).not.toBeInTheDocument());
    expect(screen.getByTestId('row-env-1')).toBeInTheDocument();
    expect(screen.getByTestId('row-env-3')).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, 'backup');
    await waitFor(() => expect(screen.queryByTestId('row-env-1')).not.toBeInTheDocument());
    expect(screen.getByTestId('row-env-2')).toBeInTheDocument();
  });

  it('wires Test, Edit, Make default and Delete to the row', async () => {
    const { user, handlers } = setup();
    const row = await findRow('env-1');
    await user.click(row.getByRole('button', { name: 'Test Primary SMTP' }));
    await user.click(row.getByRole('button', { name: 'Edit Primary SMTP' }));
    await user.click(row.getByRole('button', { name: 'Make Primary SMTP the default' }));
    await user.click(row.getByRole('button', { name: 'Delete Primary SMTP' }));
    expect(handlers.onTest).toHaveBeenCalledWith(untested);
    expect(handlers.onEdit).toHaveBeenCalledWith(untested);
    expect(handlers.onSetDefault).toHaveBeenCalledWith(untested);
    expect(handlers.onDelete).toHaveBeenCalledWith(untested);
  });

  it('shows the default entry as pressed and not re-selectable', async () => {
    setup();
    const star = (await findRow('env-2')).getByRole('button', { name: 'Backup SMTP is the default' });
    expect(star).toBeDisabled();
    expect(star).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the empty copy when the category has no entries', async () => {
    setup([]);
    expect(await screen.findByTestId('table-empty')).toHaveTextContent('No entries in this category yet.');
  });
});
