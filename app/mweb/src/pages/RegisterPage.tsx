import { useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Alert, Divider, Stack, Typography } from '@mui/material';
import AuthBackground from '../components/AuthBackground';
import AuthLogo from '../components/AuthLogo';
import AuthModeToggle from '../components/AuthModeToggle';
import AuthScreenFrame from '../components/AuthScreenFrame';
import LegalLinks from '../components/LegalLinks';
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { RegisterForm, type RegisterFormValues } from '../forms/register';
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
  const [registerMutation, { loading, error }] = useMutation(REGISTER);
  const [signupGoogle, { loading: gLoading }] = useMutation(SIGNUP_GOOGLE);
  const [gError, setGError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const navigate = useNavigate();
  const whatsappStepEnabled = useFeatureFlag('whatsapp_signup_otp', true);
  const nextRoute = whatsappStepEnabled ? '/signup-whatsapp' : '/signup-survey';

  const handleRegister = async (values: RegisterFormValues) => {
    setRegisterError(null);
    try {
      const { first_name, last_name } = splitName(values.name);
      const res = await registerMutation({
        variables: {
          input: {
            first_name,
            last_name,
            email: values.email,
            password: values.password,
            dob: new Date(values.dob).toISOString(),
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

  // Token-only Google signup: no extra form — straight to the survey.
  const handleGoogle = async (idToken: string) => {
    setGError(null);
    try {
      const res = await signupGoogle({ variables: { input: { id_token: idToken } } });
      const token = res.data?.signupWithGoogle?.token;
      if (token) {
        localStorage.setItem('token', token);
        navigate('/signup-survey');
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
            <Typography variant="h4" fontWeight={900} textAlign="center" color="text.primary">
              Join the crew
            </Typography>
            <Typography variant="body2" textAlign="center" color="text.secondary">
              Start where you are and discover pods nearby.
            </Typography>
          </Stack>

          <GoogleSignInButton onCredential={handleGoogle} loading={gLoading} text="signup_with" />
          {gError && (
            <Alert severity="error" sx={{ width: '100%' }}>
              {gError}
            </Alert>
          )}
          <Divider>OR EMAIL</Divider>

          <RegisterForm
            loading={loading}
            errorMessage={registerError ?? (error ? parseApiError(error) : null)}
            onSubmit={handleRegister}
          />
          <LegalLinks prefix="By creating an account," />
        </Stack>
      </AuthScreenFrame>
    </AuthBackground>
  );
}
