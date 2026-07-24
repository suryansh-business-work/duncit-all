import type { EnvCategory } from './envEntry.model';

/**
 * A config field for a category. `secret` fields are rendered as masked inputs
 * (eye-toggle on the client) but their values ARE returned so they can be
 * reviewed/edited in the Tech portal. `hint` shows the expected key format.
 */
export interface EnvFieldDef {
  name: string;
  label: string;
  secret?: boolean;
  number?: boolean;
  bool?: boolean;
  hint?: string;
  phone?: boolean;
}

/** Field layout per category. Keys match the stored `config`. */
export const CATEGORY_FIELDS: Record<EnvCategory, EnvFieldDef[]> = {
  EMAIL: [
    { name: 'host', label: 'SMTP Host', hint: 'e.g. smtp.gmail.com' },
    { name: 'port', label: 'Port', number: true, hint: '465 (SSL) or 587 (TLS)' },
    { name: 'user', label: 'Username', hint: 'Full mailbox address' },
    { name: 'password', label: 'Password', secret: true, hint: 'SMTP password or app password' },
    { name: 'secure', label: 'Use TLS', bool: true },
    { name: 'from_address', label: 'From Address', hint: 'no-reply@yourdomain.com' },
    { name: 'from_name', label: 'From Name' },
    { name: 'reply_to', label: 'Reply-To' },
  ],
  IMAGEKIT: [
    { name: 'public_key', label: 'Public Key', hint: 'public_xxxxxxxxxxxxxxxx' },
    { name: 'private_key', label: 'Private Key', secret: true, hint: 'private_xxxxxxxxxxxxxxxx' },
    { name: 'url_endpoint', label: 'URL Endpoint', hint: 'https://ik.imagekit.io/your_id' },
  ],
  PEXELS: [{ name: 'api_key', label: 'API Key', secret: true, hint: '56-char alphanumeric key' }],
  GOOGLE_OAUTH: [
    { name: 'client_id', label: 'OAuth Client ID', hint: 'xxxxxx.apps.googleusercontent.com' },
    { name: 'client_secret', label: 'OAuth Client Secret', secret: true, hint: 'GOCSPX-xxxxxxxxxxxxxxxx' },
  ],
  GOOGLE_MAPS: [{ name: 'maps_api_key', label: 'Maps API Key', secret: true, hint: 'AIzaSy... (39 chars)' }],
  TWILIO: [
    { name: 'account_sid', label: 'Account SID', hint: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
    { name: 'auth_token', label: 'Auth Token', secret: true, hint: '32-char hex token' },
    { name: 'phone_number', label: 'Phone Number', phone: true, hint: 'E.164, e.g. +14155552671 — caller ID for outbound calls' },
    { name: 'agent_phone_number', label: 'Agent Phone Number', phone: true, hint: 'E.164 — agent leg dialled for "Call Through Portal"' },
  ],
  OPENAI: [
    { name: 'base_url', label: 'Base URL (optional)', hint: 'https://api.openai.com/v1' },
    { name: 'model', label: 'Model (default gpt-4o-mini)', hint: 'e.g. gpt-4o-mini' },
    { name: 'api_key', label: 'API Key', secret: true, hint: 'sk-proj-... or sk-...' },
  ],
  GEMINI: [
    { name: 'model', label: 'Model (default gemini-1.5-flash)', hint: 'e.g. gemini-1.5-flash' },
    { name: 'api_key', label: 'API Key', secret: true, hint: 'AIzaSy... (39 chars)' },
  ],
  SERVAM: [
    { name: 'api_key', label: 'API Key', secret: true, hint: 'Sarvam subscription key (sk_...)' },
    { name: 'base_url', label: 'Base URL (optional)', hint: 'https://api.sarvam.ai' },
    { name: 'tts_model', label: 'TTS Model (default bulbul:v2)', hint: 'e.g. bulbul:v2' },
    { name: 'default_voice', label: 'Default Voice', hint: 'e.g. anushka, manisha, vidya, arya, abhilash, karun, hitesh' },
  ],
  RAZORPAY: [
    { name: 'key_id', label: 'Key ID', hint: 'rzp_live_xxxxxxxx or rzp_test_xxxxxxxx (public)' },
    { name: 'key_secret', label: 'Key Secret', secret: true, hint: 'Razorpay API key secret' },
    {
      name: 'webhook_secret',
      label: 'Webhook Secret (optional)',
      secret: true,
      hint: 'Used to verify Razorpay webhooks',
    },
  ],
  SHIPROCKET: [
    { name: 'email', label: 'Account Email', hint: 'ShipRocket API user email' },
    { name: 'password', label: 'Account Password', secret: true, hint: 'ShipRocket API user password' },
    {
      name: 'pickup_location',
      label: 'Default Pickup Location Nickname',
      hint: 'Must match a warehouse configured in ShipRocket (Settings → Pickup Addresses)',
    },
    { name: 'channel_id', label: 'Channel ID (optional)', number: true, hint: 'ShipRocket channel id, if any' },
    { name: 'webhook_secret', label: 'Webhook x-api-key (optional)', secret: true, hint: 'Verifies inbound ShipRocket webhooks' },
    { name: 'token_ttl_hours', label: 'Token TTL hours (optional)', number: true, hint: 'Auth token cache lifetime; default 240 (~10 days)' },
  ],
  SLACK: [
    { name: 'bot_token', label: 'Bot User OAuth Token', secret: true, hint: 'xoxb-… (Slack app → OAuth & Permissions)' },
    { name: 'signing_secret', label: 'Signing Secret (optional)', secret: true, hint: 'Verifies inbound Slack events/webhooks' },
    { name: 'default_channel', label: 'Default Channel (optional)', hint: 'Channel ID (e.g. C0123ABCD) messages default to' },
  ],
};

/** Where an operator obtains each category's credentials (shown in the Add dialog). */
export const CATEGORY_DOCS: Record<EnvCategory, string> = {
  EMAIL: 'https://support.google.com/a/answer/176600',
  IMAGEKIT: 'https://imagekit.io/dashboard/developer/api-keys',
  PEXELS: 'https://www.pexels.com/api/',
  GOOGLE_OAUTH: 'https://console.cloud.google.com/apis/credentials',
  GOOGLE_MAPS: 'https://console.cloud.google.com/google/maps-apis/credentials',
  TWILIO: 'https://console.twilio.com/',
  OPENAI: 'https://platform.openai.com/api-keys',
  GEMINI: 'https://aistudio.google.com/app/apikey',
  SERVAM: 'https://dashboard.sarvam.ai/admin',
  RAZORPAY: 'https://dashboard.razorpay.com/app/keys',
  SHIPROCKET: 'https://app.shiprocket.in/api-user',
  SLACK: 'https://api.slack.com/apps',
};

const secretSet = new Set<string>();
for (const fields of Object.values(CATEGORY_FIELDS)) {
  for (const f of fields) if (f.secret) secretSet.add(f.name);
}
/** Union of all secret field names across categories. */
export const SECRET_FIELDS: string[] = Array.from(secretSet);

/**
 * Maps a legacy server env key (used by upload/twilio/vobiz/servam/url-configs)
 * to the category + config field it now resolves from. Anything not listed
 * falls through to process.env unchanged.
 */
export const ENV_KEY_MAP: Record<string, { category: EnvCategory; field: string }> = {
  IMAGEKIT_PUBLIC_KEY: { category: 'IMAGEKIT', field: 'public_key' },
  IMAGEKIT_PRIVATE_KEY: { category: 'IMAGEKIT', field: 'private_key' },
  IMAGEKIT_URL_ENDPOINT: { category: 'IMAGEKIT', field: 'url_endpoint' },
  PEXELS_API_KEY: { category: 'PEXELS', field: 'api_key' },
  SMTP_HOST: { category: 'EMAIL', field: 'host' },
  SMTP_PORT: { category: 'EMAIL', field: 'port' },
  SMTP_USER: { category: 'EMAIL', field: 'user' },
  SMTP_PASS: { category: 'EMAIL', field: 'password' },
  SMTP_FROM: { category: 'EMAIL', field: 'from_address' },
  GOOGLE_CLIENT_ID: { category: 'GOOGLE_OAUTH', field: 'client_id' },
  GOOGLE_CLIENT_SECRET: { category: 'GOOGLE_OAUTH', field: 'client_secret' },
  GOOGLE_MAP_API: { category: 'GOOGLE_MAPS', field: 'maps_api_key' },
  TWILIO_ACCOUNT_SID: { category: 'TWILIO', field: 'account_sid' },
  TWILIO_AUTH_TOKEN: { category: 'TWILIO', field: 'auth_token' },
  TWILIO_PHONE_NUMBER: { category: 'TWILIO', field: 'phone_number' },
  TWILIO_AGENT_PHONE_NUMBER: { category: 'TWILIO', field: 'agent_phone_number' },
  OPENAI_API_KEY: { category: 'OPENAI', field: 'api_key' },
  OPENAI_BASE_URL: { category: 'OPENAI', field: 'base_url' },
  OPENAI_MODEL: { category: 'OPENAI', field: 'model' },
  SERVAM_AI_API_KEY: { category: 'SERVAM', field: 'api_key' },
  SERVAM_AI_BASE_URL: { category: 'SERVAM', field: 'base_url' },
  SERVAM_AI_TTS_MODEL: { category: 'SERVAM', field: 'tts_model' },
  SERVAM_AI_VOICE: { category: 'SERVAM', field: 'default_voice' },
  RAZORPAY_KEY_ID: { category: 'RAZORPAY', field: 'key_id' },
  RAZORPAY_KEY_SECRET: { category: 'RAZORPAY', field: 'key_secret' },
  RAZORPAY_WEBHOOK_SECRET: { category: 'RAZORPAY', field: 'webhook_secret' },
  SHIPROCKET_EMAIL: { category: 'SHIPROCKET', field: 'email' },
  SHIPROCKET_PASSWORD: { category: 'SHIPROCKET', field: 'password' },
  SHIPROCKET_PICKUP_LOCATION: { category: 'SHIPROCKET', field: 'pickup_location' },
  SHIPROCKET_CHANNEL_ID: { category: 'SHIPROCKET', field: 'channel_id' },
  SHIPROCKET_WEBHOOK_SECRET: { category: 'SHIPROCKET', field: 'webhook_secret' },
  SHIPROCKET_TOKEN_TTL_HOURS: { category: 'SHIPROCKET', field: 'token_ttl_hours' },
  SLACK_BOT_TOKEN: { category: 'SLACK', field: 'bot_token' },
  SLACK_SIGNING_SECRET: { category: 'SLACK', field: 'signing_secret' },
  SLACK_DEFAULT_CHANNEL: { category: 'SLACK', field: 'default_channel' },
};

export function maskSecret(value: string) {
  if (!value) return '';
  if (value.length <= 6) return '••••••';
  return `${value.slice(0, 3)}••••••${value.slice(-3)}`;
}
