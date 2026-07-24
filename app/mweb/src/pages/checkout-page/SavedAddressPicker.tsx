import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import { MenuItem, TextField } from '@mui/material';
import { MY_ADDRESSES } from '../account-page/AddressBookSection';
import type { UserAddress } from '../account-page/address-book-form';

interface Props {
  onPick: (address: UserAddress) => void;
}

/** Address-book dropdown for checkout — the saved delivery address the order
 * ships to and that delivery charges are quoted for. The default address is
 * pre-selected as soon as the book loads (picking another re-quotes delivery).
 * Hidden while the book is empty. */
export default function SavedAddressPicker({ onPick }: Readonly<Props>) {
  const { data } = useQuery(MY_ADDRESSES, { fetchPolicy: 'cache-and-network' });
  const addresses: UserAddress[] = data?.myAddresses ?? [];
  const [selectedId, setSelectedId] = useState('');

  // Auto-select the default (or first) saved address once the book loads, so the
  // checkout opens pre-filled and delivery is quoted for it immediately.
  useEffect(() => {
    if (selectedId || addresses.length === 0) return;
    const preferred = addresses.find((address) => address.is_default) ?? addresses[0];
    setSelectedId(preferred.id);
    onPick(preferred);
  }, [addresses, selectedId, onPick]);

  if (addresses.length === 0) return null;
  return (
    <TextField
      select
      size="small"
      label="Deliver to a saved address"
      value={selectedId}
      onChange={(event) => {
        const picked = addresses.find((address) => address.id === event.target.value);
        if (picked) {
          setSelectedId(picked.id);
          onPick(picked);
        }
      }}
      sx={{ mb: 2, minWidth: 260 }}
    >
      {addresses.map((address) => (
        <MenuItem key={address.id} value={address.id}>
          {address.label}
          {address.is_default ? ' (default)' : ''} — {address.line1}, {address.city}
        </MenuItem>
      ))}
    </TextField>
  );
}
