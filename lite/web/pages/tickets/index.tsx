import { Link as RouterLink } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Box, Stack } from '@mui/material';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTabs, tabPanelProps } from '@duncit/tabs';
import { PageHeader, QueryGuard } from '@duncit/ui';
import { useWebT } from '../../../shared/i18n';
import { EmptyState } from '../../components/EmptyState';
import { SignedInGate } from '../../components/SignedInGate';
import { useUpcomingPastTabs } from '../../components/useUpcomingPastTabs';
import { LITE_MY_REGISTRATIONS } from '../../graphql/registrations';
import { paths } from '../../lib/paths';
import { usePageTitle } from '../../lib/usePageTitle';
import { TicketRow } from './TicketRow';

const TABS_ID = 'tickets';

function TicketsList({ past }: Readonly<{ past: boolean }>) {
  const { t } = useWebT();
  const { data, loading, error } = useQuery(LITE_MY_REGISTRATIONS, { variables: { past }, fetchPolicy: 'cache-and-network' });
  const rows = data?.liteMyRegistrations ?? [];
  return (
    <QueryGuard loading={loading && !data} error={error} loadingLabel={t('lite.common.loading')}>
      {rows.length === 0 ? (
        <EmptyState
          icon={<ConfirmationNumberOutlinedIcon />}
          title={past ? t('liteWeb.tickets.emptyPast') : t('liteWeb.tickets.empty')}
          body={past ? undefined : t('liteWeb.tickets.emptyBody')}
          action={
            past ? undefined : (
              <DuncitButton component={RouterLink} to={paths.discover} variant="contained" data-testid="tickets-discover">
                {t('liteWeb.nav.discover')}
              </DuncitButton>
            )
          }
        />
      ) : (
        <Stack component="ul" spacing={1} sx={{ listStyle: 'none', p: 0, m: 0 }} data-testid="tickets-list">
          {rows.map((ticket) => (
            <Box component="li" key={ticket.id}>
              <TicketRow ticket={ticket} />
            </Box>
          ))}
        </Stack>
      )}
    </QueryGuard>
  );
}

/** /tickets — everything the reader registered for, upcoming and past. */
export function TicketsPage() {
  const { t } = useWebT();
  const tabs = useUpcomingPastTabs();
  usePageTitle(t('liteWeb.tickets.title'));
  return (
    <Stack spacing={2} data-testid="tickets-page">
      <PageHeader title={t('liteWeb.tickets.title')} subtitle={t('liteWeb.tickets.subtitle')} titleVariant="h4" />
      <SignedInGate body={t('liteWeb.tickets.gate')}>
        <DuncitTabs {...tabs} idPrefix={TABS_ID} />
        <Box {...tabPanelProps(TABS_ID, tabs.value)}>
          <TicketsList past={tabs.past} />
        </Box>
      </SignedInGate>
    </Stack>
  );
}
