import { CommunicationConfigError, CommunicationValidationError } from './errors';
import type {
  WhatsAppCategory,
  WhatsAppProvider,
  WhatsAppSendOptions,
  WhatsAppSendResult,
} from './types';

/**
 * The WhatsApp channel.
 *
 * `send` is the only thing that talks to a provider. The four category helpers
 * are the same call with the category filled in — which is the whole reason
 * they exist: a caller writing `whatsapp.utility.send(...)` cannot forget to
 * say what kind of message it is, and cannot say the wrong one by typo.
 */

/** E.164 as WhatsApp requires it: a leading + and 8–15 digits. */
const E164 = /^\+[1-9]\d{7,14}$/;

/** One category's `send`, so `whatsapp.utility.send` reads as a thing you can hold. */
export interface WhatsAppCategorySender {
  send(options: WhatsAppSendOptions): Promise<WhatsAppSendResult>;
}

export interface WhatsAppChannel extends WhatsAppCategorySender {
  readonly utility: WhatsAppCategorySender;
  readonly marketing: WhatsAppCategorySender;
  readonly authentication: WhatsAppCategorySender;
  readonly service: WhatsAppCategorySender;
  /** Whether the configured provider can send right now. */
  isConfigured(): Promise<boolean>;
  /** The provider's name, for logs and results. */
  readonly provider: string;
}

/**
 * Everything a caller can get wrong, caught before a request is made.
 *
 * Validating here rather than in each provider means a bad number fails the
 * same way on AiSensy and on whatever replaces it — and fails without spending
 * a network call or a rate-limit slot.
 */
export function assertValidSendOptions(options: WhatsAppSendOptions): void {
  if (!options || typeof options !== 'object') {
    throw new CommunicationValidationError('send() needs an options object.', 'options');
  }

  const campaign = typeof options.campaign === 'string' ? options.campaign.trim() : '';
  if (!campaign) {
    throw new CommunicationValidationError(
      'campaign is required — it names the approved template at the provider.',
      'campaign',
    );
  }

  const to = typeof options.to === 'string' ? options.to.trim() : '';
  if (!to) {
    throw new CommunicationValidationError('to is required — the destination number.', 'to');
  }
  if (!E164.test(to)) {
    throw new CommunicationValidationError(
      `to must be in E.164 format, like +919876543210 (received "${to}").`,
      'to',
    );
  }

  if (options.variables !== undefined && !Array.isArray(options.variables)) {
    throw new CommunicationValidationError(
      'variables must be an array, in the order the template declares them.',
      'variables',
    );
  }
  // A null or undefined inside the array silently becomes the string "null" at
  // the provider and ships to the customer that way.
  const blank = (options.variables ?? []).findIndex(
    (v) => v === null || v === undefined || v === '',
  );
  if (blank >= 0) {
    throw new CommunicationValidationError(
      `variables[${blank}] is empty — a template placeholder cannot be blank.`,
      'variables',
    );
  }

  if (options.media !== undefined && !options.media?.url) {
    throw new CommunicationValidationError('media.url is required when media is given.', 'media');
  }
}

/** Build the channel over one provider. */
export function createWhatsAppChannel(provider: WhatsAppProvider | null): WhatsAppChannel {
  const send = async (options: WhatsAppSendOptions): Promise<WhatsAppSendResult> => {
    if (!provider) {
      throw new CommunicationConfigError(
        'No WhatsApp provider is configured. Pass one to createCommunication().',
      );
    }
    assertValidSendOptions(options);
    return provider.send({
      ...options,
      to: options.to.trim(),
      campaign: options.campaign.trim(),
    });
  };

  /** A category helper: the same send, with the category set for the caller. */
  const forCategory = (category: WhatsAppCategory): WhatsAppCategorySender => ({
    send: (options) => send({ ...options, category }),
  });

  return {
    send,
    utility: forCategory('UTILITY'),
    marketing: forCategory('MARKETING'),
    authentication: forCategory('AUTHENTICATION'),
    service: forCategory('SERVICE'),
    isConfigured: async () => (provider ? provider.isConfigured() : false),
    provider: provider?.name ?? 'none',
  };
}
