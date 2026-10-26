import type { E2eStaffRole } from '@duncit/utils';
import { LOGIN_MUTATION } from './operations';
import { portalTokenKey, type StaffPortal } from './portals';
import type { RunAccount } from './run-account';
import { gqlRaw, type GqlBody } from './ui-staff';

/**
 * Shared steps for the Portal Shell specs under specs/shell/ — the chrome every
 * console mounts from @duncit/shell and @duncit/user-context: sign-in, the
 * session gates, the sidebar, the header, the taskbar, the apps drawer and the
 * profile page.
 *
 * Support (the base URL) is the representative console; a behaviour that is
 * about one console versus another (a role gate, state that follows the person
 * across consoles) also visits the console it is about. Every write here is to
 * the run account's OWN settings — its workspace, its profile, its two-factor,
 * its password — and each spec puts back what it changed in `after()`.
 */

/** The run password at the stage the staff project runs in. */
export const runPasswordNow = (account: RunAccount): string => account.password('CHANGED');

/** Every console CI serves: its `appConfig.fullName`, and a grantable role that opens it (none for two). */
export interface ConsoleUnderTest {
  portal: StaffPortal;
  fullName: string;
  role: E2eStaffRole | null;
}

/** From each portal's src/config/app-config.ts (`requiredRoles`, `fullName`). */
export const CONSOLES: readonly ConsoleUnderTest[] = [
  { portal: 'support', fullName: 'Duncit Support', role: 'SUPPORT_MANAGER' },
  { portal: 'legal', fullName: 'Duncit Legal', role: 'LEGAL_MANAGER' },
  { portal: 'pods', fullName: 'Duncit Pods', role: 'ALL_PODS_ACCESS' },
  { portal: 'admin', fullName: 'Duncit Admin', role: 'SUPPORT_USER' },
  { portal: 'finance', fullName: 'Duncit Finance', role: 'FINANCE_USER' },
  { portal: 'onboarding', fullName: 'Duncit Onboarding', role: 'ONBOARDING_MANAGER' },
  { portal: 'venues', fullName: 'Duncit Venues', role: 'ALL_VENUES_ACCESS' },
  { portal: 'hosts', fullName: 'Duncit Hosts', role: 'ALL_HOSTS_ACCESS' },
  { portal: 'clubs', fullName: 'Duncit Clubs', role: 'ALL_CLUBS_ACCESS' },
  { portal: 'club-admins', fullName: 'Duncit Club Admins', role: 'ALL_CLUB_ADMINS_ACCESS' },
  { portal: 'crm', fullName: 'Duncit CRM', role: 'CRM_MANAGER' },
  { portal: 'communications', fullName: 'Duncit Communications', role: 'COMMUNICATIONS_MANAGER' },
  { portal: 'logs', fullName: 'Duncit Logs', role: 'LOGS_MANAGER' },
  // PRODUCTS_MANAGER and ECOMM_STORE_MANAGER are never granted to a run account.
  { portal: 'products', fullName: 'Duncit Products', role: null },
  { portal: 'ecomm-portal', fullName: 'Duncit E-commerce', role: null },
];

/** The keys commands.ts keeps the session under — set directly when a sign-in is not `apiPortalLogin`. */
const TOKEN_ENV = '__liveToken';
const PORTAL_ENV = '__livePortal';

/** Keep a token minted outside `apiPortalLogin` (the two-factor step) for the next `visitPortal`. */
export function keepSession(portal: StaffPortal, token: string): void {
  Cypress.env(PORTAL_ENV, portal);
  Cypress.env(TOKEN_ENV, token);
}

/** Visit a page signed in, and wait for the shell chrome around it. */
export function openSignedIn(portal: StaffPortal, path: string): void {
  cy.visitPortal(portal, path);
  cy.byTestId('shell-user-menu-button').should('be.visible');
}

/**
 * The visible copy of an element. Below `md` the sidebar is a temporary drawer
 * kept mounted, so every nav id exists twice — once hidden.
 */
export const visibleTestId = (testId: string): Cypress.Chainable<JQuery<HTMLElement>> =>
  cy.get(`[data-testid="${testId}"]:visible`);

