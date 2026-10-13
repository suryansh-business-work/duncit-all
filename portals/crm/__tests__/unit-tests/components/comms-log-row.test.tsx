import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { CommunicationLogItem } from '@/api/comms.gql';

vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  formatDateTime: (d: Date) => (Number.isNaN(d.getTime()) ? '' : `fmt:${d.toISOString()}`),
}));

import LogRow from '@/components/CommsLogsSection/LogRow';
import StatusVisual, { TranscriptWave } from '@/components/CommsLogsSection/statusVisuals';

const makeLog = (over: Partial<CommunicationLogItem> = {}): CommunicationLogItem => ({
  id: 'log-1',
  type: 'EMAIL',
  direction: 'OUTBOUND',
  entity_type: 'VENUE_LEAD',
  entity_id: 'v-1',
  provider_id: 'p-1',
  provider_name: 'Main SMTP',
  contact_name: 'Asha Rao',
  contact_value: 'asha@example.com',
  subject: 'Intro to Duncit',
  status: 'SENT',
  error_message: null,
  duration_seconds: 0,
  recording_url: null,
  transcript: null,
  transcript_status: 'NONE',
  created_by: 'agent-1',
  created_at: '2026-05-27T10:00:00.000Z',
  ...over,
});

const call = (over: Partial<CommunicationLogItem> = {}) =>
  makeLog({ type: 'CALL', subject: null, contact_value: '+919800000000', provider_name: 'Twilio', ...over });

describe('StatusVisual', () => {
  it('draws an envelope for an email and a handset for a call', () => {
    const { rerender } = render(<StatusVisual type="EMAIL" status="SENT" />);
    expect(screen.getByTestId('EmailOutlinedIcon')).toBeInTheDocument();
    expect(screen.queryByTestId('CallOutlinedIcon')).not.toBeInTheDocument();
    rerender(<StatusVisual type="CALL" status="SENT" />);
    expect(screen.getByTestId('CallOutlinedIcon')).toBeInTheDocument();
  });

  it('colours the badge by status and falls back for an unknown one', () => {
    const { container, rerender } = render(<StatusVisual type="CALL" status="FAILED" />);
    expect(container.firstChild).toHaveStyle({ color: 'rgb(239, 68, 68)' });
    rerender(<StatusVisual type="CALL" status="NO_ANSWER" />);
    expect(container.firstChild).toHaveStyle({ color: 'rgb(245, 158, 11)' });
    rerender(<StatusVisual type="CALL" status="SOMETHING_NEW" />);
    expect(container.firstChild).toHaveStyle({ color: 'rgb(99, 102, 241)' });
  });

  it('pulses only while the call is still live', () => {
    // The animation lives in an emotion rule keyed by the element's generated class.
    const rulesOf = (el: Element) => {
      const cls = [...el.classList].find((name) => name.startsWith('css-'));
      return [...document.querySelectorAll('style[data-emotion]')]
        .map((tag) => tag.textContent ?? '')
        .join('')
        .split('}')
        .filter((rule) => rule.includes(`.${cls}`))
        .join('}');
    };
    const { container, rerender } = render(<StatusVisual type="CALL" status="RINGING" />);
    expect(rulesOf(container.firstChild as Element)).toMatch(/animation:[^;]*infinite/);
    rerender(<StatusVisual type="CALL" status="COMPLETED" />);
    expect(rulesOf(container.firstChild as Element)).toMatch(/animation:s*none/);
  });
});

describe('TranscriptWave', () => {
  it('draws the sound-wave glyph with four animated bars', () => {
    const { container } = render(<TranscriptWave />);
    expect(screen.getByTestId('GraphicEqIcon')).toBeInTheDocument();
    expect(container.firstElementChild?.lastElementChild?.children).toHaveLength(4);
  });
});

