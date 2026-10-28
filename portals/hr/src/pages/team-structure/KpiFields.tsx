import { useFieldArray, useWatch } from 'react-hook-form';
import { Box, MenuItem, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import { addsUp, type SeatControl } from './seat.schema';
import { KPI_FREQUENCIES } from './types';

/** The measures inside one KRA. Their weights are shares of that KRA and must make 100. */
export default function KpiFields({ control, kraIndex }: Readonly<{ control: SeatControl; kraIndex: number }>) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: `kras.${kraIndex}.kpis` });
  const kpis = useWatch({ control, name: `kras.${kraIndex}.kpis` });
  const total = (kpis ?? []).reduce((sum, k) => sum + (Number(k.weight) || 0), 0);

  return (
    <Stack spacing={1}>
      {fields.map((field, index) => {
        const base = `kras.${kraIndex}.kpis.${index}` as const;
        return (
          <Box key={field.id} sx={{ borderLeft: 3, borderColor: 'divider', pl: 1.5 }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1}>
                <RhfTextField control={control} name={`${base}.name`} label={t('hr.teamStructure.kra.kpiName')} size="small" />
                <DuncitIconButton aria-label={t('hr.teamStructure.kra.removeKpi')} onClick={() => remove(index)}>
                  <DeleteOutlinedIcon />
                </DuncitIconButton>
              </Stack>
              <Stack direction="row" spacing={1}>
                <RhfTextField control={control} name={`${base}.target`} type="number" size="small" label={t('hr.teamStructure.kra.target')} />
                <RhfTextField control={control} name={`${base}.unit`} size="small" label={t('hr.teamStructure.kra.unit')} />
              </Stack>
              <Stack direction="row" spacing={1}>
                <RhfTextField select control={control} name={`${base}.frequency`} size="small" label={t('hr.teamStructure.kra.frequency')}>
                  {KPI_FREQUENCIES.map((f) => (
                    <MenuItem key={f} value={f}>{t(`hr.teamStructure.kra.frequencies.${f}`)}</MenuItem>
                  ))}
                </RhfTextField>
                <RhfTextField control={control} name={`${base}.weight`} type="number" size="small" label={t('hr.teamStructure.kra.kpiWeight')} />
              </Stack>
            </Stack>
          </Box>
        );
      })}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <DuncitButton
          size="small"
          startIcon={<AddIcon />}
          onClick={() => append({ name: '', unit: '', target: null, frequency: 'MONTHLY', weight: 0 })}
        >
          {t('hr.teamStructure.kra.addKpi')}
        </DuncitButton>
        {fields.length > 0 && (
          <Typography variant="caption" role="status" sx={{ color: addsUp([total]) ? 'success.main' : 'error.main' }}>
            {t('hr.teamStructure.kra.kpiTotal', { vars: { total } })}
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}
