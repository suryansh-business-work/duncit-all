import { useQuery } from '@apollo/client';
import { MenuItem, TextField } from '@mui/material';
import { MY_ADDRESSES } from '../account-page/AddressBookSection';
import type { UserAddress } from '../account-page/address-book-form';

interface Props {
  onPick: (address: UserAddress) => void;
}

/** Address-book dropdown for checkout — picking a saved address fills the
 * billing/delivery fields. Hidden while the book is empty. */
export default function SavedAddressPicker({ onPick }: Readonly<Props>) {
  const { data } = useQuery(MY_ADDRESSES, { fetchPolicy: 'cache-and-network' });
  const addresses: UserAddress[] = data?.myAddresses ?? [];
  if (addresses.length === 0) return null;
  return (
    <TextField
      select
      size="small"
      label="Deliver to a saved address"
      value=""
      onChange={(event) => {
        const picked = addresses.find((address) => address.id === event.target.value);
        if (picked) onPick(picked);
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
