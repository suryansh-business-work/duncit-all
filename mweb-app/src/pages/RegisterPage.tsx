import { useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Alert, Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import AuthLogo from '../components/AuthLogo';
import GoogleSignInButton from '../components/GoogleSignInButton';
import RegisterForm, { type RegisterFormValues } from '../forms/register.form';
import GoogleSignupPhoneForm, {
  type GoogleSignupPhoneValues,
} from '../forms/google-signup-phone.form';

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

export default function RegisterPage() {
  const [registerMutation, { loading, error }] = useMutation(REGISTER);
  const [signupGoogle, { loading: gLoading }] = useMutation(SIGNUP_GOOGLE);
  const [gError, setGError] = useState<string | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRegister = async (values: RegisterFormValues) => {
    const res = await registerMutation({
      variables: {
        input: { ...values, dob: new Date(values.dob).toISOString() },
      },
    });
    const token = res.data?.register?.token;
    if (token) {
      localStorage.setItem('token', token);
      navigate('/signup-survey');
    }
  };

  const handleGoogle = async (idToken: string) => {
    setGError(null);
    setGoogleToken(idToken);
  };

  const submitGoogleSignup = async (values: GoogleSignupPhoneValues) => {
    try {
      const res = await signupGoogle({
        variables: {
          input: {
            ...values,
            id_token: googleToken,
            dob: new Date(values.dob).toISOString(),
          },
        },
      });
      const token = res.data?.signupWithGoogle?.token;
      if (token) {
        localStorage.setItem('token', token);
        navigate('/signup-survey');
      }
    } catch (e: any) {
      setGError(e.message);
    }
  };

  return (
    <Card
      elevation={2}
      sx={{
        borderRadius: '4px',
        '& .MuiOutlinedInput-root': { borderRadius: '4px' },
        '& .MuiButton-root': { borderRadius: '4px' },
      }}
    >
      <CardContent>
        <AuthLogo tagline="Create your account to join pods near you." />
        <Typography variant="h5" textAlign="center" gutterBottom>
          Create Account
        </Typography>

        <Stack spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
          <GoogleSignInButton onCredential={handleGoogle} loading={gLoading} text="signup_with" />
          {gError && (
            <Alert severity="error" sx={{ width: '100%' }}>
              {gError}
            </Alert>
          )}
        </Stack>
        <Divider sx={{ my: 2 }}>or sign up with email</Divider>

        <RegisterForm
          loading={loading}
          errorMessage={error?.message ?? null}
          onSubmit={handleRegister}
        />
      </CardContent>
      <GoogleSignupPhoneForm
        open={!!googleToken}
        loading={gLoading}
        error={gError}
        onClose={() => {
          setGoogleToken(null);
          setGError(null);
        }}
        onSubmit={submitGoogleSignup}
      />
    </Card>
  );
}
