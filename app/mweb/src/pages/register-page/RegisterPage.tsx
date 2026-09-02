import { useState } from 'react';
import { readReferralCode, type SignupStep } from '@duncit/utils';
import { birthYearToDob } from '@duncit/datetime';
import { useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Alert, Box, Divider, Stack, Typography } from '@mui/material';
import { auth } from '@duncit/auth-tokens';
import AuthBackground from '../../components/AuthBackground';
import AuthLogo from '../../components/AuthLogo';
import AuthModeToggle from '../../components/AuthModeToggle';
import AuthScreenFrame from '../../components/AuthScreenFrame';
import LegalLinks from '../../components/LegalLinks';
import { useTranslation } from '../../i18n/useTranslation';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useGoogleSignup } from '../../hooks/useGoogleSignup';
import GoogleSignInButton from '../../components/GoogleSignInButton';
import {
  ACCEPTANCE_SURFACE,
  GoogleSignupPolicyGate,
  useSignupPolicies,
} from '../../components/policy-acceptance';
import { RegisterForm, registerDefaults, type RegisterFormValues } from '../../forms/register';
import { parseApiError } from '../../utils/parseApiError';
import { REGISTER } from './queries';
import SignupStepperRail from './SignupStepperRail';
import VerifyWhatsappStep from './VerifyWhatsappStep';

/** Split a single "Name" into first/last; surname may be empty. */
function splitName(name: string): { first_name: string; last_name?: string } {
  const [first, ...rest] = name.trim().split(/\s+/).filter(Boolean);
  return { first_name: first ?? '', last_name: rest.length ? rest.join(' ') : undefined };
}

/**
 * Join Duncit — four steps.
 *
 * The first three collect the account and are the form's; the fourth verifies
 * the WhatsApp number and is this page's, because `requestWhatsAppOtp`
 * authenticates its caller and so can only run once `register` has returned a
 * token. That token is stored the moment the account exists, which is what
 * makes the last step authorised without the person having signed in.
 *
 * RN twin: app/mobile-app/src/screens/SignupScreen.
 */
export default function RegisterPage() {
  const { t } = useTranslation();
  const [registerMutation, { loading, error }] = useMutation<any>(REGISTER);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [step, setStep] = useState<SignupStep>('WHO');
  /** The number step two collected, kept for the code step four sends. */
  const [verifying, setVerifying] = useState<{ extension: string; number: string } | null>(null);
  const navigate = useNavigate();

  /*
    A shared referral link carries its code in the URL, and this page is where
    it lands — so it arrives as the form's initial value rather than as a
    separate mutation fired after the account exists. The code now travels WITH
    the signup, and the server checks it before creating anything: a code that
    has gone stale fails the form the sender's friend is still looking at,
    instead of silently costing them both their coins.
  */
  const linkedCode = readReferralCode(globalThis.location.search) ?? '';
  const initialValues = { ...registerDefaults, referralCode: linkedCode };

  /*
    Both signup doors are gated by the same policies, so the list is fetched
    once here and shared: the form reads it to build its validation rule, and
    the Google gate reads it to know when the credential can be spent.
  */
  const { policies, loading: policiesLoading, failed: policiesFailed } = useSignupPolicies();
  const google = useGoogleSignup(linkedCode);

  const whatsappStepEnabled = useFeatureFlag('whatsapp_signup_otp', true);

  const handleRegister = async (values: RegisterFormValues) => {
    setRegisterError(null);
    try {
      const { first_name, last_name } = splitName(values.name);
      const code = values.referralCode.trim().toUpperCase();
      const res = await registerMutation({
        variables: {
          input: {
            first_name,
            last_name,
            email: values.email,
            phone_number: values.phoneNumber,
            phone_extension: values.phoneExtension,
            password: values.password,
            // A birth YEAR is stored as its January 1 — see `birthYearToDob`
            // for why that is the reading the server agrees with.
            dob: new Date(birthYearToDob(values.dobYear)).toISOString(),
            ...(code ? { referral_code: code } : {}),
            accepted_policy_ids: values.acceptedPolicyIds,
            accepted_policy_surface: ACCEPTANCE_SURFACE,
          },
        },
      });
      const token = res.data?.register?.token;
      if (!token) return;
      /*
        Stored, but NOT navigated on: the last step's mutations read this token
        out of storage, and leaving the page now would skip the verification the
        person is halfway through.
      */
      localStorage.setItem('token', token);
      if (!whatsappStepEnabled) {
        navigate('/signup-survey');
        return;
      }
      setVerifying({ extension: values.phoneExtension, number: values.phoneNumber });
      setStep('VERIFY');
    } catch (e) {
      setRegisterError(parseApiError(e));
    }
  };

  const onVerifyStep = step === 'VERIFY' && verifying !== null;

  return (
    <AuthBackground>
      <AuthModeToggle />
      <AuthScreenFrame>
        <Stack spacing={1.45}>
          <Stack spacing={1.1} sx={{ alignItems: 'center', pt: 0.5 }}>
            <AuthLogo />
            <Typography
              variant="h4"
              sx={{ fontWeight: 700, textAlign: 'center', color: 'text.primary' }}
            >
              {t('mweb.signup.title')}{' '}
              <Box component="span" sx={{ color: auth.accent }}>
                {t('mweb.signup.titleAccent')}
              </Box>
            </Typography>
          </Stack>

          <SignupStepperRail step={step} />

          {onVerifyStep ? (
            <VerifyWhatsappStep
              extension={verifying.extension}
              number={verifying.number}
              onDone={() => navigate('/signup-survey')}
            />
          ) : (
            <>
              <GoogleSignInButton
                onCredential={google.start}
                loading={google.loading}
                text="signup_with"
              />
              <GoogleSignupPolicyGate
                credential={google.credential}
                policies={policies}
                loading={policiesLoading}
                failed={policiesFailed}
                onAccepted={google.accept}
                onCancelled={google.cancel}
              />
              {google.error && (
                <Alert severity="error" sx={{ width: '100%' }}>
                  {google.error}
                </Alert>
              )}
              <Divider>{t('mweb.auth.orEmail')}</Divider>

              <RegisterForm
                step={step}
                onStep={setStep}
                loading={loading}
                initialValues={initialValues}
                errorMessage={registerError ?? (error ? parseApiError(error) : null)}
                onSubmit={handleRegister}
              />
            </>
          )}
          <LegalLinks prefix={t('mweb.auth.legalSignUp')} />
        </Stack>
      </AuthScreenFrame>
    </AuthBackground>
  );
}
