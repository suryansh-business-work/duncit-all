import { useMemo, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { ConfirmDialog, notifyError, notifySuccess } from '@duncit/dialogs';
import { RhfTextField } from '@duncit/forms';
import { SectionCard } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import {
  DISCONNECT_BRAND_INTEGRATION,
  RECHECK_BRAND_INTEGRATION,
  type BrandIntegrationProvider,
  type BrandIntegrationStatus,
} from '../../queries';
import { IntegrationChips, IntegrationResult } from './IntegrationStatus';
import {
  CONNECT_DOCUMENT,
  CONNECT_RESULT_KEY,
  integrationDefaults,
  integrationFields,
  integrationIntro,
  integrationTitle,
  makeIntegrationSchema,
  toIntegrationInput,
  type IntegrationFormValues,
} from './integration-forms';

interface Props {
  provider: BrandIntegrationProvider;
  status: BrandIntegrationStatus | undefined;
  brandId: string | null;
  locked: boolean;
  /** The id to mutate against — a new brand is saved first to get one. */
  ensureBrandId: () => Promise<string | null>;
  /** The brand's integration facts changed on the server; reload them. */
  onChanged: () => void;
}

/**
 * One provider's credential form. It mutates on its own — Save & test runs the
 * vendor check right away — and reports what the vendor answered beneath the
 * fields, so the partner never guesses whether a key works.
 */
export default function IntegrationCard({ provider, status, brandId, locked, ensureBrandId, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const hasSecret = status?.has_secret === true;
  const schema = useMemo(() => makeIntegrationSchema(t, provider, hasSecret), [t, provider, hasSecret]);
  const { control, handleSubmit } = useForm<IntegrationFormValues, any, IntegrationFormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<IntegrationFormValues, any, IntegrationFormValues>,
    defaultValues: integrationDefaults(status),
    values: integrationDefaults(status),
    mode: 'onBlur',
  });
  const [connect, connectState] = useMutation<any>(CONNECT_DOCUMENT[provider]);
  const [recheck, recheckState] = useMutation<any>(RECHECK_BRAND_INTEGRATION);
  const [disconnect, disconnectState] = useMutation<any>(DISCONNECT_BRAND_INTEGRATION);
  const [result, setResult] = useState<BrandIntegrationStatus | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const busy = connectState.loading || recheckState.loading || disconnectState.loading;
  const shown = result ?? status;
  const fields = integrationFields(t, provider);

  const runConnect = handleSubmit(async (values) => {
    const id = await ensureBrandId();
    if (!id) return;
    try {
      const res = await connect({ variables: { brand_doc_id: id, input: toIntegrationInput(provider, values) } });
      setResult(res.data?.[CONNECT_RESULT_KEY[provider]] ?? null);
      onChanged();
    } catch (error) {
      notifyError(parseApiError(error));
    }
  });

  const runRecheck = async () => {
    if (!brandId) return;
    try {
      const res = await recheck({ variables: { brand_doc_id: brandId, provider } });
      setResult(res.data?.recheckBrandIntegration ?? null);
      onChanged();
    } catch (error) {
      notifyError(parseApiError(error));
    }
  };

  const runDisconnect = async () => {
    if (!brandId) return;
    try {
      const res = await disconnect({ variables: { brand_doc_id: brandId, provider } });
      setResult(res.data?.disconnectBrandIntegration ?? null);
      setConfirmOpen(false);
      notifySuccess(t('partners.brandWizard.integration.disconnected'));
      onChanged();
    } catch (error) {
      notifyError(parseApiError(error));
    }
  };

  const title = integrationTitle(t, provider);
  return (
    <SectionCard title={title} subtitle={integrationIntro(t, provider)} action={<IntegrationChips status={shown} />}>
      <Stack spacing={2} component="form" onSubmit={runConnect} noValidate data-testid={`integration-card-${provider.toLowerCase()}`}>
        {result && <IntegrationResult result={result} />}
        {fields.map((field) => (
          <RhfTextField
            key={field.name}
            control={control}
            name={field.name}
            label={field.label}
            type={field.type ?? 'text'}
            required={field.required}
            disabled={locked}
            autoComplete={field.type === 'password' ? 'new-password' : 'off'}
            hint={field.secret && hasSecret ? t('partners.brandWizard.integration.secretKept') : field.hint}
            data-testid={`integration-${provider.toLowerCase()}-${field.name}`}
          />
        ))}
        {!locked && (
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <DuncitButton type="submit" variant="contained" loading={connectState.loading} disabled={busy}>
              {t('partners.brandWizard.integration.connect')}
            </DuncitButton>
            {shown?.configured && (
              <DuncitButton variant="outlined" onClick={runRecheck} loading={recheckState.loading} disabled={busy}>
                {t('partners.brandWizard.integration.recheck')}
              </DuncitButton>
            )}
            {shown?.configured && (
              <DuncitButton color="error" onClick={() => setConfirmOpen(true)} disabled={busy}>
                {t('partners.brandWizard.integration.disconnect')}
              </DuncitButton>
            )}
          </Stack>
        )}
        {busy && (
          <Typography variant="caption" role="status" sx={{ color: 'text.secondary' }}>
            {t('partners.brandWizard.integration.checking')}
          </Typography>
        )}
      </Stack>
      <ConfirmDialog
        open={confirmOpen}
        title={t('partners.brandWizard.integration.disconnectTitle', { vars: { provider: title } })}
        message={t('partners.brandWizard.integration.disconnectBody')}
        destructive
        busy={disconnectState.loading}
        confirmLabel={t('partners.brandWizard.integration.disconnect')}
        onConfirm={runDisconnect}
        onClose={() => setConfirmOpen(false)}
      />
    </SectionCard>
  );
}
