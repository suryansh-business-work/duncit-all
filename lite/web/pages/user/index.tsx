import { useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Box, Stack, Typography } from '@mui/material';
import { DuncitTabs, tabPanelProps } from '@duncit/tabs';
import { PageHeader, QueryGuard } from '@duncit/ui';
import type { LiteMe } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { EventList } from '../../components/events/EventList';
import { UserAvatar } from '../../components/UserAvatar';
import { useUpcomingPastTabs } from '../../components/useUpcomingPastTabs';
import { LITE_USER_EVENTS, LITE_USER_PROFILE } from '../../graphql/events';
import { paragraphs } from '../../lib/text';
import { usePageTitle } from '../../lib/usePageTitle';
import { NotFoundPage } from '../not-found';

const TABS_ID = 'user';

function UserEvents({ handle, past }: Readonly<{ handle: string; past: boolean }>) {
  const { t } = useWebT();
  const { data, loading, error } = useQuery(LITE_USER_EVENTS, { variables: { handle, past }, fetchPolicy: 'cache-and-network' });
  return (
    <QueryGuard loading={loading && !data} error={error} loadingLabel={t('lite.common.loading')}>
      <EventList events={data?.liteUserEvents ?? []} emptyTitle={past ? t('liteWeb.events.noPast') : t('liteWeb.events.noUpcoming')} />
    </QueryGuard>
  );
}

function UserHeader({ user }: Readonly<{ user: LiteMe }>) {
  const { t } = useWebT();
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }} data-testid="user-header">
      <UserAvatar name={user.name} url={user.avatar_url} size={80} />
      <Box>
        <PageHeader title={user.name} titleVariant="h4" subtitle={`@${user.handle} · ${t('liteWeb.user.hosted', { count: user.events_hosted })}`} />
        {user.bio ? paragraphs(user.bio).map((block) => <Typography key={block.slice(0, 40)} sx={{ pt: 1 }}>{block}</Typography>) : null}
      </Box>
    </Stack>
  );
}

/** /u/:handle — a host's public page and the events they host. */
export function UserPage() {
  const { t } = useWebT();
  const { handle = '' } = useParams();
  const tabs = useUpcomingPastTabs();
  const { data, loading, error } = useQuery(LITE_USER_PROFILE, { variables: { handle } });
  const user = data?.liteUserProfile ?? null;
  usePageTitle(user?.name ?? '');
  if (!loading && !error && !user) return <NotFoundPage />;
  return (
    <QueryGuard loading={loading && !user} error={error} loadingLabel={t('lite.common.loading')}>
      {() =>
        user ? (
          <Stack spacing={3} data-testid="user-page">
            <UserHeader user={user} />
            <DuncitTabs {...tabs} idPrefix={TABS_ID} />
            <Box {...tabPanelProps(TABS_ID, tabs.value)}>
              <UserEvents handle={user.handle} past={tabs.past} />
            </Box>
          </Stack>
        ) : null
      }
    </QueryGuard>
  );
}
