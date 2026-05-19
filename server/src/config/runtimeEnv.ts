import { EnvironmentVariableModel } from '../modules/settings/settings.model';

export type RuntimeEnvSource = 'DATABASE' | 'ENV' | 'EMPTY';

export interface RuntimeEnvDefinition {
  group: string;
  app: string;
  key: string;
  label: string;
  is_secret: boolean;
}

export const RUNTIME_ENV_DEFINITIONS: RuntimeEnvDefinition[] = [
  { group: 'Environment', app: 'server', key: 'IS_DEVELOPMENT', label: 'Development Mode', is_secret: false },
  { group: 'URLs', app: 'server', key: 'SERVER_URL', label: 'Server URL', is_secret: false },
  { group: 'URLs', app: 'server', key: 'GRAPHQL_URL', label: 'GraphQL URL', is_secret: false },
  { group: 'URLs', app: 'server', key: 'ADMIN_URL', label: 'Admin URL', is_secret: false },
  { group: 'URLs', app: 'server', key: 'MWEB_BASE_URL', label: 'mWeb Base URL', is_secret: false },
  { group: 'URLs', app: 'server', key: 'PUBLIC_APP_URL', label: 'Public App URL', is_secret: false },
  { group: 'URLs', app: 'server', key: 'PUBLIC_SITE_URL', label: 'Public Website URL', is_secret: false },
  { group: 'Email', app: 'server', key: 'SUPPORT_EMAIL', label: 'Support Email', is_secret: false },
  { group: 'ImageKit', app: 'server', key: 'IMAGEKIT_PUBLIC_KEY', label: 'Public Key', is_secret: false },
  { group: 'ImageKit', app: 'server', key: 'IMAGEKIT_PRIVATE_KEY', label: 'Private Key', is_secret: true },
  { group: 'ImageKit', app: 'server', key: 'IMAGEKIT_URL_ENDPOINT', label: 'URL Endpoint', is_secret: false },
  { group: 'Pexels', app: 'server', key: 'PEXELS_API_KEY', label: 'API Key', is_secret: true },
  { group: 'SMTP', app: 'server', key: 'SMTP_HOST', label: 'Host', is_secret: false },
  { group: 'SMTP', app: 'server', key: 'SMTP_PORT', label: 'Port', is_secret: false },
  { group: 'SMTP', app: 'server', key: 'SMTP_USER', label: 'User', is_secret: false },
  { group: 'SMTP', app: 'server', key: 'SMTP_PASS', label: 'Password', is_secret: true },
  { group: 'SMTP', app: 'server', key: 'SMTP_FROM', label: 'From Address', is_secret: false },
  { group: 'Google', app: 'server', key: 'GOOGLE_CLIENT_ID', label: 'OAuth Client ID', is_secret: false },
  { group: 'Google', app: 'server', key: 'GOOGLE_CLIENT_SECRET', label: 'OAuth Client Secret', is_secret: true },
  { group: 'Google', app: 'server', key: 'GOOGLE_MAP_API', label: 'Maps API Key', is_secret: true },
  { group: 'Twilio', app: 'server', key: 'TWILIO_ACCOUNT_SID', label: 'Account SID', is_secret: false },
  { group: 'Twilio', app: 'server', key: 'TWILIO_AUTH_TOKEN', label: 'Auth Token', is_secret: true },
  { group: 'Twilio', app: 'server', key: 'TWILIO_PHONE_NUMBER', label: 'Phone Number', is_secret: false },
  { group: 'Twilio', app: 'server', key: 'TWILIO_AGENT_PHONE_NUMBER', label: 'Admin Call Receiver', is_secret: false },
  { group: 'Twilio', app: 'server', key: 'TWILIO_WEBHOOK_BASE_URL', label: 'Webhook Base URL', is_secret: false },
  { group: 'Twilio', app: 'server', key: 'TWILIO_CALL_RECORDING_ENABLED', label: 'Call Recording Enabled', is_secret: false },
  { group: 'AI', app: 'server', key: 'OPENAI_API_KEY', label: 'OpenAI API Key', is_secret: true },
  { group: 'Admin', app: 'admin', key: 'VITE_IS_DEVELOPMENT', label: 'Development Mode', is_secret: false },
  { group: 'Admin', app: 'admin', key: 'VITE_GRAPHQL_URL', label: 'GraphQL URL', is_secret: false },
  { group: 'Admin', app: 'admin', key: 'VITE_MWEB_URL', label: 'mWeb URL', is_secret: false },
  { group: 'Admin', app: 'admin', key: 'VITE_GOOGLE_CLIENT_ID', label: 'Google Client ID', is_secret: false },
  { group: 'Admin', app: 'admin', key: 'VITE_GOOGLE_MAP_API', label: 'Google Maps API Key', is_secret: true },
  { group: 'mWeb', app: 'mweb', key: 'VITE_IS_DEVELOPMENT', label: 'Development Mode', is_secret: false },
  { group: 'mWeb', app: 'mweb', key: 'VITE_GRAPHQL_URL', label: 'GraphQL URL', is_secret: false },
  { group: 'mWeb', app: 'mweb', key: 'VITE_MWEB_URL', label: 'mWeb URL', is_secret: false },
  { group: 'mWeb', app: 'mweb', key: 'VITE_GOOGLE_CLIENT_ID', label: 'Google Client ID', is_secret: false },
  { group: 'mWeb', app: 'mweb', key: 'VITE_GOOGLE_MAP_API', label: 'Google Maps API Key', is_secret: true },
  { group: 'Website', app: 'website', key: 'PUBLIC_IS_DEVELOPMENT', label: 'Development Mode', is_secret: false },
  { group: 'Website', app: 'website', key: 'PUBLIC_GRAPHQL_URL', label: 'Public GraphQL URL', is_secret: false },
  { group: 'Website', app: 'website', key: 'PUBLIC_SITE_URL', label: 'Public Website URL', is_secret: false },
  { group: 'Partners', app: 'partners-app', key: 'VITE_PARTNERS_APP_URL', label: 'Partners App URL', is_secret: false },
  { group: 'Partners', app: 'partners-website', key: 'PUBLIC_PARTNERS_SITE_URL', label: 'Partners Website URL', is_secret: false },
  { group: 'Partners', app: 'partners-website', key: 'PUBLIC_PARTNERS_APP_URL', label: 'Partners App URL', is_secret: false },
];

