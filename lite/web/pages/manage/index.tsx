import { useMemo } from 'react';
import { Link as RouterLink, Navigate, useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Box, Stack, Typography } from '@mui/material';
import ArrowOutwardIcon from '@mui/icons-material/ArrowOutward';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTabs, tabPanelProps, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { QueryGuard } from '@duncit/ui';
import type { LiteEvent } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { LITE_RADII } from '../../../shared/tokens';
import { SignedInGate } from '../../components/SignedInGate';
import { EventStatusChip } from '../../components/StatusChips';
import { LITE_EVENT } from '../../graphql/events';
import { paths } from '../../lib/paths';
import { usePageTitle } from '../../lib/usePageTitle';
import { NotFoundPage } from '../not-found';
import { CheckInTab } from './check-in';
import { GuestsTab } from './guests';
import { ScannerLinkCard } from './guests/ScannerLinkCard';
import { InsightsTab } from './InsightsTab';
import { OverviewTab } from './OverviewTab';
import { RegistrationTab } from './RegistrationTab';
import { SettingsTab } from './settings';
import { UpdatesTab } from './updates';
import { ManageSkeleton } from './ManageSkeleton';

type ManageTab = 'overview' | 'guests' | 'registration' | 'blasts' | 'insights' | 'more';
const TAB_VALUES: ManageTab[] = ['overview', 'guests', 'registration', 'blasts', 'insights', 'more'];
const TABS_ID = 'manage';

function Panel({ tab, event, onChanged, openTab }: Readonly<{ tab: ManageTab; event: LiteEvent; onChanged: () => void; openTab: (tab: ManageTab) => void }>) {
  switch (tab) {
    case 'guests':
      return (
        <Stack spacing={3}>
          <ScannerLinkCard event={event} />
          <GuestsTab event={event} onChanged={onChanged} />
          <CheckInTab event={event} onChanged={onChanged} />
        </Stack>
      );
    case 'registration':
      return <RegistrationTab event={event} onChanged={onChanged} />;
    case 'blasts':
      return <UpdatesTab event={event} />;
    case 'insights':
      return <InsightsTab event={event} />;
    case 'more':
      return <SettingsTab event={event} onChanged={onChanged} />;
    default:
      return <OverviewTab event={event} onChanged={onChanged} onOpenTab={openTab} />;
  }
}

function ManageView({ event, onChanged }: Readonly<{ event: LiteEvent; onChanged: () => void }>) {
  const { t } = useWebT();
  const items = useMemo<DuncitTabItem<ManageTab>[]>(() => TAB_VALUES.map((value) => ({ value, label: t(`liteWeb.manage.tabs.${value}`), testId: `manage-tab-${value}` })), [t]);
  const tabs = useTabParam<ManageTab>({ items, fallback: 'overview' });
  return (
    <Stack spacing={2} sx={{ maxWidth: 820, mx: 'auto' }} data-testid="manage-page">
      <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Stack spacing={0.5} sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary">
            {event.calendar?.name ?? t('liteWeb.eventForm.personalCalendar')}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="h2" component="h1" sx={{ wordBreak: 'break-word' }}>
              {event.title}
            </Typography>
            {event.status === 'PUBLISHED' ? null : <EventStatusChip status={event.status} />}
          </Stack>
        </Stack>
        <DuncitButton component={RouterLink} to={paths.event(event.slug)} size="small" variant="outlined" endIcon={<ArrowOutwardIcon />} sx={{ borderRadius: LITE_RADII.control, flexShrink: 0 }} data-testid="manage-view-page">
          {t('liteWeb.manage.eventPage')}
        </DuncitButton>
      </Stack>
      <DuncitTabs {...tabs} idPrefix={TABS_ID} variant="scrollable" allowScrollButtonsMobile searchable={false} />
      <Box {...tabPanelProps(TABS_ID, tabs.value)} sx={{ pt: 1 }}>
        <Panel tab={tabs.value} event={event} onChanged={onChanged} openTab={tabs.onChange} />
      </Box>
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
    refetch().catch((err: unknown) => console.warn('[lite] manage refresh failed', err));
  };
  return (
    <QueryGuard loading={loading && !event} error={error} skeleton={<ManageSkeleton />}>
      {() => (event ? <ManageView event={event} onChanged={reload} /> : null)}
    </QueryGuard>
  );
}

/** /e/:slug/manage — the host's console for one event (?tab=overview|guests|registration|blasts|insights|more). */
export function ManagePage() {
  const { t } = useWebT();
  const { slug = '' } = useParams();
  return (
    <SignedInGate skeleton={<ManageSkeleton />} body={t('liteWeb.home.gate')}>
      <ManageLoader slug={slug} />
    </SignedInGate>
  );
}
