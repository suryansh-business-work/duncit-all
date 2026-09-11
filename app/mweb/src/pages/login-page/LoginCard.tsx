import { Stack } from '@mui/material';
import AuthHeading from '../../components/AuthHeading';
import AuthScreenFrame from '../../components/AuthScreenFrame';
import { type LoginSubmitValues } from '../../forms/login';
import { useTranslation } from '../../i18n/useTranslation';
import LoginOtpStep from './LoginOtpStep';
import type { OtpLogin } from './useOtpLogin';
import LoginMethodStep from './LoginMethodStep';
import LoginPasswordStep from './LoginPasswordStep';

/** Which part of the sign-in screen is showing. */
export type LoginStep = 'CHOOSE' | 'PASSWORD' | 'OTP';

interface Props {
  step: LoginStep;
  onStep: (step: LoginStep) => void;
  loading: boolean;
  errorMessage: string | null;
  onSubmit: (values: LoginSubmitValues) => Promise<void>;
  gLoading: boolean;
  gError: string | null;
  onGoogleCredential: (idToken: string) => Promise<void> | void;
  otp: OtpLogin;
}

export default function LoginCard({
  step,
  onStep,
  loading,
  errorMessage,
  onSubmit,
  gLoading,
  gError,
  onGoogleCredential,
  otp,
}: Readonly<Props>) {
  const { t } = useTranslation();
  // The heading is decided above the JSX (S3358): the method chooser keeps the
  // welcome, and each method names itself once the boxes are showing.
  let headingTitle = t('mweb.login.title');
  let headingAccent = t('mweb.login.titleAccent');
  if (step === 'PASSWORD') {
    headingTitle = t('mweb.login.passwordStepTitle');
    headingAccent = t('mweb.login.passwordStepTitleAccent');
  } else if (step === 'OTP') {
    headingTitle = t('mweb.otpLogin.title');
    headingAccent = t('mweb.otpLogin.titleAccent');
  }

  return (
    <AuthScreenFrame center>
      <Stack spacing={3}>
        <AuthHeading title={headingTitle} accent={headingAccent} />

        {step === 'CHOOSE' && (
          <LoginMethodStep
            gLoading={gLoading}
            gError={gError}
            onGoogleCredential={onGoogleCredential}
            onChoosePassword={() => onStep('PASSWORD')}
            onChooseOtp={() => onStep('OTP')}
          />
        )}
        {step === 'PASSWORD' && (
          <LoginPasswordStep
            loading={loading}
            errorMessage={errorMessage}
            onSubmit={onSubmit}
            onBack={() => onStep('CHOOSE')}
          />
        )}
        {step === 'OTP' && <LoginOtpStep otp={otp} onBack={() => onStep('CHOOSE')} />}
      </Stack>
    </AuthScreenFrame>
  );
}
