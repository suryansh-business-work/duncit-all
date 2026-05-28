import { describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
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
  user: { id: 'u1', name: 'Riya', phone: null, avatar_url: null },
});

const listMock = (status: string | null, tickets: Ticket[]) => ({
  request: { query: TICKETS, variables: { status } },
  result: { data: { tickets } },
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
    sockMock.events.onTicketNew();
    sockMock.events.onTicketUpdate();
    fireEvent.click(screen.getByText('Cannot pay'));
    expect(screen.getByText('TICKET DETAIL')).toBeInTheDocument();
  });

  it('filters by status', async () => {
    renderWithProviders(<TicketsListPage />, {
      mocks: [listMock(null, [ticket('t1', 'Open one')]), listMock('RESOLVED', [ticket('t2', 'Resolved one')])],
    });
    await waitFor(() => expect(screen.getByText('Open one')).toBeInTheDocument());
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'RESOLVED' }));
    await waitFor(() => expect(screen.getByText('Resolved one')).toBeInTheDocument());
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
