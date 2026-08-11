import { useState } from 'react';
import { readReferralCode } from '@duncit/utils';
import { gql, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Divider, Stack, Typography } from '@mui/material';
import { auth } from '@duncit/auth-tokens';
import AuthBackground from '../components/AuthBackground';
import AuthLogo from '../components/AuthLogo';
import AuthModeToggle from '../components/AuthModeToggle';
import AuthScreenFrame from '../components/AuthScreenFrame';
import LegalLinks from '../components/LegalLinks';
import { useTranslation } from '../i18n/useTranslation';
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { RegisterForm, registerDefaults, type RegisterFormValues } from '../forms/register';
import { parseApiError } from '../utils/parseApiError';

const REGISTER = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token
      user {
        user_id
        first_name
        last_name
        email
        roles
        onboarding_survey_completed
      }
    }
  }
`;

const SIGNUP_GOOGLE = gql`
  mutation SignupWithGoogle($input: GoogleSignupInput!) {
    signupWithGoogle(input: $input) {
      token
      user {
        user_id
        email
        onboarding_survey_completed
      }
    }
  }
`;

/** Split a single "Name" into first/last; surname may be empty. */
function splitName(name: string): { first_name: string; last_name?: string } {
  const [first, ...rest] = name.trim().split(/\s+/).filter(Boolean);
  return { first_name: first ?? '', last_name: rest.length ? rest.join(' ') : undefined };
}


export default function RegisterPage() {
  const { t } = useTranslation();
  const [registerMutation, { loading, error }] = useMutation(REGISTER);
  const [signupGoogle, { loading: gLoading }] = useMutation(SIGNUP_GOOGLE);
  const [gError, setGError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
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

  const whatsappStepEnabled = useFeatureFlag('whatsapp_signup_otp', true);
  const nextRoute = whatsappStepEnabled ? '/signup-whatsapp' : '/signup-survey';

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
            password: values.password,
            dob: new Date(values.dob).toISOString(),
            ...(code ? { referral_code: code } : {}),
          },
        },
      });
      const token = res.data?.register?.token;
      if (token) {
        localStorage.setItem('token', token);
        navigate(nextRoute);
      }
    } catch (e) {
      setRegisterError(parseApiError(e));
    }
  };

  /*
    Google hands back a finished account with no form attached, so its referral
    question has to be asked afterwards — on its own step, before the survey.
    A link-borne code rides along so somebody who followed a friend's link and
    then chose Google still arrives with the box filled in.
  */
  const handleGoogle = async (idToken: string) => {
    setGError(null);
    try {
      const res = await signupGoogle({ variables: { input: { id_token: idToken } } });
      const token = res.data?.signupWithGoogle?.token;
      if (token) {
        localStorage.setItem('token', token);
        navigate('/signup-referral', { state: { code: linkedCode } });
      }
    } catch (e) {
      setGError(parseApiError(e));
    }
  };

  return (
    <AuthBackground>
      <AuthModeToggle />
      <AuthScreenFrame>
        <Stack spacing={1.45}>
          <Stack alignItems="center" spacing={1.1} sx={{ pt: 0.5 }}>
            <AuthLogo />
            <Typography variant="h4" fontWeight={700} textAlign="center" color="text.primary">
              {t('mweb.signup.title')}{' '}
              <Box component="span" sx={{ color: auth.accent }}>
                {t('mweb.signup.titleAccent')}
              </Box>
            </Typography>
            <Typography variant="body2" textAlign="center" color="text.secondary">
              {t('mweb.signup.subtitle')}
            </Typography>
          </Stack>

          <GoogleSignInButton onCredential={handleGoogle} loading={gLoading} text="signup_with" />
          {gError && (
            <Alert severity="error" sx={{ width: '100%' }}>
              {gError}
            </Alert>
          )}
          <Divider>{t('mweb.auth.orEmail')}</Divider>

          <RegisterForm
            loading={loading}
            initialValues={initialValues}
            errorMessage={registerError ?? (error ? parseApiError(error) : null)}
            onSubmit={handleRegister}
          />
          <LegalLinks prefix={t('mweb.auth.legalSignUp')} />
        </Stack>
      </AuthScreenFrame>
    </AuthBackground>
  );
}
