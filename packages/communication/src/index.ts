import { AiSensyProvider, type AiSensyConfig } from './providers/aisensy';
import { createWhatsAppChannel, type WhatsAppChannel } from './whatsapp';
import type { WhatsAppProvider } from './types';
import { createEmailChannel, type EmailChannel, type EmailChannelConfig } from './email/email';
import { ResendProvider, type ResendConfig } from './email/providers/resend';
import type { EmailProvider } from './email/interfaces/provider';

/**
 * @duncit/communication — how Duncit talks to people, provider-agnostic.
 *
 * ```ts
 * const communication = createCommunication({ whatsapp: { aisensy: { apiKey } } });
 *
 * await communication.whatsapp.utility.send({
 *   campaign: 'booking_confirmation',
 *   to: '+919876543210',
 *   name: 'Suryansh',
 *   variables: ['POD-1021', '₹299'],
 * });
 * ```
 *
 * Zero runtime dependencies, so the server, a portal, a script or a Lambda can
 * all use the same one.
 */

export interface CommunicationConfig {
  whatsapp?: {
    /** Configure the bundled AiSensy provider. */
    aisensy?: AiSensyConfig;
    /**
     * Or hand over any provider of your own — Meta Cloud API, Twilio, Gupshup,
     * Interakt, a fake in a test. It wins over `aisensy` when both are given.
     */
    provider?: WhatsAppProvider;
  };
  email?: EmailChannelConfig & {
    /** Configure the bundled Resend provider. */
    resend?: ResendConfig;
    /**
     * Or hand over any provider of your own — AWS SES, SendGrid, Postmark,
     * Brevo, Mailgun, SMTP, the bundled mock. It wins over `resend` when both
     * are given, which is also how a test swaps the network out.
     */
    provider?: EmailProvider;
  };
}

export interface Communication {
  readonly whatsapp: WhatsAppChannel;
  readonly email: EmailChannel;
}

/**
 * Build a communication client.
 *
 * Every channel always exists. With no config for one, its sends throw a
 * configuration error — a caller never has to null-check the client, and a
 * missing key fails loudly rather than silently doing nothing.
 */
export function createCommunication(config: CommunicationConfig = {}): Communication {
  const custom = config.whatsapp?.provider;
  const aisensy = config.whatsapp?.aisensy;
  const provider = custom ?? (aisensy ? new AiSensyProvider(aisensy) : null);

  const { resend, provider: emailProvider, ...emailConfig } = config.email ?? {};
  const email = emailProvider ?? (resend ? new ResendProvider(resend) : null);

  return {
    whatsapp: createWhatsAppChannel(provider),
    email: createEmailChannel(email, emailConfig),
  };
}

export { AiSensyProvider, type AiSensyConfig, type ConfigValue } from './providers/aisensy';
export {
  createWhatsAppChannel,
  assertValidSendOptions,
  type WhatsAppChannel,
  type WhatsAppCategorySender,
} from './whatsapp';
export {
  CommunicationError,
  CommunicationValidationError,
  CommunicationConfigError,
  CommunicationProviderError,
} from './errors';
export {
  HttpTransport,
  DEFAULT_RETRY,
  isRetryableStatus,
  redact,
  type HttpRequest,
  type HttpResponse,
  type RetryPolicy,
  type TransportOptions,
} from './transport';
export type {
  CommunicationLogEvent,
  CommunicationLogger,
  WhatsAppCategory,
  WhatsAppMedia,
  WhatsAppProvider,
  WhatsAppSendOptions,
  WhatsAppSendResult,
} from './types';
// Reading an AiSensy template, and the catalogue of messages Duncit sends on
// its own. Data and pure functions only — no transport, no credential.
export {
  WA_TEMPLATE_CATEGORIES,
  templateParamCount,
  templateParamError,
  templateSegments,
  renderTemplateBody,
  type AisensyCampaign,
  type AisensyTemplate,
  type WaBodySegment,
  type WaHeaderFormat,
  type WaMediaRef,
  type WaTemplateCategory,
} from './wa-template';
export {
  WA_EVENTS,
  WA_EVENT_BY_KEY,
  WA_OPTIONAL_CATEGORIES,
  WA_REQUIRED_CATEGORIES,
  isRequiredWaCategory,
  waEventArity,
  type WaAudience,
  type WaCategory,
  type WaEvent,
} from './wa-events';
// The email channel, re-exported whole. `@duncit/communication/email` is not a
// separate entry point on purpose — one import path, and the bundler drops what
// an app does not reference.
export * from './email';
