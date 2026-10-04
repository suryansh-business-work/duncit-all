import { describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router';
import { act, screen, fireEvent, waitFor, within } from '@testing-library/react';
import TicketsListPage from '../../src/pages/tickets/TicketsListPage';
import { renderWithProviders } from '../testkit';
import { applyEnumColumnFilter } from '../table-filter';
import { createTicketMock, makeTicket, ticketsListMock } from '../mocks/ticket.mock';

const sockMock = vi.hoisted(() => ({ events: {} as Record<string, () => void> }));
vi.mock('../../src/lib/useSupportSocket', () => ({
  useSupportSocket: (events: Record<string, () => void>) => {
    sockMock.events = events;
    return { current: null };
  },
}));

// The shared editor is ProseMirror, which cannot be typed into under jsdom; the
// dialog's description field is swapped for a textarea speaking the same
// (html, text) change contract.
vi.mock('@duncit/rich-text', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/rich-text')>();
  return {
    ...actual,
    DuncitRichTextInput: ({ value, onChange }: Parameters<typeof actual.DuncitRichTextInput>[0]) => (
      <textarea
        data-testid="ticket-body-editor"
        value={value}
        onChange={(e) => onChange(e.target.value, actual.htmlToText(e.target.value))}
      />
    ),
  };
});

// The list selects `source` (its own column, read through a label map), which
// the shared ticket factory does not set — a list row always carries one.
const makeListTicket = (over: Parameters<typeof makeTicket>[0]) => ({
  ...makeTicket(over),
  source: 'APP' as const,
  guest_email: null,
});

describe('TicketsListPage', () => {
  it('shows an empty state', async () => {
    renderWithProviders(<TicketsListPage />, { mocks: [ticketsListMock([])] });
    await waitFor(() => expect(screen.getByText(/no tickets here yet/i)).toBeInTheDocument());
  });

  it('lists tickets, refetches on live events and opens a row', async () => {
    const row = makeListTicket({ id: 't1', subject: 'Cannot pay' });
    renderWithProviders(<></>, {
      mocks: [ticketsListMock([row]), ticketsListMock([row]), ticketsListMock([row])],
      initialEntries: ['/tickets'],
      routes: (
        <>
          <Route path="/tickets" element={<TicketsListPage />} />
          <Route path="/tickets/:id" element={<div>TICKET DETAIL</div>} />
        </>
      ),
    });
    await waitFor(() => expect(screen.getByText('Cannot pay')).toBeInTheDocument());
    act(() => {
      sockMock.events.onTicketNew();
      sockMock.events.onTicketUpdate();
    });
    await waitFor(() => expect(screen.getByText('Cannot pay')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Cannot pay'));
    await waitFor(() => expect(screen.getByText('TICKET DETAIL')).toBeInTheDocument());
  });

  it('filters by status from the Status column header', async () => {
    renderWithProviders(<TicketsListPage />, {
      mocks: [
        ticketsListMock([makeListTicket({ id: 't1', subject: 'Open one' })]),
        ticketsListMock([makeListTicket({ id: 't2', subject: 'Resolved one' })], {
          filters: [{ field: 'status', op: 'in', values: ['RESOLVED'] }],
        }),
      ],
    });
    await waitFor(() => expect(screen.getByText('Open one')).toBeInTheDocument());

    await applyEnumColumnFilter('status', 'Status', 'RESOLVED');

    await waitFor(() => expect(screen.getByText('Resolved one')).toBeInTheDocument());
    // AG Grid removes replaced row elements asynchronously.
    await waitFor(() => expect(screen.queryByText('Open one')).not.toBeInTheDocument());
  });

  it('searches on the server (a debounced query keyed on the search variable)', async () => {
    renderWithProviders(<TicketsListPage />, {
      mocks: [
        ticketsListMock([makeListTicket({ id: 't1', subject: 'Cannot pay' }), makeListTicket({ id: 't2', subject: 'Refund please' })]),
        ticketsListMock([makeListTicket({ id: 't2', subject: 'Refund please' })], { search: 'Refund' }),
      ],
    });
    await waitFor(() => expect(screen.getByText('Cannot pay')).toBeInTheDocument());
    fireEvent.change(screen.getByRole('textbox', { name: 'Search subject' }), {
      target: { value: 'Refund' },
    });
    await waitFor(() => expect(screen.queryByText('Cannot pay')).not.toBeInTheDocument(), {
      timeout: 2000,
    });
    expect(screen.getByText('Refund please')).toBeInTheDocument();
  });

  it('reorders by priority via the Sort dropdown (display order only)', async () => {
    renderWithProviders(<TicketsListPage />, {
      mocks: [
        ticketsListMock([makeListTicket({ id: 't1', subject: 'High leads' })]),
        ticketsListMock([makeListTicket({ id: 't2', subject: 'Medium leads' })], { priority_first: 'MEDIUM' }),
      ],
    });
    await waitFor(() => expect(screen.getByText('High leads')).toBeInTheDocument());

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Sort' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Medium' }));

    await waitFor(() => expect(screen.getByText('Medium leads')).toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText('High leads')).not.toBeInTheDocument());
  });

  it('creates a ticket from the dialog and navigates to it', async () => {
    renderWithProviders(<></>, {
      mocks: [ticketsListMock([]), createTicketMock('new-1')],
      initialEntries: ['/tickets'],
      routes: (
        <>
          <Route path="/tickets" element={<TicketsListPage />} />
          <Route path="/tickets/:id" element={<div>TICKET DETAIL</div>} />
        </>
      ),
    });
    await waitFor(() => expect(screen.getByText(/no tickets here yet/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /new ticket/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Subject/), { target: { value: 'App crashes' } });
    // Pick a category from the select (exercises the category onChange handler).
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: 'Category' }));
    fireEvent.click(await screen.findByRole('option', { name: 'TECHNICAL' }));
    fireEvent.change(within(dialog).getByTestId('ticket-body-editor'), { target: { value: '<p>Steps to reproduce</p>' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(screen.getByText('TICKET DETAIL')).toBeInTheDocument());
  });

  it('cancels the new-ticket dialog', async () => {
    renderWithProviders(<TicketsListPage />, { mocks: [ticketsListMock([])] });
    await waitFor(() => expect(screen.getByText(/no tickets here yet/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /new ticket/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('refetches the list when create returns no id', async () => {
    renderWithProviders(<TicketsListPage />, {
      mocks: [
        ticketsListMock([]),
        createTicketMock(null),
        ticketsListMock([makeListTicket({ id: 't9', subject: 'Created elsewhere' })]),
      ],
    });
    await waitFor(() => expect(screen.getByText(/no tickets here yet/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /new ticket/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Subject/), { target: { value: 'Something' } });
    fireEvent.change(within(dialog).getByTestId('ticket-body-editor'), { target: { value: '<p>Body</p>' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(screen.getByText('Created elsewhere')).toBeInTheDocument());
  });
});
