import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client/react';
import { Alert, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { parseApiError } from '@duncit/utils';

import { useStoreSession } from '../../../app/providers/SessionProvider';
import { SUBSCRIBE_STOCK_ALERT } from '../../../graphql/product';
import { useStoreT } from '../../../i18n';
import { makeStockAlertSchema, type StockAlertValues } from './stock-alert.types';

interface StockAlertFormProps {
  productId: string;
  variantId: string | null;
}

/** Out of stock: leave an email and hear when it is back. */
export function StockAlertForm({ productId, variantId }: Readonly<StockAlertFormProps>) {
  const { t } = useStoreT();
  const { me } = useStoreSession();
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const schema = useMemo(() => makeStockAlertSchema(t), [t]);
  const [subscribe] = useMutation(SUBSCRIBE_STOCK_ALERT);
  const { control, handleSubmit, formState } = useForm<StockAlertValues>({
    resolver: zodResolver(schema),
    values: { email: me?.email ?? '' },
  });
  const submit = handleSubmit(async ({ email }) => {
    setError('');
    try {
      await subscribe({ variables: { product_id: productId, variant_id: variantId, email } });
      setDone(true);
    } catch (err) {
      setError(parseApiError(err, t('ecommStore.stockAlert.failed')));
    }
  });
  if (done) {
    return (
      <Alert severity="success" role="status">
        {t('ecommStore.stockAlert.done')}
      </Alert>
    );
  }
  return (
    <Stack component="form" spacing={1} onSubmit={submit} noValidate>
      <Typography sx={{ fontWeight: 800 }}>{t('ecommStore.stockAlert.title')}</Typography>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
        <RhfTextField control={control} name="email" type="email" size="small" autoComplete="email" label={t('ecommStore.stockAlert.email')} />
        <DuncitButton type="submit" variant="contained" loading={formState.isSubmitting} sx={{ minHeight: 40 }}>
          {t('ecommStore.stockAlert.notify')}
        </DuncitButton>
      </Stack>
      <Stack aria-live="assertive">{error ? <Alert severity="error">{error}</Alert> : null}</Stack>
    </Stack>
  );
}
