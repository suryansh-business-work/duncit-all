import { useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button } from '@mui/material';
import { LoginScreen, type LoginFormValues, type LoginScreenConfig } from '@duncit/user-context';
import { useColorMode, useBranding } from '@duncit/shell';
import { appConfig } from '../config/app-config';
import { setToken } from '../lib/session';
import { parseApiError } from '../utils/parseApiError';
import { getSafeRedirectPath, redirectPathFromLocation, type RedirectLocation } from '../utils/redirect';
import { urlConfigs } from '../config/url-configs';

const PARTNERS_LOGIN_IMAGE =
  (import.meta.env.VITE_LOGIN_IMAGE as string | undefined) ||
  'https://images.pexels.com/photos/4963388/pexels-photo-4963388.jpeg';

const LOGIN = gql`
  mutation PartnerLogin($input: LoginInput!) {
    login(input: $input) {
      token
      user { user_id first_name last_name email roles onboarding_survey_completed }
    }
  }
`;

export default function LoginPage() {
  const [loginMutation, { loading }] = useMutation(LOGIN);
  const [error, setError] = useState<string | null>(null);
  const { mode, toggle } = useColorMode();
  const { logoUrl } = useBranding();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectAfterLogin = () => {
    const params = new URLSearchParams(location.search);
    const stateFrom = (location.state as { from?: RedirectLocation } | null)?.from;
    return getSafeRedirectPath(params.get('redirect')) || getSafeRedirectPath(stateFrom ? redirectPathFromLocation(stateFrom) : '') || '/';
  };

  const handleLogin = async (values: LoginFormValues) => {
    setError(null);
    try {
      const res = await loginMutation({ variables: { input: { ...values, portal_key: appConfig.key } } });
      const token = res.data?.login?.token;
      if (!token) throw new Error('Login failed. Please try again.');
      setToken(token);
      navigate(redirectAfterLogin(), { replace: true });
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const config: LoginScreenConfig = {
    brandName: 'Duncit Partners',
    portalName: 'Partners',
    tagline: 'Onboard, manage and grow your hosts and venues.',
    promoTitle: 'Grow together',
    promoText: 'Onboard and manage your hosts and venues from one console.',
    bgImage: PARTNERS_LOGIN_IMAGE,
    logoUrl,
  };

  return (
    <LoginScreen
      config={config}
      mode={mode}
      onToggleMode={toggle}
      loading={loading}
      errorMessage={error}
      onSubmit={handleLogin}
      footerSlot={
        <>
          <Alert severity="info" sx={{ mt: 1 }}>
            New users can create an account from mWeb, then return to this partner console.
          </Alert>
          <Button fullWidth href={`${urlConfigs.mwebUrl}/register`} sx={{ mt: 1.5 }} variant="outlined">
            Create Duncit account
          </Button>
        </>
      }
    />
  );
}
