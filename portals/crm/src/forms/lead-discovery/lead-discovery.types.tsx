import type { useTranslation } from '@duncit/shell';
import type { LeadDiscoveryFormValues } from './lead-discovery.schema';

export type Translate = ReturnType<typeof useTranslation>['t'];

export interface LeadDiscoveryFormProps {
  /** A discovery is being started: the submit button shows it and both buttons wait. */
  submitting?: boolean;
  onSubmit: (values: LeadDiscoveryFormValues) => void | Promise<void>;
  onCancel?: () => void;
}

export type { LeadDiscoveryFormValues };
