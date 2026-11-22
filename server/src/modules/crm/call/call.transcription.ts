import { communicationLogService } from '@modules/crm/communicationLog/communicationLog.service';
import type { CallSpeaker } from '@modules/crm/communicationLog/communicationLog.model';
import { logs } from '@observability/log';
import { emitCallTranscript } from './call.socket';
import { summarizeCallInBackground } from './call.summary';
import type { FormBody } from './twilioSignature';

const field = (body: FormBody, name: string) => {
  const value = body[name];
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
};

/**
 * On the lead's leg, the inbound track is the lead talking; the outbound track
 * is what reaches them from the conference, i.e. the agent.
 */
export const speakerFor = (track: string): CallSpeaker => (track === 'inbound_track' ? 'LEAD' : 'AGENT');

function utterance(body: FormBody): { text: string; confidence: number | null } | null {
  try {
    const data = JSON.parse(field(body, 'TranscriptionData') || '{}') as { transcript?: unknown; confidence?: unknown };
    const text = typeof data.transcript === 'string' ? data.transcript.trim() : '';
    if (!text) return null;
    return { text, confidence: typeof data.confidence === 'number' ? data.confidence : null };
  } catch {
    return null;
  }
}

/**
 * One Twilio Real-Time Transcription callback for a portal call.
 *
 * - `transcription-content` (final results only) stores the utterance once —
 *   Twilio retries are deduplicated on sequence + track — and pushes it to the
 *   agent's transcript panel live.
 * - `transcription-stopped` (the call ended) writes the full transcript onto
 *   the log and starts the AI summary.
 * - `transcription-error` is logged; the recording, when there is one, still
 *   gets a transcript afterwards.
 */
export async function handleTranscriptionEvent(input: { logId: string; userId: string; body: FormBody }) {
  const { logId, userId, body } = input;
  const event = field(body, 'TranscriptionEvent');

  if (event === 'transcription-content') {
    if (field(body, 'Final') !== 'true') return;
    const said = utterance(body);
    if (!said) return;
    const track = field(body, 'Track');
    const stamp = new Date(field(body, 'Timestamp'));
    const segment = {
      seq: Number(field(body, 'SequenceId')) || 0,
      track,
      speaker: speakerFor(track),
      text: said.text,
      confidence: said.confidence,
      at: Number.isNaN(stamp.getTime()) ? null : stamp,
    };
    const added = await communicationLogService.appendTranscriptSegment(logId, segment);
    if (added) emitCallTranscript(userId, { log_id: logId, ...segment, at: segment.at?.toISOString() ?? null });
    return;
  }

  if (event === 'transcription-stopped') {
    const finished = await communicationLogService.finalizeLiveTranscript(logId);
    if (finished) summarizeCallInBackground(logId);
    return;
  }

  if (event === 'transcription-error') {
    logs.server.warn('twilio', 'transcription', { log_id: logId, msg: 'Live transcription reported an error' });
  }
}
