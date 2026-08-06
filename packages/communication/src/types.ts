/**
 * The contract every WhatsApp provider answers to.
 *
 * Nothing in here names AiSensy. That is the point: the day Duncit moves to
 * Meta's Cloud API, Twilio, Gupshup or Interakt, a new provider is written
 * against this file and every call site keeps working unchanged.
 */

/**
 * WhatsApp's own message categories. Meta prices and rate-limits by category,
 * and a template is APPROVED for exactly one — sending a marketing blast down a
 * utility template is how a number gets restricted, so the category travels
 * with the message rather than being assumed.
 */
export type WhatsAppCategory = 'UTILITY' | 'MARKETING' | 'AUTHENTICATION' | 'SERVICE';

/** Media attached to a template that has a header placeholder for it. */
export interface WhatsAppMedia {
  url: string;
  /** Shown to the recipient for documents. Ignored for images and video. */
  filename?: string;
}

/** What a caller passes to send a single WhatsApp message. */
export interface WhatsAppSendOptions {
  /** The approved campaign/template name at the provider. Required. */
  campaign: string;
  /** Destination in E.164 (`+919876543210`). Required. */
  to: string;
  /** Recipient's name, where the provider records one against the send. */
  name?: string;
  /** Ordered template placeholders, in the order the template declares them. */
  variables?: Array<string | number>;
  media?: WhatsAppMedia;
  /** Where the send came from, for the provider's own reporting. */
  source?: string;
  tags?: string[];
  attributes?: Record<string, string>;
  /**
   * Set by the category helpers. A caller may pass it to the generic `send`,
   * but `whatsapp.utility.send` and friends are the readable way.
   */
  category?: WhatsAppCategory;
}

/** What a send returns, whichever provider handled it. */
export interface WhatsAppSendResult {
  /** The provider's own id for the queued message, when it gives one. */
  messageId: string | null;
  /** Which provider handled it — useful in logs when more than one is live. */
  provider: string;
  /** The provider's untouched response, for anything the shape above omits. */
  raw: unknown;
}

/**
 * A WhatsApp provider. Implement this and pass it to `createCommunication` —
 * nothing else in the package or its callers has to change.
 */
export interface WhatsAppProvider {
  /** Identifies the provider in results, errors and logs. */
  readonly name: string;
  /** Send one message. Throws a {@link CommunicationError} on failure. */
  send(options: WhatsAppSendOptions): Promise<WhatsAppSendResult>;
  /** Whether the provider has everything it needs to send. */
  isConfigured(): Promise<boolean>;
}

/** One line of the request/response log. */
export interface CommunicationLogEvent {
  provider: string;
  /** `request` before the call, `response` after a success, `error` after a failure. */
  phase: 'request' | 'response' | 'error';
  /** Milliseconds the call took. Present on `response` and `error`. */
  durationMs?: number;
  /** Which attempt this was, counting from 1. */
  attempt?: number;
  /** Never contains the API key — the transport strips it before logging. */
  detail?: Record<string, unknown>;
}

/** Called before and after every provider call. Never throws into the caller. */
export type CommunicationLogger = (event: CommunicationLogEvent) => void;
