import { Link as RouterLink } from 'react-router';
import { Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTabs, tabPanelProps } from '@duncit/tabs';
import { QueryGuard } from '@duncit/ui';
import { useWebT } from '../../../shared/i18n';
import { EmptyState } from '../../components/EmptyState';
import { SignedInGate } from '../../components/SignedInGate';
import { useUpcomingPastTabs } from '../../components/useUpcomingPastTabs';
import { paths } from '../../lib/paths';
import { usePageTitle } from '../../lib/usePageTitle';
import { Timeline } from './Timeline';
import { useMyEvents } from './useMyEvents';

const TABS_ID = 'my-events';

function MyEventsList({ past }: Readonly<{ past: boolean }>) {
  const { t } = useWebT();
  const { rows, loading, error } = useMyEvents(past);
  return (
    <QueryGuard loading={loading} error={error} loadingLabel={t('lite.common.loading')}>
      {() =>
        rows.length > 0 ? (
          <Timeline rows={rows} />
        ) : (
          <EmptyState
            icon={<EventAvailableOutlinedIcon />}
            title={past ? t('liteWeb.home.emptyPast') : t('liteWeb.home.empty')}
            body={past ? t('liteWeb.home.emptyPastBody') : t('liteWeb.home.emptyBody')}
            action={
              <DuncitButton component={RouterLink} to={paths.create} variant="outlined" startIcon={<AddIcon />} data-testid="home-create-empty">
                {t('liteWeb.nav.create')}
              </DuncitButton>
            }
            testId="home-empty"
          />
        )
      }
    </QueryGuard>
  );
}

/** /home (and / once signed in) — every event you host or attend, Upcoming or Past. */
export function EventsHomePage() {
  const { t } = useWebT();
  const tabs = useUpcomingPastTabs();
  usePageTitle(t('liteWeb.home.title'));
  return (
    <Stack spacing={3} sx={{ maxWidth: 820, mx: 'auto' }} data-testid="events-home-page">
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h2" component="h1">
          {t('liteWeb.home.title')}
        </Typography>
        <DuncitTabs {...tabs} idPrefix={TABS_ID} searchable={false} />
      </Stack>
      <SignedInGate body={t('liteWeb.home.gate')}>
        <div {...tabPanelProps(TABS_ID, tabs.value)}>
          <MyEventsList past={tabs.past} />
        </div>
      </SignedInGate>
    </Stack>
  );
}
