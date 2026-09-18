import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@apollo/client/react';
import { Typography } from '@mui/material';
import { notifySuccess } from '@duncit/dialogs';
import { toDigits } from '@duncit/regex';
import { parseApiError } from '@duncit/utils';

import { useStoreSession } from '../../../app/providers/SessionProvider';
import { useStoreSettings } from '../../../app/providers/StoreSettingsProvider';
import { emptyAddress } from '../../../components/address-form';
import { AutoshipAddress, AutoshipDialogFrame, AutoshipPlanFields, needsCodCheck } from '../../../components/autoship-plan';
import { DIAL_CODE } from '../../../config/env';
import { MY_ADDRESSES } from '../../../graphql/account';
import { CREATE_SUBSCRIPTION } from '../../../graphql/autoship';
import type { StoreProduct, StoreVariant } from '../../../graphql/product';
import { preferredAddress, toAddressValues, toStoreAddress } from '../../../lib/addresses';
import { paths } from '../../../lib/paths';
import { useStoreT } from '../../../i18n';
import { makeAutoshipSubscribeSchema, type AutoshipSubscribeValues } from './autoship-subscribe.types';

interface AutoshipDialogProps {
  product: StoreProduct;
  variant: StoreVariant | null;
  qty: number;
  onClose: () => void;
}

/** "Subscribe & save": how often, COD-automatic or a reminder, and the address. */
export function AutoshipDialog({ product, variant, qty, onClose }: Readonly<AutoshipDialogProps>) {
  const { t } = useStoreT();
  const navigate = useNavigate();
  const settings = useStoreSettings();
  const { me } = useStoreSession();
  const [challengeId, setChallengeId] = useState('');
  const [error, setError] = useState('');
  const schema = useMemo(() => makeAutoshipSubscribeSchema(t, settings.autoship_frequencies), [t, settings.autoship_frequencies]);
  const { data: saved } = useQuery(MY_ADDRESSES);
  const start = preferredAddress(saved?.myAddresses);
  const [create] = useMutation(CREATE_SUBSCRIPTION, { refetchQueries: ['EcommStoreMySubscriptions'] });
  const { control, handleSubmit, watch, formState } = useForm<AutoshipSubscribeValues>({
    resolver: zodResolver(schema),
    values: {
      ...(start ? toAddressValues(start) : emptyAddress()),
      frequency_weeks: settings.autoship_frequencies[0] ?? 4,
      mode: 'REMIND',
    },
  });
  const codCheck = needsCodCheck(watch('mode'), settings.cod_requires_otp);

  const submit = handleSubmit(async (values) => {
    setError('');
    if (codCheck && !challengeId) {
      setError(t('ecommStore.cod.verifyFirst'));
      return;
    }
    try {
      const contact = { name: values.name, email: me?.email ?? '', phone_extension: DIAL_CODE, phone_number: values.phone };
      await create({
        variables: {
          input: {
            product_id: product.id,
            variant_id: variant?.id,
            qty,
            frequency_weeks: values.frequency_weeks,
            mode: values.mode,
            contact,
            shipping_address: toStoreAddress(values, me?.email),
            cod_challenge_id: codCheck ? challengeId : undefined,
          },
        },
      });
      notifySuccess(t('ecommStore.autoship.created'));
      onClose();
      navigate(paths.autoship);
    } catch (err) {
      setError(parseApiError(err, t('ecommStore.autoship.failed')));
    }
  });

  return (
    <AutoshipDialogFrame
      title={t('ecommStore.autoship.subscribeTitle')}
      submitLabel={t('ecommStore.autoship.start')}
      onSubmit={submit}
      onClose={onClose}
      submitting={formState.isSubmitting}
      error={error}
      lead={
        <Typography color="text.secondary">
          {t('ecommStore.autoship.subscribeBody', { vars: { name: product.title, qty, pct: settings.autoship_discount_pct } })}
        </Typography>
      }
      cod={{ needed: codCheck, phone: toDigits(watch('phone')).slice(-10), verified: Boolean(challengeId), onVerified: setChallengeId }}
    >
      <AutoshipPlanFields control={control} />
      <AutoshipAddress control={control} />
    </AutoshipDialogFrame>
  );
}
