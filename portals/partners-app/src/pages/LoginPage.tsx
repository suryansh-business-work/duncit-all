import { Alert, Button } from '@mui/material';
import { PortalLoginPage, type PortalLoginAppConfig } from '@duncit/shell';
import { appConfig } from '../config/app-config';
import { accessDeniedMessage, hasAppAccess, setToken } from '../lib/session';
import { urlConfigs } from '../config/url-configs';

const PARTNERS_LOGIN_IMAGE =
  (import.meta.env.VITE_LOGIN_IMAGE as string | undefined) ||
  'https://images.pexels.com/photos/4963388/pexels-photo-4963388.jpeg';

const PARTNER_EXTRA_FIELDS = ['onboarding_survey_completed'] as const;

const partnersLoginConfig: PortalLoginAppConfig = {
  key: appConfig.key,
  name: 'Partners',
  fullName: 'Duncit Partners',
  tagline: 'Onboard, manage and grow your hosts and venues.',
  promoTitle: 'Grow together',
  promoText: 'Onboard and manage your hosts and venues from one console.',
  loginImage: PARTNERS_LOGIN_IMAGE,
};

export default function LoginPage() {
  return (
    <PortalLoginPage
      appConfig={partnersLoginConfig}
      session={{ setToken, hasAppAccess, accessDeniedMessage }}
      mutationName="PartnerLogin"
      extraUserFields={PARTNER_EXTRA_FIELDS}
      skipAccessGate
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
