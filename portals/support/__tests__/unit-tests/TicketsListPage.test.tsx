import { describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { act, screen, fireEvent, waitFor, within } from '@testing-library/react';
import TicketsListPage from '../../src/pages/tickets/TicketsListPage';
import { CREATE_TICKET, TICKETS, type Ticket } from '../../src/graphql/tickets';
import { renderWithProviders } from './testkit';

const sockMock = vi.hoisted(() => ({ events: {} as Record<string, () => void> }));
vi.mock('../../src/lib/useSupportSocket', () => ({
  useSupportSocket: (events: Record<string, () => void>) => {
    sockMock.events = events;
    return { current: null };
  },
}));

vi.mock('react-quill', () => ({
  default: ({ value, onChange, placeholder }: any) => (
    <textarea data-testid="quill" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const ticket = (id: string, subject: string): any => ({
  __typename: 'Ticket',
  id,
  ticket_no: `ST-${id.slice(-6).toUpperCase()}`,
  subject,
  category: 'GENERAL',
  status: 'OPEN',
  priority: 'MEDIUM',
  assignee_id: null,
  assignee_name: null,
  last_message_at: new Date().toISOString(),
  message_count: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  user: {
    id: 'u1', name: 'Riya', email: null, phone: null, avatar_url: null,
    city: null, state: null, country: null, joined_at: null,
    is_email_verified: false, is_phone_verified: false,
  },
});

const listMock = (status: string | null, tickets: Ticket[], search: string | null = null) => ({
  request: {
    query: TICKETS,
    variables: {
      status,
      search,
      page: 1,
      page_size: 25,
      sort_by: 'last_message_at',
      sort_dir: 'desc',
    },
  },
  result: { data: { tickets: { items: tickets, total: tickets.length, page: 1, page_size: 25 } } },
});

describe('TicketsListPage', () => {
  it('shows an empty state', async () => {
    renderWithProviders(<TicketsListPage />, { mocks: [listMock(null, [])] });
    await waitFor(() => expect(screen.getByText(/no tickets here yet/i)).toBeInTheDocument());
  });

  it('lists tickets, refetches on live events and opens a row', async () => {
    renderWithProviders(<></>, {
      mocks: [listMock(null, [ticket('t1', 'Cannot pay')]), listMock(null, [ticket('t1', 'Cannot pay')]), listMock(null, [ticket('t1', 'Cannot pay')])],
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
      mocks: [listMock(null, [ticket('t1', 'Open one')]), listMock('RESOLVED', [ticket('t2', 'Resolved one')])],
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
        listMock(null, [ticket('t1', 'Cannot pay'), ticket('t2', 'Refund please')]),
        listMock(null, [ticket('t2', 'Refund please')], 'Refund'),
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

  it('creates a ticket from the dialog and navigates to it', async () => {
    renderWithProviders(<></>, {
      mocks: [
        listMock(null, []),
        { request: { query: CREATE_TICKET }, variableMatcher: () => true, result: { data: { createTicket: { id: 'new-1' } } } },
      ],
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
    fireEvent.change(within(dialog).getByTestId('quill'), { target: { value: '<p>Steps to reproduce</p>' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(screen.getByText('TICKET DETAIL')).toBeInTheDocument());
  });

  it('cancels the new-ticket dialog', async () => {
    renderWithProviders(<TicketsListPage />, { mocks: [listMock(null, [])] });
    await waitFor(() => expect(screen.getByText(/no tickets here yet/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /new ticket/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('refetches the list when create returns no id', async () => {
    renderWithProviders(<TicketsListPage />, {
      mocks: [
        listMock(null, []),
        { request: { query: CREATE_TICKET }, variableMatcher: () => true, result: { data: { createTicket: { id: null } } } },
        listMock(null, [ticket('t9', 'Created elsewhere')]),
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
