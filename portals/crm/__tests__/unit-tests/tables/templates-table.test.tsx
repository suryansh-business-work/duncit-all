import '../helpers/agGridEnv';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import type { MutableRefObject } from 'react';
import TemplatesTable from '@/pages/email-templates/TemplatesTable';
import type { EmailTemplateRow } from '@/api/emailTemplates.gql';

const template: EmailTemplateRow = {
  template_id: 't1',
  slug: 'venue-welcome',
  name: 'Venue Welcome',
  subject: 'Welcome aboard, {{venue_name}}',
  target: 'VENUE',
  is_active: true,
  created_at: '2026-01-04T09:00:00.000Z',
  updated_at: '2026-04-21T09:00:00.000Z',
};

function renderTable(rows: EmailTemplateRow[]) {
  const fetchRows = vi.fn(async () => ({ rows, total: rows.length }));
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  const refetchRef: MutableRefObject<(() => void) | null> = { current: null };
  render(
    <TemplatesTable
      fetchRows={fetchRows}
      refetchRef={refetchRef}
      toolbarActions={<button type="button">New template</button>}
      onEdit={onEdit}
      onDelete={onDelete}
    />,
  );
  return { fetchRows, onEdit, onDelete };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('TemplatesTable', () => {
  it('renders the name, slug, subject, target chip and status for a template', async () => {
    renderTable([template]);

    expect(await screen.findByText('Venue Welcome')).toBeTruthy();
    expect(screen.getByText('venue-welcome')).toBeTruthy();
    expect(screen.getByText('Welcome aboard, {{venue_name}}')).toBeTruthy();
    expect(screen.getByText('Venue')).toBeTruthy();
    expect(screen.getByText('Active')).toBeTruthy();
  });

  it('maps each target code to its human label', async () => {
    renderTable([
      { ...template, template_id: 't2', name: 'Host One', target: 'HOST' },
      { ...template, template_id: 't3', name: 'Ecomm One', target: 'ECOMM' },
      { ...template, template_id: 't4', name: 'Static One', target: 'STATIC', is_active: false },
    ]);

    expect(await screen.findByText('Host')).toBeTruthy();
    expect(screen.getByText('Ecomm')).toBeTruthy();
    expect(screen.getByText('Static')).toBeTruthy();
    expect(screen.getByText('Inactive')).toBeTruthy();
  });

  it('falls back to the raw target when the server sends an unmapped code', async () => {
    renderTable([{ ...template, target: 'PARTNER' as EmailTemplateRow['target'] }]);

    expect(await screen.findByText('PARTNER')).toBeTruthy();
    expect(screen.queryByText('Venue')).toBeNull();
  });

  it('shows the Updated date formatted by date-fns and keeps Created hidden', async () => {
    renderTable([template]);

    expect(await screen.findByText('21 Apr 2026')).toBeTruthy();
    expect(screen.queryByText('4 Jan 2026')).toBeNull();
  });

  it('names the row actions after the template and hands the row to each callback', async () => {
    const { onEdit, onDelete } = renderTable([template]);
    await screen.findByText('Venue Welcome');

    fireEvent.click(screen.getByLabelText('Edit Venue Welcome'));
    fireEvent.click(screen.getByLabelText('Delete Venue Welcome'));

    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ template_id: 't1' }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ template_id: 't1' }));
  });

  it('asks the server for the first page sorted by name ascending', async () => {
    const { fetchRows } = renderTable([template]);
    await screen.findByText('Venue Welcome');

    expect(fetchRows).toHaveBeenCalledWith(
      expect.objectContaining({ search: '', page: 1, pageSize: 25, sortBy: 'name', sortDir: 'asc' }),
    );
    expect(screen.getByPlaceholderText('Search name, slug or subject')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'New template' })).toBeTruthy();
  });

  it('sends a target=HOST filter to the server when the For filter is applied', async () => {
    const { fetchRows } = renderTable([template]);
    await screen.findByText('Venue Welcome');

    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));
    fireEvent.mouseDown(screen.getByLabelText('For'));
    const listbox = await screen.findByRole('listbox');
    fireEvent.click(within(listbox).getByText('Host'));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    await vi.waitFor(() =>
      expect(fetchRows).toHaveBeenCalledWith(
        expect.objectContaining({ filters: [{ field: 'target', op: 'eq', value: 'HOST' }] }),
      ),
    );
  });

  it('shows the templates empty state when the server returns nothing', async () => {
    renderTable([]);
    expect(await screen.findByText(/No templates yet/i)).toBeTruthy();
  });
});
