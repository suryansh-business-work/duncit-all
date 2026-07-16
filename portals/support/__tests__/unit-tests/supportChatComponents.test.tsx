import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import ChatHeader from '../../src/pages/live-chat/LiveChatPage/ChatHeader';
import TicketHeader from '../../src/pages/tickets/TicketDetailPage/TicketHeader';
import TicketThread from '../../src/pages/tickets/TicketDetailPage/TicketThread';
import TranscriptMenu from '../../src/components/TranscriptMenu';
import { ConfirmDialog } from '@duncit/dialogs';
import FeedbackPanel from '../../src/components/FeedbackPanel';
import type { SupportChatSession } from '../../src/graphql/supportChat';
import type { Ticket } from '../../src/graphql/tickets';
import { publicAppSettingsMock } from './testkit';

const withProvider = (ui: React.ReactElement) =>
  render(<MockedProvider mocks={[publicAppSettingsMock()]} addTypename={false}>{ui}</MockedProvider>);

const session = (over: Partial<SupportChatSession> = {}): SupportChatSession => ({
  id: 's', ticket_no: 'CH-S', status: 'OPEN', last_message_at: '', last_message_preview: '',
  unread_for_agent: 0, agent_id: null, user_last_read_at: null, rating: null,
  feedback_comment: null, feedback_at: null, resolved_at: null,
  user: { id: 'u', name: 'Riya', phone: null, avatar_url: null }, ...over,
});

const ticket = (over: Partial<Ticket> = {}): Ticket => ({
  id: 't', ticket_no: 'ST-T', subject: 'S', category: 'GENERAL', status: 'OPEN', priority: 'LOW',
  assignee_id: null, assignee_name: null, last_message_at: '', message_count: 0,
  resolved_at: null, reopen_deadline: null, rating: null, feedback_comment: null, feedback_at: null,
  created_at: '', updated_at: '', user: { id: 'u', name: 'Riya', phone: null, avatar_url: null },
  messages: [], ...over,
});

describe('ChatHeader', () => {
  it('renders an avatar from name initial + no-phone caption and confirms resolve', () => {
    const onResolve = vi.fn();
    render(
      <ChatHeader session={session()} busy={false} onResolve={onResolve} onReopen={vi.fn()} onDownload={vi.fn()} onEmail={vi.fn()} />,
    );
    expect(screen.getByText('CH-S')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /resolve/i }));
    fireEvent.click(screen.getByRole('button', { name: /mark resolved/i }));
    expect(onResolve).toHaveBeenCalled();
  });

  it('handles a closed session with an avatar image, empty name and a phone', () => {
    render(
      <ChatHeader
        session={session({ status: 'CLOSED', user: { id: 'u', name: '', phone: '123', avatar_url: 'http://img' } })}
        busy onResolve={vi.fn()} onReopen={vi.fn()} onDownload={vi.fn()} onEmail={vi.fn()}
      />,
    );
    expect(screen.getByText(/· 123/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /re-open/i })).toBeDisabled();
  });

  it('cancels the resolve confirm dialog', async () => {
    render(
      <ChatHeader session={session()} busy={false} onResolve={vi.fn()} onReopen={vi.fn()} onDownload={vi.fn()} onEmail={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /resolve/i }));
    expect(screen.getByText(/mark this chat resolved/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByText(/mark this chat resolved/i)).not.toBeInTheDocument());
  });
});

describe('TicketHeader', () => {
  it('sets status, priority, resolves and cancels; shows the ticket number', () => {
    const onStatus = vi.fn();
    const onPriority = vi.fn();
    const onResolve = vi.fn();
    render(
      <TicketHeader ticket={ticket()} onBack={vi.fn()} onStatus={onStatus} onPriority={onPriority} onResolve={onResolve} onReopen={vi.fn()} onDownload={vi.fn()} onEmail={vi.fn()} />,
    );
    expect(screen.getByText('ST-T')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Status' }));
    fireEvent.click(screen.getByRole('option', { name: 'CLOSED' }));
    expect(onStatus).toHaveBeenCalledWith('CLOSED');

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Priority' }));
    fireEvent.click(screen.getByRole('option', { name: 'HIGH' }));
    expect(onPriority).toHaveBeenCalledWith('HIGH');

    fireEvent.click(screen.getByLabelText('Mark resolved'));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    fireEvent.click(screen.getByLabelText('Mark resolved'));
    fireEvent.click(screen.getByRole('button', { name: /mark resolved/i }));
    expect(onResolve).toHaveBeenCalled();
  });

  it('shows the re-open control on a resolved ticket', () => {
    render(
      <TicketHeader ticket={ticket({ status: 'RESOLVED' })} onBack={vi.fn()} onStatus={vi.fn()} onPriority={vi.fn()} onResolve={vi.fn()} onReopen={vi.fn()} onDownload={vi.fn()} onEmail={vi.fn()} />,
    );
    expect(screen.getByLabelText('Re-open ticket')).toBeInTheDocument();
  });
});

describe('TicketThread (no messages)', () => {
  it('renders without messages', () => {
    withProvider(<TicketThread ticket={ticket({ messages: undefined })} />);
    expect(screen.queryByLabelText('Jump to latest')).not.toBeInTheDocument();
  });
});

describe('TranscriptMenu', () => {
  it('cancels the email dialog', async () => {
    render(<TranscriptMenu onDownload={vi.fn()} onEmail={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Export transcript'));
    fireEvent.click(screen.getByText(/email transcript/i));
    expect(screen.getByLabelText(/recipient email/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByLabelText(/recipient email/i)).not.toBeInTheDocument());
  });
});

describe('ConfirmDialog + FeedbackPanel defaults', () => {
  it('uses default labels and renders nothing without a rating', () => {
    const onClose = vi.fn();
    render(<ConfirmDialog open title="T" message="M" onConfirm={vi.fn()} onClose={onClose} />);
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();

    const { container } = render(<FeedbackPanel rating={null} comment={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
