/**
 * The live e2e run, as every surface's suite talks to it.
 *
 * A run lives one account's whole life on staging — signup, sign in, password
 * recovery, profile, password change, deletion — once on mWeb, once on the
 * native app and once through the Partners portal. The three suites are
 * separate Cypress projects, so what they must agree on lives here: the server
 * calls that read the account's held one-time codes, the header that keeps the
 * run's sign-ins inside the rate limit, and the password and address the
 * account holds at each point of its life.
 */

/** Added to every request the app under test sends (value from `E2E_TRAFFIC_KEY_QUERY`). */
export const E2E_TRAFFIC_HEADER = 'x-duncit-e2e';

/** Which flow issued a held code. */
export type E2eCodePurpose =
  | 'WHATSAPP_SIGNUP'
  | 'LOGIN'
  | 'PASSWORD_RESET'
  | 'WHATSAPP_CHANGE'
  | 'EMAIL_VERIFICATION'
  | 'PASSWORD_CHANGE'
  | 'ACCOUNT_DELETION'
  | 'PORTAL_LOGIN';

/** The newest code held for the run account; `null` until one is issued. */
export const E2E_ONE_TIME_CODE_QUERY = `query E2eOneTimeCode($purpose: String!, $email: String, $phone: String) {
  e2eOneTimeCode(purpose: $purpose, email: $email, phone: $phone) { code purpose issued_at expires_at }
}`;

/** The `x-duncit-e2e` value for a run, signed by the server under test. */
export const E2E_TRAFFIC_KEY_QUERY = `query E2eTrafficKey($stamp: String!) {
  e2eTrafficKey(stamp: $stamp)
}`;

/** Remove the run account outright, so the address and phone are free again. */
export const E2E_PURGE_MUTATION = `mutation PurgeE2eRunData($input: PurgeE2eRunDataInput!) {
  purgeE2eRunData(input: $input) { accounts_deleted }
}`;

/** Where the account is in its life, which decides the password it holds. */
export type RunPasswordStage = 'SIGNUP' | 'RECOVERED' | 'CHANGED';

const PASSWORD_SUFFIX: Readonly<Record<RunPasswordStage, string>> = {
  SIGNUP: '',
  RECOVERED: '-R1',
  CHANGED: '-C2',
};

/**
 * The account's password at a stage. Derived rather than remembered, because
 * each spec file is its own process: the recovery spec sets `RECOVERED`, and
 * every later spec knows it without being told.
 */
export const runPassword = (base: string, stage: RunPasswordStage): string =>
  `${base}${PASSWORD_SUFFIX[stage]}`;

/**
 * Another address that still belongs to the run: `riya+070920260300@duncit.com`
 * with `new` becomes `riya+070920260300-new@duncit.com`. The server treats it as
 * the run account, holds its codes and purges it with the rest.
 */
export function runAddress(email: string, suffix: string): string {
  const at = email.lastIndexOf('@');
  return `${email.slice(0, at)}-${suffix}${email.slice(at)}`;
}
