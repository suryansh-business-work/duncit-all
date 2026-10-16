import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Box, ButtonBase, Skeleton, Stack, Typography } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { deliveryAddressLine } from '@duncit/utils';
import DeliveryAddressDialog from './DeliveryAddressDialog';
import { useDeliveryAddress } from '../../hooks/useDeliveryAddress';
import { useTranslation } from '../../i18n/useTranslation';

/** The same 40-tall surface pill as the city pill it stands in for. */
const PILL_SX = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.75,
  flex: '0 1 auto',
  height: 40,
  minWidth: 0,
  maxWidth: '100%',
  px: 1.5,
  borderRadius: 999,
  bgcolor: 'background.paper',
  border: '1px solid var(--duncit-card-border)',
  textAlign: 'left',
} as const;

/** On the Pod Shop the header's city pill becomes "Deliver to" — the address
 * the shop's orders ship to, from the buyer's address book. Tapping lists every
 * saved address to switch between (and a way into the address book). Signed
 * out, it leads to the address book, which asks them to sign in first.
 * Native twin: components/shop/DeliveryAddressBar. */
export default function HeaderDeliveryAddress({ signedIn }: Readonly<{ signedIn: boolean }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { addresses, selected, select, loading, error, refetch } = useDeliveryAddress(signedIn);
  const manage = () => {
    setOpen(false);
    navigate('/address-book');
  };
  const line = selected ? deliveryAddressLine(selected) : t('mweb.shop.addDeliveryAddress');

  return (
    <>
      <ButtonBase
        data-testid="header-delivery-address"
        aria-label={`${t('mweb.shop.changeDeliveryAddress')}: ${line}`}
        aria-haspopup="dialog"
        onClick={signedIn ? () => setOpen(true) : manage}
        sx={PILL_SX}
      >
        <LocationOnIcon sx={{ fontSize: 18, color: 'secondary.main', flex: '0 0 auto' }} />
        {loading ? (
          <Skeleton variant="text" width={120} height={16} />
        ) : (
          <Stack sx={{ minWidth: 0, lineHeight: 1 }}>
            <Typography
              noWrap
              sx={{ fontSize: 10, fontWeight: 600, color: 'text.secondary', lineHeight: 1.2 }}
            >
              {selected
                ? `${t('mweb.checkout.deliverTo')} · ${selected.label}`
                : t('mweb.checkout.deliverTo')}
            </Typography>
            <Typography
              data-testid="header-delivery-address-line"
              noWrap
              sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', lineHeight: 1.3 }}
            >
              {line}
            </Typography>
          </Stack>
        )}
        <Box component="span" sx={{ display: 'flex', flex: '0 0 auto' }}>
          <KeyboardArrowDownIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
        </Box>
      </ButtonBase>
      <DeliveryAddressDialog
        open={open}
        onClose={() => setOpen(false)}
        addresses={addresses}
        selectedId={selected?.id ?? ''}
        loading={loading}
        failed={!!error && addresses.length === 0}
        onRetry={() => refetch()}
        onSelect={(id) => {
          select(id);
          setOpen(false);
        }}
        onManage={manage}
      />
    </>
  );
}
