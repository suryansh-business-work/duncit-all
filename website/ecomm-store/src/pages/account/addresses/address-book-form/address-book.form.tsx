import { useId, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client/react';
import { Alert, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifySuccess } from '@duncit/dialogs';
import { RhfTextField } from '@duncit/forms';
import { parseApiError } from '@duncit/utils';

import { useStoreSession } from '../../../../app/providers/SessionProvider';
import { AddressFields, emptyAddress } from '../../../../components/address-form';
import { COUNTRY } from '../../../../config/env';
import { SAVE_ADDRESS, type UserAddress } from '../../../../graphql/account';
import { toAddressValues } from '../../../../lib/addresses';
import { useStoreT } from '../../../../i18n';
import { makeAddressBookSchema, type AddressBookValues } from './address-book.types';

interface AddressBookDialogProps {
  /** The address being edited; absent adds a new one. */
  address?: UserAddress;
  onClose: () => void;
}

/** Add or edit a saved address. */
export function AddressBookDialog({ address, onClose }: Readonly<AddressBookDialogProps>) {
  const { t } = useStoreT();
  const titleId = useId();
  const { me } = useStoreSession();
  const [error, setError] = useState('');
  const schema = useMemo(() => makeAddressBookSchema(t), [t]);
  const [save] = useMutation(SAVE_ADDRESS, { refetchQueries: ['EcommStoreMyAddresses'] });
  const initial: AddressBookValues = {
    ...(address ? toAddressValues(address) : emptyAddress()),
    label: address?.label ?? t('ecommStore.address.defaultLabel'),
    is_default: address?.is_default ?? false,
  };
  const { control, handleSubmit, formState } = useForm<AddressBookValues>({ resolver: zodResolver(schema), defaultValues: initial });
  const submit = handleSubmit(async (values) => {
    setError('');
    try {
      await save({ variables: { id: address?.id ?? null, input: { ...values, email: address?.email ?? me?.email ?? '', country: COUNTRY } } });
      notifySuccess(t('ecommStore.address.saved'));
      onClose();
    } catch (err) {
      setError(parseApiError(err, t('ecommStore.address.saveFailed')));
    }
  });
  return (
    <Dialog open onClose={onClose} aria-labelledby={titleId} fullWidth maxWidth="sm" scroll="body">
      <Stack component="form" onSubmit={submit} noValidate>
        <DialogTitle id={titleId}>{address ? t('ecommStore.address.edit') : t('ecommStore.address.add')}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <RhfTextField control={control} name="label" label={t('ecommStore.address.label')} hint={t('ecommStore.address.labelHint')} />
            <AddressFields control={control} />
            <Controller
              control={control}
              name="is_default"
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />}
                  label={t('ecommStore.address.makeDefault')}
                />
              )}
            />
            <Stack aria-live="assertive">{error ? <Alert severity="error">{error}</Alert> : null}</Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <DuncitButton onClick={onClose}>{t('ecommStore.common.cancel')}</DuncitButton>
          <DuncitButton type="submit" variant="contained" loading={formState.isSubmitting}>
            {t('ecommStore.address.save')}
          </DuncitButton>
        </DialogActions>
      </Stack>
    </Dialog>
  );
}
