import { useQuery } from '@apollo/client/react';
import { Alert, CircularProgress, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import { MY_VENUE, REGISTRATION_CONFIG } from '../register-venue-page/queries';
import { RegisterVenueForm, type VenueRegistrationConfig } from '../register-venue-page/register-venue';

interface VenueAccount {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}

/** What the venue form hydrates from — the same read the venue form page makes. */
interface MyVenueData {
  me?: VenueAccount | null;
  myVenue?: { id: string } | null;
  locations?: unknown[];
}

interface Props {
  venueId: string;
}

/** Never reached: a pinned, approved form saves its section and never submits an application. */
const noSubmit = () => undefined;

/**
 * The approved venue's food menu and online ordering, edited through the venue
 * form itself pinned to its Food Menu section — the same fields, validation and
 * `updateApprovedVenue` save, with no second copy of any of them.
 */
export default function VenueFoodMenuEditor({ venueId }: Readonly<Props>) {
  const { t } = useTranslation();
  const venueQuery = useQuery<MyVenueData>(MY_VENUE, {
    variables: { venue_id: venueId },
    fetchPolicy: 'cache-and-network',
  });
  const configQuery = useQuery<{ venueRegistrationConfig: VenueRegistrationConfig }>(REGISTRATION_CONFIG);
  const { data, refetch } = venueQuery;
  const config = configQuery.data?.venueRegistrationConfig;
  const failure = venueQuery.error ?? configQuery.error;

  if ((venueQuery.loading && !data) || (configQuery.loading && !config)) {
    return (
      <Stack sx={{ alignItems: 'center', py: 4 }}>
        <CircularProgress size={24} aria-label={t('shell.a11y.loading')} />
      </Stack>
    );
  }
  // The menu's limits and its diet and spice choices come from the config, so
  // without it (or the venue) there is no form to draw — say so, and offer the read again.
  if (failure || !config) {
    const retry = () => {
      fireAndForget(venueQuery.refetch(), logs.portal['partners-app'], 'venue-food-menu', 'refetchVenue');
      fireAndForget(configQuery.refetch(), logs.portal['partners-app'], 'venue-food-menu', 'refetchConfig');
    };
    return (
      <Alert
        severity="error"
        data-testid="venue-food-menu-load-error"
        action={
          <DuncitButton size="small" color="inherit" onClick={retry} data-testid="venue-food-menu-retry">
            {t('shell.common.retry')}
          </DuncitButton>
        }
      >
        {failure ? parseApiError(failure) : t('partners.foodMenu.loadFailed')}
      </Alert>
    );
  }
  if (!data?.myVenue) {
    return <Alert severity="error">{t('partners.page.thisVenueRegistrationWasNotFound')}</Alert>;
  }

  const account = data.me;
  const name = account?.full_name || [account?.first_name, account?.last_name].filter(Boolean).join(' ');

  return (
    <RegisterVenueForm
      venue={data.myVenue}
      locations={data.locations ?? []}
      account={{ name, email: account?.email ?? '' }}
      config={config}
      mode="edit-approved"
      pinnedSection="food"
      onPersisted={() => refetch()}
      onSubmitted={noSubmit}
    />
  );
}
