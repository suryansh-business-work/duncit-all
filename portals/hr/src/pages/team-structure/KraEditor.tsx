import { useFieldArray, useWatch } from 'react-hook-form';
import { Box, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import KpiFields from './KpiFields';
import { addsUp, type SeatControl } from './seat.schema';

/**
 * A seat's scorecard: Key Result Areas, each with its measures. KRA weights are
 * shares of the seat and must make 100; the running total is shown as the user
 * types so a mistake is visible before Save refuses it.
 */
export default function KraEditor({ control }: Readonly<{ control: SeatControl }>) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: 'kras' });
  const kras = useWatch({ control, name: 'kras' });
  const total = (kras ?? []).reduce((sum, k) => sum + (Number(k.weight) || 0), 0);

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2">{t('hr.teamStructure.kra.title')}</Typography>
      {fields.map((field, index) => (
        <Box key={field.id} sx={{ border: 1, borderColor: 'divider', p: 1.5 }}>
          <Stack spacing={1}>
            <Stack direction="row" spacing={1}>
              <RhfTextField control={control} name={`kras.${index}.title`} label={t('hr.teamStructure.kra.kraTitle')} size="small" />
              <DuncitIconButton aria-label={t('hr.teamStructure.kra.removeKra')} onClick={() => remove(index)}>
                <DeleteOutlinedIcon />
              </DuncitIconButton>
            </Stack>
            <RhfTextField control={control} name={`kras.${index}.description`} label={t('hr.teamStructure.kra.description')} size="small" />
            <RhfTextField control={control} name={`kras.${index}.weight`} type="number" size="small" label={t('hr.teamStructure.kra.kraWeight')} />
            <KpiFields control={control} kraIndex={index} />
          </Stack>
        </Box>
      ))}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <DuncitButton
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => append({ title: '', description: '', weight: 0, kpis: [] })}
        >
          {t('hr.teamStructure.kra.addKra')}
        </DuncitButton>
        {fields.length > 0 && (
          <Typography variant="caption" role="status" sx={{ color: addsUp([total]) ? 'success.main' : 'error.main' }}>
            {t('hr.teamStructure.kra.kraTotal', { vars: { total } })}
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}
