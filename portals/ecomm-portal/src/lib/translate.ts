import type { useTranslation } from '@duncit/shell';

/** The translator every page and schema factory in this console takes. */
export type Translate = ReturnType<typeof useTranslation>['t'];

/** One choice of a select, already in the reader's language. */
export interface Option {
  value: string;
  label: string;
}
