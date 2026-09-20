import { useMemo } from 'react';
import { Alert, MenuItem, Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { DELAY_UNIT_KEYS } from '../../node-kinds';
import type { ConfigProps } from './config-props';
import { DELAY_UNITS, delaySchema, str, waitSchema, type DelayValues, type WaitValues } from './schemas';
import { useNodeForm } from './useNodeForm';

export function WaitConfig({ nodeId, config, onChange }: Readonly<ConfigProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => waitSchema(t), [t]);
  const values: WaitValues = { timeout_hours: Number(config.timeout_hours) || 24 };
  const { control } = useNodeForm(nodeId, schema, values, (next) => onChange({ ...config, timeout_hours: Number(next.timeout_hours) }));
  return (
    <Stack spacing={2}>
      <Alert severity="info">{t('ai.automation.inspector.wait.note')}</Alert>
      <RhfTextField
        control={control}
        name="timeout_hours"
        type="number"
        label={t('ai.automation.inspector.wait.timeout')}
        hint={t('ai.automation.inspector.wait.timeoutHint')}
        size="small"
        slotProps={{ htmlInput: { min: 1, max: 720, step: 1 } }}
      />
    </Stack>
  );
}

export function DelayConfig({ nodeId, config, onChange }: Readonly<ConfigProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => delaySchema(t), [t]);
  const rawUnit = str(config.unit);
  const values: DelayValues = {
    amount: Number(config.amount) || 1,
    unit: (DELAY_UNITS as readonly string[]).includes(rawUnit) ? (rawUnit as DelayValues['unit']) : 'HOURS',
  };
  const { control } = useNodeForm(nodeId, schema, values, (next) => onChange({ ...config, amount: Number(next.amount), unit: next.unit }));
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1}>
        <RhfTextField
          control={control}
          name="amount"
          type="number"
          label={t('ai.automation.inspector.delay.amount')}
          size="small"
          slotProps={{ htmlInput: { min: 1, max: 10000, step: 1 } }}
        />
        <RhfTextField control={control} name="unit" select label={t('ai.automation.inspector.delay.unit')} size="small">
          {DELAY_UNITS.map((unit) => (
            <MenuItem key={unit} value={unit}>
              {t(DELAY_UNIT_KEYS[unit])}
            </MenuItem>
          ))}
        </RhfTextField>
      </Stack>
      <Alert severity="info">{t('ai.automation.inspector.delay.testNote')}</Alert>
    </Stack>
  );
}
