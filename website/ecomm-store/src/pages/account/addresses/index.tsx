import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import HomeWorkOutlinedIcon from '@mui/icons-material/HomeWorkOutlined';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, useConfirm } from '@duncit/dialogs';
import { Loader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';

import { EmptyState } from '../../../components/EmptyState';
import { DELETE_ADDRESS, MY_ADDRESSES, SET_DEFAULT_ADDRESS, type UserAddress } from '../../../graphql/account';
import { useStoreT } from '../../../i18n';
import { AccountLayout } from '../AccountLayout';
import { AddressBookDialog } from './address-book-form';

type Editing = { address?: UserAddress } | null;

function AddressCard({ address, onEdit }: Readonly<{ address: UserAddress; onEdit: () => void }>) {
  const { t } = useStoreT();
  const confirm = useConfirm();
  const refetch = { refetchQueries: ['EcommStoreMyAddresses'] };
  const [remove] = useMutation(DELETE_ADDRESS, refetch);
  const [makeDefault] = useMutation(SET_DEFAULT_ADDRESS, refetch);
  const onDelete = async () => {
    const ok = await confirm({ title: t('ecommStore.address.deleteTitle'), message: t('ecommStore.address.deleteBody', { vars: { label: address.label } }), destructive: true, confirmLabel: t('ecommStore.address.delete'), cancelLabel: t('ecommStore.common.cancel') });
    if (ok) await remove({ variables: { id: address.id } }).catch((error: unknown) => notifyError(parseApiError(error)));
  };
  const onDefault = () => makeDefault({ variables: { id: address.id } }).catch((error: unknown) => notifyError(parseApiError(error)));
  return (
    <Paper component="li" sx={{ p: 2, listStyle: 'none' }}>
      <Stack spacing={0.75}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography sx={{ fontWeight: 800 }}>{address.label}</Typography>
          {address.is_default ? <Chip size="small" color="primary" label={t('ecommStore.address.default')} /> : null}
        </Stack>
        <Typography>{address.name}</Typography>
        <Typography variant="body2" color="text.secondary">
          {[address.line1, address.line2, address.landmark, address.city, address.state, address.pincode].filter(Boolean).join(', ')}
        </Typography>
        <Typography variant="body2">{address.phone}</Typography>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <DuncitButton size="small" onClick={onEdit}>{t('ecommStore.address.editShort')}</DuncitButton>
          {address.is_default ? null : <DuncitButton size="small" onClick={onDefault}>{t('ecommStore.address.setDefault')}</DuncitButton>}
          <DuncitButton size="small" color="error" onClick={onDelete}>{t('ecommStore.address.delete')}</DuncitButton>
        </Stack>
      </Stack>
    </Paper>
  );
}

/** /account/addresses — the address book: add, edit, delete, choose the default. */
export function AddressesPage() {
  const { t } = useStoreT();
  const [editing, setEditing] = useState<Editing>(null);
  const { data, loading } = useQuery(MY_ADDRESSES);
  const addresses = data?.myAddresses ?? [];
  return (
    <AccountLayout title={t('ecommStore.account.addresses')}>
      <Stack spacing={2}>
        <DuncitButton variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setEditing({})} sx={{ alignSelf: 'flex-start' }}>
          {t('ecommStore.address.add')}
        </DuncitButton>
        {loading && addresses.length === 0 ? <Loader label={t('ecommStore.common.loading')} /> : null}
        {!loading && addresses.length === 0 ? <EmptyState icon={<HomeWorkOutlinedIcon />} title={t('ecommStore.address.none')} /> : null}
        <Box component="ul" sx={{ p: 0, m: 0, display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
          {addresses.map((address) => (
            <AddressCard key={address.id} address={address} onEdit={() => setEditing({ address })} />
          ))}
        </Box>
      </Stack>
      {editing ? <AddressBookDialog address={editing.address} onClose={() => setEditing(null)} /> : null}
    </AccountLayout>
  );
}
