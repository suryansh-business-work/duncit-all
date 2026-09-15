import { useFieldArray, useFormState, type Control } from 'react-hook-form';
import { FormHelperText, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { FLOW_LIMITS } from '../e2e-flow';
import { BLANK_STEP, type SubFlowValues } from './e2e-sub-flow.types';

interface Props {
  control: Control<SubFlowValues>;
}

/** The sub flow's ordered steps — one row per step, added and removed in place. */
export default function StepsField({ control }: Readonly<Props>) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: 'steps' });
  const { errors } = useFormState({ control, name: 'steps' });
  const listError = errors.steps?.root?.message ?? errors.steps?.message;

  return (
    <Stack spacing={1.5}>
      <Stack>
        <Typography variant="subtitle2">{t('tech.e2eFlows.steps')}</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('tech.e2eFlows.stepsHint')}
        </Typography>
      </Stack>
      {fields.map((field, index) => {
        const number = index + 1;
        return (
          <Stack key={field.id} direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Typography variant="body2" sx={{ minWidth: 56, pt: { sm: 2 }, fontWeight: 600 }}>
              {t('tech.e2eFlows.stepNumber', { vars: { number } })}
            </Typography>
            <RhfTextField
              control={control}
              name={`steps.${index}.action`}
              label={t('tech.e2eFlows.stepAction')}
              hint={t('tech.e2eFlows.stepActionHint')}
              required
            />
            <RhfTextField
              control={control}
              name={`steps.${index}.expected`}
              label={t('tech.e2eFlows.stepExpected')}
              hint={t('tech.e2eFlows.stepExpectedHint')}
            />
            <Tooltip title={t('tech.e2eFlows.removeStep', { vars: { number } })}>
              <span>
                <IconButton
                  aria-label={t('tech.e2eFlows.removeStep', { vars: { number } })}
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                  sx={{ mt: { sm: 1 } }}
                >
                  <DeleteOutlineIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        );
      })}
      {listError && <FormHelperText error>{listError}</FormHelperText>}
      <DuncitButton
        variant="outlined"
        size="small"
        startIcon={<AddIcon />}
        onClick={() => append({ ...BLANK_STEP })}
        disabled={fields.length >= FLOW_LIMITS.stepsMax}
        sx={{ alignSelf: 'flex-start' }}
      >
        {t('tech.e2eFlows.addStep')}
      </DuncitButton>
    </Stack>
  );
}
