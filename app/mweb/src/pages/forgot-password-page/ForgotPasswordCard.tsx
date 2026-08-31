import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Link, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { DuncitButton } from '@duncit/buttons';
import { auth } from '@duncit/auth-tokens';
import {
  PASSWORD_RECOVERY_STEP_COUNT,
  buildPasswordRecoveryLabels,
  passwordRecoveryStepIndex,
  previousRecoveryStep,
  recoveryDestination,
} from '@duncit/utils';
import AuthLogo from '../../components/AuthLogo';
import AuthScreenFrame from '../../components/AuthScreenFrame';
import { useTranslation } from '../../i18n/useTranslation';
import RecoveryChannelStep from './RecoveryChannelStep';
import RecoveryCodeStep from './RecoveryCodeStep';
import RecoveryPasswordStep from './RecoveryPasswordStep';
import type { PasswordRecovery } from './usePasswordRecovery';

interface Props {
  recovery: PasswordRecovery;
  /** Seconds left before another code may be asked for. Ticks in the page. */
  resendIn: number;
}

/** The heading each step carries, so the frame below stays one block. */
function headingFor(
  step: string,
  labels: ReturnType<typeof buildPasswordRecoveryLabels>,
): { title: string; accent: string; subtitle: string } {
  if (step === 'CODE') {
    return { title: labels.codeTitle, accent: labels.codeTitleAccent, subtitle: '' };
  }
  if (step === 'PASSWORD') {
    return { title: labels.passwordTitle, accent: labels.passwordTitleAccent, subtitle: '' };
  }
  return {
    title: labels.chooseTitle,
    accent: labels.chooseTitleAccent,
    subtitle: labels.chooseSubtitle,
  };
}

/**
 * Forgotten-password recovery, all three steps in one card.
 *
 * One card and not three routes because the steps are one transaction: the
 * grant step two earns is spent by step three and nothing else, so a URL for
 * either would offer a step whose credential no longer exists.
 */
export default function ForgotPasswordCard({ recovery, resendIn }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = buildPasswordRecoveryLabels(t);
  const { state, error, notFound, expiresInMinutes, testCode, busy } = recovery;

  if (state.step === 'DONE') {
    return (
      <AuthScreenFrame center>
        <Stack spacing={2.2} data-testid="recovery-success" sx={{ alignItems: 'center' }}>
          <CheckCircleRoundedIcon sx={{ fontSize: 72, color: 'success.main' }} />
          <Typography
            variant="h4"
            sx={{ fontWeight: 700, textAlign: 'center', color: 'text.primary' }}
          >
            {labels.doneTitle}{' '}
            <Box component="span" sx={{ color: 'success.main' }}>
              {labels.doneTitleAccent}
            </Box>
          </Typography>
          <Typography
            variant="body2"
            sx={{ textAlign: 'center', color: 'text.secondary', maxWidth: 320 }}
          >
            {labels.doneSubtitle}
          </Typography>
          <DuncitButton
            component={RouterLink}
            to="/login"
            variant="contained"
            size="large"
            sx={{ borderRadius: '16px', py: 1.1, px: 4, fontWeight: 700, textTransform: 'none' }}
          >
            {labels.continueToLogin}
          </DuncitButton>
        </Stack>
      </AuthScreenFrame>
    );
  }

  const heading = headingFor(state.step, labels);
  const canGoBack = previousRecoveryStep(state.step) !== null;

  return (
    <AuthScreenFrame center>
      <Stack spacing={2.1}>
        <Stack spacing={1.2} sx={{ alignItems: 'center' }}>
          <AuthLogo />
          <Typography
            variant="h4"
            sx={{ fontWeight: 700, textAlign: 'center', color: 'text.primary' }}
          >
            {heading.title}{' '}
            <Box component="span" sx={{ color: auth.accent }}>
              {heading.accent}
            </Box>
          </Typography>
          {heading.subtitle && (
            <Typography
              variant="body2"
              sx={{ textAlign: 'center', color: 'text.secondary', maxWidth: 320 }}
            >
              {heading.subtitle}
            </Typography>
          )}
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            {labels.stepOf(passwordRecoveryStepIndex(state.step), PASSWORD_RECOVERY_STEP_COUNT)}
          </Typography>
        </Stack>

        {state.step === 'CHANNEL' && (
          <RecoveryChannelStep
            key={state.channel}
            channel={state.channel}
            labels={labels}
            defaultValues={state.draft}
            busy={busy.requesting}
            notFound={notFound}
            onChannel={recovery.setChannel}
            onSend={(draft) => {
              recovery.sendCode(draft).catch(() => undefined);
            }}
          />
        )}

        {state.step === 'CODE' && (
          <RecoveryCodeStep
            labels={labels}
            destination={recoveryDestination(state.channel, state.draft)}
            expiresInMinutes={expiresInMinutes}
            testCode={testCode}
            busy={busy.verifying}
            resending={busy.requesting}
            resendIn={resendIn}
            onVerify={(otp) => {
              recovery.submitCode(otp).catch(() => undefined);
            }}
            onResend={() => {
              recovery.sendCode(state.draft).catch(() => undefined);
            }}
          />
        )}

        {state.step === 'PASSWORD' && (
          <RecoveryPasswordStep
            labels={labels}
            busy={busy.saving}
            onSave={(password) => {
              recovery.submitPassword(password).catch(() => undefined);
            }}
          />
        )}

        {error && <Alert severity="error">{error}</Alert>}

        <Stack spacing={0.6} sx={{ alignItems: 'center' }}>
          {canGoBack && (
            <Link
              component="button"
              type="button"
              onClick={recovery.goBack}
              underline="hover"
              variant="body2"
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
            >
              <ArrowBackIcon fontSize="inherit" />
              {labels.back}
            </Link>
          )}
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {labels.rememberedIt}{' '}
            <Link component={RouterLink} to="/login" underline="hover">
              {labels.backToLogin}
            </Link>
          </Typography>
        </Stack>
      </Stack>
    </AuthScreenFrame>
  );
}

