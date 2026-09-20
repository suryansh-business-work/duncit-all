import { useMutation, useQuery } from '@apollo/client/react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Box, Checkbox, CircularProgress, FormControlLabel, FormHelperText, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { RhfTextField } from '@duncit/forms';
import { RICH_TEXT_BODY_SX } from '@duncit/ui';
import { useDateFormat } from '@duncit/app-settings';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import { BRAND_CONSENT_POLICY, SIGN_BRAND_CONSENT, type BrandConsent } from '../../queries';

interface SignValues {
  accepted: boolean;
  signed_name: string;
}

const makeSignSchema = (required: string) =>
  z.object({
    accepted: z.boolean().refine((value) => value, required),
    signed_name: z.string().trim().min(2, required).max(120),
  });

interface Props {
  brandId: string | null;
  consent: BrandConsent | undefined;
  locked: boolean;
  ensureBrandId: () => Promise<string | null>;
  onChanged: () => void;
}

/** Step 10 — read the Brand Consent and sign it by name; recorded with the wording signed. */
export default function ConsentStep({ brandId, consent, locked, ensureBrandId, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const { data, loading } = useQuery<any>(BRAND_CONSENT_POLICY, { fetchPolicy: 'cache-and-network' });
  const [sign, signState] = useMutation<any>(SIGN_BRAND_CONSENT);
  const { control, handleSubmit } = useForm<SignValues, any, SignValues>({
    resolver: zodResolver(makeSignSchema(t('partners.brandWizard.validation.required'))) as unknown as Resolver<SignValues, any, SignValues>,
    defaultValues: { accepted: false, signed_name: consent?.signed_name ?? '' },
  });
  const policy = data?.brandConsentPolicy;
  const signedCurrent = consent?.accepted === true && consent.current;
  const outdated = consent?.accepted === true && !consent.current;

  const submit = handleSubmit(async (values) => {
    const id = brandId ?? (await ensureBrandId());
    if (!id) return;
    try {
      await sign({ variables: { brand_doc_id: id, signed_name: values.signed_name } });
      notifySuccess(t('partners.brandWizard.consent.signedToast'));
      onChanged();
    } catch (error) {
      notifyError(parseApiError(error));
    }
  });

  if (loading && !data) return <CircularProgress size={24} aria-label={t('shell.a11y.loading')} />;
  if (!policy) return <Alert severity="info">{t('partners.brandWizard.consent.unavailable')}</Alert>;

  return (
    <Stack spacing={2}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('partners.brandWizard.consent.intro')}
      </Typography>
      <Typography variant="h6" component="h3" sx={{ fontWeight: 900 }}>
        {policy.title}
      </Typography>
      <Box
        className="ql-editor"
        sx={{ ...RICH_TEXT_BODY_SX, maxHeight: 360, overflowY: 'auto', border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}
        dangerouslySetInnerHTML={{ __html: policy.content || '' }}
        data-testid="brand-consent-policy"
      />
      {signedCurrent && (
        <Alert severity="success" data-testid="brand-consent-signed">
          {t('partners.brandWizard.consent.signed', { vars: { name: consent.signed_name, when: formatDate(consent.signed_at) } })}
        </Alert>
      )}
      {outdated && <Alert severity="warning">{t('partners.brandWizard.consent.outdated')}</Alert>}
      {!signedCurrent && !locked && (
        <Stack spacing={1.5} component="form" onSubmit={submit} noValidate>
          <Controller
            control={control}
            name="accepted"
            render={({ field, fieldState }) => (
              <Box>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                      slotProps={{ input: { 'aria-describedby': 'brand-consent-accept-error' } }}
                    />
                  }
                  label={t('partners.brandWizard.consent.acceptLabel')}
                  data-testid="brand-consent-accept"
                />
                {fieldState.error && (
                  <FormHelperText id="brand-consent-accept-error" error>
                    {fieldState.error.message}
                  </FormHelperText>
                )}
              </Box>
            )}
          />
          <RhfTextField
            control={control}
            name="signed_name"
            label={t('partners.brandWizard.consent.signedNameLabel')}
            required
            hint={t('partners.brandWizard.consent.signedNameHint')}
            autoComplete="name"
            sx={{ maxWidth: 420 }}
            data-testid="brand-consent-signed-name"
          />
          <DuncitButton type="submit" variant="contained" loading={signState.loading} sx={{ alignSelf: 'flex-start' }} data-testid="brand-consent-sign">
            {t('partners.brandWizard.consent.sign')}
          </DuncitButton>
        </Stack>
      )}
    </Stack>
  );
}
