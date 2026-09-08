import { PortalLoginPage } from '@duncit/shell';
import { appConfig } from '../config/app-config';
import { accessDeniedMessage, hasAppAccess, setToken } from '../lib/session';

export default function LoginPage() {
  return (
    <PortalLoginPage
      appConfig={appConfig}
      session={{ setToken, hasAppAccess, accessDeniedMessage }}
    />
  );
}
