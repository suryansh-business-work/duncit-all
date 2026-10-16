import { useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import HandshakeIcon from '@mui/icons-material/HandshakeOutlined';
import { CartQuantityControl } from '@duncit/ui';
import { rentalMoney, rentalUnitKey, type PodRentalItem } from '@duncit/utils';
import { useCartControlLabels } from '../../components/cart/useCartControlLabels';
import { useTranslation } from '../../i18n/useTranslation';
import { rowSx } from '../pod-details-page/PodCommercePreview/podShopStyles';

interface Props {
  item: PodRentalItem;
  currency: string;
  quantity: number;
  /** The most this booking may take: the per-guest limit for every seat, never past what is left. */
  max: number;
  /** Renting closed for the pod: the row is a listing only. */
  readOnly: boolean;
  onQuantity: (itemId: string, quantity: number) => void;
}

/** One thing the venue rents: photo, name, rate per slot or hour, deposit, what is left, and the picker. */
export default function RentalItemRow({ item, currency, quantity, max, readOnly, onQuantity }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = useCartControlLabels()(item.name);
  const [imageFailed, setImageFailed] = useState(false);
  const image = item.images[0] ?? '';
  const soldOut = item.available <= 0;
  const selected = !readOnly && quantity > 0;
  return (
    <Stack direction="row" spacing={1} data-testid={`pod-rent-row-${item.id}`} sx={rowSx(selected)}>
      <Box sx={{ width: 54, height: 54, borderRadius: '12px', overflow: 'hidden', flex: '0 0 auto', bgcolor: 'background.paper', color: 'secondary.main', display: 'grid', placeItems: 'center' }}>
        {image && !imageFailed ? (
          <Box component="img" src={image} alt={item.name} onError={() => setImageFailed(true)} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <HandshakeIcon fontSize="small" />
        )}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
          {item.name}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }} noWrap>
          {soldOut ? t('venueRentals.guest.soldOut') : t('venueRentals.guest.left', { vars: { count: item.available } })}
          {item.deposit > 0 && ` · ${t('venueRentals.guest.deposit', { vars: { amount: rentalMoney(currency, item.deposit) } })}`}
        </Typography>
        {!readOnly && (!soldOut || quantity > 0) && (
          <Box sx={{ mt: 0.75 }}>
            <CartQuantityControl
              size="small"
              quantity={quantity}
              max={max}
              labels={labels}
              onChange={(next) => onQuantity(item.id, next)}
              testIdPrefix={`pod-rent-${item.id}`}
            />
          </Box>
        )}
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'right' }}>
        {t('venueRentals.guest.rate', { vars: { amount: rentalMoney(currency, item.rate), unit: t(rentalUnitKey(item.unit)) } })}
      </Typography>
    </Stack>
  );
}
