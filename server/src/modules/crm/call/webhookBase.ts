import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { getUrlConfigs } from '@config/url-configs';

/**
 * Public base URL Twilio uses to reach our voice webhooks — targeted per
 * environment automatically: localhost in dev, the production host in prod.
 * An optional `TWILIO_WEBHOOK_BASE_URL` override wins (set it to your tunnel,
 * e.g. ngrok, when testing real Twilio callbacks against a local server, since
 * Twilio can't reach `localhost` directly).
 */
export async function getWebhookBaseUrl(): Promise<string> {
  const override = (await getRuntimeEnvValue('TWILIO_WEBHOOK_BASE_URL')).trim();
  if (override) return override.replace(/\/$/, '');
  if (process.env.NODE_ENV !== 'production') {
    return `http://localhost:${process.env.PORT || 2001}`;
  }
  const { serverUrl } = await getUrlConfigs();
  return (serverUrl || 'https://server.duncit.com').replace(/\/$/, '');
}
