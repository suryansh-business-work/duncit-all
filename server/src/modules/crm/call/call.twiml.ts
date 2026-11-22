import type { CommsLogEntity } from '@modules/crm/communicationLog/communicationLog.model';

/** XML-escape a value before embedding it in TwiML. */
export const escapeXml = (value: string) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

/**
 * Map a Twilio call/dial status to our CommunicationLog status enum.
 * Twilio call: queued | ringing | in-progress | completed | busy | no-answer | failed | canceled
 * Dial result: completed | answered | busy | no-answer | failed | canceled
 */
export function mapTwilioStatus(raw: string): string {
  switch ((raw || '').toLowerCase()) {
    case 'ringing':
      return 'RINGING';
    case 'in-progress':
    case 'answered':
      return 'IN_PROGRESS';
    case 'completed':
      return 'COMPLETED';
    case 'busy':
      return 'BUSY';
    case 'no-answer':
      return 'NO_ANSWER';
    case 'failed':
    case 'canceled':
      return 'FAILED';
    case 'queued':
    case 'initiated':
    default:
      return 'INITIATED';
  }
}

const TERMINAL = new Set(['COMPLETED', 'BUSY', 'NO_ANSWER', 'FAILED']);
export const isTerminalStatus = (status: string) => TERMINAL.has(status);

const TTS_LANG = (language?: string | null) => {
  const lang = (language || '').toLowerCase();
  if (!lang || lang === 'auto') return 'hi-IN';
  return lang.startsWith('hi') ? 'hi-IN' : 'en-IN';
};

/** The conference both legs of one portal call join; named after the log so every webhook can find it. */
export const conferenceName = (logId: string) => `crm-${logId}`;

/**
 * Portal (human) call, customer leg: the lead has answered. They hear the
 * recording notice (only when the call is recorded or transcribed), live
 * transcription starts on both directions of their line, and they wait in the
 * call's conference until the agent's phone joins it. Plain Twilio `<Say>`
 * (not Servam/`<Play>`), so a normal call never depends on TTS.
 *
 * On this leg Twilio's inbound track is the lead speaking and the outbound
 * track is everything sent to them — the agent — which is how the transcript
 * tells the speakers apart. Either side hanging up ends the conference.
 */
export function buildPortalConferenceTwiml(opts: {
  conference: string;
  notice?: string | null;
  transcription?: { callbackUrl: string; language: string } | null;
  recordingCallbackUrl?: string | null;
}): string {
  const say = opts.notice && (opts.transcription || opts.recordingCallbackUrl) ? `<Say>${escapeXml(opts.notice)}</Say>` : '';
  const transcribe = opts.transcription
    ? `<Start><Transcription statusCallbackUrl="${escapeXml(opts.transcription.callbackUrl)}" statusCallbackMethod="POST" track="both_tracks" languageCode="${escapeXml(opts.transcription.language)}" partialResults="false"/></Start>`
    : '';
  const record = opts.recordingCallbackUrl
    ? ` record="record-from-start" recordingStatusCallback="${escapeXml(opts.recordingCallbackUrl)}" recordingStatusCallbackMethod="POST"`
    : '';
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Response>',
    say,
    transcribe,
    '<Dial>',
    `<Conference startConferenceOnEnter="false" endConferenceOnExit="true" beep="false"${record}>${escapeXml(opts.conference)}</Conference>`,
    '</Dial>',
    '</Response>',
  ].join('');
}

/** AI call turn: play the Servam-voiced line, then listen for the customer's speech. */
export function buildAiPlayGatherTwiml(opts: {
  audioUrl: string;
  actionUrl: string;
  language?: string | null;
  hangup?: boolean;
}): string {
  const play = `<Play>${escapeXml(opts.audioUrl)}</Play>`;
  if (opts.hangup) {
    return ['<?xml version="1.0" encoding="UTF-8"?>', '<Response>', play, '<Hangup/>', '</Response>'].join('');
  }
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Response>',
    `<Gather input="speech" language="${TTS_LANG(opts.language)}" speechTimeout="auto" action="${escapeXml(opts.actionUrl)}" method="POST">`,
    play,
    '</Gather>',
    '<Hangup/>',
    '</Response>',
  ].join('');
}

/** Last-resort spoken line when Servam TTS is unavailable (uses Twilio's own voice). */
export function buildSayHangupTwiml(text: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Say>${escapeXml(text)}</Say><Hangup/></Response>`;
}

export interface CallEntityRef {
  entity_type: CommsLogEntity;
  entity_id: string;
}
