import { useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { BrandIntegrationProvider } from '../../queries';
import type { Translate } from '../../brand-wizard/wizard-steps';
import { integrationFields, makeIntegrationSchema, sandboxFields } from '../../brand-wizard/steps/integration-forms';
import { INTEGRATION_LINKS } from '../../../../config/integration-links';
import IntegrationGuide from '../../brand-wizard/steps/IntegrationGuide';
import { CONNECTION_LABEL_MAX, type ConnectionFormValues } from './connection.types';
import CredentialField from './CredentialField';
import SandboxField from './SandboxField';

/** The production API user: kept as saved, and not in use, while sandbox mode is on. */
const PRODUCTION_USER = new Set(['email', 'password']);

/** The provider's credential rules, plus a name for the connection. */
export const makeConnectionSchema = (
  t: Translate,
  provider: BrandIntegrationProvider,
  hasSecret: boolean,
  hasSandboxSecret = false,
) =>
  z
    .object({
      label: z
        .string()
        .trim()
        .min(1, t('partners.integrations.labelRequired'))
        .max(CONNECTION_LABEL_MAX, t('partners.integrations.labelTooLong')),
    })
    .and(makeIntegrationSchema(t, provider, hasSecret, hasSandboxSecret));

interface Props {
  provider: BrandIntegrationProvider;
  defaultValues: ConnectionFormValues;
  /** A secret is already on file, so its field may be left blank. */
  hasSecret: boolean;
  /** ShipRocket: a sandbox password is already on file, so its field may be left blank. */
  hasSandboxSecret?: boolean;
  busy: boolean;
  apiError?: string | null;
  onSave: (values: ConnectionFormValues) => void;
  onCancel: () => void;
}

/** Add or edit one saved Razorpay / ShipRocket connection. Saving checks it against the vendor. */
export default function ConnectionForm({
  provider,
  defaultValues,
  hasSecret,
  hasSandboxSecret = false,
  busy,
  apiError = null,
  onSave,
  onCancel,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(
    () => makeConnectionSchema(t, provider, hasSecret, hasSandboxSecret),
    [t, provider, hasSecret, hasSandboxSecret],
  );
  const { control, handleSubmit } = useForm<ConnectionFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onBlur',
  });
  const key = provider.toLowerCase();
  const sandboxOn = useWatch({ control, name: 'sandbox' }) && provider === 'SHIPROCKET';

  return (
    <Stack spacing={2} component="form" onSubmit={handleSubmit(onSave)} noValidate data-testid={`connection-form-${key}`}>
      <IntegrationGuide provider={provider} defaultExpanded={!hasSecret} />
      {apiError && <Alert severity="error">{apiError}</Alert>}
      <RhfTextField
        control={control}
        name="label"
        label={t('partners.integrations.label')}
        hint={t('partners.integrations.labelHint')}
        required
        data-testid={`connection-${key}-label`}
      />
      {integrationFields(t, provider).map((field) => (
        <CredentialField
          key={field.name}
          control={control}
          field={field}
          providerKey={key}
          secretOnFile={hasSecret}
          disabled={sandboxOn && PRODUCTION_USER.has(field.name)}
        />
      ))}
      {provider === 'SHIPROCKET' && (
        <SandboxField control={control}>
          {sandboxFields(t, INTEGRATION_LINKS.SHIPROCKET.sandboxApi).map((field) => (
            <CredentialField key={field.name} control={control} field={field} providerKey={key} secretOnFile={hasSandboxSecret} />
          ))}
        </SandboxField>
      )}
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
        <DuncitButton onClick={onCancel} disabled={busy}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton type="submit" variant="contained" loading={busy} data-testid={`connection-${key}-save`}>
          {t('partners.brandWizard.integration.connect')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
