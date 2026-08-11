import { getRuntimeEnvValue } from './runtimeEnv';

const developmentUrls = {
  serverUrl: 'http://localhost:2001',
  graphqlUrl: 'http://localhost:2001/graphql',
  adminUrl: 'http://localhost:2002',
  mwebUrl: 'http://localhost:2003',
  partnersUrl: 'http://localhost:2005',
  websiteUrl: 'http://localhost:2000',
  techUrl: 'http://localhost:2009',
  supportEmail: 'support@duncit.local',
  fromEmail: 'Duncit <noreply@duncit.local>',
};

const productionUrls = {
  serverUrl: 'https://server.duncit.com',
  graphqlUrl: 'https://server.duncit.com/graphql',
  adminUrl: 'https://admin.duncit.com',
  mwebUrl: 'https://mweb.duncit.com',
  partnersUrl: 'https://partners-app.duncit.com',
  websiteUrl: 'https://duncit.com',
  techUrl: 'https://tech.duncit.com',
  supportEmail: 'support@duncit.com',
  fromEmail: 'Duncit <noreply@duncit.com>',
};

const isTrue = (value: string) => value.toLowerCase() === 'true';

async function configValue(key: string, fallback: string) {
  return (await getRuntimeEnvValue(key)) || fallback;
}

export async function getUrlConfigs() {
  const isDevelopment = isTrue(await getRuntimeEnvValue('IS_DEVELOPMENT'));
  const defaults = isDevelopment ? developmentUrls : productionUrls;
  const mwebUrl =
    (await getRuntimeEnvValue('MWEB_BASE_URL')) ||
    (await getRuntimeEnvValue('PUBLIC_APP_URL')) ||
    defaults.mwebUrl;

  return {
    isDevelopment,
    serverUrl: await configValue('SERVER_URL', defaults.serverUrl),
    graphqlUrl: await configValue('GRAPHQL_URL', defaults.graphqlUrl),
    adminUrl: await configValue('ADMIN_URL', defaults.adminUrl),
    mwebUrl,
    appUrl: mwebUrl,
    partnersUrl: await configValue('PARTNERS_APP_URL', defaults.partnersUrl),
    websiteUrl: await configValue('PUBLIC_SITE_URL', defaults.websiteUrl),
    // Where the Gmail OAuth callback returns the operator to. A fixed,
    // server-side value on purpose: taking the return address from the request
    // would make this an open redirect wearing an OAuth callback's clothes.
    techUrl: await configValue('TECH_URL', defaults.techUrl),
    supportEmail: await configValue('SUPPORT_EMAIL', defaults.supportEmail),
    mail: {
      host: await getRuntimeEnvValue('SMTP_HOST'),
      port: Number((await getRuntimeEnvValue('SMTP_PORT')) || 587),
      user: await getRuntimeEnvValue('SMTP_USER'),
      pass: await getRuntimeEnvValue('SMTP_PASS'),
      from: await configValue('SMTP_FROM', defaults.fromEmail),
    },
  };
}

/**
 * Canonical deep link to a single booking — mWeb's `/booking/:bookingId` route,
 * which resolves the booking server-side (ownership enforced there) and forwards
 * to that pod's detail page. Android App Links hand the very same URL to the
 * installed app, so email CTAs work identically on web and native (rule 27).
 */
export function bookingLinkUrl(appUrl: string, bookingId: string) {
  return `${appUrl.replace(/\/+$/, '')}/booking/${bookingId}`;
}

export async function getMailConfigs() {
  return (await getUrlConfigs()).mail;
}
