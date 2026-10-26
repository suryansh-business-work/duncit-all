import { useEffect, useRef } from 'react';
import { MenuItem, TextField } from '@mui/material';
import { useTranslation } from '../../i18n/useTranslation';
import { useDeliveryAddress } from '../../hooks/useDeliveryAddress';
import type { UserAddress } from '../account-page/address-book-form';

interface Props {
  onPick: (address: UserAddress) => void;
}

/** Address-book dropdown for checkout — the saved delivery address the order
 * ships to and that delivery charges are quoted for. It opens on the address
 * the Pod Shop header's "Deliver to" pill picked (else the default), and a pick
 * here becomes the shop's delivery address too (picking re-quotes delivery).
 * Hidden while the book is empty. */
export default function SavedAddressPicker({ onPick }: Readonly<Props>) {
  const { t } = useTranslation();
  const { addresses, selected, select } = useDeliveryAddress();
  const pickedRef = useRef('');

  // Hand the chosen address to the form once per change, so the checkout opens
  // pre-filled and delivery is quoted for it immediately.
  useEffect(() => {
    if (!selected || pickedRef.current === selected.id) return;
    pickedRef.current = selected.id;
    onPick(selected);
  }, [selected, onPick]);

  if (!selected) return null;
  return (
    <TextField
      data-testid="checkout-address-picker"
      select
      size="small"
      label={t('mweb.checkout.deliverToSaved')}
      value={selected.id}
      onChange={(event) => select(event.target.value)}
      sx={{ mb: 2, minWidth: 260 }}
    >
      {addresses.map((address) => (
        <MenuItem
          key={address.id}
          data-testid={`checkout-address-option-${address.id}`}
          value={address.id}
        >
          {address.label}
          {address.is_default ? ` ${t('mweb.checkout.addressDefault')}` : ''} — {address.line1},{' '}
          {address.city}
        </MenuItem>
      ))}
    </TextField>
  );
}
