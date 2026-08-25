import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Divider,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import { auth } from '@duncit/auth-tokens';
import AuthLogo from '../../components/AuthLogo';
import AuthScreenFrame from '../../components/AuthScreenFrame';
import LegalLinks from '../../components/LegalLinks';
import GoogleSignInButton from '../../components/GoogleSignInButton';
import { LoginForm, type LoginFormValues } from '../../forms/login';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  loading: boolean;
  errorMessage: string | null;
  onSubmit: (values: LoginFormValues) => Promise<void>;
  gLoading: boolean;
  gError: string | null;
  onGoogleCredential: (idToken: string) => Promise<void> | void;
}

export default function LoginCard({
  loading,
  errorMessage,
  onSubmit,
  gLoading,
  gError,
  onGoogleCredential,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <AuthScreenFrame center>
      <Stack spacing={2.1}>
        <Stack spacing={1.2} sx={{
          alignItems: "center"
        }}>
          <AuthLogo />
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              textAlign: "center",
              color: "text.primary"
            }}>
            {t('mweb.login.title')}{' '}
            <Box component="span" sx={{ color: auth.accent }}>
              {t('mweb.login.titleAccent')}
            </Box>
          </Typography>
          <Typography
            variant="body2"
            sx={{
              textAlign: "center",
              color: "text.secondary",
              maxWidth: 300
            }}>
            {t('mweb.login.subtitle')}
          </Typography>
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            px: 1.25,
            py: 1,
            borderRadius: '16px',
            bgcolor: 'action.hover',
            border: 1,
            borderColor: 'divider'
          }}>
          <Stack direction="row" spacing={-0.7}>
            {auth.avatars.map((color) => (
              <Box key={color} sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: color, border: `2px solid ${auth.avatarRing}` }} />
            ))}
          </Stack>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: "text.primary"
            }}>
            {t('mweb.login.avatarsCaption')}
          </Typography>
        </Stack>

        <LoginForm loading={loading} errorMessage={errorMessage} onSubmit={onSubmit} />

        <Stack
          sx={{
            alignItems: "flex-end",
            mt: -1
          }}>
          <Link component={RouterLink} to="/forgot-password" underline="hover" variant="body2">
            {t('mweb.login.forgotPassword')}
          </Link>
        </Stack>

        <Divider>{t('mweb.auth.or')}</Divider>

        <Stack spacing={1.4} sx={{
          alignItems: "center"
        }}>
          <GoogleSignInButton
            onCredential={onGoogleCredential}
            loading={gLoading}
            text="signin_with"
          />
          {gError && (
            <Alert severity="error" sx={{ width: '100%' }}>
              {gError}
            </Alert>
          )}
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {t('mweb.login.newHere')}{' '}
            <Link component={RouterLink} to="/register" underline="hover">
              {t('mweb.login.createOne')}
            </Link>
          </Typography>
          <LegalLinks prefix={t('mweb.auth.legalSignIn')} />
          <Typography variant="caption" sx={{
            color: "text.disabled"
          }}>
            {t('mweb.auth.appVersion', { vars: { version: __APP_VERSION__ } })}
          </Typography>
        </Stack>
      </Stack>
    </AuthScreenFrame>
  );
}
