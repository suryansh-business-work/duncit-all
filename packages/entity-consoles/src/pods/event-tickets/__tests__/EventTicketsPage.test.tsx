import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { renderWithProviders } from '../../../../__tests__/testkit';
import {
  CHECK_IN_EVENT_TICKET,
  EVENT_TICKET_PDF,
  VERIFY_EVENT_TICKET,
  type EventTicketRow,
} from '../queries';
import EventTicketsPage from '../EventTicketsPage';

const harness = vi.hoisted(() => ({
  refetch: vi.fn(),
  download: vi.fn(),
}));

vi.mock('@duncit/table', () => ({
  useApolloTableFetch: () => async () => ({ rows: [], total: 0 }),
}));

vi.mock('@duncit/utils', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, downloadBase64File: harness.download };
});

const TICKET = {
  id: 't1',
  ticket_code: 'DUN-TKT-9001',
  pod_id: 'pod1',
  user_id: 'u1',
  status: 'VALID',
  checked_in_at: null,
  pod_title: 'Sunrise Yoga',
  pod_date_time: '2026-04-11T13:45:00.000Z',
  pod_mode: 'PHYSICAL',
  venue_name: 'Lotus Studio',
  zone_name: 'Baner',
  user_name: 'Jane Doe',
  user_email: 'jane@duncit.test',
  created_at: '2026-04-01T07:00:00.000Z',
} as EventTicketRow;

// The table has its own suite; here it is two buttons that fire the page's
// download and check-in handlers for the same ticket.
vi.mock('../EventTicketsTable', () => ({
  default: (props: {
    refetchRef: { current: (() => void) | null };
    onDownload: (t: EventTicketRow) => void;
    onCheckIn: (t: EventTicketRow) => void;
  }) => {
    props.refetchRef.current = harness.refetch;
    return (
      <div>
        <button type="button" onClick={() => props.onDownload(TICKET)}>
          row-download
        </button>
        <button type="button" onClick={() => props.onCheckIn(TICKET)}>
          row-checkin
        </button>
      </div>
    );
  },
}));

// The group form has its own suite; this stands in with the props the page
// gives it and one submit.
vi.mock('../CompanionsDialog', () => ({
  default: (props: {
    ticketCode: string | null;
    required: number;
    busy?: boolean;
    onClose: () => void;
    onSubmit: (companions: { name: string; phone_number: string }[]) => void;
  }) => (
    <div data-testid="companions" data-code={props.ticketCode ?? ''} data-required={props.required}>
      <button
        type="button"
        onClick={() => props.onSubmit([{ name: 'Raj Mehta', phone_number: '9876543210' }])}
      >
        companions-submit
      </button>
      <button type="button" onClick={props.onClose}>
        companions-close
      </button>
    </div>
  ),
}));

const ticketData = (over: Record<string, unknown> = {}) => ({
  __typename: 'EventTicket',
  ...TICKET,
  ...over,
});

const verifyMock = (token: string, ok: boolean, message: string): MockedResponse => ({
  request: { query: VERIFY_EVENT_TICKET, variables: { token } },
  result: {
    data: {
      verifyEventTicketQr: {
        __typename: 'VerifyEventTicketResult',
        ok,
        message,
        ticket: ok ? ticketData() : null,
      },
    },
  },
});

const checkInMock = (input: Record<string, unknown>, status = 'CHECKED_IN'): MockedResponse => ({
  request: { query: CHECK_IN_EVENT_TICKET, variables: { input } },
  result: { data: { checkInEventTicket: ticketData({ status }) } },
});

const renderPage = (mocks: MockedResponse[] = []) =>
  renderWithProviders(<EventTicketsPage />, { mocks });

beforeEach(() => {
  harness.refetch.mockReset();
  harness.download.mockReset();
});

