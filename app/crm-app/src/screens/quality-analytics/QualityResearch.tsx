import { Text, YStack } from 'tamagui';
import { CRM_CANDIDATE_STATUS_KEY, crmFormatScore, crmShareOf } from '@duncit/utils';

import { Card } from '@/components/Card';
import { StatGrid } from '@/components/StatGrid';
import { useTranslation } from '@/hooks/useTranslation';
import type { Analytics } from './analytics.types';
import { InfoList } from './InfoList';

/** Research is a lead added from Lead Research; everything else was entered by hand. */
const ORIGINS = [
  { origin: 'RESEARCH', key: 'crm.leadQualityAnalytics.originResearch' },
  { origin: 'MANUAL', key: 'crm.leadQualityAnalytics.originManual' },
] as const;

/** Researched leads against hand-entered ones, the research queue, and the evidence gaps — the portal's last sections. */
export function QualityResearch({ data }: Readonly<{ data: Analytics }>) {
  const { t } = useTranslation();
  const dash = t('crmApp.common.dash');
  return (
    <>
      <Card title={t('crm.leadQualityAnalytics.originsTitle')} testID="origins">
        <Text color="$muted" fontSize="$2">
          {t('crm.leadQualityAnalytics.originsHint')}
        </Text>
        {ORIGINS.map(({ origin, key }) => {
          const row = data.origins.find((o) => o.origin === origin);
          const leads = row?.leads ?? 0;
          const qualified = row?.qualified ?? 0;
          const rate = crmShareOf(qualified, leads);
          return (
            <YStack key={origin} gap="$2">
              <Text fontWeight="700">{t(key)}</Text>
              <StatGrid
                items={[
                  {
                    key: `${origin}-leads`,
                    label: t('crm.leadQualityAnalytics.leads'),
                    value: leads,
                  },
                  {
                    key: `${origin}-average`,
                    label: t('crm.leadQualityAnalytics.averageScore'),
                    value: crmFormatScore(row?.average_score, dash),
                  },
                  {
                    key: `${origin}-qualified`,
                    label: t('crm.leadQuality.qualified'),
                    value: qualified,
                  },
                  {
                    key: `${origin}-rate`,
                    label: t('crm.leadQualityAnalytics.qualifiedRate'),
                    value:
                      rate === null
                        ? dash
                        : t('crm.leadQualityAnalytics.percent', { vars: { value: rate } }),
                  },
                ]}
              />
            </YStack>
          );
        })}
      </Card>
      <InfoList
        title={t('crm.leadQualityAnalytics.researchQueue')}
        hint={t('crm.leadQualityAnalytics.researchQueueHint')}
        empty={t('crm.leadQualityAnalytics.researchQueueEmpty')}
        testID="research-queue"
        rows={data.research_queue
          .filter((row) => row.count > 0)
          .map((row) => {
            const statusKey = CRM_CANDIDATE_STATUS_KEY[row.key];
            return {
              key: row.key,
              title: statusKey ? t(statusKey) : row.label,
              detail: t('crm.leadQualityAnalytics.queueAverage', {
                vars: { status: row.label, score: crmFormatScore(row.average_score, dash) },
              }),
              value: String(row.count),
            };
          })}
      />
      <Card title={t('crm.leadQualityAnalytics.gapsTitle')} testID="evidence-gaps">
        <Text color="$muted" fontSize="$2">
          {t('crm.leadQualityAnalytics.gapsHint')}
        </Text>
        <StatGrid
          items={[
            {
              key: 'duplicate-leads',
              label: t('crm.leadQualityAnalytics.duplicateLeads'),
              value: data.duplicate_leads,
            },
          ]}
        />
      </Card>
      <InfoList
        title={t('crm.leadQualityAnalytics.missingTitle')}
        hint={t('crm.leadQualityAnalytics.gapsHint')}
        empty={t('crm.leadQualityAnalytics.noMissing')}
        testID="missing-evidence"
        rows={data.missing_evidence.map((row) => ({
          key: `${row.entity_type}:${row.criterion}`,
          title: row.criterion,
          detail: t(`crmApp.kind.${row.entity_type}`),
          value: String(row.leads),
        }))}
      />
    </>
  );
}
