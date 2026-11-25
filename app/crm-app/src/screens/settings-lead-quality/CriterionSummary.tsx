import { Text, XStack, YStack } from 'tamagui';
import { CRM_AUTO_CHECK_KEY, crmKeyOr } from '@duncit/utils';

import { SURFACE } from '@/components/surface';
import { ToneChip } from '@/components/ToneChip';
import type { QualityConfig } from '@/features/lead-quality-settings/editor';
import { useTranslation } from '@/hooks/useTranslation';

type Criterion = QualityConfig['criteria'][number];
type Item = Pick<Criterion, 'auto_check' | 'threshold' | 'guidance' | 'mandatory'>;

/** One "label: value" line of the read-only model. */
function Line({ field, value }: Readonly<{ field: string; value: string | number }>) {
  const { t } = useTranslation();
  return (
    <Text color="$muted" fontSize="$2">
      {t('shell.a11y.fieldOf', { vars: { field, name: value } })}
    </Text>
  );
}

/** How an item is checked (and against what number), whether it is a gate, and its guidance. */
function ItemDetails({ item, gateHint }: Readonly<{ item: Item; gateHint: string }>) {
  const { t } = useTranslation();
  return (
    <YStack gap="$1">
      <Line
        field={t('crm.leadQualitySettings.autoCheck')}
        value={t(crmKeyOr(CRM_AUTO_CHECK_KEY, item.auto_check, 'crm.leadQuality.autoNone'))}
      />
      {typeof item.threshold === 'number' ? (
        <Line field={t('crm.leadQualitySettings.threshold')} value={item.threshold} />
      ) : null}
      {item.mandatory ? <Text fontSize="$2">{gateHint}</Text> : null}
      {item.guidance ? (
        <Line field={t('crm.leadQualitySettings.guidance')} value={item.guidance} />
      ) : null}
    </YStack>
  );
}

/** One criterion of the published model, read-only: weightage, on/off, gate, check and its sub-criteria. */
export function CriterionSummary({
  criterion,
  index,
}: Readonly<{ criterion: Criterion; index: number }>) {
  const { t } = useTranslation();
  const subs = criterion.sub_criteria;
  return (
    <YStack {...SURFACE} gap="$2" testID={`lead-quality-summary-${index}`}>
      <XStack alignItems="center" gap="$2" flexWrap="wrap">
        <Text flex={1} fontWeight="700">
          {criterion.name}
        </Text>
        <ToneChip
          label={t('crm.leadQualitySettings.percent', { vars: { total: criterion.weightage } })}
          tone="info"
        />
        {criterion.enabled ? null : <ToneChip label={t('crm.common.inactive')} tone="default" />}
        {criterion.mandatory ? (
          <ToneChip label={t('crm.leadQualitySettings.mandatory')} tone="warning" />
        ) : null}
      </XStack>
      {subs.length === 0 ? (
        <ItemDetails item={{ ...criterion, mandatory: false }} gateHint="" />
      ) : null}
      {criterion.mandatory ? (
        <Text fontSize="$2">{t('crm.leadQualitySettings.mandatoryCriterionHint')}</Text>
      ) : null}
      <Text fontWeight="600" fontSize="$3">
        {t('crm.leadQualitySettings.subCriteriaTitle')}
      </Text>
      {subs.length === 0 ? (
        <Text color="$muted" fontSize="$2">
          {t('crm.leadQualitySettings.noSubCriteria')}
        </Text>
      ) : null}
      {subs.map((sub) => (
        <YStack
          key={sub.key}
          gap="$1"
          paddingLeft="$3"
          borderLeftWidth={2}
          borderColor="$borderColor"
        >
          <XStack alignItems="center" gap="$2" flexWrap="wrap">
            <Text flex={1} fontWeight="600">
              {sub.name}
            </Text>
            <Text color="$muted" fontSize="$2">
              {t('shell.a11y.fieldOf', {
                vars: { field: t('crm.leadQualitySettings.points'), name: sub.points },
              })}
            </Text>
          </XStack>
          <ItemDetails item={sub} gateHint={t('crm.leadQualitySettings.mandatorySubHint')} />
        </YStack>
      ))}
    </YStack>
  );
}
