import { EnvironmentVariableModel } from '@modules/platform/settings/settings.model';

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
  { group: 'AI', app: 'server', key: 'SERVAM_AI_API_KEY', label: 'Servam AI API Key', is_secret: true },
  { group: 'AI', app: 'server', key: 'SERVAM_AI_BASE_URL', label: 'Servam AI Base URL', is_secret: false },
  { group: 'Vobiz', app: 'server', key: 'VOBIZ_BASE_URL', label: 'API Base URL', is_secret: false },
  { group: 'Vobiz', app: 'server', key: 'VOBIZ_API_KEY', label: 'API Key', is_secret: true },
  { group: 'Vobiz', app: 'server', key: 'VOBIZ_SENDER_EMAIL', label: 'Sender Email', is_secret: false },
  { group: 'Vobiz', app: 'server', key: 'VOBIZ_SENDER_NAME', label: 'Sender Name', is_secret: false },
  { group: 'Vobiz', app: 'server', key: 'VOBIZ_CALLER_ID', label: 'Caller ID / From Number', is_secret: false },
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
  { group: 'Ads', app: 'ads', key: 'VITE_GRAPHQL_URL', label: 'GraphQL URL', is_secret: false },
  { group: 'Ads', app: 'ads', key: 'VITE_REQUIRED_ROLES', label: 'Allowed Roles', is_secret: false },
  { group: 'CRM', app: 'crm', key: 'VITE_GRAPHQL_URL', label: 'GraphQL URL', is_secret: false },
  { group: 'CRM', app: 'crm', key: 'VITE_REQUIRED_ROLES', label: 'Allowed Roles', is_secret: false },
  { group: 'Finance', app: 'finance', key: 'VITE_GRAPHQL_URL', label: 'GraphQL URL', is_secret: false },
  { group: 'Finance', app: 'finance', key: 'VITE_REQUIRED_ROLES', label: 'Allowed Roles', is_secret: false },
  { group: 'Tech', app: 'tech', key: 'VITE_GRAPHQL_URL', label: 'GraphQL URL', is_secret: false },
  { group: 'Tech', app: 'tech', key: 'VITE_REQUIRED_ROLES', label: 'Allowed Roles', is_secret: false },
  { group: 'Support', app: 'support', key: 'VITE_GRAPHQL_URL', label: 'GraphQL URL', is_secret: false },
  { group: 'Support', app: 'support', key: 'VITE_REQUIRED_ROLES', label: 'Allowed Roles', is_secret: false },
  { group: 'Website App', app: 'website-app', key: 'VITE_GRAPHQL_URL', label: 'GraphQL URL', is_secret: false },
  { group: 'Website App', app: 'website-app', key: 'VITE_REQUIRED_ROLES', label: 'Allowed Roles', is_secret: false },
  { group: 'Legal', app: 'legal', key: 'VITE_GRAPHQL_URL', label: 'GraphQL URL', is_secret: false },
  { group: 'Legal', app: 'legal', key: 'VITE_REQUIRED_ROLES', label: 'Allowed Roles', is_secret: false },
  { group: 'AI Console', app: 'ai', key: 'VITE_GRAPHQL_URL', label: 'GraphQL URL', is_secret: false },
  { group: 'AI Console', app: 'ai', key: 'VITE_REQUIRED_ROLES', label: 'Allowed Roles', is_secret: false },
  { group: 'Products', app: 'products', key: 'VITE_GRAPHQL_URL', label: 'GraphQL URL', is_secret: false },
  { group: 'Products', app: 'products', key: 'VITE_REQUIRED_ROLES', label: 'Allowed Roles', is_secret: false },
  { group: 'Marketing', app: 'marketing', key: 'VITE_GRAPHQL_URL', label: 'GraphQL URL', is_secret: false },
  { group: 'Marketing', app: 'marketing', key: 'VITE_REQUIRED_ROLES', label: 'Allowed Roles', is_secret: false },
];

