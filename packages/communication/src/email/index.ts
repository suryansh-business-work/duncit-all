/**
 * The email channel's public surface.
 *
 * Every export here is a named one from its own module, so a bundler drops what
 * an app does not import — a browser build that only calls `send` never pulls
 * in the mock provider or the in-memory renderer.
 */

export { createEmailChannel } from './email';
export type { EmailChannel, EmailChannelConfig } from './email';

export { ResendProvider } from './providers/resend';
export type { ResendConfig, ResendConfigValue } from './providers/resend';
export { MockEmailProvider } from './providers/mock';

export {
  EmailConfigurationError,
  EmailProviderError,
  EmailRateLimitError,
  EmailTemplateError,
  EmailValidationError,
} from './errors';

export { InMemoryTemplateRenderer, applyVariables } from './templates/renderer';
export type {
  EmailTemplateDefinition,
  EmailTemplateRenderer,
  RenderedEmail,
} from './templates/renderer';

export { composeMiddleware } from './middleware/pipeline';

export {
  assertValidEmailOptions,
  bareAddress,
  deriveIdempotencyKey,
  hash32,
  htmlToText,
  isEmailAddress,
  toAddressList,
} from './utils';
export { toBase64 } from './utils/base64';

export { EMAIL_CATEGORIES } from './interfaces/options';
export type { EmailAttachment, EmailCategory, EmailSendOptions } from './interfaces/options';
export type { EmailProvider, EmailSendResult, PreparedEmail } from './interfaces/provider';
export type {
  EmailContext,
  EmailErrorHook,
  EmailHooks,
  EmailMiddleware,
  EmailRequestHook,
  EmailResponseHook,
} from './interfaces/hooks';
