import { createPortalRuntime } from '@duncit/shell';
import { appConfig } from './config/app-config';
import { urlConfigs } from './config/url-configs';

/** The Apollo client, session and login page, wired to this console. */
export const runtime = createPortalRuntime(appConfig, urlConfigs.graphqlUrl);