describe('LogRow email', () => {
  it('shows the subject, status, provider and who it went to with the formatted time', () => {
    render(<LogRow log={makeLog()} onRequestTranscript={vi.fn()} />);
    expect(screen.getByText('Intro to Duncit')).toBeInTheDocument();
    expect(screen.getByText('SENT')).toBeInTheDocument();
    expect(screen.getByText('Main SMTP')).toBeInTheDocument();
    expect(screen.getByText('Asha Rao · asha@example.com · fmt:2026-05-27T10:00:00.000Z')).toBeInTheDocument();
    expect(screen.queryByText(/transcript/i)).not.toBeInTheDocument();
  });

  it('names a subject-less email and drops a missing contact name and provider', () => {
    render(
      <LogRow
        log={makeLog({ subject: null, contact_name: null, provider_name: null })}
        onRequestTranscript={vi.fn()}
      />,
    );
    expect(screen.getByText('(no subject)')).toBeInTheDocument();
    expect(screen.getByText('asha@example.com · fmt:2026-05-27T10:00:00.000Z')).toBeInTheDocument();
    expect(screen.queryByText('Main SMTP')).not.toBeInTheDocument();
  });

  it('shows a dash for a missing or unparsable time', () => {
    const { rerender } = render(<LogRow log={makeLog({ created_at: null })} onRequestTranscript={vi.fn()} />);
    expect(screen.getByText('Asha Rao · asha@example.com · —')).toBeInTheDocument();
    rerender(<LogRow log={makeLog({ created_at: 'not-a-date' })} onRequestTranscript={vi.fn()} />);
    expect(screen.getByText('Asha Rao · asha@example.com · —')).toBeInTheDocument();
  });

  it('surfaces the delivery error', () => {
    render(
      <LogRow log={makeLog({ status: 'FAILED', error_message: 'Mailbox full' })} onRequestTranscript={vi.fn()} />,
    );
    expect(screen.getByText('Mailbox full')).toBeInTheDocument();
    expect(screen.getByText('FAILED')).toBeInTheDocument();
  });

  it('renders an unknown status without a colour', () => {
    render(<LogRow log={makeLog({ status: 'WEIRD' })} onRequestTranscript={vi.fn()} />);
    expect(screen.getByText('WEIRD')).toBeInTheDocument();
  });
});

describe('LogRow call', () => {
  it('titles the row with the number called', () => {
    render(<LogRow log={call()} onRequestTranscript={vi.fn()} />);
    expect(screen.getByText('Call to +919800000000')).toBeInTheDocument();
  });

  it('says there is no recording yet and offers no transcript button', () => {
    render(<LogRow log={call()} onRequestTranscript={vi.fn()} />);
    expect(screen.getByText('No recording yet')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('offers to fetch a transcript for a recorded call and links the recording', () => {
    const onRequest = vi.fn();
    render(<LogRow log={call({ recording_url: 'https://rec.test/1.mp3' })} onRequestTranscript={onRequest} />);
    expect(screen.getByText('Transcript not requested')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /get transcript/i }));
    expect(onRequest).toHaveBeenCalledWith('log-1');
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://rec.test/1.mp3');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('shows a pending transcript with the fetch button disabled while refreshing', () => {
    render(
      <LogRow
        log={call({ recording_url: 'https://rec.test/1.mp3', transcript_status: 'PENDING' })}
        onRequestTranscript={vi.fn()}
        refreshing
      />,
    );
    expect(screen.getByText('Transcript pending')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /get transcript/i })).toBeDisabled();
  });

  it('offers a retry for a failed transcript', () => {
    const onRequest = vi.fn();
    render(
      <LogRow
        log={call({ recording_url: 'https://rec.test/1.mp3', transcript_status: 'FAILED' })}
        onRequestTranscript={onRequest}
      />,
    );
    expect(screen.getByText('Transcript failed')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry transcript/i }));
    expect(onRequest).toHaveBeenCalledWith('log-1');
  });

  it('shows a failed transcript without a recording as failed with no retry', () => {
    render(<LogRow log={call({ transcript_status: 'FAILED' })} onRequestTranscript={vi.fn()} />);
    expect(screen.getByText('Transcript failed')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the transcript text once it is ready', () => {
    render(
      <LogRow
        log={call({
          recording_url: 'https://rec.test/1.mp3',
          transcript_status: 'READY',
          transcript: 'Hello\nThanks for calling',
        })}
        onRequestTranscript={vi.fn()}
      />,
    );
    expect(screen.getByText(/Thanks for calling/)).toBeInTheDocument();
    expect(screen.getByTestId('GraphicEqIcon')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('treats a READY status with an empty transcript as not yet available', () => {
    render(
      <LogRow
        log={call({ recording_url: 'https://rec.test/1.mp3', transcript_status: 'READY', transcript: '' })}
        onRequestTranscript={vi.fn()}
      />,
    );
    expect(screen.getByText('Transcript not requested')).toBeInTheDocument();
  });
});
