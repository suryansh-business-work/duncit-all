import { useEffect, useMemo } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Card,
  CardContent,
  FormControlLabel,
  FormHelperText,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { DuncitRichTextInput } from '@duncit/rich-text';
import { useTranslation } from '@duncit/shell';
import {
  brandConsentSchema,
  EMPTY_BRAND_CONSENT,
  type BrandConsentFormValues,
} from './brand-consent.types';

interface Props {
  initialValues: BrandConsentFormValues;
  saving: boolean;
  error: string | null;
  /** When the consent was last changed, already worded. Blank if never. */
  updatedAt: string;
  onSubmit: (values: BrandConsentFormValues) => Promise<void>;
}

/**
 * The consent's wording, as one form.
 *
 * Not a dialog: like the Grievance Officer page, this is a single record that
 * is always there and always editable, so a page beats a table with one row.
 */
export default function BrandConsentForm({ initialValues, saving, error, updatedAt, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => brandConsentSchema(t), [t]);
  const { control, handleSubmit, reset, formState, watch } = useForm<BrandConsentFormValues, any, BrandConsentFormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<BrandConsentFormValues, any, BrandConsentFormValues>,
    defaultValues: EMPTY_BRAND_CONSENT,
    mode: 'onTouched',
  });

  // The record lands after the first render (the query resolves), so the form
  // is seeded when it arrives rather than at mount.
  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const activeLabel = watch('is_active') ? t('legal.brandConsent.active') : t('legal.brandConsent.hidden');
  const contentError = formState.errors.content?.message;

  return (
    <Card variant="outlined">
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}

            <RhfTextField
              control={control}
              name="title"
              label={t('legal.brandConsent.titleLabel')}
              required
              slotProps={{ htmlInput: { 'data-testid': 'brand-consent-title' } }}
            />

            <Controller
              control={control}
              name="is_active"
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(field.value)}
                      onChange={(_event, checked) => field.onChange(checked)}
                      onBlur={field.onBlur}
                      slotProps={{ input: { ref: field.ref, 'data-testid': 'brand-consent-active' } as never }}
                    />
                  }
                  label={activeLabel}
                />
              )}
            />

            <Controller
              control={control}
              name="content"
              render={({ field }) => (
                <Box data-testid="brand-consent-content">
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {t('legal.brandConsent.contentLabel')}
                  </Typography>
                  <DuncitRichTextInput
                    value={field.value}
                    onChange={(html) => field.onChange(html)}
                    ariaLabel={t('legal.brandConsent.contentLabel')}
                    minHeight={320}
                    aiContext="brand partner consent"
                  />
                  <FormHelperText error={!!contentError}>
                    {contentError ?? t('legal.brandConsent.contentHint')}
                  </FormHelperText>
                </Box>
              )}
            />

            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <DuncitButton
                type="submit"
                variant="contained"
                loading={saving}
                disabled={!formState.isDirty}
                data-testid="brand-consent-save"
              >
                {t('legal.brandConsent.save')}
              </DuncitButton>
              {updatedAt && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {updatedAt}
                </Typography>
              )}
            </Stack>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
}
