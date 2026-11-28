import type { SocialAppCredentials } from '../social.types';
import { socialJson, withQuery } from './http';
import { FACEBOOK_SERVICE, graphPost, graphUrl } from './meta';

/**
 * The app's own webhook registration at Meta (`/{app-id}/subscriptions`, asked
 * with the app token `app-id|app-secret`): which URL Meta calls for Instagram
 * and Page events, and for which fields. This is the dashboard's Webhooks
 * setting; without it Meta sends nothing, however the Pages are subscribed.
 *
 * Only the fields the Inbox reads are asked for — Meta refuses a whole
 * registration over one field name it does not know for that object.
 */
export const WEBHOOK_OBJECTS = ['instagram', 'page'] as const;
export type WebhookObject = (typeof WEBHOOK_OBJECTS)[number];

export const APP_WEBHOOK_FIELDS: Readonly<Record<WebhookObject, readonly string[]>> = {
  instagram: ['messages', 'messaging_postbacks', 'message_reactions', 'comments', 'live_comments'],
  page: ['messages', 'messaging_postbacks', 'message_reactions', 'feed'],
};

export interface AppSubscription {
  object: string;
  callback_url: string;
  active: boolean;
  fields: string[];
}

interface RawSubscription {
  object?: string;
  callback_url?: string;
  active?: boolean;
  fields?: ({ name?: string } | string)[];
}

type AppKeys = Pick<SocialAppCredentials, 'clientId' | 'clientSecret' | 'version'>;
const appToken = (app: AppKeys) => `${app.clientId}|${app.clientSecret}`;

/** What Meta has registered for this app, per object. */
export async function appSubscriptions(app: AppKeys): Promise<AppSubscription[]> {
  const res = await socialJson<{ data?: RawSubscription[] }>(
    FACEBOOK_SERVICE,
    withQuery(graphUrl(app.version, `/${app.clientId}/subscriptions`), { access_token: appToken(app) })
  );
  return (res.data ?? []).map((row) => ({
    object: row.object ?? '',
    callback_url: row.callback_url ?? '',
    active: row.active === true,
    fields: (row.fields ?? []).map((field) => (typeof field === 'string' ? field : (field.name ?? ''))).filter(Boolean),
  }));
}

/**
 * Point Meta at our callback for one object. Meta calls the callback's GET at
 * once with `verify_token`, so this succeeds only when the server answers it.
 */
export async function registerAppSubscription(app: AppKeys, object: WebhookObject, callbackUrl: string, verifyToken: string): Promise<void> {
  await graphPost(app.version, `/${app.clientId}/subscriptions`, appToken(app), {
    object,
    callback_url: callbackUrl,
    fields: APP_WEBHOOK_FIELDS[object].join(','),
    verify_token: verifyToken,
    include_values: 'true',
  });
}
