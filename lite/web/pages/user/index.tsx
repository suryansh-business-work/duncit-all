import { useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Box, Divider, Stack, Typography } from '@mui/material';
import { DuncitTabs, tabPanelProps } from '@duncit/tabs';
import { QueryGuard } from '@duncit/ui';
import { useWebT } from '../../../shared/i18n';
import { EventList } from '../../components/events/EventList';
import { useUpcomingPastTabs } from '../../components/useUpcomingPastTabs';
import { LITE_USER_EVENTS, LITE_USER_PROFILE } from '../../graphql/events';
import { usePageTitle } from '../../lib/usePageTitle';
import { NotFoundPage } from '../not-found';
import { ProfileHeader } from './ProfileHeader';
import { EventListSkeleton } from '../../components/skeletons';
import { ProfileSkeleton } from './ProfileSkeleton';

const TABS_ID = 'user';

function UserEvents({ handle, past }: Readonly<{ handle: string; past: boolean }>) {
  const { t } = useWebT();
  const { data, loading, error } = useQuery(LITE_USER_EVENTS, { variables: { handle, past }, fetchPolicy: 'cache-and-network' });
  return (
    <QueryGuard loading={loading && !data} error={error} skeleton={<EventListSkeleton groups={1} />}>
      <EventList events={data?.liteUserEvents ?? []} emptyTitle={past ? t('liteWeb.events.noPast') : t('liteWeb.events.noUpcoming')} />
    </QueryGuard>
  );
}

/** /u/:handle — a person's public page and the events they host. */
export function UserPage() {
  const { t } = useWebT();
  const { handle = '' } = useParams();
  const tabs = useUpcomingPastTabs();
  const { data, loading, error } = useQuery(LITE_USER_PROFILE, { variables: { handle } });
  const user = data?.liteUserProfile ?? null;
  usePageTitle(user?.name ?? '');
  if (!loading && !error && !user) return <NotFoundPage />;
  return (
    <QueryGuard loading={loading && !user} error={error} skeleton={<ProfileSkeleton />}>
      {() =>
        user ? (
          <Stack spacing={3} sx={{ maxWidth: 820, mx: 'auto', width: '100%' }} data-testid="user-page">
            <ProfileHeader user={user} />
            <Divider />
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="h3" component="h2">
                {t('liteWeb.user.hostingTitle')}
              </Typography>
              <DuncitTabs {...tabs} idPrefix={TABS_ID} searchable={false} />
            </Stack>
            <Box {...tabPanelProps(TABS_ID, tabs.value)}>
              <UserEvents handle={user.handle} past={tabs.past} />
            </Box>
          </Stack>
        ) : null
      }
    </QueryGuard>
  );
}
