import type { FaqRow } from '../FaqsTableBase';

/**
 * One value shape for both audiences. `category` carries the super category id
 * for App FAQs and the partner topic for Partner FAQs — the only field that
 * differs between them, so the form itself stays single-copy (rule 34).
 */
export interface FaqFormValues {
  category: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
}

export interface FaqCategoryOption {
  value: string;
  label: string;
}

export const emptyFaqForm = (category = ''): FaqFormValues => ({
  category,
  question: '',
  answer: '',
  sort_order: 0,
  is_active: true,
});

/** The caller reads `category` off the row, because which field it is is the
 *  one thing that depends on the audience. */
export const toFaqForm = (row: FaqRow, category: string): FaqFormValues => ({
  category,
  question: row.question || '',
  answer: row.answer || '',
  sort_order: row.sort_order ?? 0,
  is_active: row.is_active !== false,
});
