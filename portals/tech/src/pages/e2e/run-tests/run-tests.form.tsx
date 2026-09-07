import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, TextField } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import SuitePicker from '../SuitePicker';
import type { E2eSuite, E2eTriggerConfig } from '../queries';
import { runTestsSchema, type RunTestsValues } from './run-tests.types';

interface Props {
  suites: E2eSuite[];
  config: E2eTriggerConfig;
  onSubmit: (values: RunTestsValues) => void;
}

/** Submits this form from outside it — the dialog owns the action buttons. */
export const RUN_TESTS_FORM_ID = 'e2e-run-tests-form';

export default function RunTestsForm({ suites, config, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control, handleSubmit } = useForm<RunTestsValues, any, RunTestsValues>({
    // Everything ticked by default: the common case is the whole sweep, and a
    // picker that starts empty makes the common case the most work.
    defaultValues: { suites: suites.map((suite) => suite.key), ref: config.default_ref },
    resolver: zodResolver(
      runTestsSchema({
        refFormat: t('tech.e2e.refFormat'),
        suitesRequired: t('tech.e2e.suitesRequired'),
      })
    ) as unknown as Resolver<RunTestsValues, any, RunTestsValues>,
    mode: 'all',
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate id={RUN_TESTS_FORM_ID}>
      <Stack spacing={2.5} sx={{ pt: 1 }}>
        <Controller
          control={control}
          name="suites"
          render={({ field, fieldState }) => (
            <SuitePicker
              suites={suites}
              value={field.value}
              onChange={field.onChange}
              label={t('tech.e2e.suitesLabel')}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="ref"
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label={t('tech.e2e.refLabel')}
              fullWidth
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message ?? t('tech.e2e.refHint')}
            />
          )}
        />
      </Stack>
    </form>
  );
}
