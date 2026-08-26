import { logs } from '@observability/log';
import { WaMessageLogModel } from './waMessageLog.model';

/**
 * A WhatsApp message a PERSON sent, filed in the same log every automatic
 * message lands in.
 *
 * Two surfaces send one by hand — Marketing's "Send test" and the Tech portal's
 * AiSensy connection test — and both went out through the gateway directly and
 * left no trace anywhere. They are real messages on a real template and they
 * are billed like any other, so "I sent a test and nothing arrived" had no
 * answer in the console.
 *
 * It lives in its own file rather than in `whatsapp.service` because the Tech
 * portal's caller is `envEntry.connection`, and `whatsapp.service` reaches
 * `envEntry.service` through the AiSensy gateway — importing it there would
 * close a cycle. Everything here needs is the model.
 */

/** Marketing → WhatsApp → Campaigns → Send test. */
export const WA_MANUAL_EVENT_KEY = 'MANUAL_TEST_SEND';

/** Tech → Environment Variables → AiSensy → Test connection. */
export const WA_CONNECTION_TEST_EVENT_KEY = 'TECH_CONNECTION_TEST';

export interface WaManualLogInput {
  /** Which surface sent it — the Logs table draws this in Reference, so a row
   * says who pressed the button rather than which scenario fired. */
  key: string;
  /** The AiSensy campaign the message was addressed to. */
  campaign: string;
  destination: string;
  /** Meta's category at send time, which is what the rate was read from. */
  template_category?: string;
  msg_rate?: number;
  params?: readonly string[];
  media?: { url: string; filename: string } | null;
  submitted_message_id?: string;
  /** Empty on a clean send; AiSensy's own sentence on a rejected one. */
  reason?: string;
  duration_ms: number;
}

/**
 * File one by-hand send. Never throws — a log write must not turn a message
 * that went out into an error the operator sees.
 *
 * `holds_slot` is false: the one-message-per-event-per-recipient index exists
 * to stop a domain event firing twice, and somebody testing the same template
 * twice on purpose must not be refused the second one.
 */
export async function recordManualSend(input: WaManualLogInput): Promise<void> {
  await WaMessageLogModel.create({
    event_key: input.key,
    campaign: input.campaign,
    // Our consent category, not Meta's. A message a person sent by hand is a
    // support action; nothing reads it as an opt-out switch.
    category: 'support',
    audience: 'SUPPORT',
    destination: input.destination,
    status: input.reason ? 'FAILED' : 'SENT',
    reason: input.reason ?? '',
    params: (input.params ?? []).map((value) => String(value ?? '')),
    media_url: input.media?.url ?? '',
    media_filename: input.media?.filename ?? '',
    submitted_message_id: input.submitted_message_id ?? '',
    template_category: input.template_category ?? '',
    msg_rate: input.msg_rate ?? 0,
    duration_ms: input.duration_ms,
    holds_slot: false,
  }).catch((error) => logs.server.warn('whatsapp', 'record', { error, event: input.key }));
}
