import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { YStack } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';
import { crmCommsTypeCounts, type CrmCommsFilter } from '@duncit/utils';

import { StateView } from '@/components/StateView';
import { CrmAppLeadCommsDocument } from '@/graphql/leadTabsB';
import type { LeadKind } from '@/features/leads/leadKinds';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { CommLogItem } from './CommLogItem';
import { EmailStatusBadge } from './tabs/contacts/EmailStatusBadge';
import { useEmailStatuses } from './tabs/contacts/useEmailStatuses';
import { CommsFilters } from './tabs/CommsFilters';
import { TabAlert } from './tabs/TabAlert';
import { useDebouncedValue } from './tabs/TabsBDebounce';

/** The portal log's page: the newest hundred matching the filter and search. */
const LIMIT = 100;

/**
 * The lead's calls (portal Twilio calls and phone calls alike) and emails —
 * the portal's Communications tab: filter by kind, search, and per call its
 * recording, transcript and AI summary with their Get / Generate / Retry.
 */
export function LeadActivity({ kind, id }: Readonly<{ kind: LeadKind; id: string }>) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<CrmCommsFilter>('ALL');
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim());
  const variables = useMemo(
    () => ({
      filter: {
        entity_type: kind,
        entity_id: id,
        type: filter === 'ALL' ? null : filter,
        search: query || null,
      },
      limit: LIMIT,
      offset: 0,
    }),
    [kind, id, filter, query],
  );
  const { data, loading, error, refetch } = useGqlQuery(CrmAppLeadCommsDocument, variables, {
    fallbackError: t('crmApp.common.loadFailed'),
  });
  const items = data?.communicationLogs.items ?? [];
  const emails = useEmailStatuses(
    items.filter((log) => log.type === 'EMAIL').map((log) => log.contact_value),
  );
  const reload = useCallback(
    () => fireAndForget(refetch(), logs.mobileApp, 'crm-app/LeadActivity', 'refetch'),
    [refetch],
  );
  // Back from a call: the new call (and its summary) is in the log. The first focus is the first load.
  const focused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focused.current) reload();
      focused.current = true;
    }, [reload]),
  );

  return (
    <YStack gap="$2">
      <CommsFilters
        filter={filter}
        onFilter={setFilter}
        total={data?.communicationLogs.total ?? 0}
        counts={crmCommsTypeCounts(items)}
        search={search}
        onSearch={setSearch}
      />
      {emails.error ? <TabAlert tone="danger">{emails.error}</TabAlert> : null}
      <StateView
        loading={loading && !data}
        error={error}
        empty={data && items.length === 0 ? t('crm.comms.empty') : null}
        onRetry={refetch}
      />
      {items.map((log) => (
        <CommLogItem
          key={log.id}
          log={log}
          onChanged={reload}
          emailStatus={
            log.type === 'EMAIL' ? (
              <EmailStatusBadge email={log.contact_value} statuses={emails} />
            ) : null
          }
        />
      ))}
    </YStack>
  );
}