const definitionByKey = new Map(RUNTIME_ENV_DEFINITIONS.map((definition) => [definition.key, definition]));

export function getRuntimeEnvDefinition(key: string) {
  return definitionByKey.get(key.toUpperCase());
}

export function maskSecret(value: string) {
  if (!value) return '';
  if (value.length <= 6) return '••••••';
  return `${value.slice(0, 3)}••••••${value.slice(-3)}`;
}

export async function getRuntimeEnvValue(key: string) {
  const normalized = key.toUpperCase();
  const override = await EnvironmentVariableModel.findOne({ key: normalized }).lean();
  if (override?.value !== undefined && override.value !== '') return override.value;
  return process.env[normalized] ?? '';
}

export async function getRuntimeEnvRows() {
  const overrides = await EnvironmentVariableModel.find().lean();
  const overrideByKey = new Map(overrides.map((override) => [override.key, override]));

  return RUNTIME_ENV_DEFINITIONS.map((definition) => {
    const override = overrideByKey.get(definition.key);
    const fallback = process.env[definition.key] ?? '';
    const hasOverride = !!override && override.value !== '';
    const effective = hasOverride ? override!.value : fallback;
    const source: RuntimeEnvSource = hasOverride ? 'DATABASE' : fallback ? 'ENV' : 'EMPTY';
    const displayValue = definition.is_secret ? maskSecret(effective) : effective;

    return {
      ...definition,
      value: displayValue,
      has_override: hasOverride,
      has_fallback: !!fallback,
      source,
      updated_at: override?.updated_at?.toISOString?.() ?? null,
    };
  });
}