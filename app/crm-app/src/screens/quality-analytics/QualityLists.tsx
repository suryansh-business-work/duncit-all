import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { CRM_QUALIFICATION_KEY, crmFormatScore } from '@duncit/utils';

import { isLeadKind } from '@/features/leads/leadKinds';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';
import type { Analytics } from './analytics.types';
import { InfoList } from './InfoList';

/** The portal's three tables: top leads (opens the lead), cities, and conversion by classification. */
export function QualityLists({ data }: Readonly<{ data: Analytics }>) {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const dash = t('crmApp.common.dash');
  const percent = (value: number | null | undefined) =>
    typeof value === 'number'
      ? t('crm.leadQualityAnalytics.percent', { vars: { value: Math.round(value) } })
      : dash;
  const qualification = (value: string) => {
    const key = CRM_QUALIFICATION_KEY[value];
    return key ? t(key) : value;
  };
  return (
    <>
      <InfoList
        title={t('crm.leadQualityAnalytics.topLeadsTitle')}
        hint={t('crm.leadQualityAnalytics.topLeadsHint')}
        empty={t('crm.leadQualityAnalytics.noScores')}
        testID="top-leads"
        rows={[...data.top_leads]
          .sort((a, b) => b.score - a.score)
          .map((lead) => ({
            key: `${lead.entity_type}:${lead.id}`,
            title: lead.name,
            detail: [
              t(`crmApp.kind.${lead.entity_type}`),
              lead.city,
              lead.classification_label,
              qualification(lead.qualification),
            ]
              .filter(Boolean)
              .join(' · '),
            value: crmFormatScore(lead.score, dash),
            onPress: isLeadKind(lead.entity_type)
              ? () => navigation.navigate('LeadDetail', { kind: lead.entity_type, id: lead.id })
              : undefined,
          }))}
      />
      <InfoList
        title={t('crm.leadQualityAnalytics.citiesTitle')}
        hint={t('crm.leadQualityAnalytics.citiesHint')}
        empty={t('crm.leadQualityAnalytics.noCities')}
        testID="cities"
        rows={data.cities.map((city) => ({
          key: city.city,
          title: city.city,
          detail: t('crmApp.analytics.cityDetail', {
            vars: {
              leads: city.leads,
              qualified: city.qualified,
              score: crmFormatScore(city.average_score, dash),
            },
          }),
          value: crmFormatScore(city.average_score, dash),
        }))}
      />
      <InfoList
        title={t('crm.leadQualityAnalytics.conversionTitle')}
        hint={t('crm.leadQualityAnalytics.conversionHint')}
        empty={t('crm.leadQualityAnalytics.noScores')}
        testID="conversion"
        rows={data.conversion.map((row) => ({
          key: row.classification,
          title: row.label,
          detail: t('crmApp.analytics.conversionDetail', {
            vars: { leads: row.leads, won: row.won },
          }),
          value: percent(row.conversion_rate),
        }))}
      />
    </>
  );
}
