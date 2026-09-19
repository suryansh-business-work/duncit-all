import { useMemo } from 'react';
import { Link as RouterLink, Navigate, useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Box, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTabs, tabPanelProps, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { PageHeader, QueryGuard } from '@duncit/ui';
import type { LiteEvent } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { SignedInGate } from '../../components/SignedInGate';
import { EventStatusChip } from '../../components/StatusChips';
import { LITE_EVENT } from '../../graphql/events';
import { paths } from '../../lib/paths';
import { usePageTitle } from '../../lib/usePageTitle';
import { NotFoundPage } from '../not-found';
import { CheckInTab } from './check-in';
import { GuestsTab } from './guests';
import { OverviewTab } from './OverviewTab';
import { SettingsTab } from './settings';
import { UpdatesTab } from './updates';

type ManageTab = 'overview' | 'guests' | 'checkin' | 'updates' | 'settings';
const TAB_VALUES: ManageTab[] = ['overview', 'guests', 'checkin', 'updates', 'settings'];
const TABS_ID = 'manage';

function ManageView({ event, onChanged }: Readonly<{ event: LiteEvent; onChanged: () => void }>) {
  const { t } = useWebT();
  const items = useMemo<DuncitTabItem<ManageTab>[]>(() => TAB_VALUES.map((value) => ({ value, label: t(`liteWeb.manage.tabs.${value}`), testId: `manage-tab-${value}` })), [t]);
  const tabs = useTabParam<ManageTab>({ items, fallback: 'overview' });

  let panel;
  if (tabs.value === 'guests') panel = <GuestsTab event={event} onChanged={onChanged} />;
  else if (tabs.value === 'checkin') panel = <CheckInTab event={event} onChanged={onChanged} />;
  else if (tabs.value === 'updates') panel = <UpdatesTab event={event} />;
  else if (tabs.value === 'settings') panel = <SettingsTab event={event} onChanged={onChanged} />;
  else panel = <OverviewTab event={event} onChanged={onChanged} onOpenTab={tabs.onChange} />;

  return (
    <Stack spacing={2} data-testid="manage-page">
      <PageHeader
        title={event.title}
        subtitle={t('liteWeb.manage.subtitle')}
        titleVariant="h4"
        actions={
          <>
            <EventStatusChip status={event.status} />
            <DuncitButton component={RouterLink} to={paths.event(event.slug)} variant="outlined" size="small" data-testid="manage-view-page">
              {t('liteWeb.manage.viewPage')}
            </DuncitButton>
          </>
        }
      />
      <DuncitTabs {...tabs} idPrefix={TABS_ID} variant="scrollable" allowScrollButtonsMobile />
      <Box {...tabPanelProps(TABS_ID, tabs.value)}>{panel}</Box>
    </Stack>
  );
}

/** Loads the event and turns anyone who is not one of its hosts back to the event page. */
function ManageLoader({ slug }: Readonly<{ slug: string }>) {
  const { t } = useWebT();
  const { data, loading, error, refetch } = useQuery(LITE_EVENT, { variables: { slug }, fetchPolicy: 'cache-and-network' });
  const event = data?.liteEvent ?? null;
  usePageTitle(event ? t('liteWeb.manage.title', { vars: { title: event.title } }) : '');
  if (!loading && !error && !event) return <NotFoundPage />;
  if (event && !event.viewer_is_host) return <Navigate to={paths.event(event.slug)} replace />;
  const reload = () => {
    refetch().catch(() => undefined);
  };
  return (
    <QueryGuard loading={loading && !event} error={error} loadingLabel={t('lite.common.loading')}>
      {() => (event ? <ManageView event={event} onChanged={reload} /> : null)}
    </QueryGuard>
  );
}

/** /e/:slug/manage — the host's console for one event. */
export function ManagePage() {
  const { t } = useWebT();
  const { slug = '' } = useParams();
  return (
    <SignedInGate body={t('liteWeb.hosting.gate')}>
      <ManageLoader slug={slug} />
    </SignedInGate>
  );
}
