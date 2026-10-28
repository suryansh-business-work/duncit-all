import { z } from 'zod';
import type { Translate } from '@duncit/forms/schemas';
import { countIssue, type CountIssue, type CountRange } from '../../shared/limits';

const KEYS: Record<CountIssue, string> = {
  negative: 'litePortal.validation.nonNegative',
  notWhole: 'litePortal.validation.integer',
  belowMin: 'litePortal.validation.atLeast',
  aboveMax: 'litePortal.validation.atMost',
};

/** The console's message for a number box, naming the field. */
export function countMessage(t: Translate, field: string, raw: string, range: CountRange): string | null {
  const issue = countIssue(raw, range);
  return issue ? t(KEYS[issue], { vars: { field, min: range.min, max: range.max } }) : null;
}

/**
 * A whole number in [min, max] typed into a console box — negatives,
 * decimals and anything out of range are refused with a message that says
 * which. `allowBlank` lets an empty box through (it means "no value").
 */
export const countRule = (t: Translate, field: string, range: CountRange, allowBlank = false) =>
  z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      if (allowBlank && value === '') return;
      const message = countMessage(t, field, value, range);
      if (message) ctx.addIssue({ code: 'custom', message });
    });
