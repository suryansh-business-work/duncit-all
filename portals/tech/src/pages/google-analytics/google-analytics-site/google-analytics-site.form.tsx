import { useMemo } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, FormControlLabel, FormHelperText, MenuItem, Stack, Switch } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import type { GoogleAnalyticsSiteInput, TrackedWebsite } from '@duncit/gql-types';
import { SITE_LABEL_KEYS } from '../google-analytics-copy';
import { googleAnalyticsSiteSchema, type GoogleAnalyticsSiteForm as Values } from './google-analytics-site.types';

interface Props {
  /** The websites the picker offers: the untagged ones when adding, the one row when editing. */
  siteOptions: readonly TrackedWebsite[];
  /** Editing a row: the website is that row, so the picker locks. */
  lockSite: boolean;
  initial: Values;
  saving: boolean;
  opError: string | null;
  onSubmit: (input: GoogleAnalyticsSiteInput) => void;
}

/** One website's tag: which website, its GA4 measurement id, and whether it loads. */
export default function GoogleAnalyticsSiteFormBody({
  siteOptions,
  lockSite,
  initial,
  saving,
  opError,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(
    () => googleAnalyticsSiteSchema({ measurementIdInvalid: t('tech.googleAnalytics.validation.measurementIdInvalid') }),
    [t],
  );
  const { control, handleSubmit } = useForm<Values, any, Values>({
    resolver: zodResolver(schema) as unknown as Resolver<Values, any, Values>,
    defaultValues: initial,
  });

  return (
    <Stack
      spacing={2}
      component="form"
      id="google-analytics-site-form"
      data-testid="google-analytics-site-form"
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <RhfTextField
        control={control}
        name="site"
        label={t('tech.googleAnalytics.website')}
        hint={t('tech.googleAnalytics.websiteHint')}
        disabled={lockSite}
        required
        select
        data-testid="google-analytics-site-website"
      >
        {siteOptions.map((site) => (
          <MenuItem key={site} value={site}>
            {t(SITE_LABEL_KEYS[site])}
          </MenuItem>
        ))}
      </RhfTextField>
      <RhfTextField
        control={control}
        name="measurement_id"
        label={t('tech.googleAnalytics.measurementId')}
        hint={t('tech.googleAnalytics.measurementIdHint')}
        required
        autoComplete="off"
        slotProps={{ htmlInput: { spellCheck: false } }}
        data-testid="google-analytics-site-measurement-id"
      />
      <Controller
        name="enabled"
        control={control}
        render={({ field }) => (
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={field.value}
                  onChange={(_event, checked) => field.onChange(checked)}
                  slotProps={{ input: { 'aria-describedby': 'google-analytics-site-enabled-hint' } }}
                  data-testid="google-analytics-site-enabled"
                />
              }
              label={t('tech.googleAnalytics.enabled')}
            />
            <FormHelperText id="google-analytics-site-enabled-hint">{t('tech.googleAnalytics.enabledHint')}</FormHelperText>
          </Box>
        )}
      />

      {opError && (
        <Alert severity="error" data-testid="google-analytics-site-error">
          {opError}
        </Alert>
      )}
      <DuncitButton
        type="submit"
        variant="contained"
        startIcon={<SaveIcon />}
        loading={saving}
        sx={{ alignSelf: 'flex-start' }}
        data-testid="google-analytics-site-save"
      >
        {t('shell.common.save')}
      </DuncitButton>
    </Stack>
  );
}
