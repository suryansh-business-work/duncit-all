import '../helpers/agGridEnv';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { formatDateCell } from '@duncit/table';
import type { MutableRefObject } from 'react';
import CallPromptsTable from '@/pages/call-prompts/CallPromptsTable';
import type { CrmCallPrompt } from '@/api/call.gql';

const prompt: CrmCallPrompt = {
  id: 'p1',
  name: 'Venue intro',
  description: 'Opens the call with the venue pitch',
  context: 'Ask about capacity',
  language: 'English',
  is_active: true,
  created_by: 'u1',
  created_at: '2026-02-01T10:00:00.000Z',
  updated_at: '2026-02-02T10:00:00.000Z',
};

function renderTable(rows: CrmCallPrompt[]) {
  const fetchRows = vi.fn(async () => ({ rows, total: rows.length }));
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  const refetchRef: MutableRefObject<(() => void) | null> = { current: null };
  render(
    <CallPromptsTable
      fetchRows={fetchRows}
      refetchRef={refetchRef}
      toolbarActions={<button type="button">Add Static Content</button>}
      onEdit={onEdit}
      onDelete={onDelete}
    />,
  );
  return { fetchRows, onEdit, onDelete, refetchRef };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('CallPromptsTable', () => {
  it('renders the name, its description caption, language and the active status chip', async () => {
    renderTable([prompt]);

    expect(await screen.findByText('Venue intro')).toBeTruthy();
    expect(screen.getByText('Opens the call with the venue pitch')).toBeTruthy();
    expect(screen.getByText('English')).toBeTruthy();
    expect(screen.getByText('Active')).toBeTruthy();
  });

  it('omits the description caption when the prompt has none, and shows Inactive', async () => {
    renderTable([{ ...prompt, description: '', is_active: false }]);

    expect(await screen.findByText('Venue intro')).toBeTruthy();
    expect(screen.queryByText('Opens the call with the venue pitch')).toBeNull();
    expect(screen.getByText('Inactive')).toBeTruthy();
    expect(screen.queryByText('Active')).toBeNull();
  });

  it('names the row actions after the prompt and hands the row to each callback', async () => {
    const { onEdit, onDelete } = renderTable([prompt]);
    await screen.findByText('Venue intro');

    fireEvent.click(screen.getByLabelText('Edit Venue intro'));
    fireEvent.click(screen.getByLabelText('Delete Venue intro'));

    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
  });

  it('asks the server for the first unsorted page and renders the toolbar actions + search hint', async () => {
    const { fetchRows } = renderTable([prompt]);
    await screen.findByText('Venue intro');

    expect(fetchRows).toHaveBeenCalledWith(
      expect.objectContaining({ search: '', page: 1, pageSize: 25, sortBy: null, filters: [] }),
    );
    expect(screen.getByPlaceholderText('Search name, description or context')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add Static Content' })).toBeTruthy();
  });

  it('formats the hidden Created column in the admin pattern once it is switched on', async () => {
    // The date pattern is an admin setting (@duncit/datetime), so the expected
    // text comes from the same formatter the column's value getter uses —
    // hardcoding one spelling of the date asserts the default, not the column.
    const created = formatDateCell(prompt.created_at);
    renderTable([prompt]);
    await screen.findByText('Venue intro');
    expect(screen.queryByText(created)).toBeNull();

    fireEvent.click(screen.getByLabelText('Columns'));
    fireEvent.click(await screen.findByText('Created'));

    expect(await screen.findByText(created)).toBeTruthy();
  });

  it('shows the Static Content empty state when the server returns no prompts', async () => {
    renderTable([]);
    expect(await screen.findByText(/No Static Content yet/i)).toBeTruthy();
  });

  it('publishes its refetch through refetchRef so the page can reload after a mutation', async () => {
    const { fetchRows, refetchRef } = renderTable([prompt]);
    await screen.findByText('Venue intro');
    const callsBefore = fetchRows.mock.calls.length;

    refetchRef.current?.();

    expect(refetchRef.current).toBeTypeOf('function');
    await vi.waitFor(() => expect(fetchRows.mock.calls.length).toBeGreaterThan(callsBefore));
  });
});
