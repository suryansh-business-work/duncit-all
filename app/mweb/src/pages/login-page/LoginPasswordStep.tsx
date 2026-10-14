import { Link as RouterLink, useNavigate } from 'react-router';
import { Link, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { LoginForm, type LoginSubmitValues } from '../../forms/login';
import LegalLinks from '../../components/LegalLinks';
import { useTranslation } from '../../i18n/useTranslation';
import { useWithRedirect } from '../../utils/redirect';

interface Props {
  loading: boolean;
  errorMessage: string | null;
  onSubmit: (values: LoginSubmitValues) => Promise<void>;
  onBack: () => void;
}

/**
 * The password step: the email and password boxes, and the two links that only
 * make sense beside them.
 *
 * "Forgot password?" lives here rather than on the landing step because it is
 * only ever about a password. The form renders it beside the password box and
 * hands over its tab and boxes, so the code goes straight to that email or number.
 */
export default function LoginPasswordStep({
  loading,
  errorMessage,
  onSubmit,
  onBack,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const authLink = useWithRedirect();
  const navigate = useNavigate();

  return (
    <Stack spacing={2}>
      <LoginForm
        loading={loading}
        errorMessage={errorMessage}
        onSubmit={onSubmit}
        onForgotPassword={(recovery) => {
          navigate(authLink('/forgot-password'), { state: { recovery } });
        }}
      />

      <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
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
          <Link component={RouterLink} to={authLink('/register')} underline="hover" data-testid="go-signup">
            {t('mweb.login.createOne')}
          </Link>
        </Typography>
        <LegalLinks prefix={t('mweb.auth.legalSignIn')} />
      </Stack>
    </Stack>
  );
}
