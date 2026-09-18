import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useLocation, useNavigate } from 'react-router';
import AuthBackground from '../../components/AuthBackground';
import { type LoginSubmitValues } from '../../forms/login';
import { parseApiError } from '../../utils/parseApiError';
import {
  getSafeRedirectPath,
  postAuthPath,
  redirectPathFromLocation,
  type RedirectLocation,
} from '../../utils/redirect';
import { LOGIN } from './queries';
import GoogleLinkConsentDialog from './GoogleLinkConsentDialog';
import GoogleSignupInviteDialog from './GoogleSignupInviteDialog';
import LoginCard, { type LoginStep } from './LoginCard';
import { useOtpLogin } from './useOtpLogin';
import { useSocialLogin } from './useSocialLogin';
import { useStartSession } from '../../user-info/useStartSession';

export default function LoginPage() {
  // Which half of the sign-in screen is showing. Kept in state rather than the
  // URL: it is a choice of method, not a place — a shared /login link should
  // always open on the options.
  const [step, setStep] = useState<LoginStep>('CHOOSE');
  const navigate = useNavigate();
  const location = useLocation();
  const [loginMutation, { loading, error }] = useMutation<any>(LOGIN);
  const { start: startSession, starting } = useStartSession();

  const finishLogin = async (token: string, user: any) => {
    await startSession(token);
    const params = new URLSearchParams(location.search);
    const stateFrom = (location.state as { from?: RedirectLocation } | null)?.from;
    const redirect =
      getSafeRedirectPath(params.get('redirect')) ||
      getSafeRedirectPath(stateFrom ? redirectPathFromLocation(stateFrom) : '');
    navigate(postAuthPath(user?.onboarding_survey_completed !== false, redirect), { replace: true });
  };

  // Continue with OTP shares the same landing: a correct code hands its token
  // to the same finishLogin every other method spends.
  const otp = useOtpLogin(finishLogin);
  // Google and Apple: one door, the same consent step and signup invite.
  const social = useSocialLogin(finishLogin);

  const handleSubmit = async (values: LoginSubmitValues) => {
    try {
      /*
        Only the chosen channel travels. Sending a blank email alongside a
        phone number makes the server's per-channel validator argue with a
        box nobody filled in — the same reason recoveryLookup exists.
      */
      const input =
        values.channel === 'PHONE'
          ? {
              channel: 'PHONE' as const,
              phone_extension: values.phoneExtension.trim(),
              phone_number: values.phoneNumber.trim(),
              password: values.password,
            }
          : {
              channel: 'EMAIL' as const,
              email: values.email.trim().toLowerCase(),
              password: values.password,
            };
      const res = await loginMutation({ variables: { input } });
      const token = res.data?.login?.token;
      if (token) await finishLogin(token, res.data?.login?.user);
    } catch (e) {
      throw new Error(parseApiError(e));
    }
  };

  return (
    <AuthBackground>
      <LoginCard
        otp={otp}
        step={step}
        onStep={setStep}
        loading={loading || starting}
        errorMessage={error ? parseApiError(error) : null}
        onSubmit={handleSubmit}
        socialLoading={social.busy || starting}
        socialError={social.error}
        onSocialCredential={(credential) => {
          social.start(credential).catch(() => undefined);
        }}
        onSocialError={social.setError}
      />

      <GoogleLinkConsentDialog
        open={!!social.consent}
        provider={social.consent?.credential.provider ?? 'GOOGLE'}
        email={social.consent?.email ?? ''}
        busy={social.linking}
        error={social.consentError}
        onAllow={() => {
          social.allowLink().catch(() => undefined);
        }}
        onDeny={social.denyLink}
      />

      <GoogleSignupInviteDialog
        open={!!social.invite}
        provider={social.invite?.provider ?? 'GOOGLE'}
        email={social.invite?.email ?? ''}
        onAccept={social.acceptInvite}
        onDismiss={social.dismissInvite}
      />
    </AuthBackground>
  );
}
