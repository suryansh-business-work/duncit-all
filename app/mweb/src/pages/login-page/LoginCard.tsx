import { Box, Stack, Typography } from '@mui/material';
import { auth } from '@duncit/auth-tokens';
import AuthHeading from '../../components/AuthHeading';
import AuthScreenFrame from '../../components/AuthScreenFrame';
import { type LoginFormValues } from '../../forms/login';
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
  onSubmit: (values: LoginFormValues) => Promise<void>;
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
  const choosing = step === 'CHOOSE';
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
      <Stack spacing={2.1}>
        <AuthHeading
          title={headingTitle}
          accent={headingAccent}
          subtitle={choosing ? t('mweb.login.subtitle') : undefined}
        />

        {choosing && (
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: 'center',
              px: 1.25,
              py: 1,
              borderRadius: '16px',
              bgcolor: 'action.hover',
              border: 1,
              borderColor: 'divider',
            }}
          >
            <Stack direction="row" spacing={-0.7}>
              {auth.avatars.map((color) => (
                <Box
                  key={color}
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    bgcolor: color,
                    border: `2px solid ${auth.avatarRing}`,
                  }}
                />
              ))}
            </Stack>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {t('mweb.login.avatarsCaption')}
            </Typography>
          </Stack>
        )}

        {choosing && (
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
