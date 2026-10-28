import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack } from '@mui/material';
import SaveIcon from '@mui/icons-material/SaveOutlined';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import type { UpdateUnitTestSettingsInput } from '@duncit/gql-types';
import {
  makeRetentionSchema,
  toRetentionInput,
  toRetentionValues,
  type RetentionFormOutput,
  type RetentionFormValues,
  type RetentionSettings,
} from './unit-retention.types';

export interface UnitRetentionFormProps {
  settings: RetentionSettings;
  saving: boolean;
  /** The server's answer when it refused the save. */
  errorMessage: string | null;
  onSubmit: (input: UpdateUnitTestSettingsInput) => void;
}

/** How many finished unit runs keep their test cases and files; older runs keep only their totals. */
export default function UnitRetentionForm(props: Readonly<UnitRetentionFormProps>) {
  const { settings, saving, errorMessage, onSubmit } = props;
  const { t } = useTranslation();
  const schema = useMemo(() => makeRetentionSchema(t, settings), [t, settings]);
  const { control, handleSubmit } = useForm<RetentionFormValues, unknown, RetentionFormOutput>({
    defaultValues: toRetentionValues(settings),
    resolver: zodResolver(schema) as Resolver<RetentionFormValues, unknown, RetentionFormOutput>,
    mode: 'onTouched',
  });
  const { min_retention_runs: min, max_retention_runs: max } = settings;

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(toRetentionInput(values)))} noValidate>
      <Stack spacing={2} sx={{ maxWidth: 420 }}>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        <RhfTextField
          control={control}
          name="retention_runs"
          type="number"
          label={t('tests.settings.retention.label')}
          hint={t('tests.settings.retention.hint', { vars: { min, max } })}
          slotProps={{ htmlInput: { min, max, step: 1, inputMode: 'numeric' as const } }}
          required
        />
        <div>
          <DuncitButton type="submit" variant="contained" startIcon={<SaveIcon />} loading={saving || undefined}>
            {t('tests.settings.retention.save')}
          </DuncitButton>
        </div>
      </Stack>
    </form>
  );
}
