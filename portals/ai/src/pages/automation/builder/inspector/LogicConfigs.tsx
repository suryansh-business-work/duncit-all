import { useMemo } from 'react';
import { MenuItem, Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { CONDITION_OP_KEYS } from '../../node-kinds';
import type { ConfigProps } from './config-props';
import {
  CONDITION_OPS,
  conditionSchema,
  setVariableSchema,
  str,
  type ConditionValues,
  type SetVariableValues,
} from './schemas';
import { useNodeForm } from './useNodeForm';

const NO_VALUE_OPS = new Set(['is_empty', 'not_empty']);

export function ConditionConfig({ nodeId, config, onChange }: Readonly<ConfigProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => conditionSchema(t), [t]);
  const raw = str(config.operator);
  const values: ConditionValues = {
    variable: str(config.variable),
    operator: (CONDITION_OPS as readonly string[]).includes(raw) ? (raw as ConditionValues['operator']) : 'contains',
    value: str(config.value),
  };
  const { control, watch } = useNodeForm(nodeId, schema, values, (next) => onChange({ ...config, ...next }));
  const operator = watch('operator');
  return (
    <Stack spacing={2}>
      <RhfTextField
        control={control}
        name="variable"
        label={t('ai.automation.inspector.condition.variable')}
        hint={t('ai.automation.inspector.condition.variableHint')}
        size="small"
        required
      />
      <RhfTextField control={control} name="operator" select label={t('ai.automation.inspector.condition.operator')} size="small">
        {CONDITION_OPS.map((op) => (
          <MenuItem key={op} value={op}>
            {t(CONDITION_OP_KEYS[op])}
          </MenuItem>
        ))}
      </RhfTextField>
      {!NO_VALUE_OPS.has(operator) && (
        <RhfTextField
          control={control}
          name="value"
          label={t('ai.automation.inspector.condition.value')}
          hint={t('ai.automation.inspector.condition.valueHint')}
          size="small"
        />
      )}
    </Stack>
  );
}

export function SetVariableConfig({ nodeId, config, onChange }: Readonly<ConfigProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => setVariableSchema(t), [t]);
  const values: SetVariableValues = { name: str(config.name), value: str(config.value) };
  const { control } = useNodeForm(nodeId, schema, values, (next) => onChange({ ...config, ...next }));
  return (
    <Stack spacing={2}>
      <RhfTextField
        control={control}
        name="name"
        label={t('ai.automation.inspector.setVariable.name')}
        hint={t('ai.automation.inspector.setVariable.nameHint')}
        size="small"
        required
      />
      <RhfTextField
        control={control}
        name="value"
        label={t('ai.automation.inspector.setVariable.value')}
        hint={t('ai.automation.inspector.setVariable.valueHint')}
        size="small"
        multiline
        minRows={2}
      />
    </Stack>
  );
}
