import '../helpers/agGridEnv';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { formatDateCell } from '@duncit/table';
import type { MutableRefObject } from 'react';
import LeadsTable, { type LeadRow } from '@/pages/user-leads/LeadsTable';

const lead: LeadRow = {
  id: 'l1',
  name: 'Asha Rao',
  phone: '919876543210',
  source_communities: [{ jid: 'c1@g.us', name: 'Mumbai Foodies' }],
  source_groups: [
    { jid: 'g1@g.us', name: 'Weekend Pods' },
    { jid: 'g2@g.us', name: '' },
  ],
  imported_at: '2026-05-02T10:20:00.000Z',
};

function renderTable(rows: LeadRow[]) {
  const fetchRows = vi.fn(async () => ({ rows, total: rows.length }));
  const onRowClick = vi.fn();
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  const refetchRef: MutableRefObject<(() => void) | null> = { current: null };
  render(
    <LeadsTable
      fetchRows={fetchRows}
      refetchRef={refetchRef}
      toolbarActions={<button type="button">New</button>}
      onRowClick={onRowClick}
      onEdit={onEdit}
      onDelete={onDelete}
    />,
  );
  return { fetchRows, onRowClick, onEdit, onDelete };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('LeadsTable (WhatsApp user leads)', () => {
  it('renders the name and a WhatsApp deep link for the phone number', async () => {
    renderTable([lead]);

    expect(await screen.findByText('Asha Rao')).toBeTruthy();
    const link = screen.getByRole('link', { name: /919876543210/ });
    expect(link.getAttribute('href')).toBe('https://web.whatsapp.com/send?phone=919876543210');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.textContent).toContain('+919876543210');
  });

  it('renders a chip per community and per group, using the jid when a group is unnamed', async () => {
    renderTable([lead]);

    expect(await screen.findByText('Mumbai Foodies')).toBeTruthy();
    expect(screen.getByText('Weekend Pods')).toBeTruthy();
    expect(screen.getByText('g2@g.us')).toBeTruthy();
  });

  it('falls back to em dashes for a nameless lead with no community or group', async () => {
    renderTable([{ id: 'l2', name: '', phone: '911112223334', source_groups: [] }]);

    expect(await screen.findByRole('link', { name: /911112223334/ })).toBeTruthy();
    // blank name cell + both empty provenance cells + the missing Imported date
    expect(screen.getAllByText('—')).toHaveLength(4);
  });

  it('formats the Imported date in the admin-configured pattern', async () => {
    // The Imported column is a shared `dateColumn`, whose pattern comes from
    // the admin display settings — assert through that same formatter.
    const imported = formatDateCell(lead.imported_at);
    renderTable([lead]);
    expect(await screen.findByText(imported)).toBeTruthy();
  });

  it('shows an em dash in Imported when the lead was never imported', async () => {
    const imported = formatDateCell(lead.imported_at);
    renderTable([{ ...lead, imported_at: null }]);
    await screen.findByText('Asha Rao');
    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.queryByText(imported)).toBeNull();
  });

  // Row-click → onRowClick(lead.id) goes through AG Grid's rowClicked event, which
  // never fires in jsdom; the cypress user-leads flow covers it in a browser.
  it('fires the edit and delete handlers with the row', async () => {
    const { onRowClick, onEdit, onDelete } = renderTable([lead]);
    await screen.findByText('Asha Rao');

    fireEvent.click(screen.getByLabelText('Edit lead'));
    fireEvent.click(screen.getByLabelText('Delete lead'));

    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'l1' }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'l1' }));
    // Deliberately no `expect(onRowClick).not.toHaveBeenCalled()`: rowClicked
    // cannot fire in jsdom at all, so that assertion could never fail (S5914).
  });

  it('asks the server for the newest imports first and wires the toolbar', async () => {
    const { fetchRows } = renderTable([lead]);
    await screen.findByText('Asha Rao');

    expect(fetchRows).toHaveBeenCalledWith(
      expect.objectContaining({
        search: '',
        page: 1,
        pageSize: 25,
        sortBy: 'imported_at',
        sortDir: 'desc',
      }),
    );
    expect(screen.getByPlaceholderText('Search by name or phone…')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'New' })).toBeTruthy();
  });

  it('shows the WhatsApp leads empty state when the server returns nothing', async () => {
    renderTable([]);
    expect(await screen.findByText(/No WhatsApp leads yet/i)).toBeTruthy();
  });
});
