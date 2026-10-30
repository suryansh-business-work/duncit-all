import { z } from 'zod';
import type { Translate } from '@duncit/shell';

/** The server's bounds on a brief and on how many profiles one run may add. */
export const BRIEF_MIN = 10;
export const BRIEF_MAX = 500;
export const RESULT_COUNTS = [10, 20, 30, 50] as const;

export interface LeadSearchFormValues {
  brief: string;
  max_results: number;
}

export const blankLeadSearchValues = (): LeadSearchFormValues => ({ brief: '', max_results: 20 });

export const leadSearchSchema = (t: Translate) =>
  z.object({
    brief: z
      .string()
      .trim()
      .min(BRIEF_MIN, t('marketing.igLeads.briefTooShort', { vars: { min: BRIEF_MIN } }))
      .max(BRIEF_MAX, t('marketing.igLeads.briefTooLong', { vars: { max: BRIEF_MAX } })),
    max_results: z.number().int().min(5).max(50),
  });

export interface LeadSearchFormProps {
  /** True while a search is running or a key is missing — one run at a time. */
  disabled: boolean;
  /** True when the search started — only then is the brief cleared. */
  onSubmit: (values: LeadSearchFormValues) => Promise<boolean>;
}