/** A visible sidebar leaf by its label. */
export const navLeaf = (label: string): Cypress.Chainable<JQuery<HTMLElement>> =>
  cy.contains('[data-testid="shell-nav-leaf"]:visible', label);

/** A visible sidebar group by its label. */
export const navGroup = (label: string): Cypress.Chainable<JQuery<HTMLElement>> =>
  cy.contains('[data-testid="shell-nav-group"]:visible', label);

/** The portal's stored token, as the page sees it. */
export const storedToken = (portal: StaffPortal): Cypress.Chainable<string | null> =>
  cy.window().its('localStorage').invoke('getItem', portalTokenKey(portal));

/** The text of an MUI field's helper line (RhfTextField puts the error there). */
export const fieldHelper = (testId: string): Cypress.Chainable<JQuery<HTMLElement>> =>
  cy.byTestId(testId).find('.MuiFormHelperText-root');

/** The token of a signed-in run account, for API calls the spec makes itself. */
export function apiToken(portal: StaffPortal, account: RunAccount): Cypress.Chainable<string> {
  return gqlRaw<{ login: { token: string } | null }>(
    portal,
    LOGIN_MUTATION,
    { input: { email: account.email, password: runPasswordNow(account), portal_key: portal } },
    null,
  ).then((body) => {
    const token = body.data?.login?.token;
    if (!token) throw new Error(`The run account could not sign in to ${portal}: ${body.errors?.[0]?.message ?? 'no token'}`);
    return cy.wrap(token, { log: false });
  });
}

/** POST as the run account and throw on any GraphQL error. */
export function asAccount<T>(
  portal: StaffPortal,
  token: string,
  query: string,
  variables: Record<string, unknown> = {},
): Cypress.Chainable<T> {
  return gqlRaw<T>(portal, query, variables, token).then((body: GqlBody<T>) => {
    if (body.errors?.length) throw new Error(`${/(?:query|mutation)\s+(\w+)/.exec(query)?.[1]} failed: ${body.errors[0].message}`);
    return cy.wrap(body.data as T, { log: false });
  });
}

// ------------------------------------------------------------ own settings

export const ME_BASICS = `query E2eShellMe {
  me { user_id first_name last_name bio profile_photo profile_visibility roles profile_links { label url } }
}`;

export interface MeBasics {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  bio: string | null;
  profile_photo: string | null;
  profile_visibility: 'PUBLIC' | 'PRIVATE' | null;
  roles: string[];
  profile_links: { label: string; url: string }[];
}

export const UPDATE_MY_PROFILE_API = `mutation E2eUpdateMyProfile($input: UpdateMyProfileInput!) {
  updateMyProfile(input: $input) { user_id }
}`;

/** Put the profile fields the Edit form writes back to what `me` answered. */
export function restoreProfile(portal: StaffPortal, token: string, me: MeBasics): void {
  asAccount(portal, token, UPDATE_MY_PROFILE_API, {
    input: {
      first_name: me.first_name ?? '',
      last_name: me.last_name ?? '',
      bio: me.bio ?? '',
      profile_photo: me.profile_photo || null,
      profile_links: me.profile_links.map(({ label, url }) => ({ label, url })),
    },
  });
}

export const SET_VISIBILITY_API = `mutation E2eSetProfileVisibility($visibility: ProfileVisibility!) {
  updateMyProfileVisibility(visibility: $visibility) { user_id profile_visibility }
}`;

export const WORKSPACE_STATE_API = `query E2eWorkspaceState {
  shellWorkspaceState { agent_edge agent_offset clock_zone clock_seconds minimised sidebar_collapsed }
}`;

export const SAVE_WORKSPACE_API = `mutation E2eSaveWorkspaceState($input: ShellWorkspaceStateInput!) {
  saveShellWorkspaceState(input: $input) { agent_edge agent_offset clock_zone clock_seconds minimised sidebar_collapsed }
}`;

