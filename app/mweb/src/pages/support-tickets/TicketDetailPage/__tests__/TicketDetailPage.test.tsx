import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import TicketDetailPage from '../index';
import { opLink, type OpHandler } from '../../../../__tests__/op-link';
import { SmokeRoute } from '../../../../__tests__/smoke-providers';

const downloadSpy = vi.hoisted(() => vi.fn());
vi.mock('../../../support-chat/chatHelpers', async (orig) => ({
  ...(await orig<typeof import('../../../support-chat/chatHelpers')>()),
  downloadBase64File: downloadSpy,
}));
// The live socket is its own suite (useTicketSocket.test); no connection here.
vi.mock('../../useTicketSocket', () => ({ useTicketSocket: vi.fn() }));

const message = {
  __typename: 'TicketMessage',
  id: 'm1',
  author_role: 'USER',
  author_name: 'Riya',
  author_photo: null,
  body_text: 'My booking did not show up',
  attachments: [],
  created_at: '2026-06-26T05:00:00.000Z',
};

let ticket: Record<string, unknown> | null;
const baseTicket = {
  __typename: 'Ticket',
  id: 't1',
  subject: 'Booking missing',
  category: 'BOOKING',
  status: 'OPEN',
  priority: 'MEDIUM',
  created_at: '2026-06-26T05:00:00.000Z',
  updated_at: '2026-06-26T05:00:00.000Z',
  last_message_at: '2026-06-26T05:00:00.000Z',
  resolved_at: null,
  reopen_deadline: null,
  rating: null,
  feedback_comment: null,
  feedback_at: null,
  user_last_read_at: null,
  agent_last_read_at: null,
  messages: [message],
};

function mount(extra: Record<string, OpHandler> = {}) {
  const ops = opLink({
    MyTicket: () => ({ ticket }),
    MarkMyTicketRead: () => ({ markTicketRead: { __typename: 'Ticket', id: 't1', user_last_read_at: null, agent_last_read_at: null } }),
    ...extra,
  });
  render(
    <SmokeRoute pattern="/support/tickets/:id" concrete="/support/tickets/t1" link={ops.link}>
      <TicketDetailPage />
    </SmokeRoute>,
  );
  return ops;
}

const openMenu = async (testId: string) => {
  fireEvent.click(await screen.findByTestId('ticket-header-menu-button'));
  fireEvent.click(await screen.findByTestId(testId));
};

beforeEach(() => {
  ticket = { ...baseTicket };
  downloadSpy.mockReset();
});

