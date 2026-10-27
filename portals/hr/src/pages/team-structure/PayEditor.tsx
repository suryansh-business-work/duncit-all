import { useFieldArray, useWatch } from 'react-hook-form';
import { Box, MenuItem, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import { PAY_FREQUENCIES, PAY_KINDS } from './types';
import type { SeatControl } from './seat.schema';

/** Salary lines: fixed ones pay one amount, variable ones a range with an expected figure. */
export default function PayEditor({ control, currencyLabel }: Readonly<{ control: SeatControl; currencyLabel: string }>) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: 'pay' });
  const lines = useWatch({ control, name: 'pay' });

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2">{t('hr.teamStructure.pay.title')}</Typography>
      {fields.map((field, index) => {
        const variable = lines?.[index]?.kind === 'VARIABLE';
        return (
          <Box key={field.id} sx={{ border: 1, borderColor: 'divider', p: 1.5 }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1}>
                <RhfTextField control={control} name={`pay.${index}.label`} label={t('hr.teamStructure.pay.label')} size="small" />
                <DuncitIconButton aria-label={t('hr.teamStructure.pay.remove')} onClick={() => remove(index)}>
                  <DeleteOutlinedIcon />
                </DuncitIconButton>
              </Stack>
              <Stack direction="row" spacing={1}>
                <RhfTextField select control={control} name={`pay.${index}.kind`} label={t('hr.teamStructure.pay.kind')} size="small">
                  {PAY_KINDS.map((k) => (
                    <MenuItem key={k} value={k}>{t(`hr.teamStructure.pay.kinds.${k}`)}</MenuItem>
                  ))}
                </RhfTextField>
                <RhfTextField select control={control} name={`pay.${index}.frequency`} label={t('hr.teamStructure.pay.frequency')} size="small">
                  {PAY_FREQUENCIES.map((f) => (
                    <MenuItem key={f} value={f}>{t(`hr.teamStructure.pay.frequencies.${f}`)}</MenuItem>
                  ))}
                </RhfTextField>
              </Stack>
              <Stack direction="row" spacing={1}>
                <RhfTextField
                  control={control}
                  name={`pay.${index}.amount`}
                  type="number"
                  size="small"
                  label={t(variable ? 'hr.teamStructure.pay.expected' : 'hr.teamStructure.pay.amount', { vars: { currency: currencyLabel } })}
                />
                {variable && (
                  <>
                    <RhfTextField control={control} name={`pay.${index}.min_amount`} type="number" size="small" label={t('hr.teamStructure.pay.min')} />
                    <RhfTextField control={control} name={`pay.${index}.max_amount`} type="number" size="small" label={t('hr.teamStructure.pay.max')} />
                  </>
                )}
              </Stack>
              <RhfTextField control={control} name={`pay.${index}.note`} label={t('hr.teamStructure.pay.note')} size="small" />
            </Stack>
          </Box>
        );
      })}
      <DuncitButton
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={() => append({ label: '', kind: 'FIXED', frequency: 'MONTHLY', amount: 0, min_amount: null, max_amount: null, note: '' })}
      >
        {t('hr.teamStructure.pay.add')}
      </DuncitButton>
    </Stack>
  );
}
