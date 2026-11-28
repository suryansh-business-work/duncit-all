import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { userActor, withRun } from '../runs/marketingRun.service';
import { APP_WEBHOOK_FIELDS, WEBHOOK_OBJECTS, appSubscriptions, registerAppSubscription, type AppSubscription, type WebhookObject } from './providers/meta.webhooks';
import { metaWebhookApps, socialWebhookUrl, type MetaWebhookApp } from './social.credentials';

/**
 * Social Accounts › Webhooks: for every Meta app, whether Meta will actually
 * call us — the registration Meta holds for Instagram and Page events, set
 * side by side with the URL and fields we expect — and the button that
 * registers it. A Page subscribed to an app whose webhook was never set up
 * gets nothing delivered, and nothing anywhere said so; this is where it shows.
 *
 * The Instagram and Facebook entries are often one Meta app, so apps are
 * grouped by App ID. No key leaves the server: an app is its entry, name and
 * App ID, with whether its secret and verify token are set.
 */
export interface WebhookObjectStatus {
  object: WebhookObject;
  registered: boolean;
  active: boolean;
  callback_url: string;
  /** Meta calls our current webhook URL (a trailing slash aside). */
  callback_matches: boolean;
  fields: string[];
  missing_fields: string[];
}

export interface WebhookAppStatus {
  entry_id: string;
  name: string;
  app_id: string;
  secret_set: boolean;
  verify_token_set: boolean;
  callback_url: string;
  objects: WebhookObjectStatus[];
  /** Meta's refusal when its registration could not be read; '' when it was. */
  error: string;
}

const sameUrl = (a: string, b: string) => a.replace(/\/+$/, '') === b.replace(/\/+$/, '');
const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error)).slice(0, 500);

function objectStatus(object: WebhookObject, rows: AppSubscription[], callbackUrl: string): WebhookObjectStatus {
  const row = rows.find((one) => one.object === object);
  const fields = row?.fields ?? [];
  return {
    object,
    registered: Boolean(row),
    active: row?.active ?? false,
    callback_url: row?.callback_url ?? '',
    callback_matches: Boolean(row && sameUrl(row.callback_url, callbackUrl)),
    fields,
    missing_fields: APP_WEBHOOK_FIELDS[object].filter((field) => !fields.includes(field)),
  };
}

/** One entry per Meta app: the first that has both keys and a verify token, else the first. */
function byApp(apps: MetaWebhookApp[]): MetaWebhookApp[] {
  const groups = new Map<string, MetaWebhookApp[]>();
  for (const app of apps.filter((one) => one.app_id)) groups.set(app.app_id, [...(groups.get(app.app_id) ?? []), app]);
  return [...groups.values()].map((group) => group.find((app) => app.app_secret && app.verify_token) ?? group[0]);
}

const keysOf = (app: MetaWebhookApp) => ({ clientId: app.app_id, clientSecret: app.app_secret, version: app.version });

async function statusOf(app: MetaWebhookApp, callbackUrl: string): Promise<WebhookAppStatus> {
  const base = {
    entry_id: app.entry_id,
    name: app.name,
    app_id: app.app_id,
    secret_set: Boolean(app.app_secret),
    verify_token_set: Boolean(app.verify_token),
    callback_url: callbackUrl,
  };
  if (!app.app_secret) return { ...base, objects: WEBHOOK_OBJECTS.map((object) => objectStatus(object, [], callbackUrl)), error: '' };
  try {
    const rows = await appSubscriptions(keysOf(app));
    return { ...base, objects: WEBHOOK_OBJECTS.map((object) => objectStatus(object, rows, callbackUrl)), error: '' };
  } catch (error) {
    return { ...base, objects: WEBHOOK_OBJECTS.map((object) => objectStatus(object, [], callbackUrl)), error: messageOf(error) };
  }
}

export async function webhookSetup(): Promise<WebhookAppStatus[]> {
  const [apps, callbackUrl] = await Promise.all([metaWebhookApps(), socialWebhookUrl()]);
  return Promise.all(byApp(apps).map((app) => statusOf(app, callbackUrl)));
}

function refuse(code: string, message: string): never {
  throw new GraphQLError(message, { extensions: { code } });
}

/**
 * Register our webhook URL for Instagram and Page events on one app's entry.
 * Meta checks the URL there and then (it calls our GET with the verify token),
 * so a success means delivery works end to end. Kept as a run in Activity:
 * who registered which app, and what Meta answered.
 */
export async function registerWebhook(entryId: string, user: { id: string; email?: string | null }): Promise<WebhookAppStatus> {
  const app = (await metaWebhookApps()).find((one) => one.entry_id === entryId);
  if (!app) refuse('NOT_FOUND', 'This app is not an active Instagram or Facebook entry under Settings › Integrations.');
  const missing = [!app.app_id && 'App ID', !app.app_secret && 'App secret', !app.verify_token && 'webhook verify token'].filter(Boolean);
  if (missing.length > 0) refuse('NOT_CONFIGURED', `Add the ${missing.join(', ')} to this app under Settings › Integrations first.`);
  const callbackUrl = await socialWebhookUrl();
  try {
    await withRun(
      { workflow: 'SOCIAL_HEALTH', name: `Register the webhook for ${app.name || app.app_id}`, actor: await userActor(user) },
      (run) =>
        run.step('register', `Webhook · ${callbackUrl}`, async () => {
          for (const object of WEBHOOK_OBJECTS) await registerAppSubscription(keysOf(app), object, callbackUrl, app.verify_token);
          return WEBHOOK_OBJECTS.length;
        })
    );
  } catch (error) {
    logs.server.warn('social-webhook', 'register', { error, entry_id: entryId, user_id: user.id });
    refuse('SEND_FAILED', `Meta did not register the webhook — ${messageOf(error)}`);
  }
  logs.server.info('social-webhook', 'register', { entry_id: entryId, user_id: user.id, msg: 'webhook registered with Meta' });
  return statusOf(app, callbackUrl);
}
