import type { EmailSendOptions } from './options';
import type { EmailSendResult, PreparedEmail } from './provider';

/**
 * The extension points. Three of them, and they do different jobs on purpose:
 *
 *  - **middleware** can CHANGE the message (add a footer, stamp a tag, refuse a
 *    marketing send to an unsubscribed address);
 *  - **hooks** only OBSERVE (metrics, an audit row, a trace span);
 *  - the **logger** observes the wire underneath (attempts, statuses, timings).
 *
 * Keeping "can rewrite the email" apart from "wants to know about it" is what
 * stops a metrics counter from silently changing a customer's message.
 */

/** Everything a middleware or hook is told about one send. */
export interface EmailContext {
  /** What the caller asked for, untouched. */
  readonly options: EmailSendOptions;
  /** Which provider will carry it. */
  readonly provider: string;
  /** Somewhere to carry values between middlewares of one send. */
  readonly state: Record<string, unknown>;
}

/**
 * Wraps a send. Call `next(email)` to continue — with the message you were
 * given or a changed one — or return a result without calling it to stop the
 * send, or throw to fail it.
 */
export type EmailMiddleware = (
  email: PreparedEmail,
  context: EmailContext,
  next: (email: PreparedEmail) => Promise<EmailSendResult>,
) => Promise<EmailSendResult>;

/** Runs after the message is prepared and before the provider is called. */
export type EmailRequestHook = (email: PreparedEmail, context: EmailContext) => void;

/** Runs after the provider accepts the message. */
export type EmailResponseHook = (
  result: EmailSendResult,
  email: PreparedEmail,
  context: EmailContext,
) => void;

/** Runs when a send fails, whatever the reason. */
export type EmailErrorHook = (error: unknown, email: PreparedEmail, context: EmailContext) => void;

export interface EmailHooks {
  onRequest?: EmailRequestHook;
  onResponse?: EmailResponseHook;
  onError?: EmailErrorHook;
}
