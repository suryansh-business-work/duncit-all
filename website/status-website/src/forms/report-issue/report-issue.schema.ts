import { z } from 'zod';
import type { Translator } from '@duncit/i18n';
import { MESSAGE_MAX, MESSAGE_MIN, NAME_MAX, URL_MAX } from './report-issue.types';

const IMPACTS = ['CANNOT_ACCESS', 'ERRORS', 'SLOW', 'LOGIN', 'PAYMENT', 'OTHER'] as const;

/** Blank passes; anything else has to parse as an http(s) address. */
const isWebAddress = (value: string) => {
  if (value === '') return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Built from the translator rather than declared at module scope, so a
 * validation message arrives in the reader's language like every other string
 * on the page. The server re-validates all of it — this half only exists to
 * answer before a round trip.
 */
export function buildReportSchema(t: Translator['t']) {
  return z.object({
    service_key: z.string(),
    impact: z.enum(IMPACTS),
    name: z
      .string()
      .trim()
      .min(1, t('status.report.nameRequired'))
      .max(NAME_MAX, t('status.report.nameLong')),
    email: z
      .string()
      .trim()
      .min(1, t('status.report.emailRequired'))
      .email(t('status.report.emailInvalid')),
    page_url: z
      .string()
      .trim()
      .max(URL_MAX, t('status.report.urlInvalid'))
      .refine(isWebAddress, t('status.report.urlInvalid')),
    message: z
      .string()
      .trim()
      .min(1, t('status.report.messageRequired'))
      .min(MESSAGE_MIN, t('status.report.messageShort'))
      .max(MESSAGE_MAX, t('status.report.messageLong')),
    // Only "did you type something" here. Whether it is the RIGHT something is
    // the server's answer to give — this half exists to save a round trip.
    captcha_answer: z.string().trim().min(1, t('captcha.required')),
  });
}
