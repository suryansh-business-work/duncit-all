import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { deletionSettingsSchema, type DeletionSettingsFormValues } from './deletion-settings.types';

interface Props {
  initialValues: DeletionSettingsFormValues;
  saving: boolean;
  onSubmit: (values: DeletionSettingsFormValues) => Promise<void>;
}

/** Products › Delete Requests › Settings: how far ahead a partner must schedule a deletion. */
export default function DeletionSettingsForm({ initialValues, saving, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => deletionSettingsSchema(t), [t]);
  const { control, handleSubmit, reset, formState } = useForm<DeletionSettingsFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
    mode: 'onBlur',
  });

  useEffect(() => reset(initialValues), [initialValues, reset]);

  return (
    <Stack
      component="form"
      noValidate
      spacing={2}
      onSubmit={(event) => {
        handleSubmit(onSubmit)(event).catch(() => undefined);
      }}
      data-testid="deletion-settings-form"
    >
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Typography component="h2" variant="h6" sx={{ fontWeight: 700 }}>
              {t('products.deletionSettings.windowSection')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('products.deletionSettings.windowHint')}
            </Typography>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
              <RhfTextField
                control={control}
                name="min_days"
                label={t('products.deletionSettings.minDays')}
                hint={t('products.deletionSettings.minDaysHint')}
                required
                size="small"
                inputMode="numeric"
              />
              <RhfTextField
                control={control}
                name="max_days"
                label={t('products.deletionSettings.maxDays')}
                hint={t('products.deletionSettings.maxDaysHint')}
                required
                size="small"
                inputMode="numeric"
              />
            </Box>
          </Stack>
        </CardContent>
      </Card>
      <Box>
        <DuncitButton type="submit" variant="contained" disabled={!formState.isDirty || saving}>
          {saving ? t('shell.common.saving') : t('shell.common.save')}
        </DuncitButton>
      </Box>
    </Stack>
  );
}
