import type { useTranslation } from '@duncit/shell';
import type { NearbyLeadsFormValues } from './nearby-leads.schema';

export type Translate = ReturnType<typeof useTranslation>['t'];

export interface NearbyLeadsFormProps {
  /** The last search, so reopening the dialog starts from it. */
  initialValues?: NearbyLeadsFormValues;
  onSubmit: (values: NearbyLeadsFormValues) => void;
}

export type { NearbyLeadsFormValues };
