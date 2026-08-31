import { Link as RouterLink } from 'react-router';
import { Link, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { LoginForm, type LoginFormValues } from '../../forms/login';
import LegalLinks from '../../components/LegalLinks';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  loading: boolean;
  errorMessage: string | null;
  onSubmit: (values: LoginFormValues) => Promise<void>;
  onBack: () => void;
}

/**
 * The password step: the email and password boxes, and the two links that only
 * make sense beside them.
 *
 * "Forgot password?" lives here rather than on the landing step because it is
 * only ever about a password — offering it to somebody about to press Continue
 * with Google was offering to recover something they may not have.
 */
export default function LoginPasswordStep({
  loading,
  errorMessage,
  onSubmit,
  onBack,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Stack spacing={1.6}>
      <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
        {t('mweb.login.passwordStepSubtitle')}
      </Typography>

      <LoginForm loading={loading} errorMessage={errorMessage} onSubmit={onSubmit} />

      <Stack sx={{ alignItems: 'flex-end', mt: -1 }}>
        <Link component={RouterLink} to="/forgot-password" underline="hover" variant="body2">
          {t('mweb.login.forgotPassword')}
        </Link>
      </Stack>

      <Stack spacing={1.2} sx={{ alignItems: 'center' }}>
        <Link
          component="button"
          type="button"
          onClick={onBack}
          underline="hover"
          variant="body2"
          data-testid="back-to-options"
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
        >
          <ArrowBackIcon fontSize="inherit" />
          {t('mweb.login.backToOptions')}
        </Link>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('mweb.login.newHere')}{' '}
          <Link component={RouterLink} to="/register" underline="hover">
            {t('mweb.login.createOne')}
          </Link>
        </Typography>
        <LegalLinks prefix={t('mweb.auth.legalSignIn')} />
      </Stack>
    </Stack>
  );
}
