/// <reference types="cypress" />
import { openPasswordStep } from './account-steps';
import { runAccount } from './run-account';

/**
 * Shared steps for the scenario map's second third of mWeb UI rows
 * (specs/ui/** — city launch, posts, stories, follow, the Following feed,
 * Explore, chats, share links, notifications, leaderboard, badges,
 * membership and gift cards).
 *
 * Everything a spec expects on screen is read from the same public or
 * member queries the page itself asks, so the assertions follow staging's
 * data rather than a copy of it. The only things written are the run
 * account's own: its selected city (put back in `after`), its posts,
 * stories, waitlist entry and notify-me row — all purged with the account
 * (the purge walks every collection that references a user).
 */

export interface RunMe {
  user_id: string;
  username: string | null;
  email: string;
  selected_location_id: string | null;
}

const RUN_ME = `query E2eUiRunMe { me { user_id username email selected_location_id } }`;

/** The run account as the server sees it now. */
export const runMe = (): Cypress.Chainable<RunMe> => cy.gql<{ me: RunMe }>(RUN_ME).then(({ me }) => me);

export interface AppLocation {
  id: string;
  location_id: string;
  location_name: string;
  city: string;
  state: string | null;
  country: string | null;
  is_launched: boolean;
  subscriber_count: number;
  launch_target: number;
  whatsapp_group_url: string;
}

const LOCATIONS = `query E2eUiLocations {
  locations {
    id location_id location_name city state country
    is_launched subscriber_count launch_target whatsapp_group_url
  }
}`;

/** Every city the header's picker lists (the same `locations` query it reads). */
export const appLocations = (): Cypress.Chainable<AppLocation[]> =>
  cy.gql<{ locations: AppLocation[] }>(LOCATIONS).then(({ locations }) => locations);

/** A launched city — Home shows its feed, not a waitlist. */
export function launchedLocation(): Cypress.Chainable<AppLocation> {
  return appLocations().then((locations) => {
    const city = locations.find((location) => location.is_launched);
    if (!city) throw new Error('Staging lists no launched city: Home has no feed to show without one.');
    return city;
  });
}

const SET_SELECTED_LOCATION = `mutation E2eUiSetSelectedLocation($locationId: ID, $zoneName: String) {
  setMySelectedLocation(location_id: $locationId, zone_name: $zoneName) { user_id selected_location_id }
}`;

/**
 * Make `locationId` the run account's saved header city — what the header
 * applies on the next load, exactly as a pick in the location picker does.
 */
export function selectLocation(locationId: string | null): void {
  cy.gql(SET_SELECTED_LOCATION, { locationId, zoneName: null });
}

/**
 * On /login with `?redirect=…`: sign in with the run account's password the
 * way a member does, and wait for the server's answer. The app then follows
 * the redirect.
 */
export function signInOnLoginPage(): void {
  const account = runAccount();
  cy.location('pathname').should('eq', '/login');
  openPasswordStep();
  cy.byTestId('field-email').type(account.email);
  cy.byTestId('field-password').type(account.password('CHANGED'), { log: false });
  cy.interceptOperation('Login');
  cy.byTestId('login-submit').click();
  cy.wait('@Login');
}

/**
 * The page in a browser with no share sheet, whose clipboard is watched as
 * `@copied` — what every Share button falls back to. A headless runner has
 * no clipboard permission, so the write is answered here, never skipped.
 */
export function watchClipboard(): void {
  cy.window().then((win) => {
    Object.defineProperty(win.navigator, 'share', { value: undefined, configurable: true });
    cy.stub(win.navigator.clipboard, 'writeText').as('copied').resolves();
  });
}

/**
 * After a Share press: the tracked link the server minted for it (or the
 * plain in-app URL when none came back) is what reached the clipboard.
 */
export function expectSharedLink(plainUrl: string): void {
  cy.wait('@ShareLink').then(({ response }) => {
    const minted = (response?.body as { data?: { shareLink?: { url?: string } | null } })?.data?.shareLink?.url;
    cy.get('@copied').should('have.been.calledOnceWith', minted || plainUrl);
  });
}

/** The app-wide snackbar (`notify()`): what a copy or a failed action says. */
export const notice = () => cy.byTestId('notify-host-alert');

export interface ListedPod {
  id: string;
  pod_id: string;
  club_slug: string | null;
  pod_hosts_id: string[];
}

const LISTED_PODS = `query E2eUiListedPods { pods(filter: { is_active: true }) { id pod_id club_slug pod_hosts_id } }`;

/** A listed pod with a club page, hosted by someone other than the run account. */
export function listedPod(ownId: string): Cypress.Chainable<ListedPod> {
  return cy.gql<{ pods: ListedPod[] }>(LISTED_PODS).then(({ pods }) => {
    const pod = pods.find((p) => !!p.club_slug && p.pod_hosts_id.length > 0 && !p.pod_hosts_id.includes(ownId));
    if (!pod) throw new Error('Staging lists no active pod with a club page hosted by someone else: these scenarios need one.');
    return pod;
  });
}
