import { useMemo } from 'react';
import { YStack } from 'tamagui';

import { StateView } from '@/components/StateView';
import { CrmAppCommLogsDocument } from '@/graphql/comms';
import type { LeadKind } from '@/features/leads/leadKinds';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { CommLogItem } from './CommLogItem';

const LIMIT = 50;

/** The lead's calls (portal Twilio calls and phone calls alike) and emails — the portal's Communications tab. */
export function LeadActivity({ kind, id }: Readonly<{ kind: LeadKind; id: string }>) {
  const { t } = useTranslation();
  const variables = useMemo(
    () => ({ filter: { entity_type: kind, entity_id: id }, limit: LIMIT, offset: 0 }),
    [kind, id],
  );
  const { data, loading, error, refetch } = useGqlQuery(CrmAppCommLogsDocument, variables, {
    fallbackError: t('crmApp.common.loadFailed'),
  });
  const items = data?.communicationLogs.items ?? [];
  return (
    <YStack gap="$2">
      <StateView
        loading={loading && !data}
        error={error}
        empty={data && items.length === 0 ? t('crmApp.activity.empty') : null}
        onRetry={refetch}
      />
      {items.map((log) => (
        <CommLogItem key={log.id} log={log} />
      ))}
    </YStack>
  );
}
