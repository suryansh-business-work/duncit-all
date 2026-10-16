import { useNavigate } from 'react-router';
import { gql, type TypedDocumentNode } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Stack, Typography } from '@mui/material';
import HandshakeIcon from '@mui/icons-material/HandshakeOutlined';
import { DuncitButton } from '@duncit/buttons';
import { Loader } from '@duncit/ui';
import { RENTABLE_PODS_QUERY, rentalMoney, type RentablePod } from '@duncit/utils';
import EmptyState from '../../components/EmptyState';
import { SURFACE_SX } from '../../theme';
import { useTranslation } from '../../i18n/useTranslation';
import { formatDateTime } from '../../utils/dateFormat';

const RENTABLE_PODS: TypedDocumentNode<{ rentablePods: RentablePod[] }, { limit?: number }> = gql(RENTABLE_PODS_QUERY);

/** The Pod Details tab key the link opens on, so the guest lands on the rentals. */
const RENT_TAB_QUERY = 'selectedtab_podshop=rent';

/** Pod Rent on /shop: upcoming pods whose venue rents things out. Renting happens on the pod's own page. */
export default function PodRentTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useQuery(RENTABLE_PODS, { fetchPolicy: 'cache-and-network' });
  const pods = data?.rentablePods ?? [];

  if (loading && !data) return <Loader />;
  if (error && !data) {
    return (
      <Alert
        severity="error"
        action={
          <DuncitButton size="small" color="inherit" onClick={() => refetch().catch(() => undefined)}>
            {t('venueRentals.guest.retry')}
          </DuncitButton>
        }
      >
        {t('venueRentals.guest.loadError')}
      </Alert>
    );
  }
  if (pods.length === 0) {
    return <EmptyState testId="shop-rent-empty" icon={<HandshakeIcon />} title={t('venueRentals.guest.none')} />;
  }
  return (
    <Stack spacing={1.25} data-testid="shop-rent-list">
      {pods.map((pod) => (
        <Stack
          key={pod.id}
          direction="row"
          spacing={1.5}
          component="button"
          type="button"
          onClick={() => navigate(`/club/${pod.club_id}/pod/${pod.pod_id}?${RENT_TAB_QUERY}`)}
          data-testid={`shop-rent-pod-${pod.id}`}
          sx={{ ...SURFACE_SX, p: 1.5, textAlign: 'left', cursor: 'pointer', border: 0, width: '100%', font: 'inherit', color: 'inherit' }}
        >
          <Box sx={{ width: 64, height: 64, borderRadius: '12px', overflow: 'hidden', flex: '0 0 auto', bgcolor: 'action.hover', display: 'grid', placeItems: 'center', color: 'secondary.main' }}>
            {pod.cover_url ? (
              <Box component="img" src={pod.cover_url} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <HandshakeIcon />
            )}
          </Box>
          <Stack sx={{ minWidth: 0, flex: 1 }} spacing={0.25}>
            <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
              {pod.pod_title}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
              {[formatDateTime(pod.pod_date_time), pod.venue_name].filter(Boolean).join(' · ')}
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {t('venueRentals.guest.podItems', {
                vars: { count: pod.item_count, amount: rentalMoney(pod.currency_symbol, pod.from_rate) },
              })}
            </Typography>
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}
