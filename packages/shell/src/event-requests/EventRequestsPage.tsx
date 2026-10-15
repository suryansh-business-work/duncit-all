import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { createLogger } from '@duncit/logs';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { PageHeader } from '@duncit/ui';
import { useTranslation } from '../i18n/useTranslation';
import { eventRequestColumns } from './columns';
import { EventRequestCountTiles } from './EventRequestCountTiles';
import {
  SCOPE_READS,
  UPDATE_EVENT_REQUEST_STATUS,
  type EventRequestCounts,
  type EventRequestRow,
  type EventRequestScope,
  type EventRequestStatus,
  type EventRequestTarget,
} from './queries';

const logger = createLogger('portal');

export interface EventRequestsPageProps {
  targetType: EventRequestTarget;
  scope: EventRequestScope;
}

/** Literal keys per (scope, target), so the translation gate sees each one. */
const SUBTITLE_KEY: Readonly<Record<EventRequestScope, Record<EventRequestTarget, string>>> = {
  owner: { VENUE: 'publicPage.eventRequests.ownerVenueSubtitle', HOST: 'publicPage.eventRequests.ownerHostSubtitle' },
  console: {
    VENUE: 'publicPage.eventRequests.consoleVenueSubtitle',
    HOST: 'publicPage.eventRequests.consoleHostSubtitle',
  },
};

const getRowId = (row: EventRequestRow) => row.id;

/**
 * Event Requests — what members asked for when a host or venue had nothing
 * coming up. ONE page for both audiences: the partner (Partners portal, scope
 * `owner` — the server limits it to their own venues or themself as host) and
 * staff (Venues / Hosts consoles, scope `console`). A pod going live closes the
 * open ones on its own; the buttons close one by hand.
 */
export function EventRequestsPage({ targetType, scope }: Readonly<EventRequestsPageProps>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  const refetchRef = useRef<(() => void) | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const reads = SCOPE_READS[scope];
  const variables = { target_type: targetType };

  const fetchRows = useApolloTableFetch<EventRequestRow>(
    client,
    reads.table,
    reads.tableField,
    { extraVariables: variables },
    [targetType, scope],
  );
  const countsQuery = useQuery<Record<string, EventRequestCounts>>(reads.counts, {
    variables,
    fetchPolicy: 'cache-and-network',
  });
  const refetchCounts = countsQuery.refetch;
  const [update] = useMutation(UPDATE_EVENT_REQUEST_STATUS);

  const onUpdate = useCallback(
    async (row: EventRequestRow, status: Exclude<EventRequestStatus, 'OPEN'>) => {
      setBusyId(row.id);
      try {
        await update({ variables: { id: row.id, status } });
        notifySuccess(t('publicPage.eventRequests.updated'));
        refetchRef.current?.();
        refetchCounts().catch((error: unknown) => logger.warn('EventRequestsPage', 'counts', { error }));
      } catch (error) {
        notifyError(t('publicPage.eventRequests.updateFailed'));
        logger.error('EventRequestsPage', 'update', { error, request_id: row.id, status });
      } finally {
        setBusyId(null);
      }
    },
    [refetchCounts, t, update],
  );

  const columns = useMemo(
    () =>
      eventRequestColumns({
        t,
        targetType,
        showTarget: scope === 'console' || targetType === 'VENUE',
        formatDateTime,
        busyId,
        onUpdate: (row, status) => {
          onUpdate(row, status).catch(() => undefined);
        },
      }),
    [busyId, formatDateTime, onUpdate, scope, t, targetType],
  );

  return (
    <Stack spacing={2.5} data-testid={`event-requests-page-${scope}-${targetType.toLowerCase()}`}>
      <PageHeader title={t('publicPage.eventRequests.title')} subtitle={t(SUBTITLE_KEY[scope][targetType])} />
      <EventRequestCountTiles
        counts={countsQuery.data?.[reads.countsField] ?? null}
        loading={countsQuery.loading}
        failed={Boolean(countsQuery.error)}
      />
      <DuncitTable<EventRequestRow>
        ariaLabel={t('publicPage.eventRequests.title')}
        tableId={`event-requests-${scope}-${targetType.toLowerCase()}`}
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        emptyText={t('publicPage.eventRequests.empty')}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        searchPlaceholder={t('publicPage.eventRequests.search')}
        refetchRef={refetchRef}
      />
    </Stack>
  );
}
