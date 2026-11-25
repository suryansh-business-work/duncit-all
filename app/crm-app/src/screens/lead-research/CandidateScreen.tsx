import { useLayoutEffect, useState } from 'react';
import { Linking, ScrollView } from 'react-native';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import { Text, XStack, YStack } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';
import {
  CRM_CANDIDATE_STATUS_KEY,
  CRM_CANDIDATE_STATUS_TONE,
  CRM_QUALIFICATION_KEY,
  CRM_QUALIFICATION_TONE,
  crmFormatScore,
} from '@duncit/utils';

import { Card } from '@/components/Card';
import { DuncitButton } from '@/components/DuncitButton';
import { StateView } from '@/components/StateView';
import { ToneChip } from '@/components/ToneChip';
import { isLeadKind } from '@/features/leads/leadKinds';
import { CrmAppLeadCandidateDocument } from '@/graphql/leadResearch';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';
import { CandidateDecision, type Outcome } from './CandidateDecision';

/** The portal's own words for each add-to-CRM outcome (literal keys for the localization gate). */
const OUTCOME_KEY: Record<string, string> = {
  ADDED: 'crm.leadResearch.outcomeAdded',
  DUPLICATE: 'crm.leadResearch.outcomeDuplicate',
  NOT_QUALIFIED: 'crm.leadResearch.outcomeNotQualified',
  SKIPPED: 'crm.leadResearch.outcomeSkipped',
  FAILED: 'crm.leadResearch.outcomeFailed',
};

/** One researched candidate: who it is, how it scored, what is missing, where it was found — and the decision. */
export function CandidateScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const { params } = useRoute<RouteProp<AppStackParamList, 'Candidate'>>();
  const { data, loading, error, refetch } = useGqlQuery(
    CrmAppLeadCandidateDocument,
    { id: params.id },
    { fallbackError: t('crmApp.common.loadFailed') },
  );
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const c = data?.crmLeadCandidate ?? null;

  useLayoutEffect(() => {
    navigation.setOptions({ title: c?.name ?? t('crm.leadResearch.details') });
  }, [navigation, c?.name, t]);

  if (!c) {
    const notFound = data && !loading ? t('crmApp.research.notFound') : null;
    return <StateView loading={loading && !data} error={error ?? notFound} onRetry={refetch} />;
  }
  const dash = t('crmApp.common.dash');
  const open = (url: string) =>
    fireAndForget(Linking.openURL(url), logs.mobileApp, 'crm-app/Candidate', 'openURL');
  const facts = [
    c.address,
    [c.area, c.city].filter(Boolean).join(', '),
    c.category,
    ...c.phones,
    ...c.emails,
  ].filter(Boolean);
  const crmLeadId = c.crm_lead_id;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <YStack gap="$1">
        <Text fontSize="$8" fontWeight="800" role="heading">
          {c.name}
        </Text>
        <XStack gap="$2" flexWrap="wrap" alignItems="center">
          <Text color="$muted">{t(`crmApp.kind.${c.lead_type}`)}</Text>
          <ToneChip
            label={t(CRM_CANDIDATE_STATUS_KEY[c.status] ?? c.status)}
            tone={CRM_CANDIDATE_STATUS_TONE[c.status] ?? 'default'}
            testID="candidate-status"
          />
          {c.qualification ? (
            <ToneChip
              label={t(CRM_QUALIFICATION_KEY[c.qualification] ?? c.qualification)}
              tone={CRM_QUALIFICATION_TONE[c.qualification] ?? 'default'}
            />
          ) : null}
        </XStack>
        <Text fontWeight="700">
          {t('crmApp.research.score', {
            vars: { score: crmFormatScore(c.score, dash), label: c.classification_label || dash },
          })}
        </Text>
      </YStack>
      {outcome ? (
        <Card title={t('crm.leadResearch.decision')} testID="candidate-outcome">
          <Text fontWeight="700">{t(OUTCOME_KEY[outcome.outcome] ?? outcome.outcome)}</Text>
          {outcome.message ? <Text color="$muted">{outcome.message}</Text> : null}
        </Card>
      ) : null}
      {c.status === 'NEW' ? (
        <CandidateDecision
          candidateId={c.id}
          onDecided={(result) => {
            setOutcome(result);
            fireAndForget(refetch(), logs.mobileApp, 'crm-app/Candidate', 'refetch');
          }}
        />
      ) : null}
      {crmLeadId && isLeadKind(c.lead_type) ? (
        <DuncitButton
          label={t('crm.leadResearch.openLead')}
          onPress={() => navigation.navigate('LeadDetail', { kind: c.lead_type, id: crmLeadId })}
          variant="outline"
          testID="candidate-open-lead"
        />
      ) : null}
      {c.duplicates.length > 0 ? (
        <Card
          title={t('crm.leadResearch.duplicatesTitle', {
            count: c.duplicates.length,
            vars: { count: c.duplicates.length },
          })}
          testID="candidate-duplicates"
        >
          {c.duplicates.map((d) => (
            <Text key={`${d.entity_type}:${d.lead_id}`}>
              {d.lead_name} —{' '}
              {t('crm.leadResearch.duplicateMatch', {
                vars: { kind: t(`crmApp.kind.${d.entity_type}`), match: d.match },
              })}
            </Text>
          ))}
        </Card>
      ) : null}
      <Card title={t('crm.leadResearch.details')}>
        {facts.map((fact) => (
          <Text key={fact}>{fact}</Text>
        ))}
        {c.description ? <Text color="$muted">{c.description}</Text> : null}
        {c.website ? (
          <Text role="link" color="$accentText" onPress={() => open(c.website ?? '')}>
            {c.website}
          </Text>
        ) : null}
        {c.instagram_url ? (
          <Text role="link" color="$accentText" onPress={() => open(c.instagram_url ?? '')}>
            {c.instagram_handle || c.instagram_url}
          </Text>
        ) : null}
      </Card>
      <Card title={t('crm.leadResearch.missingEvidence')}>
        {c.missing_evidence.length === 0 ? (
          <Text color="$muted">{t('crm.leadResearch.nothingMissing')}</Text>
        ) : null}
        {c.missing_evidence.map((item) => (
          <Text key={item}>{item}</Text>
        ))}
      </Card>
      <Card title={t('crm.leadResearch.sourcesFound')}>
        {c.sources.map((s) => (
          <Text
            key={s.url}
            role="link"
            color="$accentText"
            onPress={() => open(s.url)}
            numberOfLines={1}
          >
            {s.title || s.url}
          </Text>
        ))}
      </Card>
    </ScrollView>
  );
}
