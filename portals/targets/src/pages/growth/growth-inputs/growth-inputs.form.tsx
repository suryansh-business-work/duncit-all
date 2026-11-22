import { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Stack } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { GROWTH_INPUT_BOUNDS } from '../../../lib/growth-calculator';
import { GROWTH_INPUT_FIELDS } from './growth-inputs.fields';
import { growthInputsSchema, toFormValues } from './growth-inputs.schema';
import type { GrowthInputs, GrowthInputsFormProps, GrowthInputsFormValues } from './growth-inputs.types';

/**
 * The nine assumptions. Every keystroke is validated against the server's own
 * bounds and, when all nine are usable, handed up so the results recalculate
 * at once; while a box is wrong it says why and the results hold still.
 */
export default function GrowthInputsForm({ seed, onChange, onReset }: Readonly<GrowthInputsFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => growthInputsSchema(t), [t]);
  const { control, reset } = useForm<GrowthInputsFormValues, unknown, GrowthInputs>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: toFormValues(seed),
  });

  useEffect(() => {
    reset(toFormValues(seed));
  }, [seed, reset]);

  const values = useWatch({ control });
  useEffect(() => {
    const parsed = schema.safeParse(values);
    onChange(parsed.success ? parsed.data : null);
  }, [values, schema, onChange]);

  return (
    <Stack spacing={1} component="form" noValidate onSubmit={(event) => event.preventDefault()}>
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr' } }}>
        {GROWTH_INPUT_FIELDS.map(({ key, label }) => {
          const bound = GROWTH_INPUT_BOUNDS[key];
          return (
            <RhfTextField
              key={key}
              control={control}
              name={key}
              label={t(label)}
              type="number"
              size="small"
              required
              slotProps={{
                htmlInput: {
                  min: bound.min,
                  max: bound.max,
                  step: bound.decimals === 0 ? 1 : 0.01,
                  inputMode: bound.decimals === 0 ? 'numeric' : 'decimal',
                  'data-testid': `growth-input-${key}`,
                },
              }}
            />
          );
        })}
      </Box>
      <Box>
        <DuncitButton
          startIcon={<RestartAltIcon />}
          onClick={onReset}
          data-testid="growth-inputs-reset"
        >
          {t('targets.growth.inputs.reset')}
        </DuncitButton>
      </Box>
    </Stack>
  );
}
