import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';
import {
  CRM_QUALITY_STATUS_KEY,
  CRM_QUALITY_STATUS_TONE,
  crmFormatPoints,
  crmKeyOr,
} from '@duncit/utils';

import { SURFACE } from '@/components/surface';
import { ToneChip } from '@/components/ToneChip';
import { useTranslation } from '@/hooks/useTranslation';
import { QualityItemRow } from './QualityItemRow';
import type { QualityCriterion as Criterion, QualityEvidence, QualityItem } from './useLeadQuality';

interface Props {
  criterion: Criterion;
  evidence: ReadonlyMap<string, QualityEvidence>;
  onRecord: (item: QualityItem) => void;
}

/** One criterion of the breakdown: what it earned of its maximum and its status; it opens to its items. */
export function QualityCriterion({ criterion, evidence, onRecord }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const toggle = open
    ? t('crm.leadQualityTab.hideItems', { vars: { name: criterion.name } })
    : t('crm.leadQualityTab.showItems', { vars: { name: criterion.name } });
  return (
    <YStack {...SURFACE} gap="$2" testID={`lead-quality-criterion-${criterion.key}`}>
      <XStack
        alignItems="center"
        gap="$2"
        role="button"
        aria-label={toggle}
        aria-expanded={open}
        onPress={() => setOpen((value) => !value)}
        testID={`lead-quality-toggle-${criterion.key}`}
      >
        <MaterialIcons
          name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={22}
          color={theme.muted?.val}
          accessibilityElementsHidden
        />
        <YStack flex={1} gap="$1">
          <XStack alignItems="center" gap="$2" flexWrap="wrap">
            <Text fontWeight="700">{criterion.name}</Text>
            {criterion.mandatory ? (
              <ToneChip label={t('crm.leadQualityTab.gate')} tone="default" />
            ) : null}
          </XStack>
          <Text color="$muted" fontSize="$2">
            {`${t('crm.leadQualityTab.colEarned')}: ${t('crm.leadQualityTab.earnedOfMax', {
              vars: {
                earned: crmFormatPoints(criterion.earned),
                max: crmFormatPoints(criterion.max),
              },
            })}`}
          </Text>
        </YStack>
        <ToneChip
          label={t(
            crmKeyOr(CRM_QUALITY_STATUS_KEY, criterion.status, 'crm.leadQuality.statusPending'),
          )}
          tone={CRM_QUALITY_STATUS_TONE[criterion.status] ?? 'default'}
        />
      </XStack>
      {open
        ? criterion.items.map((item) => (
            <QualityItemRow
              key={item.key}
              item={item}
              evidence={evidence.get(item.key)}
              onRecord={onRecord}
            />
          ))
        : null}
    </YStack>
  );
}
