import { useMemo } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Divider, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/SaveOutlined';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import EarnCopyFields from './EarnCopyFields';
import EarnImagesField from './EarnImagesField';
import EarnLayoutFields from './EarnLayoutFields';
import {
  EARN_LIMITS,
  earnSchema,
  toEarnValues,
  type EarnFormOutput,
  type EarnFormValues,
  type WebsiteEarnSection,
} from './earn.types';

interface Props {
  section: WebsiteEarnSection;
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (values: EarnFormOutput) => void;
}

/** One website's Earn with Duncit section and floating pill. */
export default function EarnForm({ section, submitting, errorMessage, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => earnSchema((key, options) => t(key, options)), [t]);
  const { control, handleSubmit } = useForm<EarnFormValues, unknown, EarnFormOutput>({
    defaultValues: toEarnValues(section),
    resolver: zodResolver(schema) as Resolver<EarnFormValues, unknown, EarnFormOutput>,
    mode: 'onTouched',
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack spacing={3} sx={{ maxWidth: 880 }}>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        <EarnLayoutFields control={control} />
        <Divider />
        <EarnCopyFields control={control} />
        <Divider />
        <Controller
          control={control}
          name="images"
          render={({ field, fieldState }) => (
            <EarnImagesField value={field.value} error={fieldState.error?.message} onChange={field.onChange} />
          )}
        />
        <Divider />
        <Stack spacing={2}>
          <Typography variant="subtitle2" component="h3">
            {t('websiteApp.earn.floating')}
          </Typography>
          <Controller
            control={control}
            name="floating_enabled"
            render={({ field }) => (
              <FormControlLabel
                control={<Switch checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />}
                label={t('websiteApp.earn.floatingEnabled')}
              />
            )}
          />
          <RhfTextField
            control={control}
            name="floating_label"
            label={t('websiteApp.earn.floatingLabel')}
            hint={t('websiteApp.earn.copyHint', { vars: { max: EARN_LIMITS.floating_label } })}
            slotProps={{ htmlInput: { maxLength: EARN_LIMITS.floating_label } }}
          />
        </Stack>
        <div>
          <DuncitButton type="submit" variant="contained" startIcon={<SaveIcon />} disabled={submitting}>
            {submitting ? t('shell.common.saving') : t('shell.common.save')}
          </DuncitButton>
        </div>
      </Stack>
    </form>
  );
}
