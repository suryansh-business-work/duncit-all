import { useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, Card, Chip, Stack, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton, DuncitRoundButton } from '@duncit/buttons';
import { AddressForm, type AddressFormValues, type UserAddress } from './address-book-form';
import { useTranslation } from '../../i18n/useTranslation';

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

/** The tonal "Default" pill on the address marked default. */
const DEFAULT_CHIP_SX = {
  height: 22,
  fontSize: 11,
  fontWeight: 600,
  color: 'primary.main',
  bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, 0.12),
} as const;

const ROW_ACTION_SX = { color: 'text.secondary' } as const;

/** Profile Settings › Address Book — the user's saved delivery addresses,
 * selectable at checkout. Add/edit via the RHF+Zod dialog; delete inline. */
export default function AddressBookSection() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<any>(MY_ADDRESSES, {
    fetchPolicy: 'cache-and-network',
  });
  const [saveAddress, { loading: saving }] = useMutation<any>(SAVE_MY_ADDRESS);
  const [deleteAddress] = useMutation<any>(DELETE_MY_ADDRESS);
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
    <Card sx={{ p: 2 }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1
        }}>
        <Typography component="h2" sx={{ fontSize: '1.0625rem', fontWeight: 600 }}>
          Address Book
        </Typography>
        <DuncitButton size="small" variant="contained" startIcon={<AddIcon />} onClick={openAdd} sx={{ minHeight: 36 }}>
          Add address
        </DuncitButton>
      </Stack>
      {error && <Alert severity="error">{error.message}</Alert>}
      {notice && <Alert severity="error" onClose={() => setNotice(null)}>{notice}</Alert>}
      {!loading && addresses.length === 0 && (
        <Typography variant="body2" sx={{
          color: "text.secondary",
          py: 1
        }}>
          Save delivery addresses here to pick them quickly at checkout.
        </Typography>
      )}
      <Box>
        {addresses.map((address) => (
          <Stack
            key={address.id}
            direction="row"
            spacing={1}
            sx={{
              alignItems: "center",
              py: 1.5,
              '& + &': { borderTop: 1, borderColor: 'divider' }
            }}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction="row" spacing={0.75} sx={{
                alignItems: "center"
              }}>
                <Typography sx={{ fontSize: '0.95rem', fontWeight: 600 }} noWrap>
                  {address.label}
                </Typography>
                {address.is_default && <Chip size="small" label={t('mweb.account.default')} sx={DEFAULT_CHIP_SX} />}
              </Stack>
              <Typography
                variant="body2"
                noWrap
                sx={{
                  color: "text.secondary",
                  display: 'block',
                  mt: 0.25
                }}>
                {oneLine(address)}
              </Typography>
            </Box>
            <DuncitRoundButton tone="surface" aria-label={`Edit ${address.label}`} onClick={() => openEdit(address)} sx={ROW_ACTION_SX}>
              <EditOutlinedIcon />
            </DuncitRoundButton>
            <DuncitRoundButton tone="surface" aria-label={`Delete ${address.label}`} onClick={() => remove(address)} sx={ROW_ACTION_SX}>
              <DeleteOutlineIcon />
            </DuncitRoundButton>
          </Stack>
        ))}
      </Box>
      <AddressForm
        open={formOpen}
        title={editing ? 'Edit address' : 'Add address'}
        initial={editing}
        saving={saving}
        onCancel={() => setFormOpen(false)}
        onSubmit={submit}
      />
    </Card>
  );
}
