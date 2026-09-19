import { useEffect } from 'react';
import { Controller } from 'react-hook-form';
import { useQuery } from '@apollo/client/react';
import { Alert, FormControlLabel, FormHelperText, Radio, RadioGroup, Skeleton, Stack, Typography } from '@mui/material';
import FormDialog from '../../../../components/FormDialog';
import { useSchemaForm } from '../../../../components/form/useSchemaForm';
import { money } from '../../../../lib/format';
import type { Translate } from '../../../../lib/translate';
import { STORE_SHIPMENT_COURIERS, type CourierOption } from '../../shipping-queries';
import { makeOrderCourierSchema, ORDER_COURIER_DEFAULTS, type OrderCourierValues } from './order-courier.types';

interface OrderCourierFormProps {
  orderId: string;
  busy: boolean;
  onClose: () => void;
  onSubmit: (courierId: string) => Promise<boolean>;
}

/** One courier as the radio label reads it: name, price, ETA and the recommendation. */
function CourierLabel({ courier, t }: Readonly<{ courier: CourierOption; t: Translate }>) {
  const facts = [
    money(courier.rate),
    courier.etd ? t('ecommPortal.shipping.eta', { vars: { etd: courier.etd } }) : '',
    courier.cod ? t('ecommPortal.shipping.codOk') : '',
  ].filter(Boolean);
  return (
    <Stack sx={{ py: 0.5 }}>
      <Typography sx={{ fontWeight: 700 }}>
        {courier.courier_name}
        {courier.recommended ? ` · ${t('ecommPortal.shipping.recommended')}` : ''}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {facts.join(' · ')}
      </Typography>
    </Stack>
  );
}

/**
 * Pick the courier for a booked shipment. ShipRocket's recommendation is
 * pre-selected; the wallet is checked against the chosen courier's price
 * before the AWB is assigned.
 */
export default function OrderCourierForm({ orderId, busy, onClose, onSubmit }: Readonly<OrderCourierFormProps>) {
  const { t, form } = useSchemaForm<OrderCourierValues>(makeOrderCourierSchema, ORDER_COURIER_DEFAULTS);
  const { control, handleSubmit, setValue } = form;
  const { data, loading, error } = useQuery(STORE_SHIPMENT_COURIERS, { variables: { id: orderId }, fetchPolicy: 'network-only' });
  const couriers = data?.storeShipmentCouriers ?? [];
  const recommended = couriers.find((c) => c.recommended)?.courier_company_id ?? '';

  useEffect(() => {
    if (recommended) setValue('courier_id', recommended);
  }, [recommended, setValue]);

  const submit = handleSubmit(async (values) => {
    if (await onSubmit(values.courier_id)) onClose();
  });

  let body = (
    <Controller
      control={control}
      name="courier_id"
      render={({ field, fieldState }) => (
        <>
          <RadioGroup {...field} aria-label={t('ecommPortal.shipping.courier')}>
            {couriers.map((courier) => (
              <FormControlLabel
                key={courier.courier_company_id}
                value={courier.courier_company_id}
                control={<Radio />}
                label={<CourierLabel courier={courier} t={t} />}
              />
            ))}
          </RadioGroup>
          {fieldState.error ? <FormHelperText error>{fieldState.error.message}</FormHelperText> : null}
        </>
      )}
    />
  );
  if (loading) body = <Skeleton variant="rounded" height={160} />;
  else if (error) body = <Alert severity="error">{error.message}</Alert>;
  else if (couriers.length === 0) body = <Alert severity="warning">{t('ecommPortal.shipping.noCouriers')}</Alert>;

  return (
    <FormDialog
      formId="order-courier-form"
      title={t('ecommPortal.shipping.chooseCourier')}
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
      submitLabel={t('ecommPortal.shipping.assignCourier')}
    >
      {body}
    </FormDialog>
  );
}
