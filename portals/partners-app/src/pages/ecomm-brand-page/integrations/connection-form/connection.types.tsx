import type { MutationSavePartnerIntegrationArgs } from '@duncit/gql-types';
import type { BrandIntegrationProvider } from '../../queries';
import {
  integrationDefaults,
  toRazorpayInput,
  toShiprocketInput,
  type IntegrationFormValues,
} from '../../brand-wizard/steps/integration-forms';
import type { PartnerIntegration } from '../integrations.queries';

/** The longest connection name the server accepts. */
export const CONNECTION_LABEL_MAX = 60;

/** A saved connection's form: the partner's name for it plus the provider's credential fields. */
export interface ConnectionFormValues extends IntegrationFormValues {
  label: string;
}

/** What the form opens with — the connection's public half, never a secret. */
export const connectionToValues = (connection: PartnerIntegration | null): ConnectionFormValues => ({
  label: connection?.label ?? '',
  ...integrationDefaults(connection?.status),
});

/** The save mutation's variables. A blank secret is omitted so the server keeps the saved one. */
export const toSaveConnectionVariables = (
  provider: BrandIntegrationProvider,
  id: string | null,
  values: ConnectionFormValues,
): MutationSavePartnerIntegrationArgs => {
  const label = values.label.trim();
  const input =
    provider === 'SHIPROCKET' ? { label, shiprocket: toShiprocketInput(values) } : { label, razorpay: toRazorpayInput(values) };
  return { id, provider, input };
};
