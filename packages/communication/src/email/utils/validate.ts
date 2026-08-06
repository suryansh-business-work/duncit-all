import { EmailValidationError } from '../errors';
import type { EmailSendOptions } from '../interfaces/options';
import { EMAIL_CATEGORIES } from '../interfaces/options';
import { isEmailAddress, toAddressList } from './address';

/**
 * What the package refuses to send.
 *
 * Every check here runs BEFORE a provider is reached, so a bad message costs
 * nothing and the error names the field. The rules are the ones that actually
 * cost money or trust: a malformed address is a bounce against the sending
 * domain's reputation, and a message with no body at all is worse than no
 * message — the recipient sees a subject line and nothing under it.
 */

const CATEGORIES = new Set<string>(EMAIL_CATEGORIES);

function assertAddresses(list: string[], field: string): void {
  for (const [index, address] of list.entries()) {
    if (!isEmailAddress(address)) {
      throw new EmailValidationError(
        `${field}[${index}] is not a valid email address: "${address}"`,
        field,
      );
    }
  }
}

/** Throws an {@link EmailValidationError} naming the first thing that is wrong. */
export function assertValidEmailOptions(options: EmailSendOptions): void {
  if (!options || typeof options !== 'object') {
    throw new EmailValidationError('Email options are required', 'options');
  }

  if (!CATEGORIES.has(options.category)) {
    throw new EmailValidationError(
      `category must be one of: ${EMAIL_CATEGORIES.join(', ')}`,
      'category',
    );
  }

  const to = toAddressList(options.to);
  if (to.length === 0) throw new EmailValidationError('to is required', 'to');
  assertAddresses(to, 'to');
  assertAddresses(toAddressList(options.cc), 'cc');
  assertAddresses(toAddressList(options.bcc), 'bcc');

  if (typeof options.subject !== 'string' || !options.subject.trim()) {
    throw new EmailValidationError('subject is required', 'subject');
  }

  if (options.from !== undefined && !isEmailAddress(options.from)) {
    throw new EmailValidationError(`from is not a valid email address: "${options.from}"`, 'from');
  }
  if (options.replyTo !== undefined && !isEmailAddress(options.replyTo)) {
    throw new EmailValidationError(
      `replyTo is not a valid email address: "${options.replyTo}"`,
      'replyTo',
    );
  }

  // A subject with nothing under it is the worst possible outcome: it looks
  // like a real message and says nothing.
  const hasBody = Boolean(options.template ?? options.html ?? options.text);
  if (!hasBody) {
    throw new EmailValidationError('one of template, html or text is required', 'html');
  }

  for (const [index, file] of (options.attachments ?? []).entries()) {
    if (!file?.filename) {
      throw new EmailValidationError(`attachments[${index}].filename is required`, 'attachments');
    }
    if (file.content === undefined || file.content === null || file.content === '') {
      throw new EmailValidationError(`attachments[${index}].content is empty`, 'attachments');
    }
  }
}
