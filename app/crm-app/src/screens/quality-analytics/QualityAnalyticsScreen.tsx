import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';
import { crmIsEmptyAnalytics } from '@duncit/utils';

import { Card } from '@/components/Card';
import { DuncitButton } from '@/components/DuncitButton';
import { StateView } from '@/components/StateView';
import { LEAD_KINDS, type LeadKind } from '@/features/leads/leadKinds';
import { displayDateTime } from '@/features/reminders/reminderTime';
import { CrmAppQualityAnalyticsDocument } from '@/graphql/leadQuality';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { QualityCharts } from './QualityCharts';
import { QualityLists } from './QualityLists';
import { QualityOverview } from './QualityOverview';
import { QualityResearch } from './QualityResearch';

const ALL = 'ALL';
type Choice = typeof ALL | LeadKind;

/**
 * CRM › Quality Analytics: how CRM leads score with the published Lead Quality
 * model — for every lead type or one — from the scores stored on the leads.
 * Nothing here is estimated; an empty type says so instead of showing zeros.
 */
export function QualityAnalyticsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [choice, setChoice] = useState<Choice>(ALL);
  const variables = useMemo(() => ({ entity_type: choice === ALL ? null : choice }), [choice]);
  const { data, loading, error, refetch } = useGqlQuery(CrmAppQualityAnalyticsDocument, variables, {
    fallbackError: t('crmApp.common.loadFailed'),
  });
  const analytics = data?.crmLeadQualityAnalytics;
  const choices: Choice[] = [ALL, ...LEAD_KINDS];

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
    >
      <XStack alignItems="center" gap="$2">
        <MaterialIcons
          name="insights"
          size={24}
          color={theme.accentText?.val}
          accessibilityElementsHidden
        />
        <YStack flex={1}>
          <Text fontSize="$7" fontWeight="800" role="heading">
            {t('crm.leadQualityAnalytics.title')}
          </Text>
          <Text color="$muted" fontSize="$2">
            {t('crm.leadQualityAnalytics.subtitle')}
          </Text>
        </YStack>
      </XStack>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <XStack gap="$2" role="tablist">
          {choices.map((c) => (
            <DuncitButton
              key={c}
              label={c === ALL ? t('crm.leadQualityAnalytics.allTypes') : t(`crmApp.kind.${c}`)}
              onPress={() => setChoice(c)}
              size="sm"
              variant={choice === c ? 'solid' : 'outline'}
              testID={`analytics-type-${c}`}
            />
          ))}
        </XStack>
      </ScrollView>
      {!analytics ? (
        <StateView loading={loading && !error} error={error} onRetry={refetch} />
      ) : null}
      {analytics && crmIsEmptyAnalytics(analytics) ? (
        <Card title={t('crm.leadQualityAnalytics.emptyTitle')} testID="analytics-empty">
          <Text color="$muted">{t('crm.leadQualityAnalytics.emptyBody')}</Text>
        </Card>
      ) : null}
      {analytics && !crmIsEmptyAnalytics(analytics) ? (
        <YStack gap="$3">
          <Text color="$muted" fontSize="$2">
            {t('crm.leadQualityAnalytics.generatedAt', {
              vars: { date: displayDateTime(analytics.generated_at) },
            })}
          </Text>
          <QualityOverview stats={analytics.by_type} />
          <QualityCharts data={analytics} />
          <QualityLists data={analytics} />
          <QualityResearch data={analytics} />
        </YStack>
      ) : null}
    </ScrollView>
  );
}
