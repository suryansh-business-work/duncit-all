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

/**
 * Portal (human) call: the agent's phone has answered — a short spoken notice,
 * then bridge to the customer. Uses plain Twilio `<Say>` (NOT Servam/`<Play>`)
 * so a normal call never depends on TTS / audio hosting. `callerId` is the
 * Twilio number shown to the customer; `action` reports the dial outcome so the
 * CRM can mark the call "over" live.
 */
export function buildPortalDialTwiml(opts: {
  dialTo: string;
  callerId?: string;
  actionUrl: string;
  recordingCallbackUrl?: string;
}): string {
  const record = opts.recordingCallbackUrl
    ? ` record="record-from-answer-dual" recordingStatusCallback="${escapeXml(opts.recordingCallbackUrl)}" recordingStatusCallbackMethod="POST"`
    : '';
  const caller = opts.callerId ? ` callerId="${escapeXml(opts.callerId)}"` : '';
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Response>',
    '<Say>Connecting your Duncit call now.</Say>',
    `<Dial answerOnBridge="true"${caller} action="${escapeXml(opts.actionUrl)}" method="POST"${record}>`,
    `<Number>${escapeXml(opts.dialTo)}</Number>`,
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
