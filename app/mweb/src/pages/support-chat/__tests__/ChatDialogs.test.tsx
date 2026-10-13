import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';

import EmailTranscriptDialog from '../EmailTranscriptDialog';
import FeedbackDialog from '../FeedbackDialog';
import ReopenReasonDialog from '../ReopenReasonDialog';
import { opLink, type OpHandler } from '../../../__tests__/op-link';

function withOps(ui: React.ReactElement, handlers: Record<string, OpHandler>) {
  const ops = opLink(handlers);
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} link={ops.link}>
      {ui}
    </MockedProvider>,
  );
  return ops;
}

describe('EmailTranscriptDialog', () => {
  it('keeps send shut until an address is typed, then sends the trimmed address and confirms', async () => {
    const ops = withOps(<EmailTranscriptDialog open sessionId="s1" onClose={vi.fn()} />, {
      EmailMySupportChatTranscript: () => ({ emailSupportChatTranscript: true }),
    });
    expect(screen.getByTestId('email-send')).toBeDisabled();
    fireEvent.change(screen.getByTestId('email-input'), { target: { value: '  riya@example.test ' } });
    fireEvent.click(screen.getByTestId('email-send'));
    expect(await screen.findByTestId('email-done')).toHaveTextContent('riya@example.test');
    expect(ops.callsTo('EmailMySupportChatTranscript')[0]?.variables).toEqual({
      session_id: 's1',
      email: 'riya@example.test',
    });
    expect(screen.queryByTestId('email-send')).not.toBeInTheDocument();
  });

  it('shows the server refusal and lets the person try again', async () => {
    withOps(<EmailTranscriptDialog open sessionId="s1" defaultEmail="riya@example.test" onClose={vi.fn()} />, {
      EmailMySupportChatTranscript: () => {
        throw new Error('Mail service is down');
      },
    });
    fireEvent.click(screen.getByTestId('email-send'));
    expect(await screen.findByTestId('email-error')).toHaveTextContent('Mail service is down');
    expect(screen.getByTestId('email-send')).toBeEnabled();
  });
});

describe('FeedbackDialog', () => {
  it('submits the chosen rating and note once, and reports it', async () => {
    const onSubmitted = vi.fn();
    const ops = withOps(
      <FeedbackDialog open sessionId="s1" rating={null} comment={null} onClose={vi.fn()} onSubmitted={onSubmitted} />,
      {
        SubmitMySupportChatFeedback: () => ({
          submitSupportChatFeedback: {
            __typename: 'SupportChatSession',
            id: 's1',
            rating: 4,
            feedback_comment: 'Quick help',
            feedback_at: null,
          },
        }),
      },
    );
    expect(screen.getByTestId('feedback-submit')).toBeDisabled();
    fireEvent.click(screen.getByTestId('feedback-emoji-4'));
    fireEvent.change(screen.getByTestId('feedback-comment'), { target: { value: ' Quick help ' } });
    fireEvent.click(screen.getByTestId('feedback-submit'));
    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith(4, 'Quick help'));
    expect(ops.callsTo('SubmitMySupportChatFeedback')[0]?.variables).toEqual({
      session_id: 's1',
      rating: 4,
      comment: 'Quick help',
    });
  });

  it('sends a null comment when none was written, and shows the refusal on failure', async () => {
    const onSubmitted = vi.fn();
    const ops = withOps(
      <FeedbackDialog open sessionId="s1" rating={null} comment={null} onClose={vi.fn()} onSubmitted={onSubmitted} />,
      {
        SubmitMySupportChatFeedback: () => {
          throw new Error('Feedback is closed for this chat');
        },
      },
    );
    fireEvent.click(screen.getByTestId('feedback-emoji-2'));
    fireEvent.click(screen.getByTestId('feedback-submit'));
    expect(await screen.findByTestId('feedback-error')).toHaveTextContent('Feedback is closed');
    expect(onSubmitted).not.toHaveBeenCalled();
    expect(ops.callsTo('SubmitMySupportChatFeedback')[0]?.variables).toMatchObject({ rating: 2, comment: null });
  });
});

describe('ReopenReasonDialog', () => {
  it('hands the trimmed reason to the caller and disables the button while re-opening', () => {
    const onSubmit = vi.fn();
    const { rerender } = render(
      <ReopenReasonDialog open loading={false} error={null} onClose={vi.fn()} onSubmit={onSubmit} />,
    );
    fireEvent.change(screen.getByTestId('reopen-reason-input'), { target: { value: '  Not fixed  ' } });
    fireEvent.click(screen.getByTestId('reopen-submit'));
    expect(onSubmit).toHaveBeenCalledWith('Not fixed');

    rerender(<ReopenReasonDialog open loading error="Window passed" onClose={vi.fn()} onSubmit={onSubmit} />);
    expect(screen.getByTestId('reopen-submit')).toBeDisabled();
    expect(screen.getByTestId('reopen-error')).toHaveTextContent('Window passed');
  });

  it('allows an empty reason and closes on cancel', () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    render(<ReopenReasonDialog open loading={false} error={null} onClose={onClose} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByTestId('reopen-submit'));
    expect(onSubmit).toHaveBeenCalledWith('');
    fireEvent.click(screen.getByTestId('reopen-cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
