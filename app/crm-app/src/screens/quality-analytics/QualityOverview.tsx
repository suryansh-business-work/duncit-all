import { Text, XStack, YStack } from 'tamagui';
import { crmFormatScore } from '@duncit/utils';

import { Card } from '@/components/Card';
import { StatGrid } from '@/components/StatGrid';
import { RADII } from '@/constants/design';
import { useTranslation } from '@/hooks/useTranslation';
import type { TypeStats } from './analytics.types';

const RING = 64;

/** One card per lead type: its average score, how many are scored, and how they qualify — the portal's type cards. */
export function QualityOverview({ stats }: Readonly<{ stats: readonly TypeStats[] }>) {
  const { t } = useTranslation();
  const dash = t('crmApp.common.dash');
  return (
    <YStack gap="$3">
      {stats.map((s) => (
        <Card key={s.entity_type} testID={`type-card-${s.entity_type}`}>
          <XStack alignItems="center" gap="$3">
            <YStack
              width={RING}
              height={RING}
              borderRadius={RADII.pill}
              borderWidth={5}
              borderColor="$accentText"
              alignItems="center"
              justifyContent="center"
              accessible
              aria-label={`${t('crm.leadQualityAnalytics.averageScore')}: ${crmFormatScore(s.average_score, dash)}`}
            >
              <Text fontSize="$6" fontWeight="800">
                {crmFormatScore(s.average_score, dash)}
              </Text>
            </YStack>
            <YStack flex={1}>
              <Text fontSize="$5" fontWeight="700" role="heading">
                {t(`crmApp.kind.${s.entity_type}`)}
              </Text>
              <Text color="$muted">
                {t('crm.leadQualityAnalytics.scoredOf', {
                  vars: { scored: s.scored, total: s.total },
                })}
              </Text>
            </YStack>
          </XStack>
          <StatGrid
            items={[
              { key: `${s.entity_type}-total`, label: t('crm.common.totalLeads'), value: s.total },
              {
                key: `${s.entity_type}-qualified`,
                label: t('crm.leadQuality.qualified'),
                value: s.qualified,
              },
              {
                key: `${s.entity_type}-not-qualified`,
                label: t('crm.leadQuality.notQualified'),
                value: s.not_qualified,
              },
              {
                key: `${s.entity_type}-pending`,
                label: t('crm.leadQuality.pendingVerification'),
                value: s.pending_verification,
              },
              {
                key: `${s.entity_type}-failed-gates`,
                label: t('crm.leadQualityAnalytics.failedGateLeads'),
                value: s.failed_gate_leads,
              },
              {
                key: `${s.entity_type}-pending-items`,
                label: t('crm.leadQualityAnalytics.pendingItems'),
                value: s.pending_items,
              },
            ]}
          />
        </Card>
      ))}
    </YStack>
  );
}
