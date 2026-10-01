import { z } from 'zod';
import { DIGITS } from '@duncit/regex';
import type { ReportCategory } from '../../../../graphql/reports';

/**
 * One report category, as Legal edits it.
 *
 * `sort_order` is text in the form because that is what a number input holds
 * while someone is typing in it; `toCategoryInput` turns it into the integer
 * the server stores.
 */
export interface ReportCategoryFormValues {
  label: string;
  description: string;
  requires_details: boolean;
  sort_order: string;
  is_active: boolean;
}

/** The same limits the server enforces, so the form cannot accept what it will refuse. */
export const REPORT_CATEGORY_MAX = { label: 80, description: 200 } as const;

type Translate = (key: string) => string;

/** Built with the reader's translator: the messages are copy, not constants. */
export const makeReportCategorySchema = (t: Translate) =>
  z.object({
    label: z
      .string()
      .trim()
      .min(1, t('reportLogs.categoryNameRequired'))
      .max(REPORT_CATEGORY_MAX.label, t('reportLogs.categoryNameTooLong')),
    description: z
      .string()
      .trim()
      .max(REPORT_CATEGORY_MAX.description, t('reportLogs.categoryDescriptionTooLong')),
    requires_details: z.boolean(),
    // Blank is allowed: the server then places the category after the last one.
    sort_order: z
      .string()
      .trim()
      .refine((value) => value === '' || DIGITS.test(value), t('reportLogs.categoryOrderInvalid')),
    is_active: z.boolean(),
  });

/**
 * A new category starts shown, optional-details, and with no position: a blank
 * position is filled with "after the last one", so adding a category never
 * means working out the next free number.
 */
export const EMPTY_REPORT_CATEGORY: ReportCategoryFormValues = {
  label: '',
  description: '',
  requires_details: false,
  sort_order: '',
  is_active: true,
};

export const toCategoryFormValues = (category: ReportCategory): ReportCategoryFormValues => ({
  label: category.label,
  description: category.description,
  requires_details: category.requires_details,
  sort_order: String(category.sort_order),
  is_active: category.is_active,
});

/** The mutation input for these values. */
export const toCategoryInput = (values: ReportCategoryFormValues) => ({
  label: values.label.trim(),
  description: values.description.trim(),
  requires_details: values.requires_details,
  // Blank leaves the position to the server: last for a new category,
  // unchanged for an existing one.
  sort_order: values.sort_order.trim() ? Number.parseInt(values.sort_order, 10) : undefined,
  is_active: values.is_active,
});
