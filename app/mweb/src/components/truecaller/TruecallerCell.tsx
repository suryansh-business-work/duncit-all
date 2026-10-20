import ContactPhoneRoundedIcon from '@mui/icons-material/ContactPhoneRounded';
import { CircularProgress, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router';
import { auth as authTokens } from '@duncit/auth-tokens';
import { BUTTON_SIZES, DuncitIconButton } from '@duncit/buttons';
import { logs } from '@duncit/logs';
import { TRUECALLER_COPY, TRUECALLER_SIGNUP_STATE_KEY } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { useFinishLogin } from '../../pages/login-page/useFinishLogin';
import { parseApiError } from '../../utils/parseApiError';
import { useWithRedirect } from '../../utils/redirect';
import { TruecallerWebError, useTruecallerWeb, type TruecallerWebFailure } from './useTruecallerWeb';

const ROUND_ICON = Math.round(BUTTON_SIZES.lg.height * authTokens.fit.socialIconRatio);

/** What each way a run can end without an outcome says. */
const WEB_FAILURE_COPY: Record<TruecallerWebFailure, string> = {
  NOT_INSTALLED: TRUECALLER_COPY.notInstalled,
  DECLINED: TRUECALLER_COPY.declined,
  FAILED: TRUECALLER_COPY.failed,
};

interface Props {
  intent: 'SIGN_IN' | 'SIGN_UP';
  /** Another provider's credential is being spent — this button waits too. */
  loading: boolean;
  onError: (message: string) => void;
}

/**
 * Continue with Truecaller, as a cell of the round-button row. Renders nothing
 * off Android or until Tech has configured Truecaller.
 *
 * Both answers are handled here, so login and signup behave the same: a known
 * number signs straight in; an unknown one opens signup with the number
 * already proven (its proof travels in router state, read by RegisterPage).
 */
export default function TruecallerCell({ intent, loading, onError }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const authLink = useWithRedirect();
  const { finishLogin, starting } = useFinishLogin();
  const truecaller = useTruecallerWeb(intent === 'SIGN_UP' ? 'SIGNUP' : 'LOGIN');
  if (!truecaller.available) return null;

  const busy = truecaller.busy || starting || loading;

  const press = async () => {
    try {
      const outcome = await truecaller.run();
      if (outcome.status === 'SIGNED_IN' && outcome.auth) {
        await finishLogin(outcome.auth.token, outcome.auth.user);
      } else if (outcome.signup) {
        navigate(authLink('/register'), { state: { [TRUECALLER_SIGNUP_STATE_KEY]: outcome.signup } });
      }
    } catch (error) {
      if (error instanceof TruecallerWebError) {
        onError(t(WEB_FAILURE_COPY[error.reason]));
        return;
      }
      logs.mWeb.error('Truecaller', 'continue', { error, msg: 'Truecaller sign-in failed' });
      onError(parseApiError(error));
    }
  };

  return (
    <Stack spacing={1} sx={{ alignItems: 'center' }}>
      <DuncitIconButton
        onClick={() => {
          press().catch(() => undefined);
        }}
        disabled={busy}
        aria-label={t(intent === 'SIGN_UP' ? TRUECALLER_COPY.signUp : TRUECALLER_COPY.signIn)}
        aria-busy={busy || undefined}
        data-testid="truecaller-auth-button"
        sx={{
          width: BUTTON_SIZES.lg.height,
          height: BUTTON_SIZES.lg.height,
          bgcolor: 'info.main',
          color: 'info.contrastText',
          '&:hover': { bgcolor: 'info.dark' },
        }}
      >
        {truecaller.busy ? (
          <CircularProgress size={BUTTON_SIZES.lg.iconSize} color="inherit" />
        ) : (
          <ContactPhoneRoundedIcon sx={{ fontSize: ROUND_ICON }} />
        )}
      </DuncitIconButton>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t(TRUECALLER_COPY.short)}
      </Typography>
    </Stack>
  );
}
