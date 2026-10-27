import { createPortalRuntime, resolvePortalGraphqlUrl } from '@duncit/shell';
import { appConfig } from './config/app-config';

/** The API this console talks to. */
export const graphqlUrl = resolvePortalGraphqlUrl(import.meta.env);

/** The Apollo client, session and login page, wired to this console. */
export const runtime = createPortalRuntime(appConfig, graphqlUrl);
