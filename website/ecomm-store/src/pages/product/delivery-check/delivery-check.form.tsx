import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLazyQuery } from '@apollo/client/react';
import { Alert, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { parseApiError } from '@duncit/utils';

import { DELIVERY_CHECK, type StoreDeliveryCheck } from '../../../graphql/product';
import { usePincode } from '../../../lib/usePincode';
import { useStoreT } from '../../../i18n';
import { makeDeliveryCheckSchema, type DeliveryCheckValues } from './delivery-check.types';

function Verdict({ result }: Readonly<{ result: StoreDeliveryCheck }>) {
  const { t } = useStoreT();
  if (!result.checked) return <Alert severity="info">{t('ecommStore.delivery.unknown')}</Alert>;
  if (!result.serviceable) return <Alert severity="warning">{t('ecommStore.delivery.notServiceable', { vars: { pincode: result.pincode } })}</Alert>;
  return (
    <Alert severity="success">
      <Stack spacing={0.25}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {result.etd ? t('ecommStore.delivery.etd', { vars: { etd: result.etd } }) : t('ecommStore.delivery.serviceable')}
        </Typography>
        <Typography variant="body2">{result.cod_available ? t('ecommStore.delivery.codYes') : t('ecommStore.delivery.codNo')}</Typography>
      </Stack>
    </Alert>
  );
}

interface DeliveryCheckFormProps {
  productId: string;
  variantId: string | null;
}

/** "Deliver to 400001?" — the courier's answer for this product, with COD and an ETD. */
export function DeliveryCheckForm({ productId, variantId }: Readonly<DeliveryCheckFormProps>) {
  const { t } = useStoreT();
  const [savedPincode, setSavedPincode] = usePincode();
  const schema = useMemo(() => makeDeliveryCheckSchema(t), [t]);
  const [check, { data, loading, error }] = useLazyQuery(DELIVERY_CHECK);
  const { control, handleSubmit } = useForm<DeliveryCheckValues>({
    resolver: zodResolver(schema),
    defaultValues: { pincode: savedPincode },
  });
  const submit = handleSubmit(async ({ pincode }) => {
    setSavedPincode(pincode);
    await check({ variables: { product_id: productId, variant_id: variantId, pincode } });
  });
  return (
    <Stack spacing={1}>
      <Stack component="form" direction="row" spacing={1} onSubmit={submit} noValidate sx={{ alignItems: 'flex-start' }}>
        <RhfTextField
          control={control}
          name="pincode"
          size="small"
          label={t('ecommStore.delivery.label')}
          autoComplete="postal-code"
          slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 6 } }}
        />
        <DuncitButton type="submit" variant="outlined" loading={loading} sx={{ minHeight: 40 }}>
          {t('ecommStore.delivery.check')}
        </DuncitButton>
      </Stack>
      <Stack aria-live="polite">
        {error ? <Alert severity="error">{parseApiError(error, t('ecommStore.delivery.failed'))}</Alert> : null}
        {data?.storeDeliveryCheck ? <Verdict result={data.storeDeliveryCheck} /> : null}
      </Stack>
    </Stack>
  );
}
