import { Box, Stack, Typography } from '@mui/material';
import { auth } from '@duncit/auth-tokens';
import AuthHeading from '../../components/AuthHeading';
import AuthScreenFrame from '../../components/AuthScreenFrame';
import { type LoginFormValues } from '../../forms/login';
import { useTranslation } from '../../i18n/useTranslation';
import LoginMethodStep from './LoginMethodStep';
import LoginPasswordStep from './LoginPasswordStep';

/** Which half of the sign-in screen is showing. */
export type LoginStep = 'CHOOSE' | 'PASSWORD';

interface Props {
  step: LoginStep;
  onStep: (step: LoginStep) => void;
  loading: boolean;
  errorMessage: string | null;
  onSubmit: (values: LoginFormValues) => Promise<void>;
  gLoading: boolean;
  gError: string | null;
  onGoogleCredential: (idToken: string) => Promise<void> | void;
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
}: Readonly<Props>) {
  const { t } = useTranslation();
  const choosing = step === 'CHOOSE';

  return (
    <AuthScreenFrame center>
      <Stack spacing={2.1}>
        <AuthHeading
          title={choosing ? t('mweb.login.title') : t('mweb.login.passwordStepTitle')}
          accent={
            choosing ? t('mweb.login.titleAccent') : t('mweb.login.passwordStepTitleAccent')
          }
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

        {choosing ? (
          <LoginMethodStep
            gLoading={gLoading}
            gError={gError}
            onGoogleCredential={onGoogleCredential}
            onChoosePassword={() => onStep('PASSWORD')}
          />
        ) : (
          <LoginPasswordStep
            loading={loading}
            errorMessage={errorMessage}
            onSubmit={onSubmit}
            onBack={() => onStep('CHOOSE')}
          />
        )}
      </Stack>
    </AuthScreenFrame>
  );
}
