import { useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import { useLocation, useNavigate } from 'react-router-dom';
import { Divider, Stack } from '@mui/material';
import { LoginScreen, type LoginFormValues, type LoginScreenConfig } from '@duncit/user-context';
import { useColorMode } from '../ColorModeContext';
import { useBranding } from '../lib/useBranding';
import SendAdminCredentials from '../components/SendAdminCredentials';
import {
  getSafeRedirectPath,
  redirectPathFromLocation,
  type RedirectLocation,
} from '../utils/redirect';

const ADMIN_LOGIN_IMAGE =
  (import.meta.env.VITE_LOGIN_IMAGE as string | undefined) ||
  'https://images.pexels.com/photos/36713016/pexels-photo-36713016.jpeg';

const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'SUPPORT_USER', 'FINANCE_USER'];

const LOGIN = gql`
  mutation AdminLogin($input: LoginInput!) {
    login(input: $input) {
      token
      user { user_id first_name last_name email roles }
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
    return (
      getSafeRedirectPath(params.get('redirect')) ||
      getSafeRedirectPath(stateFrom ? redirectPathFromLocation(stateFrom) : '') ||
      '/hub'
    );
  };

  const handleLogin = async (values: LoginFormValues) => {
    setError(null);
    try {
      const res = await loginMutation({ variables: { input: values } });
      const data = res.data?.login;
      const roles: string[] = data?.user?.roles ?? [];
      if (!roles.some((r) => ADMIN_ROLES.includes(r))) {
        throw new Error('You do not have admin access.');
      }
      localStorage.setItem('admin_token', data.token);
      navigate(redirectAfterLogin(), { replace: true });
    } catch (err: any) {
      setError(err?.message ?? 'Login failed. Please try again.');
    }
  };

  const config: LoginScreenConfig = {
    brandName: 'Duncit Admin',
    portalName: 'Admin',
    tagline: 'Operate the Duncit platform — one place.',
    promoTitle: 'One unified portal',
    promoText: 'Every team, every metric — one place. Sign in and get moving.',
    bgImage: ADMIN_LOGIN_IMAGE,
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
        <Stack spacing={1.5}>
          <Divider>or</Divider>
          <SendAdminCredentials />
        </Stack>
      }
    />
  );
}
