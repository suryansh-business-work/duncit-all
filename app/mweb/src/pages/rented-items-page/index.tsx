import { useState } from 'react';
import { useNavigate } from 'react-router';
import { gql, type TypedDocumentNode } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import HandshakeIcon from '@mui/icons-material/HandshakeOutlined';
import { DuncitButton } from '@duncit/buttons';
import { Loader } from '@duncit/ui';
import { MY_RENTAL_BOOKINGS_QUERY, parseApiError, type RentalBookingRow } from '@duncit/utils';
import { useEntityPageMeta } from '../../app/pageMeta';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import { useTranslation } from '../../i18n/useTranslation';
import RentalBookingCard from './RentalBookingCard';

const MY_RENTAL_BOOKINGS: TypedDocumentNode<
  { myRentalBookings: RentalBookingRow[] },
  { limit: number; offset: number }
> = gql(MY_RENTAL_BOOKINGS_QUERY);

const PAGE_SIZE = 20;

/**
 * My Rented Items (/rented-items) — every item the member rented with a pod,
 * newest first: what it cost, how it closed and what comes back to them.
 * Native twin: screens/MyRentedItemsScreen.
 */
export default function RentedItemsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { data, loading, error, refetch } = useQuery(MY_RENTAL_BOOKINGS, {
    variables: { limit, offset: 0 },
    fetchPolicy: 'cache-and-network',
  });
  useEntityPageMeta(t('venueRentals.guest.historyTitle'));
  const rows = data?.myRentalBookings ?? [];
  const hasMore = rows.length >= limit;

  return (
    <Stack spacing={2} sx={{ py: 0.5, pb: 4 }} data-testid="rented-items-screen">
      <PageHeader testId="rented-items-header" title={t('venueRentals.guest.historyTitle')} />
      {loading && !data && <Loader />}
      {error && !data && (
        <Alert
          severity="error"
          action={
            <DuncitButton size="small" color="inherit" onClick={() => refetch().catch(() => undefined)}>
              {t('venueRentals.guest.retry')}
            </DuncitButton>
          }
        >
          {parseApiError(error)}
        </Alert>
      )}
      {data && rows.length === 0 && (
        <EmptyState
          icon={<HandshakeIcon />}
          title={t('venueRentals.guest.historyEmpty')}
          actionLabel={t('venueRentals.guest.browseRentals')}
          onAction={() => navigate('/')}
          testId="rented-items-empty"
        />
      )}
      {rows.map((row) => (
        <RentalBookingCard key={row.id} row={row} />
      ))}
      {hasMore && (
        <DuncitButton onClick={() => setLimit((current) => current + PAGE_SIZE)} loading={loading} data-testid="rented-items-more">
          {t('venueRentals.guest.loadMore')}
        </DuncitButton>
      )}
    </Stack>
  );
}