export interface WorkspaceDto {
  agent_edge: string;
  agent_offset: number;
  clock_zone: string;
  clock_seconds: boolean;
  minimised: string[];
  sidebar_collapsed: boolean;
}

/** The run account's workspace, as the server holds it. */
export const readWorkspace = (portal: StaffPortal, token: string): Cypress.Chainable<WorkspaceDto> =>
  asAccount<{ shellWorkspaceState: WorkspaceDto }>(portal, token, WORKSPACE_STATE_API).then((d) =>
    cy.wrap(d.shellWorkspaceState, { log: false }),
  );

/** Write the workspace back exactly as it was read. */
export function restoreWorkspace(portal: StaffPortal, token: string, state: WorkspaceDto): void {
  asAccount(portal, token, SAVE_WORKSPACE_API, { input: { ...state } });
}

export const MAIL_PREFERENCES_API = `query E2eMailPreferences {
  myMailPreferences { email categories { category required enabled } }
}`;

export const SET_MAIL_PREFERENCE_API = `mutation E2eSetMailPreference($category: String!, $enabled: Boolean!) {
  setMyMailPreference(category: $category, enabled: $enabled) { email }
}`;

export const COMM_PREFERENCE_API = `query E2eCommPreference {
  myCommunicationPreference { channels { channel reachable otp_enabled otp_can_disable } }
}`;

export const SET_OTP_CHANNEL_API = `mutation E2eSetOtpChannel($channel: CommChannel!, $enabled: Boolean!) {
  setMyOtpChannel(channel: $channel, enabled: $enabled) { channels { channel otp_enabled } }
}`;

export const WHATSAPP_PREFERENCE_API = `query E2eWhatsappPreference {
  myWhatsappPreference { reachable categories { category required enabled } }
}`;

export const SET_WHATSAPP_PREFERENCE_API = `mutation E2eSetWhatsappPreference($category: String!, $enabled: Boolean!) {
  setMyWhatsappPreference(category: $category, enabled: $enabled) { reachable }
}`;

export const CONNECTED_ACCOUNTS_API = `query E2eConnectedAccounts {
  myConnectedAccounts { has_password two_factor_enabled last_login_at last_login_provider password_changed_at }
}`;

export const PORTAL_ACCESS_API = `query E2ePortalAccess {
  myPortalAccess { key name url has_access can_request request_status }
}`;

export interface PortalAccessRow {
  key: string;
  name: string;
  url: string;
  has_access: boolean;
  can_request: boolean;
  request_status: string | null;
}

export const PORTAL_FEATURES_API = `query E2ePortalFeatures($key: String!) {
  portalMode(key: $key) { mode chat_enabled apps_enabled }
}`;

export const ASK_BOTS_API = `query E2eAskBots { askBots { key is_available } }`;

export const AGENT_AVAILABILITY_API = `query E2eAgentAvailability { agentAvailability { is_available can_act } }`;

export const DASHBOARD_LAYOUT_API = `query E2eDashboardLayout($dashboard_id: ID!) {
  myDashboardLayout(dashboard_id: $dashboard_id) { dashboard_id items { widget_id x y w h } }
}`;

export const RESET_DASHBOARD_API = `mutation E2eResetDashboardLayout($dashboard_id: ID!) {
  resetDashboardLayout(dashboard_id: $dashboard_id)
}`;

export const PUBLIC_FLAGS_API = `query E2ePublicFlags { publicFeatureFlags { key enabled } }`;

export const PUBLIC_LOCALES_API = `query E2ePublicLocales { publicLocales { code } }`;

// ------------------------------------------------------------ password

export const REQUEST_PASSWORD_OTP_API = `mutation E2eRequestPasswordChangeOtp($input: RequestPasswordChangeInput!) {
  requestPasswordChangeOtp(input: $input) { ok }
}`;

export const CHANGE_PASSWORD_API = `mutation E2eChangePasswordWithOtp($input: ChangePasswordInput!) {
  changePasswordWithOtp(input: $input)
}`;

/** A password the account holds only inside the password spec. */
export const temporaryPassword = (account: RunAccount): string => `${runPasswordNow(account)}-SH`;

