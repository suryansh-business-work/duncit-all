import { createPortalRuntime, resolvePortalGraphqlUrl } from '@duncit/shell';
import { appConfig } from './config/app-config';

/** The API this console talks to — also where Google sends a mailbox grant back. */
export const graphqlUrl = resolvePortalGraphqlUrl(import.meta.env);

/** The Apollo client, session, chrome and login page, wired to this console. */
export const runtime = createPortalRuntime(appConfig, graphqlUrl);