describe('TicketDetailPage', () => {
  it('says the ticket cannot be found when the server returns none', async () => {
    ticket = null;
    mount();
    expect(await screen.findByTestId('ticket-details-missing')).toBeInTheDocument();
  });

  it('shows the thread and marks it read on open', async () => {
    const ops = mount();
    expect(await screen.findByTestId('ticket-header-subject')).toHaveTextContent('Booking missing');
    expect(screen.getByText('My booking did not show up')).toBeInTheDocument();
    await waitFor(() => expect(ops.callsTo('MarkMyTicketRead')).toHaveLength(1));
    expect(ops.callsTo('MarkMyTicketRead')[0]?.variables).toEqual({ ticket_id: 't1' });
    // An open ticket is not locked and not offered a re-open.
    expect(screen.getByTestId('ticket-composer')).toBeInTheDocument();
    expect(screen.queryByTestId('ticket-resolved-notice')).not.toBeInTheDocument();
  });

  it('sends a trimmed reply with its attachments and refetches the ticket', async () => {
    const ops = mount({
      ReplyToMyTicket: () => ({ replyToTicket: { __typename: 'Ticket', id: 't1', status: 'OPEN', message_count: 2 } }),
    });
    const input = await screen.findByTestId('ticket-reply-input');
    fireEvent.change(input, { target: { value: '  Any update?  ' } });
    fireEvent.click(screen.getByTestId('ticket-reply-send'));
    await waitFor(() => expect(ops.callsTo('ReplyToMyTicket')).toHaveLength(1));
    expect(ops.callsTo('ReplyToMyTicket')[0]?.variables).toEqual({
      ticket_id: 't1',
      body_text: 'Any update?',
      attachments: [],
    });
    await waitFor(() => expect(ops.callsTo('MyTicket').length).toBeGreaterThan(1));
    await waitFor(() => expect(input).toHaveValue(''));
  });

  it('keeps send shut while the reply box is empty', async () => {
    mount();
    await screen.findByTestId('ticket-reply-input');
    expect(screen.getByTestId('ticket-reply-send')).toBeDisabled();
  });

  it('resolves only after the confirmation, and cancelling leaves it open', async () => {
    const ops = mount({
      ResolveMyTicket: () => ({
        resolveTicket: { __typename: 'Ticket', id: 't1', status: 'RESOLVED', resolved_at: null, reopen_deadline: null },
      }),
    });
    await openMenu('ticket-action-resolve');
    fireEvent.click(await screen.findByTestId('ticket-details-resolve-confirm-cancel'));
    expect(ops.callsTo('ResolveMyTicket')).toHaveLength(0);

    await openMenu('ticket-action-resolve');
    fireEvent.click(await screen.findByTestId('ticket-details-resolve-confirm-confirm'));
    await waitFor(() => expect(ops.callsTo('ResolveMyTicket')).toHaveLength(1));
    expect(ops.callsTo('ResolveMyTicket')[0]?.variables).toEqual({ ticket_id: 't1' });
  });

  it('downloads the transcript in the chosen format', async () => {
    const ops = mount({
      MyTicketTranscript: () => ({
        ticketTranscript: { __typename: 'Transcript', filename: 'ticket.docx', text: null, content_base64: 'aGk=' },
      }),
    });
    await openMenu('ticket-action-download-docx');
    await waitFor(() => expect(downloadSpy).toHaveBeenCalledTimes(1));
    expect(ops.callsTo('MyTicketTranscript')[0]?.variables).toEqual({ ticket_id: 't1', format: 'DOCX' });
    expect(downloadSpy).toHaveBeenCalledWith('ticket.docx', 'aGk=', expect.stringContaining('wordprocessingml'));
  });

  it('opens the email dialog from the menu', async () => {
    mount();
    await openMenu('ticket-action-email');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('locks the composer on a resolved ticket and re-opens it inside the window with the reason', async () => {
    ticket = {
      ...baseTicket,
      status: 'RESOLVED',
      reopen_deadline: '2099-01-01T00:00:00.000Z',
      rating: 5,
    };
    const ops = mount({
      ReopenMyTicket: () => ({
        reopenTicket: { __typename: 'Ticket', id: 't1', status: 'OPEN', resolved_at: null, reopen_deadline: null },
      }),
    });
    expect(await screen.findByTestId('ticket-composer-locked')).toBeInTheDocument();
    expect(screen.getByTestId('ticket-reopen-until')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('ticket-reopen'));
    fireEvent.change(await screen.findByTestId('reopen-reason-input'), { target: { value: 'Still broken' } });
    fireEvent.click(screen.getByTestId('reopen-submit'));
    await waitFor(() => expect(ops.callsTo('ReopenMyTicket')).toHaveLength(1));
    expect(ops.callsTo('ReopenMyTicket')[0]?.variables).toEqual({ ticket_id: 't1', reason: 'Still broken' });
    await waitFor(() => expect(screen.queryByTestId('reopen-reason-modal')).not.toBeInTheDocument());
  });

  it('shows the refusal inside the re-open dialog and keeps it open', async () => {
    ticket = { ...baseTicket, status: 'CLOSED', reopen_deadline: '2099-01-01T00:00:00.000Z', rating: 4 };
    mount({
      ReopenMyTicket: () => {
        throw new Error('This ticket can no longer be re-opened');
      },
    });
    fireEvent.click(await screen.findByTestId('ticket-reopen'));
    fireEvent.click(await screen.findByTestId('reopen-submit'));
    expect(await screen.findByTestId('reopen-error')).toHaveTextContent('can no longer be re-opened');
    expect(screen.getByTestId('reopen-reason-modal')).toBeInTheDocument();
  });

  it('closes the re-open window: button shut and the expiry note shown', async () => {
    ticket = { ...baseTicket, status: 'RESOLVED', reopen_deadline: '2020-01-01T00:00:00.000Z', rating: 3 };
    mount();
    expect(await screen.findByTestId('ticket-reopen-expired')).toBeInTheDocument();
    expect(screen.getByTestId('ticket-reopen')).toBeDisabled();
  });

  it('asks for feedback on a resolved ticket that has no rating yet', async () => {
    ticket = { ...baseTicket, status: 'RESOLVED', reopen_deadline: null, rating: null };
    mount();
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
