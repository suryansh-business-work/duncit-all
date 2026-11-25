import { useEffect, useRef } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { Text, XStack, YStack } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';
import {
  CRM_QUALITY_STATUS_KEY,
  CRM_QUALITY_TRIGGER_KEY,
  CRM_VIA_KEY,
  crmFormatPoints,
  crmKeyOr,
} from '@duncit/utils';

import { StateView } from '@/components/StateView';
import { ToneChip } from '@/components/ToneChip';
import type { LeadKind } from '@/features/leads/leadKinds';
import { displayDateTime } from '@/features/reminders/reminderTime';
import { CrmAppLeadQualityHistoryDocument } from '@/graphql/leadTabs';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { DetailCard } from '../parts/DetailCard';
import { LinkText } from '../parts/LinkText';

/** The newest score changes and evidence decisions shown (the server allows up to 200). */
const HISTORY_LIMIT = 50;

type QualityEvent = ResultOf<
  typeof CrmAppLeadQualityHistoryDocument
>['crmLeadQualityHistory'][number];

/** One entry: a score change (with what caused it) or an evidence decision (with who made it and the source). */
function HistoryEvent({
  event,
  itemNames,
}: Readonly<{ event: QualityEvent; itemNames: ReadonlyMap<string, string> }>) {
  const { t } = useTranslation();
  const evidence = event.kind === 'EVIDENCE';
  const status = (value: string) =>
    t(crmKeyOr(CRM_QUALITY_STATUS_KEY, value, 'crm.leadQuality.statusPending'));
  const headline = evidence
    ? t('crm.leadQualityTab.historyEvidence', {
        vars: {
          item: itemNames.get(event.item_key) ?? event.item_key,
          before: status(event.status_before),
          after: status(event.status_after),
        },
      })
    : t('crm.leadQualityTab.historyScore', {
        vars: {
          before: crmFormatPoints(event.score_before),
          after: crmFormatPoints(event.score_after),
        },
      });
  const what = evidence
    ? t(crmKeyOr(CRM_VIA_KEY, event.via, 'crm.leadQuality.viaManual'))
    : t(crmKeyOr(CRM_QUALITY_TRIGGER_KEY, event.trigger, 'crm.leadQualityTab.triggerOther'));
  return (
    <YStack
      paddingVertical="$2"
      gap="$1"
      borderBottomWidth={1}
      borderColor="$borderColor"
      testID={`lead-quality-event-${event.id}`}
    >
      <XStack alignItems="center" gap="$2" flexWrap="wrap">
        <Text fontWeight="600">{headline}</Text>
        {!evidence && event.classification ? (
          <ToneChip label={event.classification} tone="default" />
        ) : null}
      </XStack>
      {evidence && event.evidence ? <Text>{event.evidence}</Text> : null}
      {evidence && event.source_url ? <LinkText href={event.source_url} /> : null}
      <Text color="$muted" fontSize="$2">
        {t('crm.leadQualityTab.historyMeta', {
          vars: { what, name: event.actor.name, date: displayDateTime(event.created_at) },
        })}
      </Text>
    </YStack>
  );
}

interface Props {
  kind: LeadKind;
  id: string;
  itemNames: ReadonlyMap<string, string>;
  /** Bumped after every write, so the history reads its new events. */
  version: number;
}

/** The lead's score and evidence history, newest first. */
export function QualityHistory({ kind, id, itemNames, version }: Readonly<Props>) {
  const { t } = useTranslation();
  const query = useGqlQuery(
    CrmAppLeadQualityHistoryDocument,
    { entity_type: kind, lead_id: id, limit: HISTORY_LIMIT },
    { fallbackError: t('crm.leadQualityTab.historyLoadFailed') },
  );
  const { refetch } = query;
  const seen = useRef(version);
  useEffect(() => {
    if (seen.current === version) return;
    seen.current = version;
    fireAndForget(refetch(), logs.mobileApp, 'crm-app/QualityHistory', 'refetch');
  }, [version, refetch]);

  const events = query.data?.crmLeadQualityHistory ?? [];
  return (
    <DetailCard
      title={t('crm.leadQualityTab.historyTitle')}
      subtitle={t('crm.leadQualityTab.historySubtitle')}
      icon="history"
      testID="lead-quality-history"
    >
      {query.data ? null : (
        <StateView loading={query.loading} error={query.error} onRetry={refetch} />
      )}
      {query.data && events.length === 0 ? (
        <Text color="$muted">{t('crm.leadQualityTab.historyEmpty')}</Text>
      ) : null}
      {events.map((event) => (
        <HistoryEvent key={event.id} event={event} itemNames={itemNames} />
      ))}
    </DetailCard>
  );
}
