import { Link as RouterLink } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Box, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTabs, tabPanelProps } from '@duncit/tabs';
import { PageHeader, QueryGuard } from '@duncit/ui';
import { useWebT } from '../../../shared/i18n';
import { EventList } from '../../components/events/EventList';
import { SignedInGate } from '../../components/SignedInGate';
import { useUpcomingPastTabs } from '../../components/useUpcomingPastTabs';
import { LITE_MY_EVENTS } from '../../graphql/events';
import { paths } from '../../lib/paths';
import { usePageTitle } from '../../lib/usePageTitle';

const TABS_ID = 'hosting';

function HostedList({ past }: Readonly<{ past: boolean }>) {
  const { t } = useWebT();
  const { data, loading, error } = useQuery(LITE_MY_EVENTS, { variables: { scope: 'HOSTING', past }, fetchPolicy: 'cache-and-network' });
  const rows = data?.liteMyEvents ?? [];
  return (
    <QueryGuard loading={loading && !data} error={error} loadingLabel={t('lite.common.loading')}>
      <EventList
        events={rows}
        showStatus
        cardTo={(event) => paths.eventManage(event.slug)}
        emptyTitle={past ? t('liteWeb.hosting.emptyPast') : t('liteWeb.hosting.empty')}
        emptyBody={past ? undefined : t('liteWeb.hosting.emptyBody')}
        emptyAction={
          past ? undefined : (
            <DuncitButton component={RouterLink} to={paths.create} variant="contained" startIcon={<AddIcon />} data-testid="hosting-create-empty">
              {t('liteWeb.nav.create')}
            </DuncitButton>
          )
        }
      />
    </QueryGuard>
  );
}

/** /hosting — the events the reader hosts or co-hosts; each card opens its Manage page. */
export function HostingPage() {
  const { t } = useWebT();
  const tabs = useUpcomingPastTabs();
  usePageTitle(t('liteWeb.hosting.title'));
  return (
    <Stack spacing={2} data-testid="hosting-page">
      <PageHeader
        title={t('liteWeb.hosting.title')}
        subtitle={t('liteWeb.hosting.subtitle')}
        titleVariant="h4"
        actions={
          <DuncitButton component={RouterLink} to={paths.create} variant="contained" startIcon={<AddIcon />} data-testid="hosting-create">
            {t('liteWeb.nav.create')}
          </DuncitButton>
        }
      />
      <SignedInGate body={t('liteWeb.hosting.gate')}>
        <DuncitTabs {...tabs} idPrefix={TABS_ID} />
        <Box {...tabPanelProps(TABS_ID, tabs.value)}>
          <HostedList past={tabs.past} />
        </Box>
      </SignedInGate>
    </Stack>
  );
}
