import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Stack } from '@mui/material';
import SaveIcon from '@mui/icons-material/SaveOutlined';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import type { UpdateTestsSettingsInput } from '@duncit/gql-types';
import {
  makeConfidenceSchema,
  toConfidenceInput,
  toConfidenceValues,
  type ConfidenceFormOutput,
  type ConfidenceFormValues,
  type ConfidenceSettings,
} from './confidence-settings.types';
import { SIGNAL_KEYS } from '../../dashboard/status';

export interface ConfidenceSettingsFormProps {
  settings: ConfidenceSettings;
  saving: boolean;
  /** The server's answer when it refused the save. */
  errorMessage: string | null;
  onSubmit: (input: UpdateTestsSettingsInput) => void;
}

const numberInput = (min: number, max: number) => ({ htmlInput: { min, max, step: 1, inputMode: 'numeric' as const } });
const FIELD_GRID = { display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' } } as const;

/** One weight per signal, the two band thresholds, and the regression penalty. */
export default function ConfidenceSettingsForm(props: Readonly<ConfidenceSettingsFormProps>) {
  const { settings, saving, errorMessage, onSubmit } = props;
  const { t } = useTranslation();
  const schema = useMemo(() => makeConfidenceSchema(t), [t]);
  const { control, handleSubmit, formState } = useForm<ConfidenceFormValues, unknown, ConfidenceFormOutput>({
    defaultValues: toConfidenceValues(settings),
    resolver: zodResolver(schema) as Resolver<ConfidenceFormValues, unknown, ConfidenceFormOutput>,
    mode: 'onTouched',
  });
  const weightsError = formState.errors.weights?.root?.message ?? formState.errors.weights?.message;

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(toConfidenceInput(values)))} noValidate>
      <Stack spacing={2.5}>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        {weightsError && <Alert severity="warning">{weightsError}</Alert>}
        <Box sx={FIELD_GRID}>
          {settings.weights.map((w, index) => (
            <RhfTextField
              key={w.signal}
              control={control}
              name={`weights.${index}.weight`}
              type="number"
              label={t('tests.settings.confidence.weightLabel', {
                vars: { signal: t(SIGNAL_KEYS[w.signal]) },
              })}
              hint={t('tests.settings.confidence.weightHint')}
              slotProps={numberInput(0, 100)}
              required
            />
          ))}
        </Box>
        <Box sx={FIELD_GRID}>
          <RhfTextField
            control={control}
            name="high_min"
            type="number"
            label={t('tests.settings.confidence.highMin')}
            slotProps={numberInput(1, 100)}
            required
          />
          <RhfTextField
            control={control}
            name="medium_min"
            type="number"
            label={t('tests.settings.confidence.mediumMin')}
            hint={t('tests.settings.confidence.bandHint')}
            slotProps={numberInput(0, 99)}
            required
          />
          <RhfTextField
            control={control}
            name="regression_penalty"
            type="number"
            label={t('tests.settings.confidence.regressionPenalty')}
            hint={t('tests.settings.confidence.regressionPenaltyHint')}
            slotProps={numberInput(1, 100)}
            required
          />
        </Box>
        <div>
          <DuncitButton type="submit" variant="contained" startIcon={<SaveIcon />} loading={saving || undefined}>
            {t('tests.settings.confidence.save')}
          </DuncitButton>
        </div>
      </Stack>
    </form>
  );
}
