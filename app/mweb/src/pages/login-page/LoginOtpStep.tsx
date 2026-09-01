import { Link, Stack } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { buildOtpLoginLabels, recoveryDestination } from '@duncit/utils';
import RecoveryChannelStep from '../../components/password-recovery/RecoveryChannelStep';
import RecoveryCodeStep from '../../components/password-recovery/RecoveryCodeStep';
import { useTranslation } from '../../i18n/useTranslation';
import type { OtpLogin } from './useOtpLogin';

interface Props {
  otp: OtpLogin;
  onBack: () => void;
}

/**
 * Continue with OTP: pick a channel, then type the code — the same two steps
 * recovery renders, with sign-in copy and a session at the end. A correct code
 * authenticates from inside the hook, so this step has no third screen.
 */
export default function LoginOtpStep({ otp, onBack }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = buildOtpLoginLabels(t);
  const { state, notFound, notSent, expiresInMinutes, testCode, resendIn, busy } = otp;
  const onCode = state.step === 'CODE';

  return (
    <Stack spacing={1.6}>
      {onCode ? (
        <RecoveryCodeStep
          labels={labels}
          destination={recoveryDestination(state.channel, state.draft)}
          expiresInMinutes={expiresInMinutes}
          testCode={testCode}
          busy={busy.verifying}
          resending={busy.requesting}
          resendIn={resendIn}
          onVerify={(code) => {
            otp.submitCode(code).catch(() => undefined);
          }}
          onResend={() => {
            otp.sendCode(state.draft).catch(() => undefined);
          }}
        />
      ) : (
        <RecoveryChannelStep
          key={state.channel}
          channel={state.channel}
          labels={labels}
          defaultValues={state.draft}
          busy={busy.requesting}
          notFound={notFound}
          notSent={notSent}
          onChannel={otp.setChannel}
          onSend={(draft) => {
            otp.sendCode(draft).catch(() => undefined);
          }}
        />
      )}

      <Stack sx={{ alignItems: 'center' }}>
        <Link
          component="button"
          type="button"
          onClick={onCode ? otp.goBack : onBack}
          underline="hover"
          variant="body2"
          data-testid="otp-back"
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
        >
          <ArrowBackIcon fontSize="inherit" />
          {onCode ? labels.back : t('mweb.login.backToOptions')}
        </Link>
      </Stack>
    </Stack>
  );
}