/**
 * If the account was left on the temporary password, set it back to the run
 * password with the same two server steps the dialog takes. A no-op when the
 * run password still signs in.
 */
export function restoreRunPassword(portal: StaffPortal, account: RunAccount): void {
  gqlRaw<{ login: { token: string } | null }>(
    portal,
    LOGIN_MUTATION,
    { input: { email: account.email, password: runPasswordNow(account), portal_key: portal } },
    null,
  ).then((body) => {
    if (body.data?.login?.token) return;
    gqlRaw<{ login: { token: string } | null }>(
      portal,
      LOGIN_MUTATION,
      { input: { email: account.email, password: temporaryPassword(account), portal_key: portal } },
      null,
    ).then((temp) => {
      const token = temp.data?.login?.token;
      if (!token) throw new Error('The run account signs in with neither the run password nor the temporary one.');
      cy.lastOtpIssuedAt('PASSWORD_CHANGE', { email: account.email }).then((before) => {
        asAccount(portal, token, REQUEST_PASSWORD_OTP_API, { input: { current_password: temporaryPassword(account) } });
        cy.readOtp('PASSWORD_CHANGE', { email: account.email }, before).then((otp) =>
          asAccount(portal, token, CHANGE_PASSWORD_API, { input: { otp, new_password: runPasswordNow(account) } }),
        );
      });
    });
  });
}

// ------------------------------------------------------------ two-factor

export const START_TWO_FACTOR_API = `mutation E2eStartTwoFactorSetup { startTwoFactorSetup { secret } }`;
export const ENABLE_TWO_FACTOR_API = `mutation E2eEnableTwoFactor($code: String!) { enableTwoFactor(code: $code) { recovery_codes } }`;
export const DISABLE_TWO_FACTOR_API = `mutation E2eDisableTwoFactor($code: String!) { disableTwoFactor(code: $code) { two_factor_enabled } }`;
export const COMPLETE_TWO_FACTOR_API = `mutation E2eCompleteTwoFactorLogin($input: TwoFactorLoginInput!) {
  completeTwoFactorLogin(input: $input) { token }
}`;

