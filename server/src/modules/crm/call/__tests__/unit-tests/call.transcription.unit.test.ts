/**
 * Live transcription callbacks: only finished utterances are kept, the
 * speaker comes from which side of the lead's line the audio was on, a
 * retried callback is stored (and shown) once, and the end of the call turns
 * the segments into the transcript and starts the summary.
 */
jest.mock('@modules/crm/communicationLog/communicationLog.service', () => ({
  communicationLogService: { appendTranscriptSegment: jest.fn(), finalizeLiveTranscript: jest.fn() },
}));
jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn() } } }));
jest.mock('./../../call.socket', () => ({ emitCallTranscript: jest.fn() }));
jest.mock('./../../call.summary', () => ({ summarizeCallInBackground: jest.fn() }));

import { communicationLogService } from '@modules/crm/communicationLog/communicationLog.service';
import { logs } from '@observability/log';
import { emitCallTranscript } from '../../call.socket';
import { summarizeCallInBackground } from '../../call.summary';
import { handleTranscriptionEvent, speakerFor } from '../../call.transcription';

const store = communicationLogService as unknown as Record<string, jest.Mock>;
const emit = emitCallTranscript as jest.Mock;
const summarize = summarizeCallInBackground as jest.Mock;

const content = (over: Record<string, string | string[]> = {}) => ({
  TranscriptionEvent: 'transcription-content',
  Final: 'true',
  Track: 'inbound_track',
  SequenceId: '3',
  Timestamp: '2026-11-22T10:00:05.000Z',
  TranscriptionData: JSON.stringify({ transcript: ' Call me on Monday ', confidence: 0.91 }),
  ...over,
});
const run = (body: Record<string, string | string[] | undefined>) => handleTranscriptionEvent({ logId: 'log1', userId: 'agent1', body });

beforeEach(() => {
  store.appendTranscriptSegment.mockResolvedValue(true);
  store.finalizeLiveTranscript.mockResolvedValue({ id: 'log1' });
});

describe('speakerFor', () => {
  it('reads the inbound track as the lead and everything else as the agent', () => {
    expect(speakerFor('inbound_track')).toBe('LEAD');
    expect(speakerFor('outbound_track')).toBe('AGENT');
  });
});

describe('handleTranscriptionEvent', () => {
  it('stores a finished utterance and pushes it to the agent', async () => {
    await run(content());

    const segment = {
      seq: 3,
      track: 'inbound_track',
      speaker: 'LEAD',
      text: 'Call me on Monday',
      confidence: 0.91,
      at: new Date('2026-11-22T10:00:05.000Z'),
    };
    expect(store.appendTranscriptSegment).toHaveBeenCalledWith('log1', segment);
    expect(emit).toHaveBeenCalledWith('agent1', { log_id: 'log1', ...segment, at: '2026-11-22T10:00:05.000Z' });
  });

  it('reads a callback without a track as the agent side', async () => {
    await run({ ...content(), Track: undefined });
    expect(store.appendTranscriptSegment).toHaveBeenCalledWith('log1', expect.objectContaining({ track: '', speaker: 'AGENT' }));
  });

  it('shows a retried callback only once', async () => {
    store.appendTranscriptSegment.mockResolvedValue(false);
    await run(content());
    expect(emit).not.toHaveBeenCalled();
  });

  it('labels the agent side and copes with a missing time, sequence and confidence', async () => {
    await run(
      content({
        Track: ['outbound_track'],
        SequenceId: '',
        Timestamp: 'not a time',
        TranscriptionData: JSON.stringify({ transcript: 'Sure', confidence: 'high' }),
      })
    );

    expect(store.appendTranscriptSegment).toHaveBeenCalledWith('log1', {
      seq: 0,
      track: 'outbound_track',
      speaker: 'AGENT',
      text: 'Sure',
      confidence: null,
      at: null,
    });
    expect(emit).toHaveBeenCalledWith('agent1', expect.objectContaining({ at: null }));
  });

  it.each([
    ['a partial result', content({ Final: 'false' })],
    ['an empty utterance', content({ TranscriptionData: JSON.stringify({ transcript: '  ' }) })],
    ['a transcript that is not text', content({ TranscriptionData: JSON.stringify({ transcript: 5 }) })],
    ['data that is not JSON', content({ TranscriptionData: '{broken' })],
    ['no data at all', content({ TranscriptionData: [] as unknown as string })],
  ])('ignores %s', async (_label, body) => {
    await run(body);
    expect(store.appendTranscriptSegment).not.toHaveBeenCalled();
  });

  it('writes the transcript and starts the summary when transcription stops', async () => {
    await run({ TranscriptionEvent: 'transcription-stopped' });

    expect(store.finalizeLiveTranscript).toHaveBeenCalledWith('log1');
    expect(summarize).toHaveBeenCalledWith('log1');
  });

  it('starts no summary for a call with nothing transcribed', async () => {
    store.finalizeLiveTranscript.mockResolvedValue(null);
    await run({ TranscriptionEvent: 'transcription-stopped' });
    expect(summarize).not.toHaveBeenCalled();
  });

  it('logs a transcription error without request data', async () => {
    await run({ TranscriptionEvent: 'transcription-error', TranscriptionData: 'secret words' });
    expect(logs.server.warn).toHaveBeenCalledWith('twilio', 'transcription', {
      log_id: 'log1',
      msg: 'Live transcription reported an error',
    });
  });

  it('does nothing for an event it does not handle', async () => {
    await run({ TranscriptionEvent: 'transcription-started' });
    expect(store.appendTranscriptSegment).not.toHaveBeenCalled();
    expect(store.finalizeLiveTranscript).not.toHaveBeenCalled();
    expect(logs.server.warn).not.toHaveBeenCalled();
  });
});
