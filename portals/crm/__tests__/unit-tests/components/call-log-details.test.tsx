import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { CallLogSummary, CommunicationLogItem } from '@/api/comms.gql';

vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  formatTime: (d: Date) => `t:${d.toISOString().slice(11, 16)}`,
}));

import CallLogDetails from '@/components/CommsLogsSection/CallLogDetails';
import CallSummaryCard from '@/components/CommsLogsSection/CallSummaryCard';

const call = (over: Partial<CommunicationLogItem> = {}): CommunicationLogItem => ({
  id: 'log-1',
  type: 'CALL',
  direction: 'OUTBOUND',
  entity_type: 'CREATOR_LEAD',
  entity_id: 'c-1',
  provider_id: null,
  provider_name: 'twilio',
  contact_name: 'Asha',
  contact_value: '+919800000000',
  subject: 'Portal Call',
  status: 'COMPLETED',
  error_message: null,
  duration_seconds: 64,
  recording_url: null,
  transcript: null,
  transcript_status: 'PENDING',
  created_by: 'agent-1',
  created_at: '2026-11-22T10:00:00.000Z',
  ...over,
});

const summary = (over: Partial<CallLogSummary> = {}): CallLogSummary => ({
  status: 'READY',
  text: 'Asha wants pricing for a workshop.',
  key_points: ['Workshop for 30', 'Weekend preferred'],
  sentiment: 'POSITIVE',
  outcome: 'Interested',
  follow_ups: ['Send pricing'],
  reminder_id: 'rem-1',
  error: '',
  ...over,
});

const details = (log: CommunicationLogItem, handlers: { onSummarize?: () => void; summarizing?: boolean } = {}) =>
  render(
    <CallLogDetails
      log={log}
      onRequestTranscript={vi.fn()}
      onSummarize={handlers.onSummarize ?? vi.fn()}
      summarizing={handlers.summarizing}
    />
  );

describe('CallLogDetails', () => {
  it('shows a live transcript by speaker, with times, and the number the call came from', () => {
    details(
      call({
        from_number: '+15550001111',
        transcript_status: 'READY',
        transcript: 'Agent: Hi\nLead: Hello',
        transcript_segments: [
          { seq: 1, speaker: 'AGENT', text: 'Hi Asha', at: '2026-11-22T10:00:05.000Z' },
          { seq: 2, speaker: 'LEAD', text: 'Hello!', at: null },
        ],
      })
    );

    expect(screen.getByText('From +15550001111')).toBeInTheDocument();
    const lines = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(lines[0]).toHaveTextContent('You · t:10:00Hi Asha');
    expect(lines[1]).toHaveTextContent('ContactHello!');
  });

  it('falls back to the plain transcript text when there are no segments', () => {
    details(call({ transcript_status: 'READY', transcript: 'Agent: Hi' }));
    expect(screen.getByText('Agent: Hi')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('offers no summary until there is a transcript', () => {
    details(call());
    expect(screen.getByText('Transcript pending')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Generate summary' })).not.toBeInTheDocument();
  });

  it('asks for the summary of this log', () => {
    const onSummarize = vi.fn();
    details(call({ transcript_segments: [{ seq: 1, speaker: 'LEAD', text: 'Call me', at: null }] }), { onSummarize });

    fireEvent.click(screen.getByRole('button', { name: 'Generate summary' }));

    expect(onSummarize).toHaveBeenCalledTimes(1);
  });
});

describe('CallSummaryCard', () => {
  it('shows the summary, sentiment, outcome, points, follow-ups and the created reminder', () => {
    const onSummarize = vi.fn();
    render(<CallSummaryCard summary={summary()} canSummarize busy={false} onSummarize={onSummarize} />);

    const card = screen.getByTestId('call-summary');
    expect(within(card).getByText('Asha wants pricing for a workshop.')).toBeInTheDocument();
    expect(within(card).getByText('Positive')).toBeInTheDocument();
    expect(within(card).getByText('Follow-up reminder created')).toBeInTheDocument();
    expect(card).toHaveTextContent('Outcome: Interested');
    expect(within(card).getByText('Workshop for 30')).toBeInTheDocument();
    expect(within(card).getByText('Send pricing')).toBeInTheDocument();

    fireEvent.click(within(card).getByRole('button', { name: 'Retry summary' }));
    expect(onSummarize).toHaveBeenCalled();
  });

  it('leaves out what the summary does not have', () => {
    render(
      <CallSummaryCard
        summary={summary({ sentiment: null, outcome: '', key_points: [], follow_ups: [], reminder_id: null })}
        canSummarize
        busy={false}
        onSummarize={vi.fn()}
      />
    );

    expect(screen.queryByText('Key points')).not.toBeInTheDocument();
    expect(screen.queryByText('Follow-ups')).not.toBeInTheDocument();
    expect(screen.queryByText(/Outcome/)).not.toBeInTheDocument();
    expect(screen.queryByText('Follow-up reminder created')).not.toBeInTheDocument();
  });

  it.each([
    ['NEGATIVE', 'Negative'],
    ['MIXED', 'Mixed'],
    ['NEUTRAL', 'Neutral'],
  ] as const)('labels a %s sentiment', (sentiment, label) => {
    render(<CallSummaryCard summary={summary({ sentiment })} canSummarize busy={false} onSummarize={vi.fn()} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('shows progress while the summary is being made, from the server or this click', () => {
    const { rerender } = render(<CallSummaryCard summary={summary({ status: 'PENDING' })} canSummarize busy={false} onSummarize={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Summarising the call…');

    rerender(<CallSummaryCard summary={null} canSummarize busy onSummarize={vi.fn()} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('explains a failure and offers a retry', () => {
    const onSummarize = vi.fn();
    render(<CallSummaryCard summary={summary({ status: 'FAILED', error: 'AI switched off' })} canSummarize busy={false} onSummarize={onSummarize} />);

    expect(screen.getByText('Summary failed · AI switched off')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry summary' }));
    expect(onSummarize).toHaveBeenCalled();
  });

  it('explains a failure that gave no reason', () => {
    render(<CallSummaryCard summary={summary({ status: 'FAILED', error: '' })} canSummarize busy={false} onSummarize={vi.fn()} />);
    expect(screen.getByText('Summary failed')).toBeInTheDocument();
  });

  it('shows nothing when there is nothing to summarise yet', () => {
    const { container } = render(<CallSummaryCard summary={undefined} canSummarize={false} busy={false} onSummarize={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
