import { useController, type Control } from 'react-hook-form';
import { XStack, YStack } from 'tamagui';

import { DateField } from '@/components/DateField';
import { DuncitButton } from '@/components/DuncitButton';
import { TextField } from '@/components/TextField';
import { useTranslation } from '@/hooks/useTranslation';
import type { LeadListFilterValues } from './lead-list-filters.types';

type DateName = 'followUpFrom' | 'followUpTo' | 'createdFrom' | 'createdTo';

/** One end of a date range: the phone's picker, and a way to clear it. */
function DateEnd({
  control,
  name,
  label,
}: Readonly<{ control: Control<LeadListFilterValues>; name: DateName; label: string }>) {
  const { t } = useTranslation();
  const { field, fieldState } = useController({ control, name });
  return (
    <YStack gap="$1">
      <DateField
        label={label}
        value={field.value}
        onChange={field.onChange}
        placeholder={t('shell.table.any')}
        error={fieldState.error?.message}
        testID={`filter-${name}`}
      />
      {field.value ? (
        <XStack justifyContent="flex-end">
          <DuncitButton
            label={t('shell.common.clear')}
            accessibilityLabel={`${t('shell.common.clear')} ${label}`}
            onPress={() => field.onChange(null)}
            variant="ghost"
            size="sm"
            testID={`filter-${name}-clear`}
          />
        </XStack>
      ) : null}
    </YStack>
  );
}

interface Props {
  control: Control<LeadListFilterValues>;
  /** A nearby search adds the Distance range. */
  nearby: boolean;
}

/** The listing's ranges: Quality Score, Follow-up and Created dates, and (nearby) Distance. */
export function LeadListRangeFields({ control, nearby }: Readonly<Props>) {
  const { t } = useTranslation();
  const score = t('crm.leadQuality.columnHeader');
  const followUp = t('crm.leadList.followUp');
  const created = t('shell.common.created');
  return (
    <YStack gap="$3">
      <XStack gap="$2">
        <YStack flex={1}>
          <TextField
            control={control}
            name="scoreMin"
            label={t('shell.table.rangeMin', { vars: { label: score } })}
            keyboardType="number-pad"
            numeric={{ nullable: true }}
            testID="filter-score-min"
          />
        </YStack>
        <YStack flex={1}>
          <TextField
            control={control}
            name="scoreMax"
            label={t('shell.table.rangeMax', { vars: { label: score } })}
            keyboardType="number-pad"
            numeric={{ nullable: true }}
            testID="filter-score-max"
          />
        </YStack>
      </XStack>
      <DateEnd
        control={control}
        name="followUpFrom"
        label={t('shell.table.rangeFrom', { vars: { label: followUp } })}
      />
      <DateEnd
        control={control}
        name="followUpTo"
        label={t('shell.table.rangeTo', { vars: { label: followUp } })}
      />
      <DateEnd
        control={control}
        name="createdFrom"
        label={t('shell.table.rangeFrom', { vars: { label: created } })}
      />
      <DateEnd
        control={control}
        name="createdTo"
        label={t('shell.table.rangeTo', { vars: { label: created } })}
      />
      {nearby ? (
        <TextField
          control={control}
          name="distanceMax"
          label={t('shell.table.rangeMax', { vars: { label: t('crm.nearby.distance') } })}
          hint={t('crmApp.leadList.distanceHint')}
          keyboardType="number-pad"
          numeric={{ nullable: true }}
          testID="filter-distance-max"
        />
      ) : null}
    </YStack>
  );
}
