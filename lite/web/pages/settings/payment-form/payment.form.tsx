import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { RhfTextField } from '@duncit/forms';
import { parseApiError } from '@duncit/utils';
import type { LiteMe } from '../../../../shared/graphql/documents';
import { useWebT } from '../../../../shared/i18n';
import { useLiteSession } from '../../../../shared/session';
import { LITE_UPDATE_PROFILE } from '../../../graphql/profile';
import { makePaymentSchema, paymentDefaults, type PaymentValues } from './payment.types';

/** The UPI details every new paid event starts from (each event can still change them). */
export function PaymentForm({ me }: Readonly<{ me: LiteMe }>) {
  const { t } = useWebT();
  const { refresh } = useLiteSession();
  const schema = useMemo(() => makePaymentSchema(t), [t]);
  const [updateProfile] = useMutation(LITE_UPDATE_PROFILE);
  const { control, handleSubmit, formState, reset } = useForm<PaymentValues>({ resolver: zodResolver(schema), defaultValues: paymentDefaults(me) });

  const submit = handleSubmit(async (values) => {
    try {
      const { data } = await updateProfile({ variables: { input: values } });
      if (data?.liteUpdateProfile) reset(paymentDefaults(data.liteUpdateProfile));
      await refresh();
      notifySuccess(t('liteWeb.profile.saved'));
    } catch (error) {
      notifyError(parseApiError(error));
    }
  });

  return (
    <Stack component="form" spacing={2} onSubmit={submit} noValidate data-testid="payment-form">
      <Typography variant="body2" color="text.secondary">
        {t('liteWeb.profile.paymentsHint')}
      </Typography>
      <RhfTextField control={control} name="upi_id" label={t('liteWeb.profile.upiId')} hint={t('liteWeb.profile.upiIdHint')} slotProps={{ htmlInput: { maxLength: 256, autoCapitalize: 'none', 'data-testid': 'profile-upi-id' } }} />
      <RhfTextField control={control} name="upi_name" label={t('liteWeb.profile.upiName')} hint={t('liteWeb.profile.upiNameHint')} slotProps={{ htmlInput: { maxLength: 80, 'data-testid': 'profile-upi-name' } }} />
      <DuncitButton type="submit" variant="contained" loading={formState.isSubmitting} sx={{ alignSelf: 'flex-start' }} data-testid="payment-save">
        {t('liteWeb.settings.saveChanges')}
      </DuncitButton>
    </Stack>
  );
}