/** The scope a server-side consumer reads its own config from. */
export const SERVER_SCOPE = 'server';

const definitionByScopeKey = new Map(
  RUNTIME_ENV_DEFINITIONS.map((definition) => [`${definition.app}:${definition.key}`, definition])
);

/** Friendly labels for each portal/app scope shown in the Tech portal table. */
const SCOPE_LABELS: Record<string, string> = {
  server: 'Server (API)',
  admin: 'Admin',
  mweb: 'mWeb',
  website: 'Website',
  'partners-app': 'Partners App',
  'partners-website': 'Partners Website',
  ads: 'Ads',
  crm: 'CRM',
  finance: 'Finance',
  tech: 'Tech',
  support: 'Support',
  'website-app': 'Website Console',
  legal: 'Legal',
  ai: 'AI',
  products: 'Products',
  marketing: 'Marketing',
};

export interface RuntimeEnvScope {
  key: string;
  label: string;
}

/** Distinct portal/app scopes (in definition order) for the scope picker. */
export const RUNTIME_ENV_SCOPES: RuntimeEnvScope[] = Array.from(
  new Set(RUNTIME_ENV_DEFINITIONS.map((definition) => definition.app))
).map((key) => ({ key, label: SCOPE_LABELS[key] ?? key }));

export function getRuntimeEnvDefinition(scope: string, key: string) {
  return definitionByScopeKey.get(`${scope}:${key.toUpperCase()}`);
}

export function maskSecret(value: string) {
  if (!value) return '';
  if (value.length <= 6) return '••••••';
  return `${value.slice(0, 3)}••••••${value.slice(-3)}`;
}

export async function getRuntimeEnvValue(key: string, scope: string = SERVER_SCOPE) {
  const normalized = key.toUpperCase();
  const override = await EnvironmentVariableModel.findOne({ scope, key: normalized }).lean();
  if (override?.value !== undefined && override.value !== '') return override.value;
  // Process env is only the fallback for the server's own scope.
  if (scope === SERVER_SCOPE) return process.env[normalized] ?? '';
  return '';
}

export async function getRuntimeEnvRows(scope: string = SERVER_SCOPE) {
  const overrides = await EnvironmentVariableModel.find({ scope }).lean();
  const overrideByKey = new Map(overrides.map((override) => [override.key, override]));

  return RUNTIME_ENV_DEFINITIONS.filter((definition) => definition.app === scope).map((definition) => {
    const override = overrideByKey.get(definition.key);
    const fallback = scope === SERVER_SCOPE ? process.env[definition.key] ?? '' : '';
    const hasOverride = !!override && override.value !== '';
    const effective = hasOverride ? override!.value : fallback;
    const source: RuntimeEnvSource = hasOverride ? 'DATABASE' : fallback ? 'ENV' : 'EMPTY';
    const displayValue = definition.is_secret ? maskSecret(effective) : effective;

    return {
      ...definition,
      scope,
      value: displayValue,
      has_override: hasOverride,
      has_fallback: !!fallback,
      source,
      updated_at: override?.updated_at?.toISOString?.() ?? null,
    };
  });
}

/** Count of DB overrides per scope, for the portal listing table. */
export async function getRuntimeEnvScopeSummary() {
  const overrides = await EnvironmentVariableModel.find({ value: { $ne: '' } }, { scope: 1 }).lean();
  const counts = new Map<string, number>();
  for (const override of overrides) {
    const scope = (override as any).scope ?? SERVER_SCOPE;
    counts.set(scope, (counts.get(scope) ?? 0) + 1);
  }
  return RUNTIME_ENV_SCOPES.map((scope) => ({
    key: scope.key,
    label: scope.label,
    total: RUNTIME_ENV_DEFINITIONS.filter((definition) => definition.app === scope.key).length,
    overrides: counts.get(scope.key) ?? 0,
  }));
}