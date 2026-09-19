import 'dotenv/config';

/**
 * Everything the Lite server reads from its process environment, with the
 * defaults a local run needs. Service credentials (SMTP, ImageKit, Google) are
 * NOT here: they live in the console's Environment page and are read from the
 * Lite database at call time, exactly as the main server reads its own.
 */
const read = (name: string, fallback = ''): string => {
  const value = (process.env[name] ?? '').trim();
  return value === '' ? fallback : value;
};

const withoutTrailingSlashes = (url: string): string => url.replace(/\/+$/, '');

export const env = {
  nodeEnv: read('NODE_ENV', 'development'),
  port: Number.parseInt(read('PORT', '2040'), 10),
  /** Its OWN database. The default names it apart from every main-stack database. */
  mongoUri: read('LITE_MONGO_URI', 'mongodb://127.0.0.1:27017/duncit-lite'),
  mongoDbName: read('LITE_MONGO_DB_NAME'),
  jwtSecret: read('LITE_JWT_SECRET', 'lite-dev-secret'),
  /** The web app's public address — links in emails, ICS files, canonical URLs. */
  siteUrl: withoutTrailingSlashes(read('LITE_SITE_URL', 'http://localhost:2041')),
  portalUrl: withoutTrailingSlashes(read('LITE_PORTAL_URL', 'http://portal.localhost:2041')),
  /** Comma-separated addresses that sign in as admins on a fresh database. */
  adminEmails: read('LITE_ADMIN_EMAILS')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
  /** The main Duncit API a "Sign in with Duncit" code is proved against. */
  duncitGraphqlUrl: read('DUNCIT_GRAPHQL_URL', 'https://server.duncit.com/graphql'),
  duncitAppUrl: withoutTrailingSlashes(read('DUNCIT_APP_URL', 'https://mweb.duncit.com')),
  /** Where the built SPA pages live, relative to the server bundle. */
  distDir: read('LITE_DIST_DIR'),
  /** The code every stubbed sign-in accepts while no mailbox is configured. */
  otpTestCode: read('LITE_OTP_TEST_CODE', '123456'),
  appEnv: read('APP_ENV', read('NODE_ENV', 'development')),
} as const;

export const isProduction = env.nodeEnv === 'production';
