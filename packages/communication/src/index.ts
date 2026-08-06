import { AiSensyProvider, type AiSensyConfig } from './providers/aisensy';
import { createWhatsAppChannel, type WhatsAppChannel } from './whatsapp';
import type { WhatsAppProvider } from './types';

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
}

export interface Communication {
  readonly whatsapp: WhatsAppChannel;
}

/**
 * Build a communication client.
 *
 * With no WhatsApp config the channel still exists and every send throws a
 * {@link CommunicationConfigError} — a caller never has to null-check the
 * client, and a missing key fails loudly rather than silently doing nothing.
 */
export function createCommunication(config: CommunicationConfig = {}): Communication {
  const custom = config.whatsapp?.provider;
  const aisensy = config.whatsapp?.aisensy;
  const provider = custom ?? (aisensy ? new AiSensyProvider(aisensy) : null);

  return { whatsapp: createWhatsAppChannel(provider) };
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
