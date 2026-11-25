import { Text, XStack, YStack } from 'tamagui';
import { crmFormatPoints, crmQualityTone } from '@duncit/utils';

import { ToneChip } from '@/components/ToneChip';
import { useTranslation } from '@/hooks/useTranslation';
import { DetailCard } from '../parts/DetailCard';
import { QualityCriterion } from './QualityCriterion';
import type { QualityEvidence, QualityItem, QualityResult } from './useLeadQuality';

interface Props {
  result: QualityResult;
  evidence: ReadonlyMap<string, QualityEvidence>;
  onRecord: (item: QualityItem) => void;
}

/**
 * The portal's breakdown table on a phone: one card per criterion (earned of
 * maximum, status, its items) and the total — the maximum, the score and the
 * classification — all from the same result as the ring above.
 */
export function QualityBreakdown({ result, evidence, onRecord }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <DetailCard
      title={t('crm.leadQualityTab.colCriteria')}
      icon="insights"
      testID="lead-quality-breakdown"
    >
      {result.criteria.length === 0 ? (
        <Text color="$muted">{t('crm.leadQualityTab.noCriteria')}</Text>
      ) : null}
      <YStack gap="$2">
        {result.criteria.map((criterion) => (
          <QualityCriterion
            key={criterion.key}
            criterion={criterion}
            evidence={evidence}
            onRecord={onRecord}
          />
        ))}
      </YStack>
      <XStack
        alignItems="center"
        gap="$2"
        paddingTop="$2"
        borderTopWidth={1}
        borderColor="$borderColor"
        testID="lead-quality-total"
      >
        <YStack flex={1}>
          <Text fontWeight="800">{t('crm.leadQualityTab.total')}</Text>
          <Text color="$muted" fontSize="$2">
            {`${t('crm.leadQualityTab.colMaximum')}: ${crmFormatPoints(result.max_score)} · ${t('crm.leadQualityTab.colEarned')}: ${crmFormatPoints(result.score)}`}
          </Text>
        </YStack>
        <ToneChip label={result.classification_label} tone={crmQualityTone(result.tone)} />
      </XStack>
    </DetailCard>
  );
}
