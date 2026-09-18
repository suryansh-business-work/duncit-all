import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import { notifySuccess } from '@duncit/dialogs';
import { toDigits } from '@duncit/regex';
import { parseApiError } from '@duncit/utils';

import { useStoreSession } from '../../../app/providers/SessionProvider';
import { useStoreSettings } from '../../../app/providers/StoreSettingsProvider';
import { emptyAddress } from '../../../components/address-form';
import { AutoshipAddress, AutoshipDialogFrame, AutoshipPlanFields, needsCodCheck } from '../../../components/autoship-plan';
import { QuantityStepper } from '../../../components/QuantityStepper';
import { UPDATE_SUBSCRIPTION, type StoreSubscription } from '../../../graphql/autoship';
import { toAddressValues, toStoreAddress } from '../../../lib/addresses';
import { useStoreT } from '../../../i18n';
import { makeAutoshipEditSchema, type AutoshipEditValues } from './autoship-edit.types';

interface AutoshipEditDialogProps {
  subscription: StoreSubscription;
  onClose: () => void;
}

/** Edit an Autoship: quantity, frequency, COD or reminder, and the delivery address. */
export function AutoshipEditDialog({ subscription, onClose }: Readonly<AutoshipEditDialogProps>) {
  const { t } = useStoreT();
  const settings = useStoreSettings();
  const { me } = useStoreSession();
  const [challengeId, setChallengeId] = useState('');
  const [error, setError] = useState('');
  const maxQty = settings.max_qty_per_line;
  const schema = useMemo(() => makeAutoshipEditSchema(t, settings.autoship_frequencies, maxQty), [t, settings.autoship_frequencies, maxQty]);
  const [update] = useMutation(UPDATE_SUBSCRIPTION);
  const address = subscription.shipping_address;
  const { control, handleSubmit, watch, formState } = useForm<AutoshipEditValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...(address ? toAddressValues(address) : emptyAddress()),
      qty: subscription.qty,
      frequency_weeks: subscription.frequency_weeks,
      mode: subscription.mode,
    },
  });
  // Switching TO automatic COD needs the phone proven; a plan already on it has been.
  const codCheck = needsCodCheck(watch('mode'), settings.cod_requires_otp) && subscription.mode !== 'COD_AUTO';

  const submit = handleSubmit(async (values) => {
    setError('');
    if (codCheck && !challengeId) {
      setError(t('ecommStore.cod.verifyFirst'));
      return;
    }
    try {
      const input = {
        qty: values.qty,
        frequency_weeks: values.frequency_weeks,
        mode: values.mode,
        shipping_address: toStoreAddress(values, me?.email),
        cod_challenge_id: codCheck ? challengeId : undefined,
      };
      await update({ variables: { id: subscription.id, input } });
      notifySuccess(t('ecommStore.autoship.updated'));
      onClose();
    } catch (err) {
      setError(parseApiError(err, t('ecommStore.autoship.failed')));
    }
  });

  return (
    <AutoshipDialogFrame
      title={t('ecommStore.autoship.editTitle')}
      submitLabel={t('ecommStore.autoship.save')}
      onSubmit={submit}
      onClose={onClose}
      submitting={formState.isSubmitting}
      error={error}
      cod={{ needed: codCheck, phone: toDigits(watch('phone')).slice(-10), verified: Boolean(challengeId), onVerified: setChallengeId }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography sx={{ fontWeight: 800 }}>{t('ecommStore.autoship.quantity')}</Typography>
        <Controller
          control={control}
          name="qty"
          render={({ field }) => (
            <QuantityStepper value={field.value} max={maxQty} itemName={subscription.product?.title ?? ''} onChange={field.onChange} />
          )}
        />
      </Stack>
      <AutoshipPlanFields control={control} />
      <AutoshipAddress control={control} />
    </AutoshipDialogFrame>
  );
}
