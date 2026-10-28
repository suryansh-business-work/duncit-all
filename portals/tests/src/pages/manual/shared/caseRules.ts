import { z } from 'zod';
import { DIGITS } from '@duncit/regex';
import type { Translate } from '@duncit/shell';
import { MANUAL_LIMITS } from './vocabulary';

/*
 * The validation rules more than one case form shares — the server's bounds,
 * in the reader's words.
 */

export const titleRule = (t: Translate) => {
  const message = t('testsManual.validation.titleLength', {
    vars: { min: MANUAL_LIMITS.titleMin, max: MANUAL_LIMITS.titleMax },
  });
  return z.string().trim().min(MANUAL_LIMITS.titleMin, message).max(MANUAL_LIMITS.titleMax, message);
};

/**
 * A whole number typed into a text box, kept as the text (so the box shows
 * exactly what was typed); empty means "not set".
 */
export const wholeNumberRule = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .refine((value) => value === '' || (DIGITS.test(value) && Number(value) >= min && Number(value) <= max), message);

/** The text of a whole-number box as the API wants it. */
export const numberOrNull = (value: string): number | null => (value.trim() === '' ? null : Number(value));
