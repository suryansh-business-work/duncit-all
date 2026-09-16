import { useCallback, useMemo, useState } from 'react';
import { Alert, Stack, Typography } from '@mui/material';
import SmsIcon from '@mui/icons-material/Sms';
import ReplayIcon from '@mui/icons-material/Replay';
import VerifiedIcon from '@mui/icons-material/Verified';
import KeyIcon from '@mui/icons-material/Key';
import { makeContactValueSchema } from '@duncit/forms/schemas';
import { useConfirm } from '@duncit/dialogs';
import { formatPhoneLine } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import type { EnvEntry } from '../../queries';
import ConnectionTestPanel from '../ConnectionTestPanel';
import Msg91StepForm from './Msg91StepForm';
import {
  SEND_OTP_VALUES,
  makeRetryOtpSchema,
  makeVerifyOtpSchema,
  makeVerifyTokenSchema,
  retryChannelOptions,
  retryOtpInput,
  sendOtpInput,
  verifyOtpInput,
  verifyTokenInput,
  type RetryOtpValues,
  type SendOtpValues,
  type VerifyOtpValues,
  type VerifyTokenValues,
} from './msg91-test.types';

/**
 * The MSG91 OTP widget, one call at a time, with this entry's own keys:
 * prove the auth key (nothing sent), send a real code, re-send it, verify it,
 * and check the access token MSG91 answered with. Each step hands the next
 * one what it needs, so a full round trip is four presses and one SMS.
 */
export default function Msg91TestPanel({ entry }: Readonly<{ entry: EnvEntry }>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [reqId, setReqId] = useState('');
  const [token, setToken] = useState('');

  const retryValues = useMemo<RetryOtpValues>(() => ({ req_id: reqId, retry_channel: '' }), [reqId]);
  const verifyValues = useMemo<VerifyOtpValues>(() => ({ req_id: reqId, otp: '' }), [reqId]);
  const tokenValues = useMemo<VerifyTokenValues>(() => ({ access_token: token }), [token]);

  const confirmSend = useCallback(
    (values: SendOtpValues) =>
      confirm({
        title: t('tech.msg91.confirmSendTitle'),
        message: t('tech.msg91.confirmSendMessage', {
          vars: { number: formatPhoneLine(values.extension, values.number) },
        }),
        confirmLabel: t('tech.msg91.confirmSend'),
        confirmColor: 'warning',
      }),
    [confirm, t]
  );

  return (
    <Stack spacing={2}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('tech.msg91.testIntro')}
      </Typography>
      <Alert severity="warning">{t('tech.msg91.codeLengthWarning')}</Alert>
      <ConnectionTestPanel entry={entry} description={t('tech.msg91.connectionIntro')} />

      <Msg91StepForm<SendOtpValues>
        entryId={entry.id}
        testId="msg91-send-otp"
        title={t('tech.msg91.sendTitle')}
        hint={t('tech.msg91.sendHint')}
        actionLabel={t('tech.msg91.send')}
        icon={<SmsIcon />}
        fields={[
          { name: 'extension', label: t('tech.msg91.countryCode'), hint: t('tech.msg91.countryCodeHint'), width: 110 },
          { name: 'number', label: t('tech.msg91.phoneNumber'), hint: t('tech.msg91.phoneNumberHint'), numeric: true },
        ]}
        schema={makeContactValueSchema('PHONE', t)}
        values={SEND_OTP_VALUES}
        toInput={sendOtpInput}
        beforeRun={confirmSend}
        onAnswer={setReqId}
      />

      <Msg91StepForm<RetryOtpValues>
        entryId={entry.id}
        testId="msg91-retry-otp"
        title={t('tech.msg91.retryTitle')}
        hint={t('tech.msg91.retryHint')}
        actionLabel={t('tech.msg91.retry')}
        icon={<ReplayIcon />}
        fields={[
          { name: 'req_id', label: t('tech.msg91.requestId'), hint: t('tech.msg91.requestIdHint') },
          {
            name: 'retry_channel',
            label: t('tech.msg91.retryChannel'),
            hint: ' ',
            options: retryChannelOptions(t),
            width: 150,
          },
        ]}
        schema={makeRetryOtpSchema(t)}
        values={retryValues}
        toInput={retryOtpInput}
      />

      <Msg91StepForm<VerifyOtpValues>
        entryId={entry.id}
        testId="msg91-verify-otp"
        title={t('tech.msg91.verifyTitle')}
        hint={t('tech.msg91.verifyHint')}
        actionLabel={t('tech.msg91.verify')}
        icon={<VerifiedIcon />}
        fields={[
          { name: 'req_id', label: t('tech.msg91.requestId'), hint: t('tech.msg91.requestIdHint') },
          { name: 'otp', label: t('tech.msg91.code'), hint: t('tech.msg91.codeHint'), numeric: true, width: 130 },
        ]}
        schema={makeVerifyOtpSchema(t)}
        values={verifyValues}
        toInput={verifyOtpInput}
        onAnswer={setToken}
      />

      <Msg91StepForm<VerifyTokenValues>
        entryId={entry.id}
        testId="msg91-verify-token"
        title={t('tech.msg91.tokenTitle')}
        hint={t('tech.msg91.tokenHint')}
        actionLabel={t('tech.msg91.verifyToken')}
        icon={<KeyIcon />}
        fields={[
          { name: 'access_token', label: t('tech.msg91.accessToken'), hint: t('tech.msg91.accessTokenHint') },
        ]}
        schema={makeVerifyTokenSchema(t)}
        values={tokenValues}
        toInput={verifyTokenInput}
      />
    </Stack>
  );
}
