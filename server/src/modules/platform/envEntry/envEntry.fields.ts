import type { EnvCategory } from './envEntry.model';

/** A config field for a category. `secret` fields are masked on read. */
export interface EnvFieldDef {
  name: string;
  label: string;
  secret?: boolean;
  number?: boolean;
  bool?: boolean;
}

/** Field layout per category. Keys match the stored `config`. */
export const CATEGORY_FIELDS: Record<EnvCategory, EnvFieldDef[]> = {
  EMAIL: [
    { name: 'host', label: 'SMTP Host' },
    { name: 'port', label: 'Port', number: true },
    { name: 'user', label: 'Username' },
    { name: 'password', label: 'Password', secret: true },
    { name: 'secure', label: 'Use TLS', bool: true },
    { name: 'from_address', label: 'From Address' },
    { name: 'from_name', label: 'From Name' },
    { name: 'reply_to', label: 'Reply-To' },
  ],
  IMAGEKIT: [
    { name: 'public_key', label: 'Public Key' },
    { name: 'private_key', label: 'Private Key', secret: true },
    { name: 'url_endpoint', label: 'URL Endpoint' },
  ],
  PEXELS: [{ name: 'api_key', label: 'API Key', secret: true }],
  GOOGLE: [
    { name: 'client_id', label: 'OAuth Client ID' },
    { name: 'client_secret', label: 'OAuth Client Secret', secret: true },
    { name: 'maps_api_key', label: 'Maps API Key', secret: true },
  ],
  TWILIO: [
    { name: 'account_sid', label: 'Account SID' },
    { name: 'auth_token', label: 'Auth Token', secret: true },
    { name: 'phone_number', label: 'Phone Number' },
  ],
  AI: [
    { name: 'provider', label: 'Provider (e.g. openai)' },
    { name: 'base_url', label: 'Base URL (optional)' },
    { name: 'model', label: 'Default Model (optional)' },
    { name: 'api_key', label: 'API Key', secret: true },
  ],
  VOBIZ: [
    { name: 'base_url', label: 'API Base URL' },
    { name: 'api_key', label: 'API Key', secret: true },
    { name: 'sender_email', label: 'Sender Email' },
    { name: 'sender_name', label: 'Sender Name' },
    { name: 'caller_id', label: 'Caller ID / From Number' },
  ],
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
  GOOGLE_CLIENT_ID: { category: 'GOOGLE', field: 'client_id' },
  GOOGLE_CLIENT_SECRET: { category: 'GOOGLE', field: 'client_secret' },
  GOOGLE_MAP_API: { category: 'GOOGLE', field: 'maps_api_key' },
  TWILIO_ACCOUNT_SID: { category: 'TWILIO', field: 'account_sid' },
  TWILIO_AUTH_TOKEN: { category: 'TWILIO', field: 'auth_token' },
  TWILIO_PHONE_NUMBER: { category: 'TWILIO', field: 'phone_number' },
  OPENAI_API_KEY: { category: 'AI', field: 'api_key' },
  SERVAM_AI_API_KEY: { category: 'AI', field: 'api_key' },
  SERVAM_AI_BASE_URL: { category: 'AI', field: 'base_url' },
  VOBIZ_BASE_URL: { category: 'VOBIZ', field: 'base_url' },
  VOBIZ_API_KEY: { category: 'VOBIZ', field: 'api_key' },
  VOBIZ_SENDER_EMAIL: { category: 'VOBIZ', field: 'sender_email' },
  VOBIZ_SENDER_NAME: { category: 'VOBIZ', field: 'sender_name' },
  VOBIZ_CALLER_ID: { category: 'VOBIZ', field: 'caller_id' },
};

export function maskSecret(value: string) {
  if (!value) return '';
  if (value.length <= 6) return '••••••';
  return `${value.slice(0, 3)}••••••${value.slice(-3)}`;
}
