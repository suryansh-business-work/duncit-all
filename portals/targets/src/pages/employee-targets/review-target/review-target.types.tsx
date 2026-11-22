import type { useTranslation } from '@duncit/shell';

export type Translate = ReturnType<typeof useTranslation>['t'];

export interface ReviewTargetFormValues {
  comment: string;
}

export interface ReviewTargetFormProps {
  /** Resolves true once the review is saved. */
  onSubmit: (values: ReviewTargetFormValues) => Promise<boolean>;
}