/** RFC 6238's 30-second step, as two-factor.totp.ts counts it. */
export const totpStepNow = (): number => Math.floor(Date.now() / 1000 / 30);

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(text: string): Uint8Array<ArrayBuffer> {
  const clean = text.replaceAll(/[\s=]/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    const index = BASE32.indexOf(char);
    if (index < 0) throw new Error('The two-factor secret is not base32');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Uint8Array.from(out);
}

/** HOTP (RFC 4226) over HMAC-SHA1 — six digits for one step, exactly what an authenticator app shows. */
async function hotp(secret: string, step: number): Promise<string> {
  const counter = new ArrayBuffer(8);
  new DataView(counter).setBigUint64(0, BigInt(step));
  const key = await globalThis.crypto.subtle.importKey('raw', base32Decode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, [
    'sign',
  ]);
  const mac = new Uint8Array(await globalThis.crypto.subtle.sign('HMAC', key, counter));
  const offset = mac[mac.length - 1] & 0x0f;
  const binary =
    ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return String(binary % 1_000_000).padStart(6, '0');
}

/** The authenticator code for `step` (the server accepts one step either side of now). */
export const totpCode = (secret: string, step: number): Cypress.Chainable<string> =>
  cy.wrap(hotp(secret, step), { log: false });

interface TwoFactorRefusal {
  code?: string;
  challenge_token?: string;
}

interface PasswordDoorResult {
  token: string | null;
  challenge: string | null;
  message: string | null;
}

/** The password door as `portal`: a token, or the TWO_FACTOR_REQUIRED challenge. */
export function passwordDoor(portal: StaffPortal, account: RunAccount): Cypress.Chainable<PasswordDoorResult> {
  return gqlRaw<{ login: { token: string } | null }>(
    portal,
    LOGIN_MUTATION,
    { input: { email: account.email, password: runPasswordNow(account), portal_key: portal } },
    null,
  ).then((body) => {
    const ext = (body.errors?.[0]?.extensions ?? {}) as TwoFactorRefusal;
    return cy.wrap<PasswordDoorResult>(
      {
        token: body.data?.login?.token ?? null,
        challenge: ext.code === 'TWO_FACTOR_REQUIRED' ? (ext.challenge_token ?? null) : null,
        message: body.errors?.[0]?.message ?? null,
      },
      { log: false },
    );
  });
}

/** Turn the authenticator on through the API, for specs that are about signing in with it. */
export function enableTwoFactorApi(portal: StaffPortal, token: string) {
  return asAccount<{ startTwoFactorSetup: { secret: string } }>(portal, token, START_TWO_FACTOR_API).then((setup) => {
    const { secret } = setup.startTwoFactorSetup;
    const step = totpStepNow();
    return totpCode(secret, step).then((code) =>
      asAccount<{ enableTwoFactor: { recovery_codes: string[] } }>(portal, token, ENABLE_TWO_FACTOR_API, { code }).then(
        (res) => cy.wrap({ secret, step, recoveryCodes: [...res.enableTwoFactor.recovery_codes] }, { log: false }),
      ),
    );
  });
}

/**
 * Leave the account with two-factor OFF, so every later sign-in (`apiPortalLogin`)
 * works: when the password door asks for the second step, spend one unused
 * recovery code to get in and another to turn it off.
 */
export function ensureTwoFactorOff(portal: StaffPortal, account: RunAccount, unused: readonly string[]): void {
  passwordDoor(portal, account).then(({ challenge }) => {
    if (!challenge) return;
    if (unused.length < 2) throw new Error('Two-factor is still on and no recovery codes are left to turn it off.');
    asAccount<{ completeTwoFactorLogin: { token: string } }>(portal, '', COMPLETE_TWO_FACTOR_API, {
      input: { challenge_token: challenge, code: unused[0] },
    }).then((done) =>
      asAccount(portal, done.completeTwoFactorLogin.token, DISABLE_TWO_FACTOR_API, { code: unused[1] }),
    );
  });
}

// ------------------------------------------------------------ misc

/** Read every recovery code off the setup dialog's list. */
export const readRecoveryCodes = (): Cypress.Chainable<string[]> =>
  cy
    .byTestId('two-factor-recovery-codes')
    .find('li')
    .then(($items) => Cypress.$.makeArray($items).map((item) => item.innerText.trim()));

/** Every recovery code the server issued is ABCD-EFGH (two-factor.proof.ts newRecoveryCodes). */
export const RECOVERY_CODE = /^[A-Z2-7]{4}-[A-Z2-7]{4}$/;

/** Open one of the apps drawer's tools (tools.tsx keys) over the current page. */
export function openAppsTool(key: 'file-manager' | 'staff-chat' | 'jump-to-portal' | 'ask-bot'): void {
  cy.byTestId('shell-header-apps').click();
  cy.byTestId(`shell-apps-drawer-tool-${key}`).click();
}

const SAVE_STAFF_CHAT_STATE_API = `mutation E2eSaveStaffChatState($input: StaffChatStateInput!) {
  saveStaffChatState(input: $input) { panel_open }
}`;

/**
 * Start with the chat panel saved as closed: the panel restores itself open on
 * load when it was left open (usePanelRestore), so a header click would close it.
 */
export function closeChatPanelState(portal: StaffPortal, token: string): void {
  asAccount(portal, token, SAVE_STAFF_CHAT_STATE_API, { input: { panel_open: false } });
}

/**
 * A code the server has not seen yet: replay protection refuses any step at or
 * before the last one accepted, so it is this step, or the next one when this
 * step was already spent (one step of drift is accepted either side).
 */
export function nextTotp(secret: string, lastStep: number): Cypress.Chainable<{ code: string; step: number }> {
  const step = Math.max(totpStepNow(), lastStep + 1);
  // More than one step ahead of the clock is outside the window: wait until it is not.
  const waitMs = Math.max(0, (step - 1) * 30_000 - Date.now() + 1000);
  return cy.wait(waitMs, { log: false }).then(() => totpCode(secret, step).then((code) => ({ code, step })));
}
