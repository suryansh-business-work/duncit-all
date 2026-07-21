import { describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { act, screen, fireEvent, waitFor, within } from '@testing-library/react';
import TicketsListPage from '../../src/pages/tickets/TicketsListPage';
import { renderWithProviders } from '../testkit';
import { createTicketMock, makeTicket, ticketsListMock } from '../mocks/ticket.mock';

const sockMock = vi.hoisted(() => ({ events: {} as Record<string, () => void> }));
vi.mock('../../src/lib/useSupportSocket', () => ({
  useSupportSocket: (events: Record<string, () => void>) => {
    sockMock.events = events;
    return { current: null };
  },
}));

vi.mock('react-quill', () => ({
  default: ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <textarea data-testid="quill" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

describe('TicketsListPage', () => {
  it('shows an empty state', async () => {
    renderWithProviders(<TicketsListPage />, { mocks: [ticketsListMock([])] });
    await waitFor(() => expect(screen.getByText(/no tickets here yet/i)).toBeInTheDocument());
  });

  it('lists tickets, refetches on live events and opens a row', async () => {
    const row = makeTicket({ id: 't1', subject: 'Cannot pay' });
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

  it('filters by status from the table filter popover', async () => {
    renderWithProviders(<TicketsListPage />, {
      mocks: [
        ticketsListMock([makeTicket({ id: 't1', subject: 'Open one' })]),
        ticketsListMock([makeTicket({ id: 't2', subject: 'Resolved one' })], { status: 'RESOLVED' }),
      ],
    });
    await waitFor(() => expect(screen.getByText('Open one')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /filters/i }));
    fireEvent.mouseDown(await screen.findByRole('combobox', { name: 'Status' }));
    fireEvent.click(await screen.findByRole('option', { name: 'RESOLVED' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() => expect(screen.getByText('Resolved one')).toBeInTheDocument());
    // AG Grid removes replaced row elements asynchronously.
    await waitFor(() => expect(screen.queryByText('Open one')).not.toBeInTheDocument());
  });

  it('searches on the server (a debounced query keyed on the search variable)', async () => {
    renderWithProviders(<TicketsListPage />, {
      mocks: [
        ticketsListMock([makeTicket({ id: 't1', subject: 'Cannot pay' }), makeTicket({ id: 't2', subject: 'Refund please' })]),
        ticketsListMock([makeTicket({ id: 't2', subject: 'Refund please' })], { search: 'Refund' }),
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
        ticketsListMock([makeTicket({ id: 't1', subject: 'High leads' })]),
        ticketsListMock([makeTicket({ id: 't2', subject: 'Medium leads' })], { priority_first: 'MEDIUM' }),
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
    fireEvent.change(within(dialog).getByLabelText('Subject'), { target: { value: 'App crashes' } });
    // Pick a category from the select (exercises the category onChange handler).
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: 'Category' }));
    fireEvent.click(await screen.findByRole('option', { name: 'TECHNICAL' }));
    fireEvent.change(within(dialog).getByTestId('quill'), { target: { value: '<p>Steps to reproduce</p>' } });
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
        ticketsListMock([makeTicket({ id: 't9', subject: 'Created elsewhere' })]),
      ],
    });
    await waitFor(() => expect(screen.getByText(/no tickets here yet/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /new ticket/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Subject'), { target: { value: 'Something' } });
    fireEvent.change(within(dialog).getByTestId('quill'), { target: { value: '<p>Body</p>' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(screen.getByText('Created elsewhere')).toBeInTheDocument());
  });
});
