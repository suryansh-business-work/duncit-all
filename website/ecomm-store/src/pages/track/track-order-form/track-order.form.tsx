import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useApolloClient } from '@apollo/client/react';
import { Alert, Box, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { parseApiError } from '@duncit/utils';

import { TRACK_ORDER, type StoreOrder } from '../../../graphql/orders';
import { useStoreT } from '../../../i18n';
import { makeTrackOrderSchema, type TrackOrderValues } from './track-order.types';

/** Find an order by its number and the email or phone it was placed with. */
export function TrackOrderForm({ onFound }: Readonly<{ onFound: (order: StoreOrder) => void }>) {
  const { t } = useStoreT();
  const client = useApolloClient();
  const [error, setError] = useState('');
  const schema = useMemo(() => makeTrackOrderSchema(t), [t]);
  const { control, handleSubmit, formState } = useForm<TrackOrderValues>({
    resolver: zodResolver(schema),
    defaultValues: { orderNo: '', contact: '' },
  });
  const submit = handleSubmit(async ({ orderNo, contact }) => {
    setError('');
    try {
      const { data } = await client.query({ query: TRACK_ORDER, variables: { order_no: orderNo, contact }, fetchPolicy: 'network-only' });
      if (data?.storeTrackOrder) onFound(data.storeTrackOrder);
    } catch (err) {
      setError(parseApiError(err, t('ecommStore.track.notFound')));
    }
  });
  return (
    <Stack component="form" spacing={1.5} onSubmit={submit} noValidate>
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        <RhfTextField control={control} name="orderNo" label={t('ecommStore.track.orderNo')} autoComplete="off" required />
        <RhfTextField control={control} name="contact" label={t('ecommStore.track.contact')} hint={t('ecommStore.track.contactHint')} required />
      </Box>
      <Stack aria-live="assertive">{error ? <Alert severity="error">{error}</Alert> : null}</Stack>
      <DuncitButton type="submit" variant="contained" size="large" loading={formState.isSubmitting} sx={{ alignSelf: 'flex-start' }}>
        {t('ecommStore.track.find')}
      </DuncitButton>
    </Stack>
  );
}
