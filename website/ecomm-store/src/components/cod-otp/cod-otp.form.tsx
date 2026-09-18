import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client/react';
import { Alert, Stack, Typography } from '@mui/material';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { parseApiError } from '@duncit/utils';

import { useCart } from '../../app/providers/CartProvider';
import { DIAL_CODE } from '../../config/env';
import { REQUEST_COD_OTP, VERIFY_COD_OTP, type StoreCodOtp } from '../../graphql/checkout';
import { useStoreT } from '../../i18n';
import { makeCodOtpSchema, type CodOtpValues } from './cod-otp.types';

interface CodOtpFormProps {
  /** The 10-digit number the order is for — the code goes there. */
  phone: string;
  /** Already verified for this number: nothing to ask. */
  verified: boolean;
  onVerified: (challengeId: string) => void;
}

/** Cash on Delivery's phone check: send a code to the order's number, then enter it. */
export function CodOtpForm({ phone, verified, onVerified }: Readonly<CodOtpFormProps>) {
  const { t } = useStoreT();
  const { cartToken } = useCart();
  const [challenge, setChallenge] = useState<StoreCodOtp | null>(null);
  const [error, setError] = useState('');
  const schema = useMemo(() => makeCodOtpSchema(t), [t]);
  const [requestOtp, requestState] = useMutation(REQUEST_COD_OTP);
  const [verifyOtp] = useMutation(VERIFY_COD_OTP);
  const { control, handleSubmit, formState } = useForm<CodOtpValues>({ resolver: zodResolver(schema), defaultValues: { code: '' } });

  if (verified) {
    return (
      <Alert severity="success" icon={<VerifiedRoundedIcon />}>
        {t('ecommStore.cod.verified', { vars: { phone } })}
      </Alert>
    );
  }

  const send = async () => {
    setError('');
    try {
      const { data } = await requestOtp({ variables: { cart_token: cartToken, phone_extension: DIAL_CODE, phone_number: phone } });
      setChallenge(data?.storeRequestCodOtp ?? null);
    } catch (err) {
      setError(parseApiError(err, t('ecommStore.cod.sendFailed')));
    }
  };

  const verify = handleSubmit(async ({ code }) => {
    if (!challenge) return;
    setError('');
    try {
      const { data } = await verifyOtp({ variables: { challenge_id: challenge.challenge_id, code } });
      if (data?.storeVerifyCodOtp) onVerified(challenge.challenge_id);
      else setError(t('ecommStore.cod.wrongCode'));
    } catch (err) {
      setError(parseApiError(err, t('ecommStore.cod.wrongCode')));
    }
  });

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2">{t('ecommStore.cod.explain', { vars: { phone } })}</Typography>
      {challenge ? (
        <Stack component="form" spacing={1.5} onSubmit={verify} noValidate>
          {challenge.test_code ? <Alert severity="info">{t('ecommStore.auth.testCode', { vars: { code: challenge.test_code } })}</Alert> : null}
          <RhfTextField
            control={control}
            name="code"
            autoComplete="one-time-code"
            label={t('ecommStore.auth.code')}
            slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 6 } }}
          />
          <Stack direction="row" spacing={1}>
            <DuncitButton type="submit" variant="contained" loading={formState.isSubmitting}>
              {t('ecommStore.cod.verify')}
            </DuncitButton>
            <DuncitButton onClick={send}>{t('ecommStore.cod.resend')}</DuncitButton>
          </Stack>
        </Stack>
      ) : (
        <DuncitButton variant="outlined" onClick={send} loading={requestState.loading} disabled={phone.length !== 10}>
          {t('ecommStore.cod.send')}
        </DuncitButton>
      )}
      <Stack aria-live="assertive">{error ? <Alert severity="error">{error}</Alert> : null}</Stack>
    </Stack>
  );
}
