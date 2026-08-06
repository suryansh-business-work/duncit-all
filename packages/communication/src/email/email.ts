import { EmailConfigurationError, EmailTemplateError } from './errors';
import type { EmailContext, EmailHooks, EmailMiddleware } from './interfaces/hooks';
import type { EmailSendOptions } from './interfaces/options';
import type { EmailProvider, EmailSendResult, PreparedEmail } from './interfaces/provider';
import { composeMiddleware } from './middleware/pipeline';
import type { EmailTemplateRenderer, RenderedEmail } from './templates/renderer';
import { toAddressList } from './utils/address';
import { deriveIdempotencyKey } from './utils/idempotency';
import { htmlToText } from './utils/text';
import { assertValidEmailOptions } from './utils/validate';

/**
 * The email channel — the only thing a caller touches.
 *
 * It owns the ORDER of a send and nothing else:
 *
 *   validate → render → normalise → middleware → hooks → provider
 *
 * Every step is behind an interface, so the channel never learns which provider
 * is live, where templates come from, or what a host does with the events. That
 * is what makes swapping Resend for SES a config line instead of a rewrite.
 */

export interface EmailChannelConfig {
  /** Where the mail comes from when a message does not say. Required to send. */
  from?: string;
  /** Applied to every send unless the message names its own. */
  replyTo?: string;
  /** Renders `template` into a body. Without one, a templated send fails loudly. */
  renderer?: EmailTemplateRenderer;
  /** Run in registration order, outermost first. May rewrite or stop a send. */
  middleware?: EmailMiddleware[];
  /** Observe only — a hook that throws never fails the send. */
  hooks?: EmailHooks;
  /** Added to every message, e.g. `{ environment: 'staging' }`. */
  defaultMetadata?: Record<string, string>;
  /** Added to every message's tag list. */
  defaultTags?: string[];
  /** Added to every message's headers, e.g. a `List-Unsubscribe` endpoint. */
  defaultHeaders?: Record<string, string>;
}

export interface EmailChannel {
  /** The single public API. Everything is decided by what is in `options`. */
  send(options: EmailSendOptions): Promise<EmailSendResult>;
  /** Which provider is live — useful in logs when more than one is configured. */
  readonly provider: string;
  /** Whether a send would reach a provider at all. */
  isConfigured(): Promise<boolean>;
}

/** A hook must never be able to fail a send it only wanted to watch. */
function observe(run: (() => void) | undefined): void {
  try {
    run?.();
  } catch {
    // Observability is never worth a lost email.
  }
}

async function renderBody(
  options: EmailSendOptions,
  renderer: EmailTemplateRenderer | undefined,
): Promise<RenderedEmail> {
  if (!options.template) {
    return { html: options.html ?? '', text: options.text, subject: undefined };
  }
  if (!renderer) {
    throw new EmailTemplateError(
      `A template ("${options.template}") was asked for but no renderer is configured`,
      options.template,
    );
  }
  return renderer.render(options.template, options.variables ?? {});
}

/**
 * Build the channel.
 *
 * With no provider the channel still exists and every send throws an
 * {@link EmailConfigurationError} — a caller never has to null-check the client,
 * and a missing key fails loudly rather than silently doing nothing.
 */
export function createEmailChannel(
  provider: EmailProvider | null,
  config: EmailChannelConfig = {},
): EmailChannel {
  const providerName = provider?.name ?? 'none';

  const deliver = (email: PreparedEmail): Promise<EmailSendResult> => {
    if (!provider) {
      return Promise.reject(
        new EmailConfigurationError('No email provider is configured, so nothing was sent'),
      );
    }
    return provider.send(email);
  };

  const pipeline = composeMiddleware(config.middleware ?? [], deliver);

  const prepare = async (options: EmailSendOptions): Promise<PreparedEmail> => {
    const rendered = await renderBody(options, config.renderer);
    const html = rendered.html || options.html || '';
    // A template's own subject wins: it is the one an admin edited alongside
    // the body, and it is localized with it.
    const subject = (rendered.subject || options.subject).trim();
    // Never ship a body-less message — the text part is derived when missing.
    const text = options.text ?? rendered.text ?? htmlToText(html);

    const to = toAddressList(options.to);
    const cc = toAddressList(options.cc);
    const bcc = toAddressList(options.bcc);
    const from = options.from ?? config.from ?? '';
    if (!from) {
      throw new EmailConfigurationError(
        'No from address: set `from` on the channel or on the message',
        providerName,
      );
    }

    return {
      category: options.category,
      from,
      to,
      cc,
      bcc,
      subject,
      html,
      text,
      attachments: options.attachments ?? [],
      replyTo: options.replyTo ?? config.replyTo,
      tags: [...(config.defaultTags ?? []), ...(options.tags ?? [])],
      metadata: { ...config.defaultMetadata, ...options.metadata },
      headers: { ...config.defaultHeaders, ...options.headers },
      idempotencyKey:
        options.idempotencyKey ??
        deriveIdempotencyKey({ category: options.category, to, subject, html }),
    };
  };

  return {
    provider: providerName,

    async isConfigured() {
      return provider ? provider.isConfigured() : false;
    },

    async send(options: EmailSendOptions): Promise<EmailSendResult> {
      // Before anything else: a bad message must cost nothing.
      assertValidEmailOptions(options);

      const email = await prepare(options);
      const context: EmailContext = { options, provider: providerName, state: {} };

      observe(() => config.hooks?.onRequest?.(email, context));
      try {
        const result = await pipeline(email, context);
        observe(() => config.hooks?.onResponse?.(result, email, context));
        return result;
      } catch (error) {
        observe(() => config.hooks?.onError?.(error, email, context));
        throw error;
      }
    },
  };
}
