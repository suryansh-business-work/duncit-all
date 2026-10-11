import { useController, type Control } from 'react-hook-form';
import { parseIsoDay } from '@duncit/datetime';
import type { WalletStatementValues } from '@duncit/forms/schemas';
import {
  STATEMENT_FORMATS,
  STATEMENT_PRESETS,
  STATEMENT_PRESET_LABEL_KEYS,
  statementPresetRange,
  zonedToday,
} from '@duncit/utils';
import { Text, YStack } from 'tamagui';

import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';

import { StatementChoice } from './StatementChoice';
import { StatementDateField } from './StatementDateField';

interface Props {
  control: Control<WalletStatementValues>;
  disabled: boolean;
}

/**
 * The statement form's three questions: which period, (for a custom one) which
 * days, and which file format. The presets, their days and the rules are the
 * shared ones mWeb and the partner console use; only the controls are Tamagui.
 */
export function StatementFields({ control, disabled }: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const preset = useController({ control, name: 'preset' });
  const from = useController({ control, name: 'from' });
  const to = useController({ control, name: 'to' });
  const format = useController({ control, name: 'format' });

  const now = fmt.now();
  const range = statementPresetRange(preset.field.value, now, fmt.timeZone);
  // The last pickable day is today in the business zone, as a local calendar date.
  const today = parseIsoDay(zonedToday(now, fmt.timeZone)) ?? now;

  return (
    <YStack gap={16}>
      <StatementChoice
        testID="statement-preset"
        label={t('withdraw.statement.periodLabel')}
        options={STATEMENT_PRESETS.map((value) => ({
          value,
          label: t(STATEMENT_PRESET_LABEL_KEYS[value]),
        }))}
        value={preset.field.value}
        onChange={preset.field.onChange}
        disabled={disabled}
      />
      {range ? (
        <Text testID="statement-range" fontSize={13} color="$muted">
          {t('withdraw.statement.rangeSummary', {
            vars: { from: fmt.formatDay(range.from), to: fmt.formatDay(range.to) },
          })}
        </Text>
      ) : (
        <YStack gap={12}>
          <StatementDateField
            testID="statement-from"
            label={t('withdraw.statement.fromLabel')}
            value={from.field.value}
            onChange={from.field.onChange}
            maxDate={today}
            error={from.fieldState.error?.message}
            disabled={disabled}
          />
          <StatementDateField
            testID="statement-to"
            label={t('withdraw.statement.toLabel')}
            value={to.field.value}
            onChange={to.field.onChange}
            maxDate={today}
            error={to.fieldState.error?.message}
            disabled={disabled}
          />
        </YStack>
      )}
      <StatementChoice
        testID="statement-format"
        label={t('withdraw.statement.formatLabel')}
        options={STATEMENT_FORMATS.map((value) => ({ value, label: value }))}
        value={format.field.value}
        onChange={format.field.onChange}
        disabled={disabled}
      />
    </YStack>
  );
}
