import { useMemo } from 'react';
import { YStack } from 'tamagui';

import { StateView } from '@/components/StateView';
import { CrmAppRemindersDocument } from '@/graphql/reminders';
import type { LeadKind } from '@/features/leads/leadKinds';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { ReminderRow } from '@/screens/reminders/ReminderRow';

/** This lead's reminders, done and pending — the portal's Reminders tab. */
export function LeadReminders({ kind, id }: Readonly<{ kind: LeadKind; id: string }>) {
  const { t } = useTranslation();
  const variables = useMemo(() => ({ filter: { entity_type: kind, lead_id: id } }), [kind, id]);
  const { data, loading, error, refetch } = useGqlQuery(CrmAppRemindersDocument, variables, { fallbackError: t('crmApp.common.loadFailed') });
  const rows = [...(data?.crmReminders ?? [])].sort((a, b) => a.due_at.localeCompare(b.due_at));
  return (
    <YStack>
      <StateView loading={loading && !data} error={error} empty={data && rows.length === 0 ? t('crmApp.reminder.empty') : null} onRetry={refetch} />
      {rows.map((r) => (
        <ReminderRow key={r.id} reminder={r} onChanged={refetch} />
      ))}
    </YStack>
  );
}
