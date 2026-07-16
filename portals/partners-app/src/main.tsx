import { mountPortal } from '@duncit/shell';
import { createSessionUserLoader } from '@duncit/user-context';
import { logs } from '@duncit/logs';
import { urlConfigs } from './config/url-configs';
import { appConfig } from './config/app-config';
import { apolloClient } from './apollo';
import { PARTNERS_ACCENT } from './theme';
import App from './App';
import 'react-datepicker/dist/react-datepicker.css';

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || '';

mountPortal({
  config: {
    key: appConfig.key,
    name: appConfig.name,
    tokenKey: appConfig.tokenKey,
    colorModeKey: appConfig.colorModeKey,
    accent: PARTNERS_ACCENT,
  },
  apolloClient,
  graphqlUrl: urlConfigs.graphqlUrl,
  googleClientId: GOOGLE_CLIENT_ID,
  logsPortal: logs.portal['partners-app'],
  loadUser: createSessionUserLoader(apolloClient, { operationName: 'PartnerSessionMe' }),
  userStorageKey: 'partner_user',
  children: <App />,
});