describe('EventTicketsPage / QR check-in', () => {
  it('cannot verify or check in until a token is pasted', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Verify' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Check in' })).toBeDisabled();
  });

  it('verifies a pasted token, shows the answer and then checks the ticket in and resets', async () => {
    renderPage([
      verifyMock('tok-1', true, 'Ticket is valid'),
      checkInMock({ token: 'tok-1' }),
    ]);
    fireEvent.change(screen.getByRole('textbox', { name: /token/i }), { target: { value: '  tok-1 ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

    expect(await screen.findByText('Ticket is valid')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check in' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Check in' }));

    expect(await screen.findByText('Checked in')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('textbox', { name: /token/i })).toHaveValue(''));
    expect(screen.queryByText('Ticket is valid')).not.toBeInTheDocument();
    expect(harness.refetch).toHaveBeenCalledTimes(1);
  });

  it('keeps check-in locked when the server refuses the token', async () => {
    renderPage([verifyMock('tok-2', false, 'Ticket already used')]);
    fireEvent.change(screen.getByRole('textbox', { name: /token/i }), { target: { value: 'tok-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

    expect(await screen.findByText('Ticket already used')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check in' })).toBeDisabled();
  });

  it('shows no answer, and keeps check-in locked, when the server returns no result', async () => {
    renderPage([
      {
        request: { query: VERIFY_EVENT_TICKET, variables: { token: 'tok-0' } },
        result: { data: { verifyEventTicketQr: null } },
      },
    ]);
    fireEvent.change(screen.getByRole('textbox', { name: /token/i }), { target: { value: 'tok-0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Verify' })).toBeEnabled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check in' })).toBeDisabled();
  });

  it('shows a failed verification as an error answer', async () => {
    renderPage([
      {
        request: { query: VERIFY_EVENT_TICKET, variables: { token: 'tok-3' } },
        result: { errors: [new GraphQLError('Token expired')] },
      },
    ]);
    fireEvent.change(screen.getByRole('textbox', { name: /token/i }), { target: { value: 'tok-3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

    expect(await screen.findByText('Token expired')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check in' })).toBeDisabled();
  });

  it('reports a failed token check-in and leaves the token in place', async () => {
    renderPage([
      verifyMock('tok-4', true, 'Ticket is valid'),
      {
        request: { query: CHECK_IN_EVENT_TICKET, variables: { input: { token: 'tok-4' } } },
        result: { errors: [new GraphQLError('Event has not started')] },
      },
    ]);
    fireEvent.change(screen.getByRole('textbox', { name: /token/i }), { target: { value: 'tok-4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
    await screen.findByText('Ticket is valid');
    fireEvent.click(screen.getByRole('button', { name: 'Check in' }));

    expect(await screen.findByText('Event has not started')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /token/i })).toHaveValue('tok-4');
    expect(harness.refetch).not.toHaveBeenCalled();
  });
});

describe('EventTicketsPage / row actions', () => {
  it('checks a single-seat ticket in by id and reloads the grid', async () => {
    renderPage([checkInMock({ ticket_doc_id: 't1', companions: null })]);
    fireEvent.click(screen.getByText('row-checkin'));

    expect(await screen.findByText('Checked in DUN-TKT-9001')).toBeInTheDocument();
    expect(harness.refetch).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('companions')).toHaveAttribute('data-code', '');
  });

  it('asks for the rest of the group when the server says companions are required, then re-submits', async () => {
    renderPage([
      {
        request: {
          query: CHECK_IN_EVENT_TICKET,
          variables: { input: { ticket_doc_id: 't1', companions: null } },
        },
        result: {
          errors: [
            new GraphQLError('Add the other people', {
              extensions: { code: 'COMPANIONS_REQUIRED', companions_required: 2 },
            }),
          ],
        },
      },
      checkInMock({
        ticket_doc_id: 't1',
        companions: [{ name: 'Raj Mehta', phone_number: '9876543210' }],
      }),
    ]);

    fireEvent.click(screen.getByText('row-checkin'));

    await waitFor(() =>
      expect(screen.getByTestId('companions')).toHaveAttribute('data-code', 'DUN-TKT-9001'),
    );
    expect(screen.getByTestId('companions')).toHaveAttribute('data-required', '2');
    expect(screen.queryByText('Add the other people')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('companions-submit'));

    expect(await screen.findByText('Checked in DUN-TKT-9001')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('companions')).toHaveAttribute('data-code', ''));
    expect(harness.refetch).toHaveBeenCalledTimes(1);
  });

  it('asks for one companion when the server does not say how many', async () => {
    renderPage([
      {
        request: {
          query: CHECK_IN_EVENT_TICKET,
          variables: { input: { ticket_doc_id: 't1', companions: null } },
        },
        result: {
          errors: [new GraphQLError('Add them', { extensions: { code: 'COMPANIONS_REQUIRED' } })],
        },
      },
    ]);
    fireEvent.click(screen.getByText('row-checkin'));

    await waitFor(() =>
      expect(screen.getByTestId('companions')).toHaveAttribute('data-code', 'DUN-TKT-9001'),
    );
    expect(screen.getByTestId('companions')).toHaveAttribute('data-required', '1');
  });

  it('ignores a group submit when no ticket is awaiting its companions', async () => {
    renderPage();
    fireEvent.click(screen.getByText('companions-submit'));

    // No check-in mock is registered: a request would surface as an error toast.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(harness.refetch).not.toHaveBeenCalled();
  });

  it('closes the group form without checking anything in', async () => {
    renderPage([
      {
        request: {
          query: CHECK_IN_EVENT_TICKET,
          variables: { input: { ticket_doc_id: 't1', companions: null } },
        },
        result: {
          errors: [new GraphQLError('Add them', { extensions: { code: 'COMPANIONS_REQUIRED' } })],
        },
      },
    ]);
    fireEvent.click(screen.getByText('row-checkin'));
    await waitFor(() =>
      expect(screen.getByTestId('companions')).toHaveAttribute('data-code', 'DUN-TKT-9001'),
    );

    fireEvent.click(screen.getByText('companions-close'));

    expect(screen.getByTestId('companions')).toHaveAttribute('data-code', '');
    expect(harness.refetch).not.toHaveBeenCalled();
  });

  it('shows any other check-in failure as an error', async () => {
    renderPage([
      {
        request: {
          query: CHECK_IN_EVENT_TICKET,
          variables: { input: { ticket_doc_id: 't1', companions: null } },
        },
        result: { errors: [new GraphQLError('Ticket was cancelled')] },
      },
    ]);
    fireEvent.click(screen.getByText('row-checkin'));

    expect(await screen.findByText('Ticket was cancelled')).toBeInTheDocument();
    expect(screen.getByTestId('companions')).toHaveAttribute('data-code', '');
  });

  it('downloads the ticket PDF under its code', async () => {
    renderPage([
      {
        request: { query: EVENT_TICKET_PDF, variables: { id: 't1' } },
        result: { data: { eventTicketPdfBase64: 'JVBERi0=' } },
      },
    ]);
    fireEvent.click(screen.getByText('row-download'));

    await waitFor(() => expect(harness.download).toHaveBeenCalledTimes(1));
    expect(harness.download).toHaveBeenCalledWith('JVBERi0=', 'ticket-DUN-TKT-9001.pdf', 'application/pdf');
  });

  it('reports a failed download and saves nothing', async () => {
    renderPage([
      {
        request: { query: EVENT_TICKET_PDF, variables: { id: 't1' } },
        result: { errors: [new GraphQLError('PDF service unavailable')] },
      },
    ]);
    fireEvent.click(screen.getByText('row-download'));

    expect(await screen.findByText('PDF service unavailable')).toBeInTheDocument();
    expect(harness.download).not.toHaveBeenCalled();
  });
});
