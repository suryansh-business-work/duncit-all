import { useNavigate } from 'react-router';
import { Alert } from '@mui/material';
import type { GoogleSignupHandoff } from '@duncit/utils';
import SocialRoundButtons from '../../components/SocialRoundButtons';
import { GoogleSignupPolicyGate, type useSignupPolicies } from '../../components/policy-acceptance';
import type { useGoogleSignup } from '../../hooks/useGoogleSignup';
import { useWithRedirect } from '../../utils/redirect';
import GoogleSignupInviteDialog from '../login-page/GoogleSignupInviteDialog';

interface Props {
  google: ReturnType<typeof useGoogleSignup>;
  signup: ReturnType<typeof useSignupPolicies>;
  /** The account is being made — the buttons wait. */
  creating: boolean;
}

/**
 * The signup page's Google and Apple buttons, and every question a returned
 * credential can raise before the number step: "you're already on Duncit — log
 * in?" for somebody who is, the policy gate for somebody who is not.
 *
 * "Log me in" carries the credential, unspent, to the login screen — the one
 * place that knows every way a provider login can answer (a session, the
 * link-consent step for an email/password account, two-factor). Nothing is
 * signed in from here.
 */
export default function SocialSignupDoor({ google, signup, creating }: Readonly<Props>) {
  const navigate = useNavigate();
  const authLink = useWithRedirect();
  const busy = creating || google.checking;

  const logInInstead = () => {
    const held = google.existing;
    if (!held) return;
    google.dismissExisting();
    const socialLogin: GoogleSignupHandoff = {
      idToken: held.credential.idToken,
      email: held.email,
      provider: held.credential.provider,
    };
    navigate(authLink('/login'), { state: { socialLogin } });
  };

  return (
    <>
      <SocialRoundButtons
        intent="SIGN_UP"
        loading={busy}
        onCredential={(credential) => {
          google.start(credential).catch(() => undefined);
        }}
        onError={google.setError}
      />
      <GoogleSignupPolicyGate
        credential={google.credential}
        policies={signup.policies}
        loading={signup.loading}
        failed={signup.failed}
        onAccepted={google.accept}
        onCancelled={google.cancel}
      />
      <GoogleSignupInviteDialog
        open={!!google.existing}
        prompt="EXISTS"
        provider={google.existing?.credential.provider ?? 'GOOGLE'}
        email={google.existing?.email ?? ''}
        onAccept={logInInstead}
        onDismiss={google.dismissExisting}
      />
      {google.error && (
        <Alert data-testid="google-signup-error" severity="error" sx={{ width: '100%' }}>
          {google.error}
        </Alert>
      )}
    </>
  );
}
