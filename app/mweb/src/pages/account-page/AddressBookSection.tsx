import { useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, Chip, IconButton, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import { AddressForm, type AddressFormValues, type UserAddress } from './address-book-form';

const ADDRESS_FIELDS = gql`
  fragment AddressFields on UserAddress {
    id
    label
    name
    phone
    email
    line1
    line2
    landmark
    city
    state
    pincode
    country
    is_default
  }
`;

export const MY_ADDRESSES = gql`
  query MyAddresses {
    myAddresses {
      ...AddressFields
    }
  }
  ${ADDRESS_FIELDS}
`;

export const SAVE_MY_ADDRESS = gql`
  mutation SaveMyAddress($id: ID, $input: UserAddressInput!) {
    saveMyAddress(id: $id, input: $input) {
      ...AddressFields
    }
  }
  ${ADDRESS_FIELDS}
`;

export const DELETE_MY_ADDRESS = gql`
  mutation DeleteMyAddress($id: ID!) {
    deleteMyAddress(id: $id)
  }
`;

const oneLine = (a: UserAddress) =>
  [a.line1, a.line2, a.landmark, a.city, a.state, a.pincode].filter(Boolean).join(', ');

/** Profile Settings › Address Book — the user's saved delivery addresses,
 * selectable at checkout. Add/edit via the RHF+Zod dialog; delete inline. */
export default function AddressBookSection() {
  const { data, loading, error, refetch } = useQuery(MY_ADDRESSES, {
    fetchPolicy: 'cache-and-network',
  });
  const [saveAddress, { loading: saving }] = useMutation(SAVE_MY_ADDRESS);
  const [deleteAddress] = useMutation(DELETE_MY_ADDRESS);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserAddress | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const addresses: UserAddress[] = data?.myAddresses ?? [];

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (address: UserAddress) => {
    setEditing(address);
    setFormOpen(true);
  };

  const submit = async (values: AddressFormValues) => {
    setNotice(null);
    try {
      await saveAddress({ variables: { id: editing?.id ?? null, input: values } });
      setFormOpen(false);
      await refetch();
    } catch (e: any) {
      setNotice(e.message ?? 'Could not save the address');
    }
  };

  const remove = async (address: UserAddress) => {
    setNotice(null);
    try {
      await deleteAddress({ variables: { id: address.id } });
      await refetch();
    } catch (e: any) {
      setNotice(e.message ?? 'Could not delete the address');
    }
  };

  return (
    <Box sx={{ p: 2, borderRadius: 3, border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <HomeWorkIcon color="primary" />
          <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
            Address Book
          </Typography>
        </Stack>
        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={openAdd} sx={{ borderRadius: 999, fontWeight: 800 }}>
          Add address
        </Button>
      </Stack>
      {error && <Alert severity="error">{error.message}</Alert>}
      {notice && <Alert severity="error" onClose={() => setNotice(null)}>{notice}</Alert>}
      {!loading && addresses.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          Save delivery addresses here to pick them quickly at checkout.
        </Typography>
      )}
      <Stack spacing={1}>
        {addresses.map((address) => (
          <Stack
            key={address.id}
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ p: 1.25, borderRadius: 2, border: 1, borderColor: 'divider' }}
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  {address.label}
                </Typography>
                {address.is_default && <Chip size="small" color="primary" label="Default" sx={{ fontWeight: 800 }} />}
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
                {oneLine(address)}
              </Typography>
            </Box>
            <IconButton size="small" aria-label={`Edit ${address.label}`} onClick={() => openEdit(address)}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" aria-label={`Delete ${address.label}`} onClick={() => remove(address)}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
      </Stack>
      <AddressForm
        open={formOpen}
        title={editing ? 'Edit address' : 'Add address'}
        initial={editing}
        saving={saving}
        onCancel={() => setFormOpen(false)}
        onSubmit={submit}
      />
    </Box>
  );
}
