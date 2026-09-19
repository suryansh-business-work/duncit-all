import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { PageHeader } from '@duncit/ui';
import { usePortalT } from '../../../shared/i18n';
import { LITE_ADMIN_CANCEL_EVENT, LITE_ADMIN_EVENTS_TABLE, LITE_ADMIN_SET_EVENT_FLAGS, type LiteAdminEventRow } from '../../graphql/events';
import { useAction } from '../../hooks/useAction';
import { CancelEventDialog } from './cancel-event';
import { buildEventColumns, eventRowId } from './columns';
import { EventActions } from './EventActions';

export function EventsPage() {
  const { t } = usePortalT();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const reload = useCallback(() => refetchRef.current?.(), []);
  const run = useAction(reload);
  const fetchRows = useApolloTableFetch<LiteAdminEventRow>(client, LITE_ADMIN_EVENTS_TABLE, 'liteAdminEventsTable');
  const [setFlags] = useMutation(LITE_ADMIN_SET_EVENT_FLAGS);
  const [cancelEvent, cancelState] = useMutation(LITE_ADMIN_CANCEL_EVENT);
  const [cancelling, setCancelling] = useState<LiteAdminEventRow | null>(null);

  const toggleFeatured = useCallback(
    (row: LiteAdminEventRow) => {
      const featured = !row.featured;
      const vars = { vars: { title: row.title } };
      const done = featured ? t('litePortal.events.featuredOn', vars) : t('litePortal.events.featuredOff', vars);
      return run(() => setFlags({ variables: { id: row.id, featured } }), done);
    },
    [run, setFlags, t],
  );

  const toggleHidden = useCallback(
    (row: LiteAdminEventRow) => {
      const hidden = !row.hidden;
      const vars = { vars: { title: row.title } };
      const done = hidden ? t('litePortal.events.hiddenOn', vars) : t('litePortal.events.hiddenOff', vars);
      return run(() => setFlags({ variables: { id: row.id, hidden } }), done);
    },
    [run, setFlags, t],
  );

  const submitCancel = async (reason: string) => {
    if (!cancelling) return;
    const ok = await run(
      () => cancelEvent({ variables: { id: cancelling.id, reason: reason || null } }),
      t('litePortal.events.cancelled', { vars: { title: cancelling.title } }),
    );
    if (ok) setCancelling(null);
  };

  const columns = useMemo(
    () => buildEventColumns(t, (row) => <EventActions row={row} onFeatured={toggleFeatured} onHidden={toggleHidden} onCancel={setCancelling} />),
    [t, toggleFeatured, toggleHidden],
  );

  return (
    <Stack spacing={2}>
      <PageHeader title={t('litePortal.events.title')} subtitle={t('litePortal.events.subtitle')} />
      <DuncitTable<LiteAdminEventRow>
        tableId="lite-events"
        ariaLabel={t('litePortal.events.title')}
        columns={columns}
        fetchRows={fetchRows}
        getRowId={eventRowId}
        emptyText={t('litePortal.events.empty')}
        searchPlaceholder={t('litePortal.events.search')}
        defaultSort={{ field: 'start_at', dir: 'desc' }}
        refetchRef={refetchRef}
      />
      <CancelEventDialog event={cancelling} busy={cancelState.loading} onClose={() => setCancelling(null)} onSubmit={submitCancel} />
    </Stack>
  );
}
