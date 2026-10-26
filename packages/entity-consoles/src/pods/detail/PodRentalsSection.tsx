import { Link as RouterLink } from 'react-router';
import { gql, type TypedDocumentNode } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import HandshakeIcon from '@mui/icons-material/Handshake';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { DuncitButton } from '@duncit/buttons';
import { SectionCard } from '@duncit/pod-details';
import { useTranslation } from '@duncit/shell';
import {
  POD_RENTALS_QUERY,
  parseApiError,
  rentalMoney,
  rentalUnitKey,
  type PodRentalCatalogue,
} from '@duncit/utils';

const POD_RENTALS: TypedDocumentNode<{ podRentals: PodRentalCatalogue }, { pod_id: string }> = gql(POD_RENTALS_QUERY);

interface Props {
  podId: string;
  /** The pod editor, where the Pod Shop's products are picked from the catalogue. */
  editTo: string;
}

/**
 * What guests can add to this pod: the Pod Shop (its products are managed in
 * the pod editor, picked from the approved catalogue) and the items its venue
 * rents out, with how many are left for this pod.
 */
export default function PodRentalsSection({ podId, editTo }: Readonly<Props>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(POD_RENTALS, { variables: { pod_id: podId }, fetchPolicy: 'cache-and-network' });
  const catalogue = data?.podRentals;
  const items = catalogue?.items ?? [];
  const currencySymbol = catalogue?.currency_symbol ?? '';

  return (
    <Stack spacing={2}>
      <SectionCard
        icon={<StorefrontIcon fontSize="small" />}
        title={t('venueRentals.guest.shopTab')}
        action={
          <DuncitButton size="small" component={RouterLink} to={editTo} data-testid="pod-shop-manage">
            {t('admin.pods.manageShop')}
          </DuncitButton>
        }
      >
        <Typography variant="body2" color="text.secondary">
          {t('admin.pods.manageShopHint')}
        </Typography>
      </SectionCard>
      <SectionCard
        icon={<HandshakeIcon fontSize="small" />}
        title={t('venueRentals.guest.rentTab')}
        tone="info"
        loading={loading && !data}
        error={error ? parseApiError(error) : null}
        empty={catalogue && items.length === 0 ? t('venueRentals.guest.none') : null}
      >
        <Stack spacing={1} data-testid="pod-rentals-list">
          {items.map((item) => (
            <Stack key={item.id} direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {item.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'right' }}>
                {t('venueRentals.guest.rate', {
                  vars: { amount: rentalMoney(currencySymbol, item.rate), unit: t(rentalUnitKey(item.unit)) },
                })}
                {' · '}
                {item.available > 0 ? t('venueRentals.guest.left', { vars: { count: item.available } }) : t('venueRentals.guest.soldOut')}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </SectionCard>
    </Stack>
  );
}
